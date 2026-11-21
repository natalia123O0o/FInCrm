import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getAuthenticatedUser } from "../services/auth.api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PATHS } from "../../../routes/paths.js";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email.trim(), password);
      const respuestaUsuario = await getAuthenticatedUser(data.token);
      const verifiedUser = respuestaUsuario?.user ?? respuestaUsuario;
      const rol = verifiedUser?.role?.trim().toUpperCase();
      const rutasPorRol = {
        SUPER_ADMIN: PATHS.superAdminDashboard,
        ADMIN: PATHS.dashboard,
        USER: PATHS.userDashboard,
      };
      const destino = rutasPorRol[rol];
      if (!destino) throw new Error("El usuario no tiene un rol válido.");

      login({ token: data.token, user: verifiedUser });
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="fincrm-login-card" onSubmit={handleSubmit} aria-label="Inicio de sesión de FinCRM">
      <div className="fincrm-login-card__brand" aria-label="FinCRM">
        <span className="fincrm-login-card__mark" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span>Fin<span>CRM</span></span>
      </div>

      <h1 className="fincrm-login-card__title">Iniciar sesión</h1>
      <p className="fincrm-login-card__subtitle">
        Accede de forma segura a tu espacio de trabajo.
      </p>

      <div className="fincrm-login-card__group">
        <label className="fincrm-login-card__label" htmlFor="email">Correo electrónico</label>
        <div className="fincrm-login-card__field">
          <svg className="fincrm-login-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@empresa.com"
            autoComplete="username"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="fincrm-login-card__group">
        <label className="fincrm-login-card__label" htmlFor="password">Contraseña</label>
        <div className="fincrm-login-card__field">
          <svg className="fincrm-login-card__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            required
            disabled={loading}
          />
          <button
            className="fincrm-login-card__toggle"
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            disabled={loading}
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      <div className="fincrm-login-card__links">
        <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
      </div>

      {error && <p className="fincrm-login-card__error" role="alert">{error}</p>}

      <button className="fincrm-login-card__submit" type="submit" disabled={loading}>
        {loading ? "Verificando..." : "Ingresar a FinCRM"}
        {!loading && <span aria-hidden="true">→</span>}
      </button>

      <p className="fincrm-login-card__footnote">Acceso exclusivo para usuarios autorizados.</p>
    </form>
  );
}
