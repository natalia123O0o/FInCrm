const User = require('./user.model'); // Nos permite utilizar el modelo User para consultar y guardar empleados en MongoDB.
const bcrypt = require('bcryptjs');

// Controlador asíncrono para registrar un nuevo empleado o usuario dentro de una empresa específica
const createUser = async (req, res) => {
  try {
    // 1. Recibir los datos del empleado: Extrae el nombre, correo y contraseña 
    // del cuerpo de la solicitud HTTP (req.body). 
    // Se usa el operador de coalescencia nula (?? {}) para evitar que la aplicación 
    // se rompa si req.body llega vacío o indefinido (undefined).
    const { name, email, password } = req.body ?? {};

    // 2. Validar los campos obligatorios: Comprueba estrictamente las reglas básicas de entrada:
    // - Que 'name' sea texto y no esté vacío (validando con .trim()).
    // - Que 'email' sea texto y no esté vacío.
    // - Que 'password' sea texto y tenga al menos 8 caracteres de longitud.
    // Si alguna regla falla, se interrumpe y responde con un código HTTP 400 (Bad Request).
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: 'Nombre, correo y contraseña válida son obligatorios'
      });
    }

    // 3. Obtener la empresa del ADMIN autenticado: Extrae el identificador de la empresa (tenantId) 
    // que fue inyectado previamente en el objeto 'req.user' por un middleware de autenticación (como JWT).
    // Esto garantiza que el administrador solo pueda crear empleados para su propia empresa.
    const tenantId = req.user.tenantId;

    // Si por alguna razón el usuario autenticado no tiene una empresa asociada, 
    // se bloquea la acción con un código HTTP 403 (Forbidden).
    if (!tenantId) {
      return res.status(403).json({
        message: 'El administrador no tiene una empresa asignada'
      });
    }

    // 4. Normalizar el correo: Limpia los espacios en blanco sobrantes a los lados 
    // y convierte todo el correo a minúsculas. Esto previene que "Test@Gmail.com" 
    // y "test@gmail.com" se registren como cuentas diferentes.
    const cleanEmail = email.trim().toLowerCase();

    // 5. Verificar si el correo ya existe: Consulta en la base de datos de MongoDB 
    // si ya hay un usuario registrado con ese mismo correo electrónico.
    const existingUser = await User.findOne({
      email: cleanEmail
    });

    // Si el usuario ya existe, interrumpe la ejecución y responde con un código HTTP 409 (Conflict).
    if (existingUser) {
      return res.status(409).json({
        message: 'El correo ya está registrado'
      });
    }

    // 6. Proteger la contraseña: Utiliza la librería 'bcrypt' para aplicar un hash seguro 
    // a la contraseña usando un factor de costo (salt rounds) de 12. 
    // Esto asegura que la contraseña NUNCA se guarde en texto plano en la base de datos.
    const passwordHash = await bcrypt.hash(password, 12);

    // 7. Guardar el empleado en MongoDB: Crea el nuevo documento del usuario vinculando:
    // - El nombre limpio.
    // - El correo normalizado.
    // - La contraseña cifrada (passwordHash).
    // - El rol fijo de empleado ('USER').
    // - El 'tenantId' del administrador para asociar este empleado a la empresa correcta.
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'USER',
      tenantId
    });

    // 8. Responder sin mostrar la contraseña: Devuelve un código HTTP 201 (Created) 
    // confirmando el éxito. Es una buena práctica de seguridad retornar únicamente 
    // los datos públicos del usuario creado (ID, nombre, correo, rol y tenantId), 
    // omitiendo totalmente la contraseña o el hash.
    return res.status(201).json({
      message: 'Empleado registrado correctamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    });

  } catch (error) {
    // 9. Manejo de errores de base de datos (Condición de carrera): 
    // Si dos administradores intentan registrar exactamente el mismo correo al mismo milisegundo,
    // el paso 5 podría omitirlo por un microsegundo, pero MongoDB lo bloqueará a nivel de índice único 
    // lanzando el código de error 11000 (Duplicate Key). Aquí se captura para responder limpiamente un 409.
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'El correo ya está registrado'
      });
    }

    // 10. Manejo de errores genéricos: Registra cualquier fallo inesperado del servidor 
    // en la consola para depuración y responde con un código HTTP 500 (Internal Server Error).
    console.error('Error al registrar empleado:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};


const getUsers = async (req, res) => {
  try {
    // 1. Obtener la empresa del ADMIN autenticado
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        message: 'El administrador no tiene una empresa asignada'
      });
    }

    // 2. Buscar solamente empleados de su empresa
    const users = await User.find({
      tenantId,
      role: 'USER'
    })
      .select('_id name email role tenantId isActive')
      .sort({ name: 1 });

    // 3. Enviar los resultados
    return res.status(200).json({
      message: 'Empleados obtenidos correctamente',
      total: users.length,
      users
    });

  } catch (error) {
    console.error('Error al consultar empleados:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};




// Exporta las funciones del controlador para poder asignarlas a las rutas protegidas 
// (ej: router.post('/employees', verifyToken, createUser))
module.exports = { 
  createUser, 
  getUsers 
};