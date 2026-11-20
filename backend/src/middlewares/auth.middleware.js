'use strict';
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const Tenant = require('../modules/tenants/tenant.model');
const { effectiveUserStatus } = require('../modules/users/user.status');

// El JWT identifica la sesión; los permisos y estados se leen en el servidor
// en cada petición para aplicar bloqueos sin esperar a que venza el token.
async function protect(req, res, next) {
  if (req.authVerified === true) return next();
  try {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ code: 'TOKEN_REQUIRED', message: 'Inicia sesión para continuar.' });
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!mongoose.isObjectIdOrHexString(decoded.userId)) {
      return res.status(401).json({ code: 'TOKEN_INVALID', message: 'Sesión inválida.' });
    }
    const user = await User.findById(decoded.userId);
    if (!user || effectiveUserStatus(user) !== 'ACTIVE') {
      return res.status(401).json({ code: 'USER_UNAVAILABLE', message: 'Tu usuario está inactivo o bloqueado. Contacta al administrador.' });
    }
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ code: 'SESSION_REVOKED', message: 'Tu sesión terminó. Inicia sesión nuevamente.' });
    }
    let tenant = null;
    if (user.role !== 'SUPER_ADMIN') {
      tenant = user.tenantId ? await Tenant.findById(user.tenantId) : null;
      if (!tenant || tenant.status !== 'ACTIVE') {
        return res.status(403).json({ code: 'TENANT_SUSPENDED', message: 'El acceso de la empresa está suspendido. Contacta al SUPER_ADMIN.' });
      }
      if ((decoded.tenantVersion ?? 0) !== (tenant.sessionVersion || 0)) {
        return res.status(401).json({ code: 'SESSION_REVOKED', message: 'La sesión de tu empresa terminó. Inicia sesión nuevamente.' });
      }
      user.$locals.authTenantVersion = decoded.tenantVersion ?? 0;
    }
    req.user = user;
    req.tenant = tenant;
    req.authVerified = true;
    return next();
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return res.status(401).json({ code: 'TOKEN_INVALID', message: 'Token inválido o vencido.' });
    }
    console.error('Autenticación:', error.message);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'No se pudo comprobar la sesión.' });
  }
}
module.exports = protect;
