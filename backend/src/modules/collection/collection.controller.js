// Importa Mongoose para operaciones y validación de identificadores ObjectId de MongoDB
const mongoose = require("mongoose");

// Importa los modelos necesarios para realizar verificaciones relacionales
const Client = require("../clients/client.model");
const Debt = require("../debts/debt.model");
const Tenant = require("../tenants/tenant.model");
const CollectionLog = require("./collectionLog.model");

// Importa la función de validación de normativas de contacto (ej. Ley 2300 de Colombia sobre horarios y canales)
const {
  validateBasicContactRules
} = require("./ley2300.rules");

// Importa la función auxiliar de servicio para validar la frecuencia semanal de contactos
const {
  validateContactFrequency
} = require("./collection.service");

// ============================================================================
// CONTROLADOR: CREAR UN NUEVO REGISTRO DE GESTIÓN DE COBRANZA
// Método HTTP: POST /api/collections (o similar)
// Restricción: Requiere autenticación de usuario y pertenecer a una empresa activa
// ============================================================================

const createCollectionLog = async (req, res) => {
  try {
    // 1. Obtiene el identificador de la empresa del usuario autenticado a partir del objeto 'req.user'
    const tenantId = req.user.tenantId;

    // Validación de seguridad multiempresa: si el usuario no tiene una empresa asignada, se rechaza la petición
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 2. Extrae los datos enviados en el cuerpo de la petición (usa un objeto vacío por defecto si es nulo)
    const {
      clientId,
      debtId,
      channel,
      result,
      notes
    } = req.body || {};

    // 3. Valida estrictamente que tanto el 'clientId' como el 'debtId' tengan una estructura de ObjectId válida
    if (
      !mongoose.isValidObjectId(clientId) ||
      !mongoose.isValidObjectId(debtId)
    ) {
      return res.status(400).json({
        message: "ID de cliente o deuda inválido"
      });
    }

    // 4. Valida el canal de contacto: el valor enviado debe pertenecer obligatoriamente a la lista permitida
    const channels = [
      "email",
      "sms",
      "call",
      "whatsapp"
    ];

    if (!channels.includes(channel)) {
      return res.status(400).json({
        message: "Canal de contacto inválido"
      });
    }

    // 5. Valida el resultado de la gestión: debe ser uno de los estados permitidos del ciclo de cobro
    const results = [
      "CONTACTED",     // Cliente contactado exitosamente
      "NO_ANSWER",     // No se obtuvo respuesta
      "PROMISE_TO_PAY" // Promesa de pago adquirida
    ];

    if (!results.includes(result)) {
      return res.status(400).json({
        message: "Resultado de gestión inválido"
      });
    }

    // 6. Valida el campo de observaciones (notas):
    // Si se envía, debe ser estrictamente de tipo texto (*string*) y no superar los 1000 caracteres
    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > 1000)
    ) {
      return res.status(400).json({
        message: "Las observaciones deben ser texto de máximo 1000 caracteres"
      });
    }

    // 7. Busca la empresa (Tenant) en la base de datos para verificar su existencia y estado actual
    const tenant = await Tenant.findById(tenantId);

    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Empresa no disponible"
      });
    }

    // 8. Busca al cliente asegurándose de que pertenezca a la misma empresa y esté activo
    const client = await Client.findOne({
      _id: clientId,
      tenantId: tenantId,
      isActive: true
    });

    if (!client) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 9. Verifica que la deuda especificada exista, esté activa y pertenezca tanto al cliente como a la empresa
    const debt = await Debt.findOne({
      _id: debtId,
      clientId: clientId,
      tenantId: tenantId,
      isActive: true
    });

    if (!debt) {
      return res.status(404).json({
        message: "Deuda no encontrada"
      });
    }

    // 10. Regla de negocio: Evita registrar gestiones de cobro sobre deudas que ya se encuentran totalmente pagadas
    if (debt.outstandingBalance <= 0) {
      return res.status(409).json({
        message: "La deuda ya está pagada"
      });
    }

    // Define la marca de tiempo exacta del momento en que se intenta registrar la gestión
    const now = new Date();

    // 11. Validar reglas normativas de contacto (ej. Ley 2300 de horarios permitidos según el canal y configuraciones del tenant)
    const basicRules = validateBasicContactRules({
      channel: channel,
      date: now,
      tenantSettings: tenant.settings
    });

    if (!basicRules.valid) {
      return res.status(403).json({
        message: basicRules.message
      });
    }

    // 12. Validar la frecuencia máxima de contacto permitida por semana para este cliente
    const frequency = await validateContactFrequency({
      tenantId: tenantId,
      clientId: clientId,
      tenantSettings: tenant.settings,
      now: now
    });

    if (!frequency.valid) {
      return res.status(409).json({
        message: frequency.message
      });
    }

    // 13. Persistencia: Guarda formalmente el registro de la gestión de cobranza en MongoDB
    const collection = await CollectionLog.create({
      tenantId: tenantId,
      clientId: clientId,
      debtId: debtId,
      createdBy: req.user._id, // Asocia el ID del usuario autenticado que realiza la acción
      channel: channel,
      result: result,
      notes: notes ? notes.trim() : "", // Limpia los espacios vacíos de las notas si existen
      contactedAt: now
    });

    // 14. Respuesta exitosa: Retorna código HTTP 201 (Created) con la confirmación y el documento creado
    return res.status(201).json({
      message: "Gestión de cobranza registrada correctamente",
      collection: collection
    });

  } catch (error) {
    // Registro de errores inesperados de servidor en la consola
    console.error("Error al registrar cobranza:", error);

    // Retorna código HTTP 500 (Internal Server Error) genérico por seguridad
    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Exporta el controlador para su uso en las rutas de la aplicación
module.exports = {
  createCollectionLog
};