const mongoose = require('mongoose');
const Activity = require('./activity.model');
const User = require('../users/user.model');
const Client = require('../clients/client.model');
const { notifyAssigned, dismissNotifications } = require('../notifications/notification.service');

const isId = (id) => mongoose.isValidObjectId(id) && /^[a-f\d]{24}$/i.test(String(id));
const clean = (value) => typeof value === 'string' ? value.trim() : '';
const types = ['TASK', 'CALL', 'MEETING', 'FOLLOW_UP'];
const priorities = ['LOW', 'MEDIUM', 'HIGH'];
const fields = 'name email';

function getInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Datos inválidos' };
  const { title, description = '', type = 'TASK', priority = 'MEDIUM', dueAt, assignedTo, clientId = null } = body;
  if (!clean(title) || clean(title).length > 120 || typeof description !== 'string' || description.length > 2000 || !types.includes(type) || !priorities.includes(priority)) return { error: 'Título, descripción, tipo o prioridad inválidos' };
  const date = typeof dueAt === 'string' ? new Date(dueAt) : new Date(NaN);
  if (!dueAt || Number.isNaN(date.getTime()) || !isId(assignedTo) || (clientId !== null && clientId !== '' && !isId(clientId))) return { error: 'Fecha, empleado o cliente inválidos' };
  return { data: { title: clean(title), description: clean(description), type, priority, dueAt: date, assignedTo, clientId: clientId || null } };
}
async function checkReferences(data, tenantId) {
  const { activeUserFilter } = require('../users/user.status');
  const employee = await User.findOne({ ...activeUserFilter(tenantId), _id: data.assignedTo, role: 'USER' });
  if (!employee) return 'Empleado no disponible en esta empresa';
  if (data.clientId) {
    const client = await Client.findOne({ _id: data.clientId, tenantId, isActive: true });
    if (!client) return 'Cliente no disponible en esta empresa';
  }
  return null;
}
const populate = (query) => query.populate('assignedTo', fields).populate('clientId', 'name documentNumber').populate('createdBy', 'name');

async function createActivity(req, res) {
  try {
    const input = getInput(req.body);
    if (input.error) return res.status(400).json({ message: input.error });
    const error = await checkReferences(input.data, req.user.tenantId);
    if (error) return res.status(404).json({ message: error });
    const created = await Activity.create({ ...input.data, tenantId: req.user.tenantId, createdBy: req.user._id });
    // Registra la notificación después de guardar la tarea, sin bloquear su creación si falla.
    await notifyAssigned(created).catch(error => console.error('Notificación al asignar:', error.message));
    const activity = await populate(Activity.findOne({ _id: created._id, tenantId: req.user.tenantId }));
    return res.status(201).json({ activity });
  } catch (error) {
    console.error('Crear actividad:', error);
    return res.status(500).json({ message: 'Error al crear actividad' });
  }
}

async function listActivities(req, res) {
  try {
    const filter = { tenantId: req.user.tenantId };
    if (req.user.role === 'USER') filter.assignedTo = req.user._id;
    if (req.query.status && ['PENDING', 'COMPLETED'].includes(req.query.status)) filter.status = req.query.status;
    const activities = await populate(Activity.find(filter).sort({ dueAt: 1, createdAt: -1 }).limit(500));
    return res.json({ activities });
  } catch (error) {
    console.error('Listar actividades:', error);
    return res.status(500).json({ message: 'Error al consultar actividades' });
  }
}

async function editActivity(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
    const input = getInput(req.body);
    if (input.error) return res.status(400).json({ message: input.error });
    const error = await checkReferences(input.data, req.user.tenantId);
    if (error) return res.status(404).json({ message: error });
    const previous = await Activity.findOne({ _id: req.params.id, tenantId: req.user.tenantId, status: 'PENDING' }).select('assignedTo dueAt').lean();
    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, status: 'PENDING' },
      { $set: input.data }, { new: true, runValidators: true }
    );
    if (!activity) return res.status(404).json({ message: 'Actividad pendiente no encontrada' });
    if (previous && String(previous.assignedTo) !== String(activity.assignedTo)) {
      await dismissNotifications({ tenantId: req.user.tenantId, activityId: activity._id, recipientId: previous.assignedTo })
        .catch(error => console.error('Descartar avisos antiguos:', error.message));
      await notifyAssigned(activity).catch(error => console.error('Notificación al reasignar:', error.message));
    } else if (previous && new Date(previous.dueAt).getTime() !== new Date(activity.dueAt).getTime()) {
      await dismissNotifications({ tenantId: req.user.tenantId, activityId: activity._id,
        recipientId: activity.assignedTo, types: ['ACTIVITY_DUE_SOON', 'ACTIVITY_OVERDUE'] })
        .catch(error => console.error('Descartar avisos de vencimiento:', error.message));
    }
    const populated = await populate(Activity.findOne({ _id: activity._id, tenantId: req.user.tenantId }));
    return res.json({ activity: populated });
  } catch (error) {
    console.error('Editar actividad:', error);
    return res.status(500).json({ message: 'Error al editar actividad' });
  }
}

async function completeActivity(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
    const result = req.body?.result;
    if (typeof result !== 'string' || !result.trim() || result.trim().length > 3000) return res.status(400).json({ message: 'Escribe el resultado de la gestión (máximo 3000 caracteres)' });
    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, assignedTo: req.user._id, status: 'PENDING' },
      { $set: { result: result.trim(), status: 'COMPLETED', completedAt: new Date(), completedBy: req.user._id } },
      { new: true, runValidators: true }
    );
    if (!activity) return res.status(404).json({ message: 'Actividad pendiente no encontrada o no asignada a ti' });
    await dismissNotifications({ tenantId: req.user.tenantId, activityId: activity._id, recipientId: req.user._id })
      .catch(error => console.error('Cerrar recordatorios:', error.message));
    const populated = await populate(Activity.findOne({ _id: activity._id, tenantId: req.user.tenantId }));
    return res.json({ activity: populated });
  } catch (error) {
    console.error('Completar actividad:', error);
    return res.status(500).json({ message: 'Error al completar actividad' });
  }
}

module.exports = { createActivity, listActivities, editActivity, completeActivity };
