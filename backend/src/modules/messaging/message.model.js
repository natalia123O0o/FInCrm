
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    to: {
      type: String,
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["seguimiento", "invitacion", "cobranza", "fidelizacion"],
      required: true,
    },

    authorizationConfirmed: {
      type: Boolean,
      required: true,
    },

    status: {
      type: String,
      enum: ["PROCESSING", "ACCEPTED", "FAILED"],
      default: "PROCESSING",
    },

    providerId: String,
    errorMessage: String,
  },
  { timestamps: true }
);

messageSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
