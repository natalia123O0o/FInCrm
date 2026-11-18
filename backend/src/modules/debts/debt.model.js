const mongoose = require("mongoose");

const debtSchema = new mongoose.Schema(
  {
    // Empresa a la que pertenece la deuda
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // Cliente al que pertenece la deuda
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // Descripción de la deuda
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Referencia externa de factura o crédito.
    // Se utilizará para identificar deudas importadas por CSV.
    externalReference: {
      type: String,
      trim: true,
    },

    // Valor original de la deuda
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Saldo que todavía debe el cliente
    outstandingBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    // Fecha de vencimiento
    dueDate: {
      type: Date,
      required: true,
    },

    // Estado de la deuda
    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID"],
      default: "PENDING",
    },

    // Indica si el registro está activo
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Facilita las consultas de deudas por empresa y cliente
debtSchema.index({ tenantId: 1, clientId: 1 });

// Evitar referencias externas duplicadas dentro de una empresa.
// El índice solo aplica cuando existe una referencia de texto.
// Así no afecta las deudas creadas manualmente sin referencia.
debtSchema.index(
  { tenantId: 1, externalReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalReference: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Debt", debtSchema);
