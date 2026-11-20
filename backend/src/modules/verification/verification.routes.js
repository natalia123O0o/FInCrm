const express = require('express');
const protect = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { sendClientVerification, confirmClientEmail } = require('./verification.controller');
const router = express.Router();
router.post('/clients/:clientId/send', protect, authorizeRoles('ADMIN'), sendClientVerification);
router.post('/clients/confirm', confirmClientEmail);
module.exports = router;
