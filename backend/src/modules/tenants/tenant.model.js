
const mongoose = require('mongoose');
const { limitsSchema } = require('../plans/plan.model');
const { MODULES } = require('../plans/plan.catalog');

// Una asignación conserva la versión contratada, aunque se edite el catálogo.
const subscriptionSchema = new mongoose.Schema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planCode: { type: String, required: true },
  planName: { type: String, required: true },
  planVersion: { type: Number, required: true },
  monthlyPriceCOP: { type: Number, required: true, min: 0 },
  modules: { type: [String], enum: MODULES.map((item) => item.key) },
  limits: { type: limitsSchema, required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, default: null },
  assignedAt: { type: Date, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: false });

// Configuraciones de cobranza y negociación
const tenantSettingsSchema = new mongoose.Schema({
  collectionSettings: {
    weekdaysStart: { type: String, default: '07:00' },
    weekdaysEnd: { type: String, default: '19:00' },
    saturdayStart: { type: String, default: '08:00' },
    saturdayEnd: { type: String, default: '15:00' },
    maxContactsPerWeek: { type: Number, default: 1 },
    allowedChannels: {
      type: [String],
      default: ['email', 'sms']
    }
  },

  negotiation: {
    maxInstallments: { type: Number, default: 3 },
    maxDiscountPercent: { type: Number, default: 10 },
    minPaymentPercent: { type: Number, default: 20 }
  },

  timezone: {
    type: String,
    default: 'America/Bogota'
  }
}, { _id: false });

// Modelo principal de empresas
const tenantSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  // Número de identificación tributaria
  nit: {
    type: String,
    trim: true,
    default: undefined
  },

  // Dígito de verificación
  verificationDigit: {
    type: String,
    trim: true
  },

  // Correo empresarial
  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Teléfono
  phone: {
    type: String,
    trim: true
  },

  // Dirección
  address: {
    type: String,
    trim: true
  },

  // Ciudad
  city: {
    type: String,
    trim: true
  },

  // Subdominio de la empresa
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  // Estado de la empresa
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  subscription: { type: subscriptionSchema, default: null },
  managementVersion: { type: Number, default: 0 },
  managementLock: { type: Number, default: 0 },
  sessionVersion: { type: Number, default: 0 },

  // Configuraciones de FinCRM
  settings: {
    type: tenantSettingsSchema,
    default: () => ({})
  }

}, {
  timestamps: true
});

// Evita duplicar NIT entre empresas
// Solo indexa documentos que tengan un NIT de tipo string
tenantSchema.index(
  { nit: 1 },
  {
    unique: true,
    partialFilterExpression: {
      nit: { $type: 'string' }
    }
  }
);

module.exports = mongoose.model('Tenant', tenantSchema);
