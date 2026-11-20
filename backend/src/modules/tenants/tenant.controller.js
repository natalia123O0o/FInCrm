'use strict';
const mongoose = require('mongoose');
const Tenant = require('./tenant.model');
const User = require('../users/user.model');
const { activeUserFilter } = require('../users/user.status');
const { createManagedUser, changeUserStatus, listManagedUsers } = require('../users/user.service');
const { recordAudit } = require('../audit/audit.service');
const { assertCurrentActor } = require('../users/user.authorization');
const { sendError, PlanError } = require('../plans/plan.errors');
const v = require('../plans/plan.validation');
const { getTenantView, assignSubscription, changeTenantStatus, listTenantAudit,
  withTenantTransaction, assertCurrentVersion, subscriptionState } = require('../plans/plan.service');

// Se conserva la validación original del NIT y de su dígito de verificación.
function calculateVerificationDigit(nit) {
  const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
  const digits = nit.padStart(15, '0');
  const total = weights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0);
  const remainder = total % 11;
  return String(remainder > 1 ? 11 - remainder : remainder);
}
function validateNit(nit, verificationDigit) {
  if (typeof nit !== 'string' || !/^[0-9]{6,15}$/.test(nit)) throw new PlanError(400, 'INVALID_NIT', 'El NIT debe contener entre 6 y 15 dígitos.');
  if (typeof verificationDigit !== 'string' || !/^[0-9]$/.test(verificationDigit) || calculateVerificationDigit(nit) !== verificationDigit) {
    throw new PlanError(400, 'INVALID_NIT_DIGIT', 'Dígito de verificación del NIT incorrecto.');
  }
}
const PROFILE_FIELDS = ['name', 'nit', 'verificationDigit', 'email', 'phone', 'address', 'city'];
function profileSnapshot(tenant) {
  return Object.fromEntries(['name', 'subdomain', 'nit', 'verificationDigit', 'email', 'phone', 'address', 'city', 'status'].map((key) => [key, tenant[key]]));
}
async function createTenant(req, res) {
  try {
    const body = req.body ?? {};
    v.allowedKeys(body, [...PROFILE_FIELDS, 'subdomain', 'reason']);
    const name = v.text(body.name, 'Nombre de la empresa', 1, 200);
    if (typeof body.subdomain !== 'string' || body.subdomain.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.subdomain.trim())) {
      throw new PlanError(400, 'INVALID_SUBDOMAIN', 'Subdominio inválido.');
    }
    validateNit(body.nit, body.verificationDigit);
    for (const key of ['email', 'phone', 'address', 'city']) {
      if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 500)) throw new PlanError(400, 'INVALID_DATA', 'Los datos de contacto deben ser textos de máximo 500 caracteres.');
    }
    const reason = body.reason === undefined ? 'Registro de empresa en FinCRM' : v.reason(body.reason);
    const tenant = await mongoose.connection.transaction(async (session) => {
      if ((await assertCurrentActor(req.user, session)).role !== 'SUPER_ADMIN') throw new PlanError(403, 'FORBIDDEN', 'Solo SUPER_ADMIN administra empresas.');
      const [created] = await Tenant.create([{
        name, subdomain: body.subdomain.trim().toLowerCase(), nit: body.nit, verificationDigit: body.verificationDigit,
        email: body.email?.trim().toLowerCase(), phone: body.phone?.trim(), address: body.address?.trim(), city: body.city?.trim(),
      }], { session });
      await recordAudit({ actor: req.user, tenantId: created._id, action: 'TENANT_CREATED', targetType: 'TENANT', targetId: created._id,
        after: profileSnapshot(created), reason }, session);
      return created;
    });
    return res.status(201).json({ message: 'Empresa registrada. Asigna un plan antes de registrar su administrador.', tenant });
  } catch (error) { return sendError(res, error); }
}
async function createTenantAdmin(req, res) {
  try {
    const admin = await createManagedUser(req.user, req.params.tenantId, 'ADMIN', req.body);
    return res.status(201).json({ message: 'Administrador registrado correctamente', admin });
  } catch (error) { return sendError(res, error); }
}
async function updateTenant(req, res) {
  try {
    const body = req.body ?? {};
    v.allowedKeys(body, [...PROFILE_FIELDS, 'reason', 'expectedVersion']);
    const fields = Object.keys(body).filter((key) => PROFILE_FIELDS.includes(key));
    if (!fields.length) throw new PlanError(400, 'NO_CHANGES', 'No se enviaron datos de empresa para actualizar.');
    for (const key of fields) v.text(body[key], key, 1, key === 'name' ? 200 : 500);
    const reason = body.reason === undefined ? 'Actualización de datos de la empresa' : v.reason(body.reason);
    const tenant = await withTenantTransaction(req.params.tenantId, async (current, session) => {
      if ((await assertCurrentActor(req.user, session)).role !== 'SUPER_ADMIN') throw new PlanError(403, 'FORBIDDEN', 'Solo SUPER_ADMIN administra empresas.');
      if (body.expectedVersion !== undefined) assertCurrentVersion(current.managementVersion, body.expectedVersion);
      const nit = body.nit ?? current.nit;
      const digit = body.verificationDigit ?? current.verificationDigit;
      if (nit !== undefined || digit !== undefined) validateNit(nit, digit);
      const before = profileSnapshot(current);
      for (const key of fields) current[key] = body[key].trim();
      current.managementVersion = (current.managementVersion || 0) + 1;
      await current.save({ session });
      await recordAudit({ actor: req.user, tenantId: current._id, action: 'TENANT_UPDATED', targetType: 'TENANT', targetId: current._id,
        before, after: profileSnapshot(current), reason }, session);
      return current;
    });
    return res.json({ message: 'Empresa actualizada correctamente', tenant });
  } catch (error) { return sendError(res, error); }
}
async function listTenants(req, res) {
  try {
    const tenants = await Tenant.find().select('_id name nit verificationDigit subdomain status email phone address city subscription managementVersion createdAt updatedAt').sort({ createdAt: -1 }).lean();
    const counts = await User.aggregate([
      { $match: activeUserFilter({ $in: tenants.map((tenant) => tenant._id) }) },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]);
    const countsByTenant = new Map(counts.map((item) => [String(item._id), item.count]));
    for (const tenant of tenants) {
      tenant.managementVersion ??= 0;
      tenant.subscription ??= null;
      tenant.activeUsers = countsByTenant.get(String(tenant._id)) || 0;
      tenant.subscriptionState = subscriptionState(tenant);
    }
    return res.json({ tenants });
  } catch (error) { return sendError(res, error); }
}
async function detailTenant(req, res) {
  try { return res.json(await getTenantView(req.params.tenantId)); }
  catch (error) { return sendError(res, error); }
}
async function updateSubscription(req, res) {
  try { return res.json({ message: 'Plan y funcionalidades asignados.', ...await assignSubscription(req.user, req.params.tenantId, req.body) }); }
  catch (error) { return sendError(res, error); }
}
async function updateStatus(req, res) {
  try { return res.json({ message: 'Estado de empresa actualizado.', ...await changeTenantStatus(req.user, req.params.tenantId, req.body) }); }
  catch (error) { return sendError(res, error); }
}
async function tenantUsers(req, res) {
  try {
    await getTenantView(req.params.tenantId);
    const users = await listManagedUsers(req.user, req.params.tenantId);
    return res.json({ users, total: users.length });
  } catch (error) { return sendError(res, error); }
}
async function updateTenantUserStatus(req, res) {
  try { return res.json({ message: 'Estado actualizado sin eliminar información.', user: await changeUserStatus(req.user, req.params.tenantId, req.params.userId, req.body) }); }
  catch (error) { return sendError(res, error); }
}
async function tenantAudit(req, res) {
  try { return res.json(await listTenantAudit(req.params.tenantId, req.query)); }
  catch (error) { return sendError(res, error); }
}
module.exports = { createTenant, createTenantAdmin, updateTenant, listTenants, detailTenant,
  updateSubscription, updateStatus, tenantUsers, updateTenantUserStatus, tenantAudit };
