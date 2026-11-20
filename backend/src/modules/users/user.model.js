const mongoose = require('mongoose');
const { STATES, effectiveUserStatus } = require('./user.status');

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
  // Sin default en lectura: permite reconocer los documentos anteriores a la migración.
  status: { type: String, enum: STATES },
  statusChangedAt: { type: Date, default: null },
  statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  emailVerifiedAt: { type: Date, default: null },
  tokenVersion: { type: Number, default: 0 },
  lastLoginAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índice útil para búsquedas por tenant
userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ tenantId: 1, status: 1 });

userSchema.pre('validate', function syncStatus() {
  if (this.isNew && !this.status) this.status = this.isActive === false ? 'INACTIVE' : 'ACTIVE';
  if (!this.status) this.status = effectiveUserStatus(this);
  if (this.status === 'ACTIVE' && this.isActive === false) this.status = 'INACTIVE';
  this.isActive = this.status === 'ACTIVE';
});

// Los usuarios conservan su identidad en pagos, actividades e historial.
function rejectDeletion() {
  const error = new Error('Los usuarios no se eliminan. Cambia su estado para conservar la trazabilidad.');
  error.code = 'USER_DELETION_FORBIDDEN';
  throw error;
}
userSchema.pre('deleteOne', { document: true, query: true }, rejectDeletion);
userSchema.pre(['deleteMany', 'findOneAndDelete', 'replaceOne', 'findOneAndReplace'], rejectDeletion);
userSchema.pre('bulkWrite', function rejectDestructiveBulk(operations) {
  if (operations.some((operation) => operation.deleteOne || operation.deleteMany || operation.replaceOne)) rejectDeletion();
});

module.exports = mongoose.model('User', userSchema);
