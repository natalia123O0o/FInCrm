const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  purpose: { type: String, enum: ['VERIFY_USER', 'VERIFY_CLIENT', 'RESET_PASSWORD'], required: true },
  targetType: { type: String, enum: ['USER', 'CLIENT'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

codeSchema.index({ purpose: 1, targetType: 1, targetId: 1 }, { unique: true });
codeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('VerificationCode', codeSchema);
