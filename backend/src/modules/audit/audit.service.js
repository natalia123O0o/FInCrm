'use strict';
const AuditEvent = require('./audit.model');
async function recordAudit({ actor, tenantId = null, action, targetType, targetId, before = null, after = null, reason }, session) {
  if (!session?.inTransaction()) throw new Error('La auditoría requiere la misma transacción que el cambio.');
  const [event] = await AuditEvent.create([{
    actorId: actor?._id || null,
    actorName: actor?.name || 'Migración del sistema',
    actorRole: actor?.role || 'SYSTEM',
    tenantId, action, targetType, targetId, before, after, reason,
  }], { session });
  return event;
}
module.exports = { recordAudit };
