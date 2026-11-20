
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
  UserRoundPlus,
  Mail,
  ShoppingCart,
  Mic,
  CalendarDays,
  Target,
  FileText,
  Megaphone,
  BarChart3,
  CreditCard,
} from "lucide-react";

import "./Sidebar.css";

export default function Sidebar() {
  const { user, hasFeature } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Enlaces disponibles según el rol del usuario
  const enlaces = [
    { nombre: "Mi plan", ruta: PATHS.myPlan, icono: CreditCard, roles: ["ADMIN"] },
    {
      nombre: "Inicio",
      ruta: PATHS.dashboard,
      icono: LayoutDashboard,
      roles: ["ADMIN"],
    },
    {
      nombre: "Clientes",
      ruta: PATHS.clients,
      feature: "crm",
      icono: Users,
      roles: ["ADMIN"],
    },
    {
      nombre: "Empleados",
      ruta: PATHS.users,
      icono: UserRoundPlus,
      roles: ["ADMIN"],
    },
    {
      nombre: "Actividades",
      ruta: PATHS.activities,
      feature: "activities",
      icono: CalendarDays,
      roles: ["ADMIN"],
    },
    {
      nombre: "Oportunidades",
      ruta: PATHS.opportunities,
      feature: "opportunities",
      icono: Target,
      roles: ["ADMIN"],
    },

    // NUEVOS MÓDULOS
    {
      nombre: "Cotizaciones",
      ruta: PATHS.quotes,
      feature: "quotes",
      icono: FileText,
      roles: ["ADMIN"],
    },
    {
      nombre: "Campañas",
      ruta: PATHS.campaigns,
      feature: "campaigns",
      icono: Megaphone,
      roles: ["ADMIN"],
    },
    {
      nombre: "Analítica de campañas",
      ruta: PATHS.campaignAnalytics,
      feature: "campaigns",
      icono: BarChart3,
      roles: ["ADMIN"],
    },

    // MÓDULOS EXISTENTES
    {
      nombre: "Deudas",
      ruta: PATHS.debts,
      feature: "crm",
      icono: Wallet,
      roles: ["ADMIN"],
    },
    {
      nombre: "Mensajería",
      ruta: PATHS.messaging,
      feature: "messaging",
      icono: Mail,
      roles: ["ADMIN"],
    },
    {
      nombre: "FinPOS",
      ruta: "/pos",
      feature: "pos",
      icono: ShoppingCart,
      roles: ["ADMIN"],
    },
    {
      nombre: "FinVoice",
      ruta: "/finvoice",
      feature: "pos",
      icono: Mic,
      roles: ["ADMIN", "USER"],
    },
    {
      nombre: "Asistente inteligente",
      ruta: PATHS.aiChat,
      feature: "ai",
      icono: Sparkles,
      roles: ["ADMIN", "USER"],
      ia: true,
    },
  ];

  // Mostrar solamente los enlaces permitidos
  const enlacesVisibles = enlaces.filter((item) =>
    item.roles.includes(user?.role) && (!item.feature || hasFeature(item.feature))
  );

  return (
    <>
      {/* ENCABEZADO MÓVIL */}
      <header className="fincrm-mobile-header">
        <span className="fincrm-brand">
          Fin<span>CRM</span>
        </span>

        <button
          type="button"
          className="fincrm-menu-button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={
            menuAbierto ? "Cerrar menú" : "Abrir menú"
          }
          aria-expanded={menuAbierto}
          aria-controls="fincrm-sidebar"
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* FONDO PARA CERRAR EL MENÚ EN MÓVIL */}
      {menuAbierto && (
        <button
          type="button"
          className="fincrm-sidebar-backdrop"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* BARRA LATERAL */}
      <aside
        id="fincrm-sidebar"
        className={`fincrm-sidebar ${
          menuAbierto ? "fincrm-sidebar--open" : ""
        }`}
      >
        {/* MARCA */}
        <div className="fincrm-sidebar-brand">
          <span className="fincrm-brand">
            Fin<span>CRM</span>
          </span>
          <small>Gestión empresarial</small>
        </div>

        {/* NAVEGACIÓN */}
        <nav
          className="fincrm-sidebar-nav"
          aria-label="Navegación principal"
        >
          {enlacesVisibles.map((item) => {
            const Icon = item.icono;

            return (
              <NavLink
                key={item.ruta}
                to={item.ruta}
                title={item.nombre}
                end={item.ruta === PATHS.campaigns}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `fincrm-sidebar-link ${
                    isActive
                      ? "fincrm-sidebar-link--active"
                      : ""
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={
                        item.ia
                          ? "fincrm-sidebar-icon-ia"
                          : ""
                      }
                      color={
                        isActive
                          ? "#F97316"
                          : item.ia
                          ? "#06B6D4"
                          : "#F8FAFC"
                      }
                      aria-hidden="true"
                    />
                    <span>{item.nombre}</span>
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
