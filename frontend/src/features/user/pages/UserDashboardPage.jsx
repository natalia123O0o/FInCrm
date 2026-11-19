
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  Bell,
  Sparkles,
  LogOut,
  UserRound,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { PATHS } from "../../../routes/paths.js";
import "./UserDashboardPage.css";

export default function UserDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(PATHS.login, { replace: true });
  }

  const nombre = user?.name || "Colaborador";

  return (
    <div className="user-panel">
      <header className="user-topbar">
        <Link
          className="user-brand"
          to={PATHS.userDashboard}
        >
          <span className="user-brand-mark">F</span>
          <span>FinCRM</span>
        </Link>

        <div className="user-account">
          <span className="user-account-name">
            {nombre}
          </span>

          <button
            type="button"
            className="user-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </header>

      <div className="user-shell">
        <aside className="user-sidebar">
          <div className="user-sidebar-label">
            ESPACIO DE TRABAJO
          </div>

          <Link
            to={PATHS.userDashboard}
            className="user-nav-link active"
          >
            <LayoutDashboard size={19} />
            Mi panel
          </Link>

          <Link
            to={PATHS.aiChat}
            className="user-nav-link"
          >
            <Sparkles size={19} />
            Asistente IA
          </Link>

          <div className="user-sidebar-note">
            Las oportunidades, tareas y alertas se
            habilitarán al conectar sus módulos.
          </div>
        </aside>

        <main className="user-main">
          <div className="user-heading">
            <p className="user-eyebrow">
              ESPACIO DEL COLABORADOR
            </p>

            <h1>¡Hola, {nombre}!</h1>

            <p>
              Bienvenido a tu espacio de trabajo.
              Aquí podrás consultar tus actividades
              comerciales y realizar seguimientos.
            </p>
          </div>

          <section className="user-profile">
            <div className="user-profile-icon">
              <UserRound size={25} />
            </div>

            <div>
              <h2>Mi información</h2>

              <p>
                <strong>Nombre:</strong> {nombre}
              </p>

              <p>
                <strong>Correo:</strong>{" "}
                {user?.email || "No disponible"}
              </p>

              <p>
                <strong>Rol:</strong> USER
              </p>
            </div>
          </section>

          <h2 className="user-section-title">
            Mis herramientas
          </h2>

          <div className="user-cards">
            <article className="user-card">
              <div className="user-card-icon">
                <Target size={23} />
              </div>

              <h3>Mis oportunidades</h3>

              <p>
                Consulta los clientes y negocios
                comerciales que te asignen.
              </p>

              <span className="user-pending">
                Próximamente
              </span>
            </article>

            <article className="user-card">
              <div className="user-card-icon">
                <CalendarDays size={23} />
              </div>

              <h3>Mis actividades</h3>

              <p>
                Organiza llamadas, reuniones y
                próximos seguimientos.
              </p>

              <span className="user-pending">
                Próximamente
              </span>
            </article>

            <article className="user-card">
              <div className="user-card-icon">
                <Bell size={23} />
              </div>

              <h3>Mis alertas</h3>

              <p>
                Revisa avisos de seguimientos
                pendientes o vencidos.
              </p>

              <span className="user-pending">
                Próximamente
              </span>
            </article>

            <article className="user-card">
              <div className="user-card-icon">
                <Sparkles size={23} />
              </div>

              <h3>Asistente inteligente</h3>

              <p>
                Accede al asistente de FinCRM
                según los permisos de tu usuario.
              </p>

              <Link
                className="user-card-link"
                to={PATHS.aiChat}
              >
                Abrir asistente
                <ArrowRight size={17} />
              </Link>
            </article>
          </div>

          <section className="user-info">
            <h2>
              <Bell size={20} />
              Seguimiento comercial
            </h2>

            <p>
              Cuando esté disponible el módulo
              de oportunidades, FinCRM mostrará
              aquí los seguimientos que requieren
              tu atención.
            </p>

            <p>
              Si una actividad vence, el sistema
              podrá generar una alerta. Los
              incumplimientos repetidos también
              podrán notificarse al administrador,
              según las reglas configuradas.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
