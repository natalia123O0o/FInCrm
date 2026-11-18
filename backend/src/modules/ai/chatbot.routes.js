
const express = require("express");
const router = express.Router();

const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

const { consultarGemini } = require("./chatbot.controller");

const {
  descargarReporteCartera,
} = require("./reportes.controller");

router.post(
  "/chat",
  protect,
  authorizeRoles("ADMIN", "USER"),
  consultarGemini
);

// Descargar reporte de cartera en Excel.
// Solo administradores autenticados.
router.get(
  "/reportes/cartera",
  protect,
  authorizeRoles("ADMIN"),
  descargarReporteCartera
);

module.exports = router;
