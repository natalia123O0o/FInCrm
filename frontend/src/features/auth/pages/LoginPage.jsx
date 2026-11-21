import { Link } from "react-router-dom";
import LoginForm from "../components/LoginForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import heroVideo from "../../../assets/videos/video_Fondo_Pantalla_Hero.mp4";
import "../login.css";

export default function LoginPage() {
  const { sessionError } = useAuth();

  return (
    <main className="fincrm-login">
      {/* El mismo video de la landing; se mantiene silenciado y sin interacción. */}
      <div className="fincrm-login__media" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata">
          <source src={heroVideo} type="video/mp4" />
        </video>
      </div>
      {/* La capa oscura permite leer el formulario aunque el video sea muy luminoso. */}
      <div className="fincrm-login__veil" aria-hidden="true" />

      <div className="fincrm-login__content">
        <div className="fincrm-login__topline">
          <span className="fincrm-login__topline-dot" aria-hidden="true" />
          ACCESO A LA PLATAFORMA FINCRM
        </div>

        {sessionError && (
          <p className="fincrm-login__session-error" role="status">
            {sessionError}
          </p>
        )}

        <LoginForm />

        <Link to="/" className="fincrm-login__back">
          <span aria-hidden="true">←</span> Volver al inicio
        </Link>
      </div>
    </main>
  );
}
