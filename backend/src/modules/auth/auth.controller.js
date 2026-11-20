'use strict';
const User = require('../users/user.model');
const Tenant = require('../tenants/tenant.model');
const { effectiveUserStatus } = require('../users/user.status');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function sessionView(user, tenant) {
  return {
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role,
      tenantId: user.tenantId, status: effectiveUserStatus(user),
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    tenant: tenant ? { id: tenant._id, name: tenant.name, status: tenant.status,
      managementVersion: tenant.managementVersion || 0 } : null,
    subscription: tenant?.subscription || null,
  };
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' ||
        !email.trim() || email.length > 254 || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Escribe un correo y una contraseña válidos.' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
    if (effectiveUserStatus(user) !== 'ACTIVE') {
      return res.status(403).json({ code: 'USER_UNAVAILABLE', message: 'Usuario inactivo o bloqueado. Contacta al administrador.' });
    }
    let tenant = null;
    if (user.role !== 'SUPER_ADMIN') {
      tenant = user.tenantId ? await Tenant.findById(user.tenantId) : null;
      if (!tenant || tenant.status !== 'ACTIVE') {
        return res.status(403).json({ code: 'TENANT_SUSPENDED', message: 'El acceso de la empresa está suspendido.' });
      }
    }
    const token = jwt.sign({ userId: user._id.toString(), role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tokenVersion: user.tokenVersion || 0, tenantVersion: tenant?.sessionVersion || 0,
    }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
    // No guardar todo el documento: evitar reescribir un bloqueo concurrente.
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return res.json({ message: 'Inicio de sesión exitoso.', token, ...sessionView(user, tenant) });
  } catch (error) {
    console.error('Inicio de sesión:', error.message);
    return res.status(500).json({ message: 'No se pudo iniciar sesión.' });
  }
}

function me(req, res) {
  // Mi plan sigue disponible sin suscripción o con fechas vencidas.
  // Cada módulo comercial aplica requireFeature por separado.
  return res.json({ message: 'Usuario autenticado.', ...sessionView(req.user, req.tenant) });
}
module.exports = { login, me, sessionView };
