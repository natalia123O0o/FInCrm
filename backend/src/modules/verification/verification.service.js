const crypto = require('node:crypto');
const VerificationCode = require('./code.model');

const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function isEmail(email) {
  return email.length <= 254 && EMAIL_RE.test(email);
}

function hashCode(code, id) {
  if (!process.env.VERIFICATION_SECRET || process.env.VERIFICATION_SECRET.length < 32) {
    throw new Error('Configura VERIFICATION_SECRET (mínimo 32 caracteres)');
  }
  return crypto.createHmac('sha256', process.env.VERIFICATION_SECRET)
    .update(`${id}:${code}`).digest('hex');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function deliverCode({ email, code, purpose }) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!process.env.BREVO_API_KEY || !isEmail(normalizeEmail(senderEmail))) {
    throw new Error('Configura BREVO_API_KEY y BREVO_SENDER_EMAIL verificado');
  }
  const subjects = {
    VERIFY_USER: 'Verifica tu correo en FinCRM',
    VERIFY_CLIENT: 'Confirma tu correo electrónico',
    RESET_PASSWORD: 'Código para recuperar tu contraseña de FinCRM',
  };
  const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
    <h2>FinCRM</h2><p>Tu código de verificación es:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escapeHtml(code)}</p>
    <p>Vence en 10 minutos. Si no solicitaste este código, ignora el correo.</p>
    <p>No compartas este código con nadie.</p></div>`;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'FinCRM', email: senderEmail },
      to: [{ email }], subject: subjects[purpose], htmlContent,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Brevo rechazó la solicitud (${response.status})`);
}

async function issueCode({ purpose, targetType, targetId, email }) {
  const now = new Date();
  const cleanEmail = normalizeEmail(email);
  if (!isEmail(cleanEmail)) throw new Error('Correo inválido');
  const filter = { purpose, targetType, targetId };
  const existing = await VerificationCode.findOne(filter);
  if (existing && existing.sentAt.getTime() + COOLDOWN_MS > now.getTime()) {
    return { issued: false, cooldown: true };
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const id = crypto.randomUUID();
  const codeHash = hashCode(code, id);
  // Se usa id aleatorio en el hash; no se almacena el código, ni se escribe en logs.
  const record = await VerificationCode.findOneAndUpdate(filter, {
    $set: { email: cleanEmail, codeHash: `${id}:${codeHash}`, attempts: 0,
      sentAt: now, expiresAt: new Date(now.getTime() + TTL_MS) },
  }, { upsert: true, new: true, runValidators: true });
  try {
    await deliverCode({ email: cleanEmail, code, purpose });
  } catch (error) {
    await VerificationCode.deleteOne({ _id: record._id, codeHash: `${id}:${codeHash}` });
    throw error;
  }
  return { issued: true, cooldown: false };
}

async function consumeCode({ purpose, targetType, targetId, email, code }) {
  const cleanEmail = normalizeEmail(email);
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const challenge = await VerificationCode.findOneAndUpdate({
    purpose, targetType, targetId, email: cleanEmail,
    expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS },
  }, { $inc: { attempts: 1 } }, { new: true });
  if (!challenge) return false;
  const [salt, digest] = challenge.codeHash.split(':');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const received = Buffer.from(hashCode(String(code), salt), 'hex');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return false;
  const consumed = await VerificationCode.findOneAndDelete({ _id: challenge._id, codeHash: challenge.codeHash });
  return Boolean(consumed);
}

module.exports = { normalizeEmail, isEmail, issueCode, consumeCode };
