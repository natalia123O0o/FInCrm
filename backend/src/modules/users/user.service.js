'use strict';
const bcrypt = require('bcryptjs');
const User = require('./user.model');
const { STATES, effectiveUserStatus, activeUserFilter, publicUser } = require('./user.status');
const { withTenantTransaction, assertSubscriptionActive, countActiveUsers, assertCurrentVersion } = require('../plans/plan.service');
const { PlanError } = require('../plans/plan.errors');
const v = require('../plans/plan.validation');
const { recordAudit } = require('../audit/audit.service');
const { assertCurrentActor } = require('./user.authorization');

function assertManager(actor, tenantId, targetRole) {
  if (actor?.role === 'SUPER_ADMIN' && ['ADMIN', 'USER'].includes(targetRole)) return;
  if (actor?.role === 'ADMIN' && targetRole === 'USER' && String(actor.tenantId) === String(tenantId)) return;
  throw new PlanError(403, 'FORBIDDEN', 'No tienes permiso para administrar esta cuenta.');
}
async function assertCurrentManager(actor, tenant, targetRole, session) {
  const current = await assertCurrentActor(actor, session);
  assertManager(current, tenant._id, targetRole);
  if (current.role === 'ADMIN' && tenant.status !== 'ACTIVE') {
    throw new PlanError(403, 'TENANT_SUSPENDED', 'La empresa está suspendida.');
  }
  if (current.role === 'ADMIN' && actor.$locals?.authTenantVersion !== undefined &&
      actor.$locals.authTenantVersion !== (tenant.sessionVersion || 0)) {
    throw new PlanError(401, 'SESSION_REVOKED', 'La sesión de tu empresa terminó. Inicia sesión nuevamente.');
  }
  return current;
}
function credentials(body) {
  v.allowedKeys(body, ['name', 'email', 'password', 'reason']);
  const name = v.text(body.name, 'Nombre', 2, 150);
  if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    throw new PlanError(400, 'INVALID_EMAIL', 'Escribe un correo válido.');
  }
  if (typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72) {
    throw new PlanError(400, 'INVALID_PASSWORD', 'La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes.');
  }
  return { name, email: body.email.trim().toLowerCase(), password: body.password };
}
async function createManagedUser(actor, tenantId, role, body) {
  v.objectId(tenantId, 'Empresa');
  assertManager(actor, tenantId, role);
  const data = credentials(body);
  const reason = body.reason === undefined ? 'Registro de cuenta de la empresa' : v.reason(body.reason);
  const passwordHash = await bcrypt.hash(data.password, 12);
  return withTenantTransaction(tenantId, async (tenant, session) => {
    await assertCurrentManager(actor, tenant, role, session);
    const subscription = assertSubscriptionActive(tenant);
    if (await countActiveUsers(tenant._id, session) >= subscription.limits.maxActiveUsers) {
      throw new PlanError(409, 'USER_LIMIT_REACHED', 'Se alcanzó el cupo de usuarios activos del plan. El ADMIN también ocupa un cupo.');
    }
    if (await User.exists({ email: data.email }).session(session)) throw new PlanError(409, 'EMAIL_IN_USE', 'El correo ya está registrado.');
    const [user] = await User.create([{
      name: data.name, email: data.email, passwordHash, role, tenantId: tenant._id,
      status: 'ACTIVE', isActive: true,
    }], { session });
    const after = publicUser(user);
    await recordAudit({ actor, tenantId: tenant._id, action: 'USER_CREATED', targetType: 'USER', targetId: user._id, after, reason }, session);
    return after;
  });
}
async function changeUserStatus(actor, tenantId, userId, body) {
  v.objectId(tenantId, 'Empresa');
  v.objectId(userId, 'Usuario');
  v.allowedKeys(body, ['status', 'reason', 'expectedVersion']);
  if (!STATES.includes(body.status)) throw new PlanError(400, 'INVALID_STATUS', 'Selecciona ACTIVE, INACTIVE o BLOCKED.');
  const reason = v.reason(body.reason);
  v.expectedVersion(body.expectedVersion);
  if (String(userId) === String(actor?._id)) throw new PlanError(403, 'SELF_STATUS_CHANGE_FORBIDDEN', 'No puedes cambiar tu propio estado.');
  if (actor?.role !== 'SUPER_ADMIN' && (actor?.role !== 'ADMIN' || String(actor.tenantId) !== String(tenantId))) {
    throw new PlanError(403, 'FORBIDDEN', 'No tienes permiso para administrar esta empresa.');
  }
  return withTenantTransaction(tenantId, async (tenant, session) => {
    await assertCurrentManager(actor, tenant, actor.role === 'ADMIN' ? 'USER' : 'ADMIN', session);
    const filter = { _id: userId, tenantId: tenant._id, role: { $in: actor.role === 'ADMIN' ? ['USER'] : ['ADMIN', 'USER'] } };
    const user = await User.findOne(filter).session(session);
    // No revela cuentas de otras empresas ni de roles superiores.
    if (!user) throw new PlanError(404, 'USER_NOT_FOUND', 'Usuario no encontrado en esta empresa.');
    assertManager(actor, tenant._id, user.role);
    assertCurrentVersion(user.__v, body.expectedVersion);
    const previousStatus = effectiveUserStatus(user);
    if (previousStatus === body.status) return publicUser(user);
    if (body.status === 'ACTIVE') {
      const subscription = assertSubscriptionActive(tenant);
      if (await countActiveUsers(tenant._id, session) >= subscription.limits.maxActiveUsers) {
        throw new PlanError(409, 'USER_LIMIT_REACHED', 'No hay cupos para reactivar esta cuenta. Inactiva otra cuenta o amplía el plan.');
      }
    }
    if (user.role === 'ADMIN' && previousStatus === 'ACTIVE' && body.status !== 'ACTIVE') {
      const adminCount = await User.countDocuments({ ...activeUserFilter(tenant._id), role: 'ADMIN' }).session(session);
      if (adminCount <= 1) throw new PlanError(409, 'LAST_ADMIN', 'Registra o activa otro ADMIN antes de inactivar o bloquear al último administrador activo.');
    }
    const before = publicUser(user);
    user.status = body.status;
    user.isActive = body.status === 'ACTIVE';
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.statusChangedAt = new Date();
    user.statusChangedBy = actor._id;
    user.__v = (user.__v || 0) + 1;
    await user.save({ session });
    const after = publicUser(user);
    await recordAudit({ actor, tenantId: tenant._id, action: 'USER_STATUS_CHANGED', targetType: 'USER', targetId: user._id,
      before, after, reason }, session);
    return after;
  });
}
async function listManagedUsers(actor, tenantId) {
  v.objectId(tenantId, 'Empresa');
  if (actor?.role !== 'SUPER_ADMIN' && (actor?.role !== 'ADMIN' || String(actor.tenantId) !== String(tenantId))) {
    throw new PlanError(403, 'FORBIDDEN', 'No puedes consultar usuarios de esta empresa.');
  }
  const users = await User.find({ tenantId, role: { $in: actor.role === 'ADMIN' ? ['USER'] : ['ADMIN', 'USER'] } })
    .select('_id name email role tenantId status isActive emailVerifiedAt lastLoginAt createdAt updatedAt __v').sort({ name: 1 }).lean();
  return users.map(publicUser);
}
module.exports = { createManagedUser, changeUserStatus, listManagedUsers, assertCurrentManager };
