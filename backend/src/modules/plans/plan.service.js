'use strict';
const mongoose = require('mongoose');
const Plan = require('./plan.model');
const Tenant = require('../tenants/tenant.model');
const User = require('../users/user.model');
const { activeUserFilter } = require('../users/user.status');
const { recordAudit } = require('../audit/audit.service');
const AuditEvent = require('../audit/audit.model');
const { PlanError } = require('./plan.errors');
const v = require('./plan.validation');
const { assertCurrentActor } = require('../users/user.authorization');

function requireSuperAdmin(actor) {
  if (actor?.role !== 'SUPER_ADMIN') throw new PlanError(403, 'FORBIDDEN', 'Solo SUPER_ADMIN administra planes y empresas.');
}
function plain(value) { return typeof value?.toObject === 'function' ? value.toObject() : value; }
function resolveEntitlements(tenant) {
  const subscription = plain(tenant?.subscription);
  if (!subscription?.planId) throw new PlanError(403, 'PLAN_REQUIRED', 'El SUPER_ADMIN debe asignar un plan a esta empresa.');
  return {
    planId: subscription.planId, planCode: subscription.planCode, planName: subscription.planName,
    planVersion: subscription.planVersion, monthlyPriceCOP: subscription.monthlyPriceCOP,
    modules: [...(subscription.modules || [])], limits: { ...plain(subscription.limits) },
    startsAt: subscription.startsAt, endsAt: subscription.endsAt || null,
    assignedAt: subscription.assignedAt, assignedBy: subscription.assignedBy,
  };
}
function assertSubscriptionActive(tenant, now = new Date()) {
  if (!tenant || tenant.status !== 'ACTIVE') throw new PlanError(403, 'TENANT_SUSPENDED', 'La empresa está suspendida. Comunícate con el SUPER_ADMIN.');
  const entitlements = resolveEntitlements(tenant);
  if (new Date(entitlements.startsAt).getTime() > now.getTime()) throw new PlanError(403, 'SUBSCRIPTION_NOT_STARTED', 'La suscripción todavía no ha comenzado.');
  if (entitlements.endsAt && new Date(entitlements.endsAt).getTime() <= now.getTime()) throw new PlanError(403, 'SUBSCRIPTION_EXPIRED', 'La suscripción venció. Comunícate con el SUPER_ADMIN.');
  return entitlements;
}
function subscriptionState(tenant, now = new Date()) {
  if (tenant.status !== 'ACTIVE') return 'SUSPENDED';
  if (!tenant.subscription?.planId) return 'NONE';
  if (new Date(tenant.subscription.startsAt) > now) return 'SCHEDULED';
  if (tenant.subscription.endsAt && new Date(tenant.subscription.endsAt) <= now) return 'EXPIRED';
  return 'ACTIVE';
}
async function countActiveUsers(tenantId, session = null) {
  return User.countDocuments(activeUserFilter(tenantId)).session(session);
}
async function lockTenant(tenantId, session) {
  v.objectId(tenantId, 'Empresa');
  const tenant = await Tenant.findOneAndUpdate({ _id: tenantId }, { $inc: { managementLock: 1 } }, { returnDocument: 'after', session });
  if (!tenant) throw new PlanError(404, 'TENANT_NOT_FOUND', 'Empresa no encontrada.');
  return tenant;
}
async function withTenantTransaction(tenantId, work) {
  return mongoose.connection.transaction(async (session) => {
    const tenant = await lockTenant(tenantId, session);
    return work(tenant, session);
  });
}
function assertCurrentVersion(actual, expected) {
  v.expectedVersion(expected);
  if ((actual || 0) !== expected) throw new PlanError(409, 'VERSION_CONFLICT', 'Otra persona modificó este registro. Recarga los datos antes de guardar.');
}
async function createPlan(actor, body) {
  requireSuperAdmin(actor);
  const data = v.planInput(body);
  const reason = v.reason(body.reason);
  return mongoose.connection.transaction(async (session) => {
    requireSuperAdmin(await assertCurrentActor(actor, session));
    const [plan] = await Plan.create([data], { session });
    await recordAudit({ actor, action: 'PLAN_CREATED', targetType: 'PLAN', targetId: plan._id, after: plan.toObject(), reason }, session);
    return plan;
  });
}
async function updatePlan(actor, planId, body) {
  requireSuperAdmin(actor);
  v.objectId(planId, 'Plan');
  v.objectBody(body);
  const reason = v.reason(body.reason);
  v.expectedVersion(body.expectedVersion);
  return mongoose.connection.transaction(async (session) => {
    requireSuperAdmin(await assertCurrentActor(actor, session));
    const plan = await Plan.findById(planId).session(session);
    if (!plan) throw new PlanError(404, 'PLAN_NOT_FOUND', 'Plan no encontrado.');
    assertCurrentVersion(plan.version, body.expectedVersion);
    const before = plan.toObject();
    const data = v.planInput(body, before);
    for (const key of ['name', 'description', 'monthlyPriceCOP', 'modules', 'limits', 'isActive']) plan[key] = data[key];
    plan.version += 1;
    await plan.save({ session });
    await recordAudit({ actor, action: 'PLAN_UPDATED', targetType: 'PLAN', targetId: plan._id, before, after: plan.toObject(), reason }, session);
    return plan;
  });
}
async function getTenantView(tenantId) {
  v.objectId(tenantId, 'Empresa');
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw new PlanError(404, 'TENANT_NOT_FOUND', 'Empresa no encontrada.');
  tenant.managementVersion ??= 0;
  tenant.subscription ??= null;
  tenant.subscriptionState = subscriptionState(tenant);
  return { tenant, subscription: tenant.subscription, activeUsers: await countActiveUsers(tenantId) };
}
async function assignSubscription(actor, tenantId, body) {
  requireSuperAdmin(actor);
  v.allowedKeys(body, ['planId', 'modules', 'limits', 'startsAt', 'endsAt', 'reason', 'expectedVersion']);
  v.objectId(body.planId, 'Plan');
  const reason = v.reason(body.reason);
  v.expectedVersion(body.expectedVersion);
  await withTenantTransaction(tenantId, async (tenant, session) => {
    requireSuperAdmin(await assertCurrentActor(actor, session));
    assertCurrentVersion(tenant.managementVersion, body.expectedVersion);
    const plan = await Plan.findById(body.planId).session(session);
    if (!plan || !plan.isActive) throw new PlanError(400, 'PLAN_UNAVAILABLE', 'Selecciona un plan activo.');
    const modules = v.modules(body.modules === undefined ? [...plan.modules] : body.modules);
    const limits = v.limits(body.limits === undefined ? plain(plan.limits) : body.limits, plain(plan.limits));
    const startsAt = body.startsAt === undefined ? new Date() : v.date(body.startsAt, 'Inicio');
    const endsAt = body.endsAt === undefined ? null : v.date(body.endsAt, 'Vencimiento', true);
    if (endsAt && endsAt <= startsAt) throw new PlanError(400, 'INVALID_PERIOD', 'El vencimiento debe ser posterior al inicio.');
    const activeUsers = await countActiveUsers(tenant._id, session);
    if (activeUsers > limits.maxActiveUsers) throw new PlanError(409, 'ACTIVE_USERS_EXCEED_PLAN', `Hay ${activeUsers} usuarios activos y el plan permite ${limits.maxActiveUsers}. Inactiva las cuentas necesarias antes de cambiar el plan.`);
    const before = plain(tenant.subscription) || null;
    tenant.subscription = {
      planId: plan._id, planCode: plan.code, planName: plan.name, planVersion: plan.version,
      monthlyPriceCOP: plan.monthlyPriceCOP, modules, limits, startsAt, endsAt,
      assignedAt: new Date(), assignedBy: actor._id,
    };
    tenant.managementVersion = (tenant.managementVersion || 0) + 1;
    await tenant.save({ session });
    await recordAudit({ actor, tenantId: tenant._id, action: 'SUBSCRIPTION_ASSIGNED', targetType: 'TENANT', targetId: tenant._id, before, after: plain(tenant.subscription), reason }, session);
  });
  return getTenantView(tenantId);
}
async function changeTenantStatus(actor, tenantId, body) {
  requireSuperAdmin(actor);
  v.allowedKeys(body, ['status', 'reason', 'expectedVersion']);
  if (!['ACTIVE', 'SUSPENDED'].includes(body.status)) throw new PlanError(400, 'INVALID_STATUS', 'Estado de empresa inválido.');
  const reason = v.reason(body.reason);
  v.expectedVersion(body.expectedVersion);
  await withTenantTransaction(tenantId, async (tenant, session) => {
    requireSuperAdmin(await assertCurrentActor(actor, session));
    assertCurrentVersion(tenant.managementVersion, body.expectedVersion);
    if (tenant.status === body.status) return;
    const before = { status: tenant.status, sessionVersion: tenant.sessionVersion || 0 };
    tenant.status = body.status;
    tenant.sessionVersion = (tenant.sessionVersion || 0) + 1;
    tenant.managementVersion = (tenant.managementVersion || 0) + 1;
    await tenant.save({ session });
    await recordAudit({ actor, tenantId: tenant._id, action: 'TENANT_STATUS_CHANGED', targetType: 'TENANT', targetId: tenant._id, before,
      after: { status: tenant.status, sessionVersion: tenant.sessionVersion }, reason }, session);
  });
  return getTenantView(tenantId);
}
async function listTenantAudit(tenantId, query = {}) {
  v.objectId(tenantId, 'Empresa');
  if (!(await Tenant.exists({ _id: tenantId }))) throw new PlanError(404, 'TENANT_NOT_FOUND', 'Empresa no encontrada.');
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 30);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new PlanError(400, 'INVALID_PAGINATION', 'Paginación inválida.');
  const events = await AuditEvent.find({ tenantId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
  const total = await AuditEvent.countDocuments({ tenantId });
  return { events, total, page, pageSize };
}

module.exports = { resolveEntitlements, assertSubscriptionActive, subscriptionState, countActiveUsers,
  lockTenant, withTenantTransaction, assertCurrentVersion, createPlan, updatePlan, getTenantView,
  assignSubscription, changeTenantStatus, listTenantAudit };
