'use strict';
const mongoose = require('mongoose');
const Tenant = require('../tenants/tenant.model');
const User = require('../users/user.model');
const { effectiveUserStatus } = require('../users/user.status');
const Usage = require('./usage.model');
const { assertFeature, accessError } = require('../../middlewares/feature.middleware');

const RESOURCES = Object.freeze({
  aiRequests: { limit: 'aiRequestsPerMonth', feature: 'ai', label: 'consultas de IA' },
  quotes: { limit: 'quotesPerMonth', feature: 'quotes', label: 'cotizaciones' },
  campaigns: { limit: 'campaignsPerMonth', feature: 'campaigns', label: 'campañas' },
  emails: { limit: 'emailsPerMonth', feature: 'messaging', label: 'intentos de correo' },
});

function currentPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}

async function readUsage(tenantId, now = new Date()) {
  const period = currentPeriod(now);
  const doc = await Usage.findOne({ tenantId, period }).lean();
  return { period, timezone: 'America/Bogota',
    aiRequests: doc?.aiRequests || 0, quotes: doc?.quotes || 0,
    campaigns: doc?.campaigns || 0, emails: doc?.emails || 0 };
}

async function reserveInSession({ tenantId, resource, actorId, tokenVersion, tenantVersion, now = new Date(), feature }, session) {
  const config = RESOURCES[resource];
  if (!config) throw new Error('Recurso de suscripción desconocido.');
  // Cupos y cambios de plan escriben esta misma fila: así se serializa el
  // consumo concurrente del último cupo con el cambio de límites.
  const tenant = await Tenant.findOneAndUpdate({ _id: tenantId },
    { $inc: { managementLock: 1 } }, { new: true, session });
  const subscription = assertFeature(tenant, feature || config.feature, now);
  if (tenantVersion !== undefined && (tenant.sessionVersion || 0) !== tenantVersion) {
    throw accessError('SESSION_REVOKED', 'La sesión de tu empresa terminó. Inicia sesión nuevamente.', 401);
  }
  if (feature && feature !== config.feature) assertFeature(tenant, config.feature, now);
  if (actorId) {
    const actor = await User.findOne({ _id: actorId, tenantId }).session(session);
    if (!actor || !['ADMIN', 'USER'].includes(actor.role) || effectiveUserStatus(actor) !== 'ACTIVE' ||
        (tokenVersion !== undefined && (actor.tokenVersion || 0) !== tokenVersion)) {
      throw accessError('USER_UNAVAILABLE', 'La cuenta ya no tiene acceso. Inicia sesión nuevamente.', 401);
    }
  }
  const limit = subscription.limits[config.limit];
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw accessError('INVALID_PLAN_LIMIT', 'El plan no tiene un límite válido. Contacta al SUPER_ADMIN.');
  }
  const period = currentPeriod(now);
  const current = await Usage.findOne({ tenantId, period }).session(session);
  if ((current?.[resource] || 0) >= limit) {
    throw accessError('PLAN_QUOTA_EXCEEDED', `Se alcanzó el límite mensual de ${config.label} (${limit}).`, 429);
  }
  await Usage.findOneAndUpdate({ tenantId, period }, { $inc: { [resource]: 1 } },
    { upsert: true, new: true, session, setDefaultsOnInsert: true });
  return { tenant, subscription, period };
}

// La nueva entidad en MongoDB y su cuota se confirman o revierten juntas.
async function withQuota(options, operation) {
  let result;
  await mongoose.connection.transaction(async session => {
    const access = await reserveInSession(options, session);
    result = await operation(session, access);
  });
  return result;
}

// Se cuenta el intento autorizado al proveedor, incluso si falla/vence la
// espera: un timeout no prueba que el proveedor no haya ejecutado el envío.
async function consumeQuota(options) {
  return withQuota(options, async (_session, access) => access);
}

function requestQuota(req, resource, feature) {
  return { tenantId: req.user.tenantId, actorId: req.user._id,
    tokenVersion: req.user.tokenVersion || 0, tenantVersion: req.user.$locals?.authTenantVersion,
    resource, feature };
}

module.exports = { currentPeriod, readUsage, withQuota, consumeQuota, requestQuota, RESOURCES };
