const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expectedCash: { type: Number, required: true, min: 0 },
  declaredCash: { type: Number, required: true, min: 0 },
  difference: { type: Number, required: true },
  salesCount: { type: Number, required: true, min: 0 },
  totals: { type: mongoose.Schema.Types.Mixed, default: {} },
  note: { type: String, trim: true, maxlength: 300, default: '' },
}, { timestamps: true });
schema.index({ tenantId: 1, day: 1 }, { unique: true });
module.exports = mongoose.model('PosCashClosure', schema);
