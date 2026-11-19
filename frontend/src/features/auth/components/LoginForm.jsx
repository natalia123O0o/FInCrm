import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  loginUser,
  getAuthenticatedUser,
} from "../services/auth.api.js";

import { useAuth } from "../context/AuthContext.jsx";
import { PATHS } from "../../../routes/paths.js";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(
        email.trim(),
        password
      );

      const respuestaUsuario =
        await getAuthenticatedUser(data.token);

      const verifiedUser =
        respuestaUsuario?.user ?? respuestaUsuario;

      const rol = verifiedUser?.role
        ?.trim()
        .toUpperCase();

      const rutasPorRol = {
        SUPER_ADMIN: PATHS.superAdminDashboard,
        ADMIN: PATHS.dashboard,
        USER: PATHS.userDashboard,
      };

      const destino = rutasPorRol[rol];

      if (!destino) {
        throw new Error(
          "El usuario no tiene un rol válido."
        );
      }

      login({
        token: data.token,
        user: verifiedUser,
      });

      navigate(destino, { replace: true });
    } catch (err) {
      setError(
        err.message || "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #CBD5E1",
    borderRadius: "10px",
    font: "inherit",
    boxSizing: "border-box",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        maxWidth: "420px",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          color: "#0F172A",
          marginBottom: "8px",
        }}
      >
        Iniciar sesión
      </h1>

      <label htmlFor="email">
        Correo electrónico
      </label>

      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        placeholder="correo@empresa.com"
        autoComplete="username"
        required
        style={inputStyle}
      />

      <label htmlFor="password">
        Contraseña
      </label>

      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        placeholder="Ingresa tu contraseña"
        autoComplete="current-password"
        required
        style={inputStyle}
      />

      {error && (
        <p
          role="alert"
          style={{ color: "#DC2626" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "14px",
          background: "#F97316",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "10px",
          font: "inherit",
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading
          ? "Verificando..."
          : "Ingresar a FinCRM"}
      </button>
    </form>
  );
}
