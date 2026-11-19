
import { useState } from "react";
import { useAuth } from "../../auth/context/AuthContext.jsx";

const campos = [
  { name: "name", label: "Nombre de la empresa", required: true },
  { name: "subdomain", label: "Subdominio", required: true },
  { name: "nit", label: "NIT (sin dígito de verificación)", required: true },
  { name: "verificationDigit", label: "Dígito de verificación", required: true },
  { name: "email", label: "Correo empresarial", type: "email" },
  { name: "phone", label: "Teléfono" },
  { name: "address", label: "Dirección" },
  { name: "city", label: "Ciudad" },
];

export default function TenantForm({ onCreated }) {
  const { token } = useAuth();

  const [form, setForm] = useState(
    Object.fromEntries(campos.map((campo) => [campo.name, ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:4000";

      const response = await fetch(`${API_URL}/api/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo crear la empresa.");
      }

      if (!data.tenant) {
        throw new Error("El servidor no devolvió la empresa creada.");
      }

      onCreated(data.tenant);
    } catch (err) {
      setError(err.message || "No se pudo conectar al servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: "14px" }}
    >
      {campos.map((campo) => (
        <label
          key={campo.name}
          style={{
            display: "grid",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {campo.label}

          <input
            type={campo.type || "text"}
            required={Boolean(campo.required)}
            value={form[campo.name]}
            onChange={(event) =>
              setForm({
                ...form,
                [campo.name]: event.target.value,
              })
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #CBD5E1",
              borderRadius: "10px",
              font: "inherit",
            }}
          />
        </label>
      ))}

      <p style={{ fontSize: "12px", color: "#64748B" }}>
        El dígito de verificación debe coincidir con el NIT.
        Puedes consultarlo en el RUT de la empresa.
      </p>

      {error && <p role="alert" style={{ color: "#B91C1C" }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        style={{
          background: "#F97316",
          color: "#0F172A",
          padding: "13px",
          border: "none",
          borderRadius: "10px",
          fontWeight: 700,
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? "Registrando..." : "Registrar empresa"}
      </button>
    </form>
  );
}
