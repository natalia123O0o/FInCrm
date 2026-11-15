import { useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { createClient } from "../services/clients.api";

export default function ClientForm({ onClientCreated }) {
  const { token } = useAuth();

  // Guarda el nombre que escribe el usuario.
  const [name, setName] = useState("");

  // Guarda el número de documento.
  const [documentNumber, setDocumentNumber] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  async function handleSubmit(event) {
    // Evita que el navegador recargue la página.
    event.preventDefault();

    // Limpiamos los mensajes anteriores.
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Preparamos los datos del cliente.

      const clientData = {
        name: name.trim(),
        documentNumber: documentNumber.trim(),
      };

      // Agregamos los campos opcionales solo si tienen contenido.
      if (email.trim()) {
        clientData.email = email.trim();
      }

      if (phone.trim()) {
        clientData.phone = phone.trim();
      }

      if (address.trim()) {
        clientData.address = address.trim();
      }


      // Enviamos los datos al backend.
      const newClient = await createClient(token, clientData);

      onClientCreated?.(newClient);

      // Mostramos el resultado exitoso.
      setSuccess("Cliente registrado correctamente.");

      // Limpiamos los campos del formulario.
      setName("");
      setDocumentNumber("");
      setEmail("");
      setPhone("");
      setAddress("");
    } catch (err) {
      // Mostramos el error recibido.
      setError(err.message);
    } finally {
      // Finalizamos el estado de carga.
      setLoading(false);
    }
  }


  return (
    <form onSubmit={handleSubmit}>
      <h2>Registrar nuevo cliente</h2>

      <label htmlFor="name">
        Nombre completo
      </label>

      <input
        id="name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <label htmlFor="documentNumber">
        Número de documento
      </label>

      <input
        id="documentNumber"
        type="text"
        value={documentNumber}
        onChange={(event) =>
          setDocumentNumber(event.target.value)
        }
      />


      <label htmlFor="email">
        Correo electrónico
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="cliente@ejemplo.com"
      />

      <label htmlFor="phone">
        Teléfono
      </label>
      <input
        id="phone"
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="3001234567"
      />

      <label htmlFor="address">
        Dirección
      </label>
      <input
        id="address"
        type="text"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="Dirección del cliente"
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

      <button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Registrar cliente"}
      </button>
    </form>
  );
}


