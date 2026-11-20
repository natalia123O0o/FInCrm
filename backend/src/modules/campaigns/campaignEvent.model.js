'use strict';
const mongoose = require('mongoose');

const campaignEventSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinCampaign', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, enum: ['CONTACTED', 'RESPONDED', 'OPPORTUNITY', 'OPT_OUT'], required: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', default: null },
  details: { type: String, trim: true, maxlength: 600, default: '' },
  authorizationConfirmed: { type: Boolean, default: false },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

campaignEventSchema.index({ tenantId: 1, campaignId: 1, createdAt: -1 });
campaignEventSchema.index({ tenantId: 1, clientId: 1, type: 1 });
module.exports = mongoose.model('FinCampaignEvent', campaignEventSchema);
