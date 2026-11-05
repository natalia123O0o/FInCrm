
 // Importamos Express para crear las rutas del backend.
const express = require('express');

// Creamos un enrutador para organizar las rutas de empresas.
const router = express.Router();

// Importamos las dos funciones del controlador.
// createTenant: registra una nueva empresa.
// createTenantAdmin: registra un administrador para una empresa.
const {
  createTenant,
  createTenantAdmin,
  updateTenant
} = require('./tenant.controller');

// Importamos el middleware que verifica el token JWT.
const protect = require('../../middlewares/auth.middleware');

// Importamos el middleware que verifica los permisos por rol.
const authorizeRoles = require('../../middlewares/role.middleware');

// RUTA 1: Registrar una nueva empresa.
// Solo un SUPER_ADMIN puede registrar empresas.
router.post(
  '/',                           // Dirección de la ruta.
  protect,                       // Verifica que el usuario esté autenticado.
  authorizeRoles('SUPER_ADMIN'), // Verifica que sea SUPER_ADMIN.
  createTenant                   // Ejecuta la creación de la empresa.
);

// RUTA 2: Registrar un administrador para una empresa.
// :tenantId identifica la empresa a la que pertenecerá.
router.post(
  '/:tenantId/admin',            // Dirección con el ID de la empresa.
  protect,                       // Verifica el token JWT.
  authorizeRoles('SUPER_ADMIN'), // Solo SUPER_ADMIN puede acceder.
  createTenantAdmin              // Ejecuta la creación del administrador.
);

router.patch(
  "/:tenantId",
  protect,
  authorizeRoles("SUPER_ADMIN"),
  updateTenant
);

// Exportamos las rutas para utilizarlas en app.js.
module.exports = router;
