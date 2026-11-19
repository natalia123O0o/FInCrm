
import { useState } from "react";
import { useAuth } from "../../auth/context/AuthContext.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function TenantAdminForm({
  tenant,
  onCreated,
  onCancel,
}) {
  const { token } = useAuth();

  const [tenantId, setTenantId] = useState(tenant?._id || "");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #CBD5E1",
    borderRadius: "10px",
    boxSizing: "border-box",
    font: "inherit",
  };

  const labelStyle = {
    display: "grid",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/tenants/${tenantId.trim()}/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "No se pudo crear el administrador."
        );
      }

      if (!data.admin) {
        throw new Error(
          "El servidor no devolvió el administrador."
        );
      }

      onCreated(data.admin);
    } catch (err) {
      setError(err.message || "Error al registrar administrador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: "16px" }}
    >
      <label style={labelStyle}>
        Empresa
        {tenant?._id ? (
          <input
            value={tenant.name}
            readOnly
            style={inputStyle}
          />
        ) : (
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="ID de la empresa registrada"
            required
            pattern="[0-9a-fA-F]{24}"
            style={inputStyle}
          />
        )}
      </label>

      <label style={labelStyle}>
        Nombre completo
        <input
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          required
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Correo electrónico
        <input
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          required
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Contraseña
        <input
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          minLength={8}
          autoComplete="new-password"
          required
          style={inputStyle}
        />
      </label>

      {error && (
        <p role="alert" style={{ color: "#B91C1C" }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "12px 18px",
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px 18px",
            background: "#F97316",
            color: "#0F172A",
            border: "none",
            borderRadius: "10px",
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Guardando..." : "Crear administrador"}
        </button>
      </div>
    </form>
  );
}
