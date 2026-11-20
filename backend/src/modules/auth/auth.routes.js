const express = require('express');
const router = express.Router();
const { login } = require('./auth.controller');
const protect = require('../../middlewares/auth.middleware');
const { sendOwnVerification, verifyOwnEmail, forgotPassword, resetPassword } =
  require('../verification/verification.controller');

router.post('/login', login);
router.post('/email/send-code', protect, sendOwnVerification);
router.post('/email/verify', protect, verifyOwnEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, (req, res) => res.json({
  message: 'Usuario autenticado',
  user: { id: req.user._id, name: req.user.name, email: req.user.email,
    role: req.user.role, tenantId: req.user.tenantId,
    emailVerified: Boolean(req.user.emailVerifiedAt) },
}));
module.exports = router;
