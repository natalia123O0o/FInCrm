'use strict';
const mongoose = require('mongoose');
const usageSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, immutable: true },
  period: { type: String, required: true, immutable: true, match: /^\d{4}-\d{2}$/ },
  aiRequests: { type: Number, min: 0, default: 0 },
  quotes: { type: Number, min: 0, default: 0 },
  campaigns: { type: Number, min: 0, default: 0 },
  emails: { type: Number, min: 0, default: 0 },
}, { timestamps: true });
usageSchema.index({ tenantId: 1, period: 1 }, { unique: true });
module.exports = mongoose.model('SubscriptionUsage', usageSchema);
