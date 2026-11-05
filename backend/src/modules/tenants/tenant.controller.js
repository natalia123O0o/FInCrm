// Importa el módulo principal de Mongoose para operaciones avanzadas (como validación de ObjectIds)
const mongoose = require("mongoose");

// Importa el modelo de datos de la empresa (Tenant) para consultar y crear registros en la colección 'tenants'
const Tenant = require("./tenant.model");

// Importa el modelo de usuarios (User) para registrar administradores vinculados a la empresa
const User = require("../users/user.model");

// Importa 'bcryptjs' para el cifrado seguro de contraseñas mediante hashing unidireccional
const bcrypt = require("bcryptjs");

// ============================================================================
// FUNCIÓN AUXILIAR: CÁLCULO DEL DÍGITO DE VERIFICACIÓN DE UN NIT (DIAN COLOMBIA)
// ============================================================================

/**
 * Algoritmo oficial estándar (Módulo 11) utilizado en Colombia para validar la 
 * autenticidad matemática de un Número de Identificación Tributaria (NIT).
 * 
 * @param {string} nit - El NIT numérico de la empresa (sin incluir el dígito de verificación).
 * @returns {string} El dígito de verificación calculado resultante (un solo dígito de 0 a 9).
 */
const calculateVerificationDigit = (nit) => {
  // Arreglo estricto de pesos (factores multiplicadores) definidos por la DIAN en orden de derecha a izquierda
  const weights = [
    71, 67, 59, 53, 47,
    43, 41, 37, 29, 23,
    19, 17, 13, 7, 3
  ];

  // Asegura una longitud fija de 15 caracteres rellenando con ceros a la izquierda para alinear correctamente los pesos
  const digits = nit.padStart(15, "0");

  let total = 0;

  // Itera por cada uno de los 15 dígitos normalizados, multiplicándolo por su respectivo peso y acumulando la suma
  for (let i = 0; i < 15; i++) {
    total += Number(digits[i]) * weights[i];
  }

  // Obtiene el residuo (módulo) de dividir la suma total acumulada entre 11
  const remainder = total % 11;

  // Aplica la regla estándar de la DIAN:
  // - Si el residuo es mayor estricto a 1, se resta 11 menos el residuo.
  // - Si el residuo es 0 o 1, el dígito de verificación es igual al residuo mismo.
  return String(
    remainder > 1 ? 11 - remainder : remainder
  );
};

// ============================================================================
// 1. CONTROLADOR: REGISTRAR UNA NUEVA EMPRESA (TENANT)
// Método HTTP: POST /api/tenants
// Restricción de Acceso: Exclusivo para usuarios con rol 'SUPER_ADMIN'
// ============================================================================

const createTenant = async (req, res) => {
  try {
    // Extracción segura de los campos enviados en el body de la petición HTTP.
    // Utiliza un operador de coalescencia nula (?? {}) para evitar fallos si req.body llega undefined.
    const {
      name,
      subdomain,
      nit,
      verificationDigit,
      email,
      phone,
      address,
      city
    } = req.body ?? {};

    // VALIDACIÓN 1: Nombre de la empresa obligatorio y de tipo texto válido
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      // Retorna código HTTP 400 (Bad Request) si falla la validación
      return res.status(400).json({
        message: "El nombre de la empresa es obligatorio"
      });
    }

    // VALIDACIÓN 2: Subdominio estricto (solo letras minúsculas, números y guiones permitidos mediante RegEx)
    if (
      typeof subdomain !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        subdomain.trim()
      )
    ) {
      return res.status(400).json({
        message: "Subdominio inválido"
      });
    }

    // VALIDACIÓN 3: Formato del NIT (estrictamente numérico, con una longitud de 6 a 15 caracteres)
    if (
      typeof nit !== "string" ||
      !/^[0-9]{6,15}$/.test(nit)
    ) {
      return res.status(400).json({
        message: "El NIT debe contener entre 6 y 15 dígitos"
      });
    }

    // VALIDACIÓN 4: Dígito de verificación. Comprueba el formato de 1 dígito y que coincida 
    // exactamente con el valor retornado por la función matemática 'calculateVerificationDigit'
    if (
      typeof verificationDigit !== "string" ||
      !/^[0-9]$/.test(verificationDigit) ||
      calculateVerificationDigit(nit) !== verificationDigit
    ) {
      return res.status(400).json({
        message: "Dígito de verificación del NIT incorrecto"
      });
    }

    // Agrupación de campos de contacto opcionales para validación masiva en bloque
    const optionalFields = [
      email,
      phone,
      address,
      city
    ];

    // VALIDACIÓN 5: Garantiza que si un campo opcional es provisto, su tipo de dato sea obligatoriamente 'string'
    if (
      optionalFields.some(
        value =>
          value !== undefined &&
          typeof value !== "string"
      )
    ) {
      return res.status(400).json({
        message: "Los datos de contacto deben ser textos"
      });
    }

    // Normaliza el subdominio: elimina espacios periféricos y lo convierte enteramente a minúsculas
    const cleanSubdomain = subdomain.trim().toLowerCase();

    // CONSULTA 1: Verifica de forma anticipada si ya existe un registro previo con ese mismo subdominio
    const existingSubdomain = await Tenant.findOne({
      subdomain: cleanSubdomain
    });

    if (existingSubdomain) {
      // Código HTTP 409 (Conflict): Indica que el recurso choca con uno existente
      return res.status(409).json({
        message: "El subdominio ya está registrado"
      });
    }

    // CONSULTA 2: Verifica de forma anticipada si ya existe una empresa registrada con el mismo NIT exacto
    const existingNit = await Tenant.findOne({
      nit: nit
    });

    if (existingNit) {
      return res.status(409).json({
        message: "El NIT ya está registrado"
      });
    }

    // PERSISTENCIA: Crea formalmente el nuevo documento de la empresa en la base de datos de MongoDB
    const tenant = await Tenant.create({
      name: name.trim(),
      subdomain: cleanSubdomain,
      nit: nit,
      verificationDigit: verificationDigit,
      // Operador de encadenamiento opcional (?.) para limpiar de forma segura si no son nulos/undefined
      email: email?.trim().toLowerCase(),
      phone: phone?.trim(),
      address: address?.trim(),
      city: city?.trim()
    });

    // RESPUESTA EXITOSA: Retorna código HTTP 201 (Created) con los datos de la empresa recién creada
    return res.status(201).json({
      message: "Empresa registrada correctamente",
      tenant: tenant
    });

  } catch (error) {
    // MANEJO DE ERRORES DE BASE DE DATOS: 
    // El código 11000 de MongoDB corresponde a una violación de índice único (unique index constraint violation)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "El NIT o subdominio ya está registrado"
      });
    }

    // Captura cualquier otro error crítico inesperado y lo registra en la consola del servidor
    console.error("Error al crear empresa:", error);

    // Retorna un código HTTP 500 (Internal Server Error) genérico por seguridad del servidor
    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// ============================================================================
// 2. CONTROLADOR: REGISTRAR UN ADMINISTRADOR PARA UNA EMPRESA ESPECÍFICA
// Método HTTP: POST /api/tenants/:tenantId/admin
// Restricción de Acceso: Exclusivo para usuarios con rol 'SUPER_ADMIN'
// ============================================================================

const createTenantAdmin = async (req, res) => {
  try {
    // Extrae el parámetro dinámico 'tenantId' enviado directamente en la URL de la petición
    const { tenantId } = req.params;

    // VALIDACIÓN PREVIA DE SEGURIDAD: 
    // Comprueba mediante Mongoose si el ID de la URL tiene el formato estructural válido de un ObjectId (24 caracteres hexadecimales)
    if (!mongoose.isValidObjectId(tenantId)) {
      return res.status(400).json({
        message: "ID de empresa inválido"
      });
    }

    // Extrae las credenciales y datos del administrador desde el cuerpo de la petición
    const {
      name,
      email,
      password
    } = req.body ?? {};

    // VALIDACIÓN OBLIGATORIA: Verifica tipos de datos correctos, campos no vacíos y una contraseña robusta (mínimo 8 caracteres)
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Nombre, correo y contraseña válida son obligatorios"
      });
    }

    // CONSULTA 1: Busca en MongoDB la empresa vinculada mediante su identificador único ID
    const tenant = await Tenant.findById(tenantId);

    // VALIDACIÓN DE ESTADO: Verifica que la empresa realmente exista en la base de datos y que su propiedad status sea "ACTIVE"
    if (!tenant || tenant.status !== "ACTIVE") {
      // Código HTTP 404 (Not Found): La empresa no existe o está inactiva/suspendida
      return res.status(404).json({
        message: "Empresa no encontrada o inactiva"
      });
    }

    // Normaliza el correo electrónico del administrador (lo pasa a minúsculas y remueve espacios sobrantes)
    const cleanEmail = email.trim().toLowerCase();

    // CONSULTA 2: Comprueba preventivamente si ya existe un usuario registrado en el sistema con ese correo
    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "El correo ya está registrado"
      });
    }

    // SEGURIDAD CRÍTICA: Cifra la contraseña del usuario utilizando 'bcrypt' con un factor de costo (salt rounds) de 12
    // Esto garantiza que la contraseña plana jamás se almacene de forma legible en la base de datos.
    const passwordHash = await bcrypt.hash(password, 12);

    // PERSISTENCIA: Crea el nuevo registro del usuario con rol 'ADMIN' vinculado de manera relacional al `tenantId` de la empresa
    const admin = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: passwordHash,
      role: "ADMIN",
      tenantId: tenant._id
    });

    // RESPUESTA EXITOSA: Retorna código HTTP 201 (Created) devolviendo exclusivamente los datos públicos esenciales del admin 
    // (Omitiendo deliberadamente la propiedad sensible `passwordHash` por razones de seguridad elemental).
    return res.status(201).json({
      message: "Administrador registrado correctamente",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        tenantId: admin.tenantId
      }
    });

  } catch (error) {
    // MANEJO DE ERROR 1: Duplicidad de correo electrónico a nivel de base de datos (Código 11000 de MongoDB)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "El correo ya está registrado"
      });
    }

    // MANEJO DE ERROR 2: Error de conversión de Mongoose (`CastError`). Ocurre si por alguna razón la URL pasa un ID estructuralmente defectuoso que evade validaciones previas.
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "ID de empresa inválido"
      });
    }

    // Registro de errores inesperados de sistema en la consola del servidor
    console.error("Error al crear administrador:", error);

    // Retorna código HTTP 500 genérico de servidor
    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


const updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Validar el ID de la empresa
    if (!mongoose.isValidObjectId(tenantId)) {
      return res.status(400).json({
        message: "ID de empresa inválido"
      });
    }

    // Buscar la empresa existente
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        message: "Empresa no encontrada"
      });
    }

    // Campos permitidos para actualizar
    const allowedFields = [
      "name",
      "nit",
      "verificationDigit",
      "email",
      "phone",
      "address",
      "city"
    ];

    // Rechazar campos que no permitimos modificar
    const data = req.body ?? {};

    if (
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).some(
        key => !allowedFields.includes(key)
      )
    ) {
      return res.status(400).json({
        message: "Campos de actualización inválidos"
      });
    }

    // Validar los campos recibidos
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          message: `Valor inválido para ${key}`
        });
      }
    }

    // Validar el NIT y su dígito de verificación
    const nit = data.nit ?? tenant.nit;
    const digit = data.verificationDigit ??
      tenant.verificationDigit;

    if (nit !== undefined || digit !== undefined) {
      if (
        typeof nit !== "string" ||
        !/^[0-9]{6,15}$/.test(nit) ||
        typeof digit !== "string" ||
        !/^[0-9]$/.test(digit) ||
        calculateVerificationDigit(nit) !== digit
      ) {
        return res.status(400).json({
          message: "NIT o dígito de verificación inválido"
        });
      }
    }

    // Actualizar únicamente los campos permitidos
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        tenant[key] = data[key].trim();
      }
    }

    await tenant.save();

    return res.status(200).json({
      message: "Empresa actualizada correctamente",
      tenant
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "El NIT ya está registrado"
      });
    }

    console.error("Error al actualizar empresa:", error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};


module.exports = {
  createTenant,
  createTenantAdmin,
  updateTenant
};