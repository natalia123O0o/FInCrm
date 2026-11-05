
const express = require('express');
const router = express.Router();

// Importar controladores
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
} = require('./client.controller');

// Importar middlewares
const protect = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

// POST /api/clients
// Registrar un cliente
router.post(
  '/',
  protect,
  authorizeRoles('ADMIN'),
  createClient
);

// GET /api/clients
// Consultar clientes de la empresa
router.get(
  '/',
  protect,
  authorizeRoles('ADMIN'),
  getClients
);

// GET /api/clients/:id
// Consultar un cliente específico
router.get(
  '/:id',
  protect,
  authorizeRoles('ADMIN'),
  getClientById
);

// PUT /api/clients/:id
// Actualizar un cliente
router.put(
  '/:id',
  protect,
  authorizeRoles('ADMIN'),
  updateClient
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  deleteClient
);

module.exports = router;
