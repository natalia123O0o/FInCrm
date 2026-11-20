'use strict';
const { createManagedUser, changeUserStatus, listManagedUsers } = require('./user.service');
const { sendError } = require('../plans/plan.errors');

async function createUser(req, res) {
  try {
    const user = await createManagedUser(req.user, req.user.tenantId, 'USER', req.body);
    return res.status(201).json({ message: 'Empleado registrado correctamente', user });
  } catch (error) { return sendError(res, error); }
}
async function getUsers(req, res) {
  try {
    const users = await listManagedUsers(req.user, req.user.tenantId);
    return res.json({ message: 'Empleados obtenidos correctamente', total: users.length, users });
  } catch (error) { return sendError(res, error); }
}
async function updateUserStatus(req, res) {
  try {
    const user = await changeUserStatus(req.user, req.user.tenantId, req.params.userId, req.body);
    return res.json({ message: 'Estado actualizado. El usuario deberá iniciar sesión nuevamente si se reactiva.', user });
  } catch (error) { return sendError(res, error); }
}
module.exports = { createUser, getUsers, updateUserStatus };
