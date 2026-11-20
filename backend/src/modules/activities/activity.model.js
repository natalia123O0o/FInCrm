const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  type: { type: String, enum: ['TASK', 'CALL', 'MEETING', 'FOLLOW_UP'], default: 'TASK' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
  dueAt: { type: Date, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  result: { type: String, trim: true, maxlength: 3000, default: '' },
  completedAt: { type: Date, default: null },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

activitySchema.index({ tenantId: 1, assignedTo: 1, status: 1, dueAt: 1 });
module.exports = mongoose.model('Activity', activitySchema);
