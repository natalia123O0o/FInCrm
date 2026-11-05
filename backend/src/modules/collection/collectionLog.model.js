// Importa el módulo principal de Mongoose para la definición de esquemas y modelos de MongoDB
const mongoose = require("mongoose");

/**
 * Definición del esquema 'collectionLogSchema'.
 * Almacena el historial de todas las gestiones, comunicaciones o contactos realizados 
 * a los clientes en el proceso de cobro o cobranza.
 */
const collectionLogSchema = new mongoose.Schema(
  {
    // Empresa (Tenant) que realiza la gestión o a la que pertenece el registro (Aislamiento Multiempresa)
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",       // Relación con el modelo 'Tenant'
      required: true,      // Es un campo obligatorio
      index: true          // Crea un índice para acelerar las búsquedas y filtros por empresa
    },

    // Cliente al que se le ha realizado la gestión de cobro
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",       // Relación con el modelo 'Client'
      required: true       // Es obligatorio especificar a qué cliente va dirigida la gestión
    },

    // Deuda específica relacionada con la gestión (Opcional)
    debtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debt",         // Relación con el modelo 'Debt'
      default: null        // Si no se vincula a una deuda en particular, por defecto es nulo
    },

    // Usuario del sistema (ej. gestor, cobrador o administrador) que registra la gestión
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",         // Relación con el modelo 'User'
      required: true       // Obligatorio para saber qué usuario realizó o registró la acción
    },

    // Canal de comunicación utilizado para contactar al cliente
    channel: {
      type: String,
      enum: ["email", "sms", "call", "whatsapp"], // Restringe los valores permitidos estrictamente a estas opciones
      required: true                              // El canal es obligatorio
    },

    // Resultado obtenido tras el intento de contacto con el cliente
    result: {
      type: String,
      enum: [
        "CONTACTED",     // El cliente contestó/fue contactado
        "NO_ANSWER",     // No hubo respuesta
        "PROMISE_TO_PAY" // El cliente realizó una promesa de pago
      ],
      required: true     // El resultado de la gestión es obligatorio
    },

    // Observaciones o notas adicionales detalladas sobre la gestión
    notes: {
      type: String,
      trim: true,        // Elimina automáticamente los espacios vacíos al inicio y al final
      maxlength: 500,    // Límite máximo de 500 caracteres para evitar textos excesivamente largos
      default: ""        // Por defecto se inicializa como una cadena vacía
    },

    // Fecha y hora exacta en la que se llevó a cabo la gestión
    contactedAt: {
      type: Date,
      default: Date.now, // Por defecto toma la fecha y hora actual del servidor
      required: true     // Es obligatorio
    }
  },
  {
    timestamps: true     // Añade automáticamente los campos 'createdAt' y 'updatedAt' de control de auditoría
  }
);

// Índice compuesto avanzado:
// Facilita y optimiza las consultas para filtrar el historial de gestiones ordenadas por empresa,
// cliente y organizadas de la más reciente a la más antigua (gracias al orden descendente '-1' en 'contactedAt').
collectionLogSchema.index({
  tenantId: 1,
  clientId: 1,
  contactedAt: -1
});

// Compila el esquema en un modelo de Mongoose llamado "CollectionLog" y lo exporta para su uso en la aplicación
module.exports = mongoose.model(
  "CollectionLog",
  collectionLogSchema
);