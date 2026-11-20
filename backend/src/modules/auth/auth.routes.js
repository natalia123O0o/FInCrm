const express = require('express');
const router = express.Router();
const { login, me } = require('./auth.controller');
const protect = require('../../middlewares/auth.middleware');
const { sendOwnVerification, verifyOwnEmail, forgotPassword, resetPassword } =
  require('../verification/verification.controller');

router.post('/login', login);
router.post('/email/send-code', protect, sendOwnVerification);
router.post('/email/verify', protect, verifyOwnEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, me);
module.exports = router;
