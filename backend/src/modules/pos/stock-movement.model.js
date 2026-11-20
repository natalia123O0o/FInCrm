const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosProduct', required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delta: { type: Number, required: true },
  before: { type: Number, required: true },
  after: { type: Number, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 200 },
}, { timestamps: true });
module.exports = mongoose.model('PosStockMovement', schema);
