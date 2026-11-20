'use strict';
const mongoose = require('mongoose');
const { MODULES, LIMITS } = require('./plan.catalog');
const limitPaths = Object.fromEntries(LIMITS.map(({ key, min }) => [key, { type: Number, required: true, min, validate: Number.isSafeInteger }]));
const limitsSchema = new mongoose.Schema(limitPaths, { _id: false });

const planSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  monthlyPriceCOP: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  modules: { type: [String], enum: MODULES.map((item) => item.key), required: true },
  limits: { type: limitsSchema, required: true },
  version: { type: Number, default: 1, min: 1 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
module.exports.limitsSchema = limitsSchema;
