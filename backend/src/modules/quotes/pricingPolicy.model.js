'use strict';
const mongoose = require('mongoose');
const pricingPolicySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', unique: true, required: true },
  minimumMarginPct: { type: Number, default: 20, min: 0, max: 100 },
  approvalDiscountPct: { type: Number, default: 10, min: 0, max: 100 },
  stalledDays: { type: Number, default: 5, min: 1, max: 90 }
}, { timestamps: true });
module.exports = mongoose.model('FinPricingPolicy', pricingPolicySchema);
