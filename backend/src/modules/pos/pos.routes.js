const router = require('express').Router();
const multer = require('multer');
const protect = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const c = require('./pos.controller');
const csv = require('./pos.import');

const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.originalname.toLowerCase().endsWith('.csv')) });
// Error de subida -> respuesta JSON, sin exponer rutas internas.
function csvFile(req, res, next) {
  uploadCsv.single('file')(req, res, err => {
    if (err) return res.status(400).json({ message: 'CSV inválido o demasiado grande (máx. 1 MB).' });
    if (!req.file) return res.status(400).json({ message: 'Adjunta un archivo .csv en el campo file.' });
    next();
  });
}

router.use(protect);
router.get('/products', authorizeRoles('ADMIN', 'USER'), c.listProducts);
router.post('/products', authorizeRoles('ADMIN'), c.createProduct);
router.patch('/products/:id', authorizeRoles('ADMIN'), c.updateProduct);
router.post('/products/:id/stock', authorizeRoles('ADMIN'), c.adjustStock);
router.post('/products/import/preview', authorizeRoles('ADMIN'), csvFile, csv.previewProducts);
router.post('/products/import/commit', authorizeRoles('ADMIN'), csvFile, csv.commitProducts);

router.get('/sales', authorizeRoles('ADMIN', 'USER'), c.listSales);
router.post('/sales', authorizeRoles('ADMIN', 'USER'), c.createSale);
router.post('/sales/import/preview', authorizeRoles('ADMIN'), csvFile, csv.previewSales);
router.post('/sales/import/commit', authorizeRoles('ADMIN'), csvFile, csv.commitSales);
router.get('/closures', authorizeRoles('ADMIN'), c.listClosures);
router.post('/closures', authorizeRoles('ADMIN'), c.createClosure);

module.exports = router;
