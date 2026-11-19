
const express = require("express");
const router = express.Router();
const multer = require("multer");

// Controladores actuales de pagos.
const {
  createPayment,
  getPayments,
} = require("./payment.controller");

// Controlador para revisar el CSV de abonos.
const {
  previsualizarAbonosCsv,
  confirmarImportacionAbonos,
} = require("./import/importarAbonos.controller");

// Middlewares de seguridad.
const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Configuración para recibir archivos CSV.
const uploadAbonos = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 1024 * 1024, // Máximo 1 MB.
  },

  fileFilter: (req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      return callback(
        new Error("Solo se permiten archivos CSV")
      );
    }

    callback(null, true);
  },
});

// ============================================
// IMPORTACIÓN CSV DE ABONOS - VISTA PREVIA
// ============================================

// POST /api/payments/import/preview
router.post(
  "/import/preview",
  protect,
  authorizeRoles("ADMIN"),

  // Recibir y validar el archivo.
  (req, res, next) => {
    uploadAbonos.single("file")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      next();
    });
  },

  previsualizarAbonosCsv
);


router.post(
  "/import/confirm",
  protect,
  authorizeRoles("ADMIN"),
  (req, res, next) => {
    uploadAbonos.single("file")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      next();
    });
  },
  confirmarImportacionAbonos
);


// ============================================
// RUTAS ACTUALES DE PAGOS
// ============================================

// POST /api/payments
// Registrar un pago individual.
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  createPayment
);

// GET /api/payments
// Consultar pagos registrados.
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  getPayments
);

module.exports = router;
