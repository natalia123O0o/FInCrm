'use strict';
const Notification = require('./notification.model');
const Tenant = require('../tenants/tenant.model');
const User = require('../users/user.model');
const { effectiveUserStatus } = require('../users/user.status');
const { assertFeature } = require('../../middlewares/feature.middleware');

const TITLES = {
  ACTIVITY_ASSIGNED: 'Nueva actividad asignada',
  ACTIVITY_DUE_SOON: 'Actividad próxima a vencer',
  ACTIVITY_OVERDUE: 'Actividad vencida'
};

function eventKey(activity, type) {
  const timeKey = type === 'ACTIVITY_ASSIGNED'
    ? new Date(activity.updatedAt || activity.createdAt || Date.now()).toISOString()
    : new Date(activity.dueAt).toISOString();
  return `${type}:${activity._id}:${activity.assignedTo}:${timeKey}`;
}

async function createNotification(activity, type) {
  if (!activity?.tenantId || !activity?.assignedTo || activity.status !== 'PENDING') return null;
  const [tenant, recipient] = await Promise.all([
    Tenant.findById(activity.tenantId).lean(),
    User.findOne({ _id: activity.assignedTo, tenantId: activity.tenantId, role: 'USER' }).lean(),
  ]);
  if (effectiveUserStatus(recipient) !== 'ACTIVE') return null;
  try { assertFeature(tenant, 'activities'); }
  catch (error) { if (error.status === 403) return null; throw error; }
  const descriptions = {
    ACTIVITY_ASSIGNED: `Tienes una actividad nueva: ${activity.title}`,
    ACTIVITY_DUE_SOON: `Tu actividad "${activity.title}" vence dentro de las próximas 24 horas.`,
    ACTIVITY_OVERDUE: `La actividad "${activity.title}" ya superó su fecha límite.`
  };
  const details = {
    tenantId: activity.tenantId,
    recipientId: activity.assignedTo,
    activityId: activity._id,
    type,
    eventKey: eventKey(activity, type),
    title: TITLES[type],
    description: descriptions[type]?.slice(0, 320),
    dueAt: activity.dueAt,
    link: '/user/activities',
    // Por seguridad, un despliegue con email desactivado no acumula correos pendientes.
    emailStatus: process.env.NOTIFICATION_EMAIL_ENABLED === 'true' ? 'PENDING' : 'DISABLED'
  };
  if (!TITLES[type]) throw new Error('Tipo de notificación inválido');
  try {
    return await Notification.findOneAndUpdate(
      { tenantId: details.tenantId, recipientId: details.recipientId, eventKey: details.eventKey },
      { $setOnInsert: details },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Las ejecuciones concurrentes pueden chocar en el índice único.
    if (error.code !== 11000) throw error;
    return Notification.findOne({ tenantId: details.tenantId, recipientId: details.recipientId, eventKey: details.eventKey });
  }
}

async function notifyAssigned(activity) {
  return createNotification(activity, 'ACTIVITY_ASSIGNED');
}

// Retira de la bandeja los avisos de una tarea que ya no pertenece al usuario.
async function dismissNotifications({ tenantId, activityId, recipientId, types }) {
  const filter = { tenantId, activityId, recipientId, dismissedAt: null };
  if (Array.isArray(types)) filter.type = { $in: types };
  await Notification.updateMany(filter, { $set: { dismissedAt: new Date() } });
  await Notification.updateMany({ tenantId, activityId, recipientId, emailStatus: 'PENDING', ...(Array.isArray(types) ? { type: { $in: types } } : {}) }, {
    $set: { emailStatus: 'SKIPPED', emailLastError: 'Notificación invalidada por cambio de actividad' }
  });
}

module.exports = { createNotification, notifyAssigned, dismissNotifications };
