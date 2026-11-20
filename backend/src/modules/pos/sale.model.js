const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'PosProduct', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 1 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lines: { type: [lineSchema], required: true },
  total: { type: Number, required: true, min: 1 },
  paymentMethod: { type: String, required: true, enum: ['CASH', 'TRANSFER', 'CARD', 'OTHER'] },
  source: { type: String, required: true, enum: ['POS', 'HISTORICAL'], default: 'POS' },
  externalRef: { type: String, required: true, trim: true, maxlength: 80 },
  soldAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

saleSchema.index({ tenantId: 1, externalRef: 1 }, { unique: true, partialFilterExpression: { externalRef: { $type: 'string' } } });
saleSchema.index({ tenantId: 1, soldAt: -1 });
module.exports = mongoose.model('PosSale', saleSchema);
