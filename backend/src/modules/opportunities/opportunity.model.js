const mongoose = require('mongoose');

const ENCOUNTERS = ['CALL', 'MEETING', 'VISIT', 'LUNCH', 'DEMO', 'EMAIL', 'OTHER'];
const OUTCOMES = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NO_RESPONSE', 'AGREEMENT', 'FOLLOW_UP'];
const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

const encounterSchema = new mongoose.Schema({
  type: { type: String, enum: ENCOUNTERS, required: true },
  happenedAt: { type: Date, required: true },
  summary: { type: String, required: true, trim: true, maxlength: 2000 },
  outcome: { type: String, enum: OUTCOMES, required: true },
  nextAction: { type: String, trim: true, maxlength: 500, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const decisionSchema = new mongoose.Schema({
  action: { type: String, enum: ['ACCEPT', 'REJECT', 'POSTPONE'], required: true },
  reason: { type: String, trim: true, maxlength: 1000, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const opportunitySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1500, default: '' },
  stage: { type: String, enum: STAGES, default: 'NEW' },
  estimatedValue: { type: Number, min: 0, default: 0 },
  expectedCloseAt: { type: Date, default: null },
  encounters: { type: [encounterSchema], default: [] },
  recommendation: {
    text: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  decisions: { type: [decisionSchema], default: [] }
}, { timestamps: true });

opportunitySchema.index({ tenantId: 1, assignedTo: 1, stage: 1 });
module.exports = mongoose.model('Opportunity', opportunitySchema);
module.exports.STAGES = STAGES;
module.exports.ENCOUNTERS = ENCOUNTERS;
module.exports.OUTCOMES = OUTCOMES;
