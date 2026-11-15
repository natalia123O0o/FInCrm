
import { useState } from "react";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { createPayment } from "../services/payments.api.js";

export default function PaymentForm({
  debts,
  onPaymentCreated,
}) {
  const { token } = useAuth();

  // Datos del formulario.
  const [debtId, setDebtId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Mensajes y estado de carga.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Solo mostramos deudas con saldo pendiente.
  const pendingDebts = debts.filter(
    (debt) =>
      debt.outstandingBalance > 0 &&
      ["PENDING", "PARTIAL"].includes(debt.status)
  );

  // Identificamos la deuda elegida.
  const selectedDebt = pendingDebts.find(
    (debt) => debt._id === debtId
  );

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const paymentAmount = Number(amount);

    // Validamos antes de enviar al backend.
    if (
      !Number.isSafeInteger(paymentAmount) ||
      paymentAmount <= 0
    ) {
      setError("Ingresa un valor entero mayor que cero.");
      return;
    }

    if (
      !selectedDebt ||
      paymentAmount > selectedDebt.outstandingBalance
    ) {
      setError("Selecciona una deuda con saldo suficiente.");
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        debtId,
        amount: paymentAmount,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
      };

      const result = await createPayment(
        token,
        paymentData
      );

      setSuccess(
        `Pago registrado. Nuevo saldo: $${result.debt.outstandingBalance.toLocaleString("es-CO")}`
      );

      // Limpiamos los campos.
      setDebtId("");
      setAmount("");
      setPaymentMethod("CASH");
      setReference("");
      setNotes("");

      // Avisamos a la página que debe actualizar las deudas.
      if (onPaymentCreated) {
        await onPaymentCreated();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "12px",
        maxWidth: "480px",
      }}
    >
      <h2>Registrar pago</h2>

      <label htmlFor="payment-debt">
        Deuda *
      </label>
      <select
        id="payment-debt"
        value={debtId}
        onChange={(event) =>
          setDebtId(event.target.value)
        }
        required
        disabled={loading}
      >
        <option value="">Seleccionar deuda</option>

        {pendingDebts.map((debt) => (
          <option key={debt._id} value={debt._id}>
            {debt.clientId?.name || "Cliente"}
            {" - "}
            {debt.description}
            {" - Saldo: $"}
            {debt.outstandingBalance.toLocaleString("es-CO")}
          </option>
        ))}
      </select>

      <label htmlFor="payment-amount">
        Valor del pago *
      </label>
      <input
        id="payment-amount"
        type="number"
        min="1"
        step="1"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
        disabled={loading}
      />

      <label htmlFor="payment-method">
        Medio de pago *
      </label>
      <select
        id="payment-method"
        value={paymentMethod}
        onChange={(event) =>
          setPaymentMethod(event.target.value)
        }
        disabled={loading}
      >
        <option value="CASH">Efectivo</option>
        <option value="TRANSFER">Transferencia</option>
        <option value="CARD">Tarjeta</option>
        <option value="OTHER">Otro</option>
      </select>

      <label htmlFor="payment-reference">
        Referencia (opcional)
      </label>
      <input
        id="payment-reference"
        type="text"
        value={reference}
        onChange={(event) =>
          setReference(event.target.value)
        }
        disabled={loading}
      />

      <label htmlFor="payment-notes">
        Observaciones (opcional)
      </label>
      <textarea
        id="payment-notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={loading}
      />

      {error && (
        <p role="alert" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}

      {success && (
        <p role="status" style={{ color: "#15803d" }}>
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || pendingDebts.length === 0}
      >
        {loading ? "Registrando..." : "Registrar pago"}
      </button>
    </form>
  );
}
