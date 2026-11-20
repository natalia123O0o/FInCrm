'use strict';
const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const Tenant = require('../modules/tenants/tenant.model');
const AuditEvent = require('../modules/audit/audit.model');
const { recordAudit } = require('../modules/audit/audit.service');
const { withTenantTransaction } = require('../modules/plans/plan.service');
const { STATES } = require('../modules/users/user.status');

function targetStatus(user) {
  if (STATES.includes(user.status)) return user.status === 'ACTIVE' && user.isActive === false ? 'INACTIVE' : user.status;
  if (user.status != null) return 'INACTIVE';
  return user.isActive === true ? 'ACTIVE' : 'INACTIVE';
}
function needsMigration(user) {
  const status = targetStatus(user);
  return user.status !== status || user.isActive !== (status === 'ACTIVE');
}
async function migrateUserStatuses({ apply = false } = {}) {
  const result = { mode: apply ? 'apply' : 'dry-run', scanned: 0, changed: 0, unchanged: 0, skippedOrphans: 0,
    resultingStates: { ACTIVE: 0, INACTIVE: 0, BLOCKED: 0 } };
  const existingTenants = new Map();
  if (apply) await AuditEvent.init();
  // Colección raw: evita convertir un isActive ausente en true por defaults del modelo.
  const cursor = User.collection.find({}, { projection: { _id: 1, tenantId: 1, role: 1, status: 1, isActive: 1 } });
  for await (const snapshot of cursor) {
    result.scanned += 1;
    let orphan = snapshot.role !== 'SUPER_ADMIN' && !snapshot.tenantId;
    if (snapshot.tenantId) {
      const key = String(snapshot.tenantId);
      if (!existingTenants.has(key)) {
        const exists = mongoose.isObjectIdOrHexString(snapshot.tenantId) && Boolean(await Tenant.exists({ _id: snapshot.tenantId }));
        existingTenants.set(key, exists);
      }
      orphan = !existingTenants.get(key);
    }
    // Un vínculo roto exige revisión: no crea empresas, no activa cuentas y no
    // interrumpe la migración de las demás. Dry-run informa el mismo conteo.
    if (orphan) { result.skippedOrphans += 1; continue; }
    const status = targetStatus(snapshot);
    result.resultingStates[status] += 1;
    if (!needsMigration(snapshot)) { result.unchanged += 1; continue; }
    if (apply) {
      const migrateOne = async (session) => {
        const current = await User.collection.findOne({ _id: snapshot._id }, { session });
        if (!current || !needsMigration(current)) return;
        const next = targetStatus(current);
        const before = { status: current.status ?? null, isActive: current.isActive ?? null, tokenVersion: current.tokenVersion || 0 };
        const after = { status: next, isActive: next === 'ACTIVE', tokenVersion: (current.tokenVersion || 0) + 1 };
        // No cambia _id, referencias, createdAt ni updatedAt. Incrementa la versión de sesión.
        await User.collection.updateOne({ _id: current._id }, {
          $set: after, $inc: { __v: 1 },
        }, { session });
        await recordAudit({ actor: null, tenantId: current.tenantId || null, action: 'USER_STATUS_MIGRATED', targetType: 'USER',
          targetId: current._id, before, after, reason: 'Migración conservadora de isActive a estados; conserva identidad y fechas' }, session);
      };
      try {
        if (snapshot.tenantId) await withTenantTransaction(snapshot.tenantId, async (_tenant, session) => migrateOne(session));
        else await mongoose.connection.transaction(migrateOne);
      } catch (error) {
        if (error.code !== 'TENANT_NOT_FOUND') throw error;
        result.skippedOrphans += 1;
        result.resultingStates[status] -= 1;
        continue;
      }
    }
    result.changed += 1;
  }
  return result;
}
async function main() {
  require('dotenv').config();
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI. Revisa la simulación antes de aplicar a tu base de datos.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const result = await migrateUserStatuses({ apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(result, null, 2));
    if (result.mode === 'dry-run') console.log('Simulación: no se cambió ningún usuario. Usa --apply para aplicar la migración.');
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrateUserStatuses, targetStatus };
