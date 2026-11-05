const express = require('express');
const router = express.Router();

// Importamos el controlador que creamos previamente para registrar empleados
const { createUser, getUsers } = require('./user.controller');

// Importamos los middlewares de seguridad y control de acceso
const protect = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

// Definición de la ruta POST para registrar un empleado.
// El sistema ejecuta estos middlewares en orden estricto (de izquierda a derecha) antes de llegar al controlador:
router.post(
  '/',
  
  // 1. Middleware de Autenticación ('protect'):
  // Verifica que la petición incluya un Token JWT válido en las cabeceras (Headers). 
  // Si es válido, extrae la información del usuario y la guarda en 'req.user' 
  // (permitiendo que el controlador conozca el 'tenantId' del admin).
  protect,
  
  // 2. Middleware de Autorización por Roles ('authorizeRoles'):
  // Revisa el rol del usuario que ya fue autenticado en el paso anterior (req.user.role).
  // Si el rol es 'ADMIN', le permite pasar. Si es cualquier otro rol (ej. 'USER'), 
  // bloquea la petición inmediatamente con un error 403 (Forbidden).
  authorizeRoles('ADMIN'),
  
  // 3. Controlador final ('createUser'):
  // Si la petición pasó con éxito por los dos filtros anteriores, 
  // se ejecuta la lógica para guardar el nuevo empleado en la base de datos vinculándolo a la empresa del administrador.
  createUser,

);

router.get(
  '/',
  protect,
  authorizeRoles('ADMIN'),
  getUsers
);

// Exportamos el enrutador para poder montarlo en la aplicación principal 
// (por ejemplo: app.use('/api/users', userRoutes))
module.exports = router;