'use strict';
const User = require('./user.model');
const { effectiveUserStatus } = require('./user.status');
const { PlanError } = require('../plans/plan.errors');

// Se consulta otra vez DESPUÉS de adquirir el lock de empresa. La autenticación
// inicial puede haber ocurrido antes de una espera o del cálculo de bcrypt.
async function assertCurrentActor(actor, session) {
  if (!actor?._id) throw new PlanError(401, 'SESSION_REVOKED', 'Inicia sesión nuevamente.');
  const current = await User.findById(actor._id).session(session);
  if (!current || effectiveUserStatus(current) !== 'ACTIVE' ||
      current.role !== actor.role || String(current.tenantId || '') !== String(actor.tenantId || '') ||
      (current.tokenVersion || 0) !== (actor.tokenVersion || 0)) {
    throw new PlanError(401, 'SESSION_REVOKED', 'La sesión cambió o fue revocada. Inicia sesión nuevamente.');
  }
  return current;
}
module.exports = { assertCurrentActor };
