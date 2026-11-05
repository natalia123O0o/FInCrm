// Importa el módulo principal de Mongoose para operaciones y validación de tipos de ID de MongoDB
const mongoose = require("mongoose");

// Importa el modelo 'Debt' para interactuar con la colección de deudas en la base de datos
const Debt = require("./debt.model");

// Importa el modelo 'Client' para verificar la existencia y propiedad del cliente al que se le asignará la deuda
const Client = require("../clients/client.model");

// CONTROLADOR: REGISTRAR UNA NUEVA DEUDA
// Método HTTP: POST /api/debts (o similar)
// Restricción: Diseñado para ejecutarse bajo un middleware de autenticación (requiere req.user)


const createDebt = async (req, res) => {
  try {
    // 1. Obtiene el identificador de la empresa del administrador autenticado desde el objeto 'req.user'
    const tenantId = req.user.tenantId;

    // Validación de seguridad multiempresa: si el usuario no tiene una empresa asociada, se deniega el acceso
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 2. Extrae los datos enviados en el cuerpo de la petición (usa un objeto vacío por defecto si es nulo)
    const {
      clientId,
      description,
      originalAmount,
      dueDate
    } = req.body || {};

    // 3. Valida estrictamente que el 'clientId' tenga la estructura válida de un ObjectId de MongoDB (24 caracteres hexadecimales)
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({
        message: "ID de cliente inválido"
      });
    }

    // 4. Valida que la descripción sea obligatoriamente un texto (*string*) válido y que no esté vacía
    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "La descripción es obligatoria"
      });
    }

    // 5. Valida el monto o valor original de la deuda:
    // - Debe ser un número finito válido (*Number*).
    // - Debe ser estrictamente mayor a cero.
    if (
      typeof originalAmount !== "number" ||
      !Number.isFinite(originalAmount) ||
      originalAmount <= 0
    ) {
      return res.status(400).json({
        message: "El valor de la deuda debe ser mayor que cero"
      });
    }

    // 6. Validación avanzada de la fecha de vencimiento (`dueDate`):
    // Primero, comprueba que sea un texto que cumpla estrictamente con el formato estándar YYYY-MM-DD mediante una Expresión Regular.
    if (
      typeof dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ) {
      return res.status(400).json({
        message: "La fecha debe tener formato YYYY-MM-DD"
      });
    }

    // Crea un objeto de fecha de JavaScript fijando la hora a medianoche en formato UTC
    const date = new Date(`${dueDate}T00:00:00.000Z`);

    // Valida que la fecha generada sea matemáticamente real (ej. previene fechas inválidas como el 31 de febrero)
    // y comprueba que la cadena ISO resultante coincida exactamente con la fecha enviada inicialmente.
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dueDate
    ) {
      return res.status(400).json({
        message: "Fecha de vencimiento inválida"
      });
    }

    // 7. Comprobación de seguridad cruzada (Aislamiento Multiempresa):
    // Busca al cliente en la base de datos asegurándose de que:
    // - Coincida con el 'clientId' proporcionado.
    // - Pertenezca exactamente a la misma empresa del usuario autenticado ('tenantId').
    // - El cliente se encuentre en un estado activo ('isActive: true').
    const client = await Client.findOne({
      _id: clientId,
      tenantId: tenantId,
      isActive: true
    });

    // Si el cliente no existe, no pertenece a la empresa o está inactivo, se retorna un error 404 (Not Found)
    if (!client) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    // 8. Persistencia: Crea formalmente el registro de la deuda en la base de datos de MongoDB.
    // Nota: Al crearla, el 'outstandingBalance' (saldo pendiente) se inicializa con el mismo valor que el 'originalAmount'.
    const debt = await Debt.create({
      tenantId: tenantId,
      clientId: client._id,
      description: description.trim(),
      originalAmount: originalAmount,
      outstandingBalance: originalAmount, // Inicialmente el saldo por pagar es igual al total de la deuda
      dueDate: date,
      status: "PENDING",                 // Estado inicial de la deuda ('Pendiente')
      isActive: true
    });

    // 9. Respuesta exitosa: Retorna el código HTTP 201 (Created) junto con un mensaje y los datos de la deuda registrada
    return res.status(201).json({
      message: "Deuda registrada correctamente",
      debt: debt
    });

  } catch (error) {
    // Registro de errores inesperados de servidor en la consola
    console.error("Error al registrar deuda:", error);

    // Retorna un código HTTP 500 (Internal Server Error) genérico por seguridad
    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


const getDebts = async (req, res) => {
  try {
    // 1. Obtener la empresa del administrador
    const tenantId = req.user.tenantId;

    // 2. Verificar que tenga empresa asignada
    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 3. Buscar las deudas de la empresa
    const debts = await Debt.find({
      tenantId: tenantId,
      isActive: true
    })
      .populate(
        "clientId",
        "name documentNumber email phone"
      )
      .sort({ createdAt: -1 });

    // 4. Devolver los resultados
    return res.status(200).json({
      message: "Deudas obtenidas correctamente",
      total: debts.length,
      debts: debts
    });

  } catch (error) {
    console.error("Error al consultar deudas:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


module.exports = {
  createDebt,
  getDebts
};