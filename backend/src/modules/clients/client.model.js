/**
 * Módulo de Mongoose para definir el esquema y modelo de Clientes.
 * Soporta arquitectura multitenant (aislamiento de datos por empresa).
 */
const mongoose = require('mongoose');

// Definición del esquema de datos para la colección de clientes
const clientSchema = new mongoose.Schema(
  {
    // Identificador de la empresa o inquilino al que pertenece el cliente (Multitenancy)
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',       // Relación con el modelo 'Tenant'
      required: true,      // Es obligatorio para asegurar que el cliente pertenece a una empresa
      index: true          // Crea un índice para acelerar las búsquedas por empresa
    },

    // Nombre completo del cliente
    name: {
      type: String,
      required: true,      // El nombre es obligatorio
      trim: true           // Elimina automáticamente los espacios vacíos al inicio y final
    },

    // Número de documento de identificación del cliente
    documentNumber: {
      type: String,
      required: true,      // El documento es obligatorio
      trim: true           // Elimina espacios vacíos sobrantes
    },

    // Correo electrónico de contacto
    email: {
      type: String,
      trim: true,          // Elimina espacios vacíos sobrantes
      lowercase: true      // Guarda siempre el correo en minúsculas de forma automática
    },

    // Número de teléfono de contacto
    phone: {
      type: String,
      trim: true           // Elimina espacios vacíos sobrantes
    },

    // Dirección de residencia o ubicación
    address: {
      type: String,
      trim: true           // Elimina espacios vacíos sobrantes
    },

    emailVerifiedAt: { type: Date, default: null },

    // Estado del cliente (activo o inactivo)
    isActive: {
      type: Boolean,
      default: true        // Por defecto, todo cliente nuevo se crea como activo
    }
  },
  {
    timestamps: true       // Añade automáticamente los campos 'createdAt' y 'updatedAt'
  }
);

// Índice compuesto único: Impide duplicar el mismo número de documento dentro de la misma empresa
clientSchema.index(
  { tenantId: 1, documentNumber: 1 },
  { unique: true }
);

// Compila el esquema en un modelo de Mongoose llamado 'Client' y lo exporta para la app
module.exports = mongoose.model('Client', clientSchema);

//notas:el índice compuesto { tenantId, documentNumber } permite que dos empresas registren clientes con
//el mismo documento, pero impide duplicar ese documento dentro de una misma empresa.