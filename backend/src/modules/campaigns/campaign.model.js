'use strict';
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  objective: { type: String, required: true, trim: true, maxlength: 600 },
  purpose: { type: String, enum: ['PROMOTION', 'FOLLOW_UP', 'INVITATION', 'LOYALTY'], required: true },
  channel: { type: String, enum: ['EMAIL', 'PHONE', 'WHATSAPP', 'OTHER'], required: true },
  status: { type: String, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'], default: 'DRAFT' },
  budget: { type: Number, default: 0, min: 0, max: 1000000000000 },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }]
}, { timestamps: true });

campaignSchema.index({ tenantId: 1, createdAt: -1 });
module.exports = mongoose.model('FinCampaign', campaignSchema);
