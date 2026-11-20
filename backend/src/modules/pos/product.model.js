const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
  category: { type: String, required: true, trim: true, maxlength: 60, default: 'General' },
  price: { type: Number, required: true, min: 1 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  minStock: { type: Number, required: true, min: 0, default: 3 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
productSchema.index({ tenantId: 1, category: 1 });
module.exports = mongoose.model('PosProduct', productSchema);
