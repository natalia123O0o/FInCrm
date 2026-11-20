import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CreditCard,
  HandCoins,
  LayoutList,
  LogOut,
  MailCheck,
  KeyRound,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getClients } from "../../clients/services/clients.api.js";
import { getDebts } from "../../debts/services/debts.api.js";
import { getPayments } from "../../payments/services/payments.api.js";
import { PATHS } from "../../../routes/paths.js";

import "./AdminDashboardPage.css";

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, token, logout, subscription, subscriptionLoading, hasFeature } = useAuth();

  const crmEnabled = hasFeature("crm");

  const [stats, setStats] = useState({
    totalClients: 0,
    totalDebts: 0,
    outstandingBalance: 0,
    totalPayments: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Conservamos las consultas reales que ya funcionan en FinCRM.
  useEffect(() => {
    let active = true;

    async function loadStats() {
      setStatsLoading(true);
      setStatsError("");

      try {
        const [clients, debts, payments] = await Promise.all([
          getClients(token),
          getDebts(token),
          getPayments(token),
        ]);

        const outstandingBalance = debts.reduce(
          (total, debt) => total + Number(debt.outstandingBalance || 0),
          0
        );

        if (active) {
          setStats({
            totalClients: clients.length,
            totalDebts: debts.length,
            outstandingBalance,
            totalPayments: payments.length,
          });
        }
      } catch (err) {
        if (active) {
          setStatsError(err.message || "No se pudieron cargar los indicadores.");
        }
      } finally {
        if (active) setStatsLoading(false);
      }
    }

    if (token && crmEnabled) {
      loadStats();
    } else {
      setStatsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [token, crmEnabled]);

  function handleLogout() {
    logout();
    navigate(PATHS.login, { replace: true });
  }

  return (
    <main className="fincrm-dashboard">
      <header className="fincrm-dashboard__header">
        <div className="fincrm-dashboard__heading">
          <h1>Panel administrativo de FinCRM</h1>
          <p>Bienvenido a FinCRM</p>
        </div>
        <div className="fincrm-dashboard__identity" aria-label="Sesión actual">
          <p>
            <span>Usuario</span>
            <strong>{user?.name || user?.email || "Sin nombre"}</strong>
          </p>
          <p>
            <span>Rol</span>
            <strong className="fincrm-dashboard__role">{user?.role || "Sin rol"}</strong>
          </p>
        </div>
      </header>

      <section className="fincrm-dashboard__session" aria-labelledby="plan-empresa" style={{ marginBottom: 24 }}>
        <h2 id="plan-empresa">{subscriptionLoading ? "Consultando tu plan..." : subscription?.planName ? `Plan ${subscription.planName}` : "Plan pendiente de asignación"}</h2>
        <p style={{ margin: "12px 0" }}>Consulta las funcionalidades, los cupos y la vigencia contratados para tu empresa.</p>
        <Link className="fincrm-dashboard__button fincrm-dashboard__button--outline" to={PATHS.myPlan}>
          <CreditCard size={18} aria-hidden="true" /> Ver mi plan
        </Link>
      </section>

      {hasFeature('crm') && <section className="fincrm-dashboard__section" aria-labelledby="resumen-financiero">
        <h2 id="resumen-financiero">Resumen financiero</h2>

        {statsLoading && (
          <p className="fincrm-dashboard__notice" role="status">
            Cargando indicadores...
          </p>
        )}
        {statsError && (
          <p className="fincrm-dashboard__notice fincrm-dashboard__notice--error" role="alert">
            {statsError}
          </p>
        )}

        {!statsLoading && !statsError && (
          <div className="fincrm-dashboard__kpis">
            <article className="fincrm-dashboard__kpi">
              <div className="fincrm-dashboard__kpi-top">
                <h3>Clientes</h3>
                <UsersRound size={20} aria-hidden="true" />
              </div>
              <p className="fincrm-dashboard__value">{stats.totalClients}</p>
            </article>

            <article className="fincrm-dashboard__kpi">
              <div className="fincrm-dashboard__kpi-top">
                <h3>Deudas</h3>
                <LayoutList size={20} aria-hidden="true" />
              </div>
              <p className="fincrm-dashboard__value">{stats.totalDebts}</p>
            </article>

            <article className="fincrm-dashboard__kpi fincrm-dashboard__kpi--featured">
              <div className="fincrm-dashboard__kpi-top">
                <h3>Saldo por cobrar</h3>
                <HandCoins size={20} aria-hidden="true" />
              </div>
              <p className="fincrm-dashboard__value fincrm-dashboard__value--money">
                {formatoCOP.format(stats.outstandingBalance)}
              </p>
            </article>

            <article className="fincrm-dashboard__kpi">
              <div className="fincrm-dashboard__kpi-top">
                <h3>Pagos registrados</h3>
                <CreditCard size={20} aria-hidden="true" />
              </div>
              <p className="fincrm-dashboard__value">{stats.totalPayments}</p>
            </article>
          </div>
        )}
      </section>}

      <nav className="fincrm-dashboard__quicklinks" aria-label="Accesos rápidos">
        {hasFeature("crm") && <Link className="fincrm-dashboard__quicklink" to={PATHS.clients}>
          <span className="fincrm-dashboard__quicklink-icon" aria-hidden="true">
            <UsersRound size={20} />
          </span>
          <h3>Ver clientes de mi empresa</h3>
          <ArrowUpRight className="fincrm-dashboard__quicklink-arrow" size={18} aria-hidden="true" />
        </Link>}
        {hasFeature("crm") && <Link className="fincrm-dashboard__quicklink" to={PATHS.debts}>
          <span className="fincrm-dashboard__quicklink-icon" aria-hidden="true">
            <LayoutList size={20} />
          </span>
          <h3>Ver deudas de mi empresa</h3>
          <ArrowUpRight className="fincrm-dashboard__quicklink-arrow" size={18} aria-hidden="true" />
        </Link>}
        {hasFeature("ai") && <Link className="fincrm-dashboard__quicklink" to={PATHS.aiChat}>
          <span className="fincrm-dashboard__quicklink-icon fincrm-dashboard__quicklink-icon--ai" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <h3>Asistente inteligente FinCRM</h3>
          <ArrowUpRight className="fincrm-dashboard__quicklink-arrow" size={18} aria-hidden="true" />
        </Link>}
      </nav>

      <section className="fincrm-dashboard__session" aria-labelledby="seguridad-cuenta" style={{ marginBottom: 24 }}>
        <h2 id="seguridad-cuenta">Seguridad de mi cuenta</h2>
        <p style={{ marginTop: 8, marginBottom: 16 }}>
          {user?.emailVerified ? "Tu correo está verificado." : "Confirma que puedes recibir mensajes en el correo de tu cuenta."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link className="fincrm-dashboard__button fincrm-dashboard__button--outline" to="/verificar-mi-correo">
            <MailCheck size={18} aria-hidden="true" /> Verificar mi correo
          </Link>
          {hasFeature("crm") && <Link className="fincrm-dashboard__button fincrm-dashboard__button--outline" to="/admin/verificar-clientes">
            <KeyRound size={18} aria-hidden="true" /> Verificar correo de clientes
          </Link>}
        </div>
      </section>

      <footer>
        <button type="button" className="fincrm-dashboard__button fincrm-dashboard__button--dark" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" /> Cerrar sesión
        </button>
      </footer>
    </main>
  );
}
