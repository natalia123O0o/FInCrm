
const express = require("express");
const router = express.Router();

const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const { requireFeature } = require('../../middlewares/feature.middleware');

const { consultarGemini } = require("./chatbot.controller");

const {
  descargarReporteCartera,
} = require("./reportes.controller");

router.post(
  "/chat",
  protect,
  authorizeRoles("ADMIN", "USER"),
  requireFeature('ai'),
  consultarGemini
);

// Descargar reporte de cartera en Excel.
// Solo administradores autenticados.
router.get(
  "/reportes/cartera",
  protect,
  authorizeRoles("ADMIN"),
  requireFeature('crm'),
  descargarReporteCartera
);

module.exports = router;
