'use strict';
const mongoose = require('mongoose');
const auditSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  action: { type: String, required: true },
  targetType: { type: String, required: true, enum: ['PLAN', 'TENANT', 'USER'] },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });
auditSchema.index({ tenantId: 1, createdAt: -1 });
auditSchema.index({ targetId: 1, createdAt: -1 });
module.exports = mongoose.model('AuditEvent', auditSchema);
