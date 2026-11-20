
 // Importamos la librería jsonwebtoken para verificar los tokens JWT.
const jwt = require('jsonwebtoken');

// Importamos el modelo User para consultar los usuarios en MongoDB.
const User = require('../modules/users/user.model');

// Importamos el modelo Tenant para consultar las empresas registradas.
const Tenant = require('../modules/tenants/tenant.model');

// Creamos una función llamada protect que protege las rutas privadas.
// req: contiene la información de la petición del cliente.
// res: permite enviar una respuesta al cliente.
// next: permite continuar con la siguiente función de Express.
// async: permite utilizar await para esperar consultas a la base de datos.
const protect = async (req, res, next) => {

  // try intenta ejecutar el código y catch captura los errores.
  try {

    // Obtenemos el token enviado en los encabezados de la petición.
    // Normalmente llega así: Authorization: Bearer eyJhbGciOi...
    const authorization = req.headers.authorization;

    // Verificamos dos cosas:
    // 1. Que el cliente haya enviado el encabezado Authorization.
    // 2. Que el encabezado comience con la palabra "Bearer ".
    // El símbolo ! significa "NO".
    // El símbolo || significa "O".
    if (!authorization || !authorization.startsWith('Bearer ')) {

      // Si no cumple las condiciones, enviamos el error 401.
      // 401 significa que el cliente no está autenticado.
      return res.status(401).json({
        message: 'Token requerido'
      });

    }

    // Separamos el texto del encabezado utilizando el espacio.
    // Ejemplo: "Bearer abc123" se convierte en ["Bearer", "abc123"].
    // [1] obtiene el segundo elemento, que es el token.
    const token = authorization.split(' ')[1];

    // Verificamos que realmente exista un token.
    if (!token) {

      // Si el token está vacío, rechazamos la petición.
      return res.status(401).json({
        message: 'Token requerido'
      });

    }

    // Verificamos que el token JWT sea válido.
    // JWT_SECRET es la clave secreta guardada en el archivo .env.
    // Si el token fue modificado, venció o es inválido, se genera un error.
    // Si es válido, decoded contiene la información guardada en él.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscamos en MongoDB al usuario utilizando su ID.
    // decoded.userId es el identificador guardado al crear el token.
    // await espera a que MongoDB termine la búsqueda.
    const user = await User.findById(decoded.userId);

    // Verificamos que:
    // 1. El usuario exista en la base de datos.
    // 2. El usuario esté activo.
    // !user significa que el usuario no existe.
    // !user.isActive significa que el usuario está desactivado.
    if (!user || !user.isActive) {

      // Si no existe o está desactivado, rechazamos el acceso.
      return res.status(401).json({
        message: 'Acceso no autorizado'
      });

    }

    // Invalidar JWT anteriores al último restablecimiento de contraseña.
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Sesión vencida. Inicia sesión nuevamente.' });
    }

    // Comprobamos si el usuario NO es SUPER_ADMIN.
    // !== significa "diferente de".
    // SUPER_ADMIN puede administrar todo el sistema.
    // Los demás usuarios deben pertenecer a una empresa.
    if (user.role !== 'SUPER_ADMIN') {

      // Verificamos que el usuario tenga una empresa asignada.
      // tenantId es el identificador de la empresa.
      if (!user.tenantId) {

        // Si no tiene empresa, no puede acceder al sistema.
        // 403 significa que no tiene permiso para acceder.
        return res.status(403).json({
          message: 'Acceso no permitido'
        });

      }

      // Buscamos la empresa del usuario en MongoDB.
      const tenant = await Tenant.findById(user.tenantId);

      // Verificamos que la empresa exista y esté activa.
      // !tenant significa que la empresa no existe.
      // tenant.status !== 'ACTIVE' significa que no está activa.
      if (!tenant || tenant.status !== 'ACTIVE') {

        // Si la empresa no existe o está inactiva,
        // rechazamos el acceso del usuario.
        return res.status(403).json({
          message: 'Acceso no permitido'
        });

      }

    }

    // Guardamos los datos del usuario autenticado en req.user.
    // Así, las siguientes funciones pueden saber quién hizo la petición.
    req.user = user;

    // Como todas las verificaciones fueron correctas,
    // permitimos continuar hacia el endpoint solicitado.
    next();

  } catch (error) {

    // catch recibe cualquier error ocurrido dentro de try.
    // Verificamos si el error está relacionado con el token JWT.
    if (

      // El token tiene una firma incorrecta o un formato inválido.
      error.name === 'JsonWebTokenError' ||

      // El token ya venció.
      error.name === 'TokenExpiredError' ||

      // El token todavía no está habilitado para utilizarse.
      error.name === 'NotBeforeError'

    ) {

      // Si ocurre alguno de estos errores, respondemos con 401.
      return res.status(401).json({
        message: 'Token inválido o vencido'
      });

    }

    // Mostramos en la terminal el error para facilitar su revisión.
    console.error('Error de autenticación:', error);

    // Si ocurrió un error diferente, respondemos con código 500.
    // 500 significa que ocurrió un problema interno en el servidor.
    return res.status(500).json({
      message: 'Error interno del servidor'
    });

  }

};

// Exportamos protect para utilizarlo en otros archivos.
// Por ejemplo, en las rutas que requieren iniciar sesión.
module.exports = protect;
