
const express = require("express");
const router = express.Router();

// Importar controladores
const {
  createDebt,
  getDebts
} = require("./debt.controller");

// Importar middlewares
const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// POST /api/debts
// Registrar una deuda
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  createDebt
);

// GET /api/debts
// Consultar deudas de la empresa
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  getDebts
);

module.exports = router;
