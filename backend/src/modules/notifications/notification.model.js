'use strict';
const mongoose = require('mongoose');

// Notificaciones internas del empleado. Nunca se derivan de un tenantId enviado por React.
const notificationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  type: { type: String, enum: ['ACTIVITY_ASSIGNED', 'ACTIVITY_DUE_SOON', 'ACTIVITY_OVERDUE'], required: true },
  eventKey: { type: String, required: true, maxlength: 180 },
  title: { type: String, required: true, maxlength: 160 },
  description: { type: String, required: true, maxlength: 320 },
  dueAt: { type: Date, required: true },
  link: { type: String, default: '/user/activities' },
  readAt: { type: Date, default: null },
  dismissedAt: { type: Date, default: null },
  emailStatus: {
    type: String,
    enum: ['DISABLED', 'PENDING', 'SENDING', 'SENT', 'SKIPPED', 'FAILED'],
    default: 'DISABLED'
  },
  emailAttempts: { type: Number, default: 0 },
  emailNextAttemptAt: { type: Date, default: Date.now },
  emailClaimedAt: { type: Date, default: null },
  emailSentAt: { type: Date, default: null },
  emailLastError: { type: String, default: '' }
}, { timestamps: true });

notificationSchema.index({ tenantId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, recipientId: 1, readAt: 1 });
notificationSchema.index({ tenantId: 1, recipientId: 1, eventKey: 1 }, { unique: true });
notificationSchema.index({ emailStatus: 1, emailNextAttemptAt: 1 });

module.exports = mongoose.model('FinNotification', notificationSchema);
