const express = require('express');
const router = express.Router();

const multer = require("multer");

const {
  previsualizarClientesCsv,
  confirmarImportacionClientes,
} = require("./import/importarClientes.controller");

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


// Recibir el CSV en memoria sin guardarlo en disco.
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

// POST /api/clients/import/preview
// Validar un archivo CSV sin guardar clientes.
router.post(
  "/import/preview",
  protect,
  authorizeRoles("ADMIN"),
  uploadCsv.single("archivo"),
  previsualizarClientesCsv
);

// POST /api/clients/import/confirm
// Confirmar y guardar clientes desde CSV.
router.post(
  "/import/confirm",
  protect,
  authorizeRoles("ADMIN"),
  recibirCsv,
  confirmarImportacionClientes
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
