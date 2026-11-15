
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getClients } from "../../clients/services/clients.api.js";
import { createDebt } from "../services/debts.api.js";

export default function DebtForm({ onDebtCreated }) {
  const { token } = useAuth();

  // Clientes disponibles para seleccionar.
  const [clients, setClients] = useState([]);

  // Datos del formulario.
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Estados para mostrar mensajes.
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Consultamos los clientes al abrir el formulario.
  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const data = await getClients(token);

        if (active) {
          setClients(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoadingClients(false);
        }
      }
    }

    loadClients();

    return () => {
      active = false;
    };
  }, [token]);

  // Registramos la deuda al enviar el formulario.
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const debtData = {
        clientId,
        description: description.trim(),
        originalAmount: Number(amount),
        dueDate,
      };

      await createDebt(token, debtData);

      setSuccess("Deuda registrada correctamente.");

      // Limpiamos los campos.
      setClientId("");
      setDescription("");
      setAmount("");
      setDueDate("");

      // Avisamos a la página para actualizar la tabla.
      if (onDebtCreated) {
        await onDebtCreated();
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
      <h2>Registrar nueva deuda</h2>

      <label htmlFor="debt-client">
        Cliente *
      </label>

      <select
        id="debt-client"
        value={clientId}
        onChange={(event) => setClientId(event.target.value)}
        required
        disabled={loadingClients || loading}
      >
        <option value="">
          {loadingClients
            ? "Cargando clientes..."
            : "Seleccionar cliente"}
        </option>

        {clients.map((client) => (
          <option key={client._id} value={client._id}>
            {client.name} - {client.documentNumber}
          </option>
        ))}
      </select>

      <label htmlFor="debt-description">
        Descripción *
      </label>

      <input
        id="debt-description"
        type="text"
        value={description}
        onChange={(event) =>
          setDescription(event.target.value)
        }
        required
      />

      <label htmlFor="debt-amount">
        Valor original *
      </label>

      <input
        id="debt-amount"
        type="number"
        min="1"
        step="0.01"
        value={amount}
        onChange={(event) =>
          setAmount(event.target.value)
        }
        required
      />

      <label htmlFor="debt-date">
        Fecha de vencimiento *
      </label>

      <input
        id="debt-date"
        type="date"
        value={dueDate}
        onChange={(event) =>
          setDueDate(event.target.value)
        }
        required
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
        disabled={loading || loadingClients || clients.length === 0}
      >
        {loading ? "Guardando..." : "Registrar deuda"}
      </button>
    </form>
  );
}
