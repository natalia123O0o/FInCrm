'use strict';
const mongoose = require('mongoose');
const O = mongoose.Schema.Types.ObjectId;
const line = new mongoose.Schema({
  kind: { type: String, enum: ['PRODUCT','SERVICE'], required: true },
  productId: { type: O, ref: 'PosProduct', default: null },
  description: { type: String, required: true, trim: true, maxlength: 180 },
  sku: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  discountPct: { type: Number, required: true, min: 0, max: 100 },
  taxRate: { type: Number, required: true, enum: [0,5,19] },
  net: Number, tax: Number, total: Number, cost: Number
}, {_id: false});
const event = new mongoose.Schema({
  kind: { type: String, required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  by: { type: O, ref: 'User', required: true },
  at: { type: Date, default: Date.now }
}, {_id: false});
const snapshot = new mongoose.Schema({
  number: Number, at: Date, by: { type: O, ref: 'User' },
  total: Number, marginPct: Number, lines: [line]
}, {_id: false});
const quoteSchema = new mongoose.Schema({
  tenantId: { type: O, ref: 'Tenant', required: true, index: true },
  code: { type: String, required: true },
  clientId: { type: O, ref: 'Client', required: true },
  opportunityId: { type: O, ref: 'Opportunity', default: null },
  assignedTo: { type: O, ref: 'User', required: true },
  createdBy: { type: O, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  validUntil: { type: String, required: true }, // yyyy-mm-dd business calendar date
  currency: { type: String, enum: ['COP'], default: 'COP' },
  status: { type: String, enum: ['DRAFT','PENDING_APPROVAL','APPROVED','SENT','ACCEPTED','REJECTED'], default: 'DRAFT' },
  lines: { type: [line], required: true },
  net: { type: Number, required: true }, tax: { type: Number, required: true },
  total: { type: Number, required: true }, cost: { type: Number, required: true },
  marginPct: { type: Number, required: true }, maxLineDiscount: { type: Number, required: true },
  revision: { type: Number, default: 1 },
  versions: { type: [snapshot], default: [] },
  events: { type: [event], default: [] },
  sentAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  recommendation: {
    text: { type: String, default: '' },
    generatedAt: { type: Date, default: null }
  }
}, { timestamps: true, optimisticConcurrency: true });
quoteSchema.index({ tenantId: 1, code: 1 }, { unique: true });
quoteSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
quoteSchema.index({ tenantId: 1, assignedTo: 1, createdAt: -1 });
module.exports = mongoose.model('FinQuote', quoteSchema);
