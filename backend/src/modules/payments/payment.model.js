const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Empresa propietaria del pago
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // Deuda a la que pertenece el pago
    debtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debt",
      required: true,
    },

    // Cliente que realiza el pago
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // Valor del pago
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Fecha del pago
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Medio de pago
    paymentMethod: {
      type: String,
      enum: ["CASH", "TRANSFER", "CARD", "OTHER"],
      required: true,
    },

    // Referencia o comprobante
    reference: {
      type: String,
      trim: true,
      default: "",
    },

    // Identificador del abono en una importacion CSV.
    // Los pagos manuales no necesitan este campo.
    importReference: {
      type: String,
      trim: true,
      default: undefined,
    },

    // Observaciones
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Facilita consultar pagos por empresa y deuda
paymentSchema.index({
  tenantId: 1,
  debtId: 1,
});


paymentSchema.index(
  { tenantId: 1, importReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      importReference: { $type: "string" },
    },
  }
);


module.exports = mongoose.model("Payment", paymentSchema);
