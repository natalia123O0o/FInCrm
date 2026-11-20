'use strict';
const mongoose = require('mongoose');
const Notification = require('./notification.model');

function ownFilter(req) {
  return { tenantId: req.user.tenantId, recipientId: req.user._id, dismissedAt: null };
}

async function listNotifications(req, res) {
  try {
    const filter = ownFilter(req);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(30).select('-eventKey -emailLastError -emailClaimedAt').lean(),
      Notification.countDocuments({ ...filter, readAt: null })
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Consultar notificaciones:', error);
    res.status(500).json({ message: 'No se pudieron cargar las notificaciones.' });
  }
}

async function markRead(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' });
    const notification = await Notification.findOneAndUpdate(
      { ...ownFilter(req), _id: req.params.id }, { $set: { readAt: new Date() } }, { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notificación no encontrada.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Marcar notificación:', error);
    res.status(500).json({ message: 'No se pudo actualizar la notificación.' });
  }
}

async function markAllRead(req, res) {
  try {
    const result = await Notification.updateMany({ ...ownFilter(req), readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true, updatedCount: result.modifiedCount });
  } catch (error) {
    console.error('Marcar todas:', error);
    res.status(500).json({ message: 'No se pudieron actualizar las notificaciones.' });
  }
}

module.exports = { listNotifications, markRead, markAllRead };
