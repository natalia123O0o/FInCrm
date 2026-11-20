'use strict';
const { assertSubscriptionActive, resolveEntitlements } = require('../modules/plans/plan.service');

function accessError(code, message, status = 403) {
  return Object.assign(new Error(message), { code, status });
}

function assertFeature(tenant, feature, now = new Date()) {
  assertSubscriptionActive(tenant, now);
  const subscription = resolveEntitlements(tenant);
  if (!subscription.modules.includes(feature)) {
    throw accessError('MODULE_NOT_INCLUDED', 'Tu empresa no tiene habilitado este módulo. Contacta al SUPER_ADMIN.');
  }
  return subscription;
}

function respondAccessError(res, error) {
  if (!Number.isInteger(error?.status) || error.status < 400 || error.status >= 500) return false;
  res.status(error.status).json({ code: error.code, message: error.message });
  return true;
}

function requireFeature(feature) {
  return (req, res, next) => {
    try {
      if (!req.user || req.user.role === 'SUPER_ADMIN') {
        throw accessError('BUSINESS_ROLE_REQUIRED', 'Este módulo requiere una cuenta de la empresa.');
      }
      req.entitlements = assertFeature(req.tenant, feature);
      return next();
    } catch (error) {
      if (!respondAccessError(res, error)) return next(error);
    }
  };
}

module.exports = { requireFeature, assertFeature, accessError, respondAccessError };
