const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const Client = require('../clients/client.model');
const Tenant = require('../tenants/tenant.model');
const { normalizeEmail, isEmail, issueCode, consumeCode } = require('./verification.service');

function fail(res, error) {
  console.error('Verificación:', error.message);
  return res.status(503).json({ message: 'No se pudo completar el proceso. Intenta más tarde.' });
}
const genericResetResponse = { message: 'Si existe una cuenta activa con ese correo, enviaremos un código.' };

async function sendOwnVerification(req, res) {
  try {
    if (req.user.emailVerifiedAt) return res.status(200).json({ message: 'Tu correo ya está verificado.' });
    const result = await issueCode({ purpose: 'VERIFY_USER', targetType: 'USER', targetId: req.user._id, email: req.user.email });
    if (result.cooldown) return res.status(429).json({ message: 'Espera un minuto antes de pedir otro código.' });
    return res.json({ message: 'Se envió un código a tu correo.' });
  } catch (error) { return fail(res, error); }
}

async function verifyOwnEmail(req, res) {
  try {
    const ok = await consumeCode({ purpose: 'VERIFY_USER', targetType: 'USER', targetId: req.user._id,
      email: req.user.email, code: req.body?.code });
    if (!ok) return res.status(400).json({ message: 'Código inválido, vencido o agotado.' });
    await User.updateOne({ _id: req.user._id, email: req.user.email }, { $set: { emailVerifiedAt: new Date() } });
    return res.json({ message: 'Correo verificado correctamente.' });
  } catch (error) { return fail(res, error); }
}

async function sendClientVerification(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.clientId)) return res.status(400).json({ message: 'Cliente inválido.' });
    const client = await Client.findOne({ _id: req.params.clientId, tenantId: req.user.tenantId, isActive: true });
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado en tu empresa.' });
    if (client.emailVerifiedAt) return res.json({ message: 'El correo del cliente ya está verificado.' });
    const result = await issueCode({ purpose: 'VERIFY_CLIENT', targetType: 'CLIENT', targetId: client._id, email: client.email });
    if (result.cooldown) return res.status(429).json({ message: 'Espera un minuto antes de pedir otro código.' });
    return res.json({ message: 'Se envió el código al correo del cliente. Solicítale que lo introduzca en la página de confirmación.' });
  } catch (error) { return fail(res, error); }
}

// El cliente no inicia sesión, solo confirma un código enviado al correo.
async function confirmClientEmail(req, res) {
  try {
    const { clientId, email, code } = req.body || {};
    if (!mongoose.isValidObjectId(clientId) || !isEmail(normalizeEmail(email))) return res.status(400).json({ message: 'Datos inválidos.' });
    const client = await Client.findOne({ _id: clientId, email: normalizeEmail(email), isActive: true });
    if (!client) return res.status(400).json({ message: 'Código inválido, vencido o agotado.' });
    const ok = await consumeCode({ purpose: 'VERIFY_CLIENT', targetType: 'CLIENT', targetId: client._id,
      email: client.email, code });
    if (!ok) return res.status(400).json({ message: 'Código inválido, vencido o agotado.' });
    await Client.updateOne({ _id: client._id, email: client.email }, { $set: { emailVerifiedAt: new Date() } });
    return res.json({ message: 'Correo verificado. Esto no implica consentimiento para recibir publicidad.' });
  } catch (error) { return fail(res, error); }
}

async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isEmail(email)) return res.status(400).json({ message: 'Escribe un correo válido.' });
    const user = await User.findOne({ email, isActive: true });
    if (!user) return res.json(genericResetResponse);
    if (user.role !== 'SUPER_ADMIN') {
      const tenant = await Tenant.findById(user.tenantId).select('status').lean();
      if (!tenant || tenant.status !== 'ACTIVE') return res.json(genericResetResponse);
    }
    await issueCode({ purpose: 'RESET_PASSWORD', targetType: 'USER', targetId: user._id, email });
    return res.json(genericResetResponse);
  } catch (error) {
    // La respuesta no debe revelar si existe o no una cuenta.
    console.error('Recuperación de contraseña:', error.message);
    return res.json(genericResetResponse);
  }
}

async function resetPassword(req, res) {
  try {
    const { code, newPassword } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    if (!isEmail(email) || !/^\d{6}$/.test(String(code || '')) ||
        typeof newPassword !== 'string' || newPassword.length < 10 ||
        Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ message: 'Datos incorrectos. La contraseña debe tener entre 10 y 72 bytes.' });
    }
    const user = await User.findOne({ email, isActive: true });
    if (!user) return res.status(400).json({ message: 'Código inválido, vencido o agotado.' });
    const ok = await consumeCode({ purpose: 'RESET_PASSWORD', targetType: 'USER', targetId: user._id, email, code });
    if (!ok) return res.status(400).json({ message: 'Código inválido, vencido o agotado.' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: user._id, email }, { $set: { passwordHash }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Contraseña actualizada. Inicia sesión nuevamente.' });
  } catch (error) { return fail(res, error); }
}

module.exports = { sendOwnVerification, verifyOwnEmail, sendClientVerification,
  confirmClientEmail, forgotPassword, resetPassword };
