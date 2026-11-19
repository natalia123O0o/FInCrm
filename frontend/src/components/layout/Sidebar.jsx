
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext.jsx";
import { PATHS } from "../../routes/paths.js";

import {
  LayoutDashboard,
  Users,
  Wallet,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

import "./Sidebar.css";

export default function Sidebar() {
  const { user } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const role = user?.role;

  // Solo incluimos rutas que ya existen.
  const enlaces = [
    {
      nombre: "Inicio",
      ruta: PATHS.dashboard,
      icono: LayoutDashboard,
      roles: ["ADMIN"],
    },
    {
      nombre: "Clientes",
      ruta: PATHS.clients,
      icono: Users,
      roles: ["ADMIN"],
    },
    {
      nombre: "Deudas",
      ruta: PATHS.debts,
      icono: Wallet,
      roles: ["ADMIN"],
    },
    {
      nombre: "Asistente inteligente",
      ruta: PATHS.aiChat,
      icono: Sparkles,
      roles: ["ADMIN", "USER"],
      ia: true,
    },
  ];

  const enlacesVisibles = enlaces.filter((enlace) =>
    enlace.roles.includes(role)
  );

  return (
    <>
      {/* Barra superior para celulares */}
      <header className="fincrm-mobile-header">
        <span className="fincrm-brand">
          Fin<span>CRM</span>
        </span>

        <button
          type="button"
          className="fincrm-menu-button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="fincrm-sidebar"
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Fondo para cerrar el menú en móviles */}
      {menuAbierto && (
        <button
          type="button"
          className="fincrm-sidebar-backdrop"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Navegación principal */}
      <aside
        id="fincrm-sidebar"
        className={`fincrm-sidebar ${
          menuAbierto ? "fincrm-sidebar--open" : ""
        }`}
      >
        <div className="fincrm-sidebar-brand">
          <span className="fincrm-brand">
            Fin<span>CRM</span>
          </span>
          <small>Gestión empresarial</small>
        </div>

        <nav
          className="fincrm-sidebar-nav"
          aria-label="Navegación principal"
        >
          {enlacesVisibles.map((enlace) => {
            const Icono = enlace.icono;

            return (
              <NavLink
                key={enlace.ruta}
                to={enlace.ruta}
                title={enlace.nombre}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `fincrm-sidebar-link ${
                    isActive ? "fincrm-sidebar-link--active" : ""
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icono
                      size={20}
                      className={
                        enlace.ia
                          ? "fincrm-sidebar-icon-ia"
                          : ""
                      }
                      color={
                        isActive
                          ? "#F97316"
                          : enlace.ia
                            ? "#06B6D4"
                            : "#F8FAFC"
                      }
                    />

                    <span>{enlace.nombre}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
