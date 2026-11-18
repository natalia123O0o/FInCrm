
const express = require("express");
const multer = require("multer");

const router = express.Router();

// Controladores existentes.
const {
  createDebt,
  getDebts,
} = require("./debt.controller");

// Controlador de vista previa CSV.
const {
  previsualizarDeudasCsv,
  confirmarImportacionDeudas,
} = require("./import/importarDeudas.controller");

// Middlewares de seguridad.
const protect = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Configurar recepción de archivos CSV.
const uploadCsv = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 1024 * 1024, // Máximo 1 MB.
    files: 1,
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

// Controlar errores de Multer.
const recibirCsv = (req, res, next) => {
  uploadCsv.single("archivo")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "El archivo CSV no puede superar 1 MB"
            : error.message,
      });
    }

    next();
  });
};

// POST /api/debts
// Registrar una deuda manualmente.
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  createDebt
);

// GET /api/debts
// Consultar deudas de la empresa.
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  getDebts
);

// POST /api/debts/import/preview
// Validar un archivo CSV sin guardar las deudas.
router.post(
  "/import/preview",
  protect,
  authorizeRoles("ADMIN"),
  recibirCsv,
  previsualizarDeudasCsv
);

// POST /api/debts/import/confirm
// Guardar deudas después de una nueva validación.
router.post(
  "/import/confirm",
  protect,
  authorizeRoles("ADMIN"),
  recibirCsv,
  confirmarImportacionDeudas
);

module.exports = router;
