'use strict';
const mongoose = require('mongoose');
const Plan = require('../modules/plans/plan.model');
const AuditEvent = require('../modules/audit/audit.model');
const { DEFAULT_PLANS } = require('../modules/plans/plan.catalog');
const { recordAudit } = require('../modules/audit/audit.service');

async function seedDefaultPlans({ apply = false } = {}) {
  const result = { mode: apply ? 'apply' : 'dry-run', created: [], existing: [] };
  if (apply) {
    await Plan.init();
    await AuditEvent.init();
  }
  for (const definition of DEFAULT_PLANS) {
    if (await Plan.exists({ code: definition.code })) { result.existing.push(definition.code); continue; }
    if (apply) {
      await mongoose.connection.transaction(async (session) => {
        if (await Plan.exists({ code: definition.code }).session(session)) return;
        const [plan] = await Plan.create([definition], { session });
        await recordAudit({ actor: null, action: 'PLAN_SEEDED', targetType: 'PLAN', targetId: plan._id,
          after: plan.toObject(), reason: 'Configuración inicial de planes; cupos editables por SUPER_ADMIN' }, session);
      });
    }
    result.created.push(definition.code);
  }
  return result;
}

async function main() {
  require('dotenv').config();
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI. Usa primero una copia de desarrollo de tu base de datos.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const result = await seedDefaultPlans({ apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(result, null, 2));
    if (result.mode === 'dry-run') console.log('Simulación: no se guardaron cambios. Agrega --apply para crear únicamente los planes que faltan.');
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedDefaultPlans };
