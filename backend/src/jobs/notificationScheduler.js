'use strict';
const cron = require('node-cron');
const Activity = require('../modules/activities/activity.model');
const Notification = require('../modules/notifications/notification.model');
const User = require('../modules/users/user.model');
const Tenant = require('../modules/tenants/tenant.model');
const { createNotification } = require('../modules/notifications/notification.service');
const { assertFeature } = require('../middlewares/feature.middleware');
const { consumeQuota } = require('../modules/subscriptions/usage.service');
const { effectiveUserStatus } = require('../modules/users/user.status');

const HOUR = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
let running = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, symbol => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[symbol]));
}

async function generateDueNotifications(now) {
  // Ventanas pequeñas para no recorrer todo el historial indefinidamente.
  const nextDay = new Date(now.getTime() + 24 * HOUR);
  const lastWeek = new Date(now.getTime() - 7 * 24 * HOUR);
  const [upcoming, overdue] = await Promise.all([
    Activity.find({ status: 'PENDING', dueAt: { $gt: now, $lte: nextDay } }).select('_id tenantId assignedTo title dueAt status updatedAt').limit(1000).lean(),
    Activity.find({ status: 'PENDING', dueAt: { $gte: lastWeek, $lte: now } }).select('_id tenantId assignedTo title dueAt status updatedAt').limit(1000).lean()
  ]);
  for (const activity of upcoming) {
    const reminder = await createNotification(activity, 'ACTIVITY_DUE_SOON');
    // Si acaba de recibir el correo de asignación, no mandar otro por la misma tarea.
    const assignedRecently = await Notification.exists({
      tenantId: activity.tenantId, recipientId: activity.assignedTo,
      activityId: activity._id, type: 'ACTIVITY_ASSIGNED',
      createdAt: { $gte: new Date(now.getTime() - 24 * HOUR) }
    });
    if (assignedRecently && reminder) {
      await Notification.updateOne({ _id: reminder._id, emailStatus: 'PENDING' },
        { $set: { emailStatus: 'SKIPPED', emailLastError: 'Asignación notificada recientemente' } });
    }
  }
  for (const activity of overdue) await createNotification(activity, 'ACTIVITY_OVERDUE');
}

function permittedAddress(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return false;
  if (String(process.env.EMAIL_SEND_MODE || 'test').trim().toLowerCase() === 'live') return true;
  const allowed = String(process.env.EMAIL_ALLOWED_RECIPIENTS || '')
    .split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(normalized);
}

async function sendBrevo(notification, user) {
  const sender = String(process.env.BREVO_SENDER_EMAIL || '').trim();
  if (!process.env.BREVO_API_KEY || !EMAIL_RE.test(sender)) {
    throw new Error('Falta BREVO_API_KEY o BREVO_SENDER_EMAIL válido');
  }
  const base = String(process.env.FINCRM_FRONTEND_URL || '').trim().replace(/\/$/, '');
  const link = /^https:\/\/[a-z\d.-]+(?::\d+)?$/i.test(base)
    || /^http:\/\/localhost(?::\d+)?$/i.test(base)
    ? `${base}/user/activities` : null;
  const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18181B">
  <div style="background:#0F172A;color:#F8FAFC;padding:16px;font-weight:bold">Fin<span style="color:#F97316">CRM</span></div>
  <h2 style="color:#0F172A">${escapeHtml(notification.title)}</h2>
  <p>Hola, ${escapeHtml(user.name)}.</p>
  <p>${escapeHtml(notification.description)}</p>
  <p>Fecha límite: <strong>${escapeHtml(new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }).format(notification.dueAt))}</strong></p>
  ${link ? `<p><a href="${link}" style="color:#0F172A;font-weight:bold">Abrir mis actividades</a></p>` : ''}
  <p style="font-size:13px;color:#64748B">Aviso interno de tareas. No respondas a este correo.</p></div>`;
  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || 'FinCRM', email: sender },
      to: [{ email: user.email }],
      subject: `FinCRM: ${notification.title}`,
      htmlContent
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`El proveedor devolvió HTTP ${response.status}`);
}

async function deliverQueued(now) {
  if (process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') return;
  // Si cambia la configuración tras una prueba, no enviar avisos antiguos.
  const maxAge = new Date(now.getTime() - 48 * HOUR);
  const staleClaim = new Date(now.getTime() - 15 * 60 * 1000);
  for (let index = 0; index < 30; index += 1) {
    // El claim es atómico y evita que dos workers tomen el mismo registro a la vez.
    const notification = await Notification.findOneAndUpdate({
      createdAt: { $gte: maxAge },
      dismissedAt: null,
      emailNextAttemptAt: { $lte: now },
      $or: [
        { emailStatus: 'PENDING' },
        { emailStatus: 'SENDING', emailClaimedAt: { $lte: staleClaim } }
      ]
    }, { $set: { emailStatus: 'SENDING', emailClaimedAt: new Date() }, $inc: { emailAttempts: 1 } },
    { sort: { createdAt: 1 }, new: true });
    if (!notification) break;
    try {
      const [activity, user, tenant] = await Promise.all([
        Activity.findOne({ _id: notification.activityId, tenantId: notification.tenantId, status: 'PENDING', assignedTo: notification.recipientId }).select('dueAt').lean(),
        User.findOne({ _id: notification.recipientId, tenantId: notification.tenantId, role: 'USER', isActive: true }).select('name email role status isActive tokenVersion').lean(),
        Tenant.findOne({ _id: notification.tenantId, status: 'ACTIVE' }).lean()
      ]);
      if (!activity || !user || !tenant || effectiveUserStatus(user) !== 'ACTIVE') {
        await Notification.updateOne({ _id: notification._id }, { $set: { emailStatus: 'SKIPPED', emailLastError: 'La actividad o el destinatario ya no es válido' } });
        continue;
      }
      if (new Date(activity.dueAt).getTime() !== new Date(notification.dueAt).getTime()) {
        await Notification.updateOne({ _id: notification._id }, { $set: { emailStatus: 'SKIPPED', emailLastError: 'Fecha de la actividad modificada' } });
        continue;
      }
      if (notification.type === 'ACTIVITY_OVERDUE' && notification.dueAt.getTime() < now.getTime() - 24 * HOUR) {
        await Notification.updateOne({ _id: notification._id }, { $set: { emailStatus: 'SKIPPED', emailLastError: 'Aviso de mora demasiado antiguo' } });
        continue;
      }
      if (!permittedAddress(user.email)) {
        await Notification.updateOne({ _id: notification._id }, { $set: { emailStatus: 'SKIPPED', emailLastError: 'Destinatario fuera de la lista de correos permitidos' } });
        continue;
      }
      // Volver a comprobar la licencia al enviar, no solamente al programar.
      assertFeature(tenant, 'activities');
      assertFeature(tenant, 'messaging');
      if (!process.env.BREVO_API_KEY || !EMAIL_RE.test(String(process.env.BREVO_SENDER_EMAIL || '').trim())) {
        throw new Error('Falta configurar el proveedor de correo');
      }
      await consumeQuota({ tenantId: tenant._id, actorId: user._id,
        tokenVersion: user.tokenVersion || 0, resource: 'emails', feature: 'activities' });
      await sendBrevo(notification, user);
      await Notification.updateOne({ _id: notification._id }, { $set: { emailStatus: 'SENT', emailSentAt: new Date(), emailLastError: '' } });
    } catch (error) {
      if (error.status >= 400 && error.status < 500) {
        await Notification.updateOne({ _id: notification._id }, { $set: {
          emailStatus: 'SKIPPED', emailLastError: String(error.message).slice(0, 200),
        } });
        continue;
      }
      const retry = notification.emailAttempts < 3;
      const backoff = new Date(Date.now() + notification.emailAttempts * 15 * 60 * 1000);
      await Notification.updateOne({ _id: notification._id }, { $set: {
        emailStatus: retry ? 'PENDING' : 'FAILED',
        emailNextAttemptAt: backoff,
        emailLastError: String(error.message || 'Error de proveedor').slice(0, 200)
      } });
      console.error('Recordatorio no enviado:', error.message);
    }
  }
}

async function runNotificationsCycle() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    await generateDueNotifications(now);
    await deliverQueued(now);
  } catch (error) {
    console.error('Error en scheduler de notificaciones:', error);
  } finally {
    running = false;
  }
}

function startNotificationScheduler() {
  const expression = process.env.NOTIFICATION_CRON_EXPRESSION || '*/5 * * * *';
  if (!cron.validate(expression)) throw new Error('NOTIFICATION_CRON_EXPRESSION inválida');
  const task = cron.schedule(expression, () => { void runNotificationsCycle(); }, { timezone: 'America/Bogota' });
  // Ejecución inicial: útil en desarrollo; envíos reales siguen desactivados sin opt-in.
  void runNotificationsCycle();
  console.log('Notificaciones: scheduler activo (cada 5 minutos por defecto).');
  return task;
}

module.exports = { startNotificationScheduler, runNotificationsCycle };
