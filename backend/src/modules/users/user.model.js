const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // 1. Datos básicos
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,        // nadie más puede usar el mismo correo
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,      // nunca guardamos la contraseña en texto plano
  },

  // 2. Rol y pertenencia
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,       // solo SUPER_ADMIN puede ser null
  },

  // 3. Estado
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índice útil para búsquedas por tenant
userSchema.index({ tenantId: 1, email: 1 });

module.exports = mongoose.model('User', userSchema);