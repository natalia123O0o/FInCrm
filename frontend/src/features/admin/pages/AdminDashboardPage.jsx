
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getAuthenticatedUser } from "../../auth/services/auth.api.js";

import { getClients } from "../../clients/services/clients.api.js";

import { getDebts } from "../../debts/services/debts.api.js";

import { getPayments } from "../../payments/services/payments.api.js";


export default function AdminDashboardPage() {
  // Permite navegar entre páginas.
  const navigate = useNavigate();

  // Obtenemos los datos de la sesión.
  const { user, token, logout } = useAuth();


  // Almacena los indicadores del dashboard.
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDebts: 0,
    outstandingBalance: 0,
    totalPayments: 0,
  });

  // Controla la carga y los posibles errores.
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");


  // Guarda el resultado de la verificación.
  const [verification, setVerification] = useState("");

  // Controla si se está verificando la sesión.
  const [verifying, setVerifying] = useState(false);


  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const [clients, debts, payments] = await Promise.all([
          getClients(token),
          getDebts(token),
          getPayments(token),
        ]);

        const outstandingBalance = debts.reduce(
          (total, debt) =>
            total + Number(debt.outstandingBalance || 0),
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
          setStatsError(err.message);
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    }

    if (token) {
      loadStats();
    }

    return () => {
      active = false;
    };
  }, [token]);



  // Verifica el JWT consultando al backend.
  async function handleVerifySession() {
    setVerifying(true);
    setVerification("");

    try {
      const verifiedUser = await getAuthenticatedUser(token);

      setVerification(
        `Sesión válida. Usuario: ${verifiedUser.email}`
      );
    } catch (error) {
      setVerification(`Error: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  }

  // Cierra la sesión y regresa al login.
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main style={{ padding: "32px" }}>
      <h1>Panel administrativo de FinCRM</h1>

      <h2>Bienvenido a FinCRM</h2>

      <p>
        Usuario: {user?.name || user?.email || "Sin nombre"}
      </p>

      <p>Rol: {user?.role}</p>


      <section style={{ marginTop: "24px" }}>
        <h2>Resumen financiero</h2>

        {statsLoading && <p>Cargando indicadores...</p>}

        {statsError && (
          <p role="alert" style={{ color: "#c62828" }}>
            {statsError}
          </p>
        )}

        {!statsLoading && !statsError && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            <article>
              <h3>Clientes</h3>
              <p>{stats.totalClients}</p>
            </article>

            <article>
              <h3>Deudas</h3>
              <p>{stats.totalDebts}</p>
            </article>

            <article>
              <h3>Saldo por cobrar</h3>
              <p>
                {stats.outstandingBalance.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                })}
              </p>
            </article>

            <article>
              <h3>Pagos registrados</h3>
              <p>{stats.totalPayments}</p>
            </article>
          </div>
        )}
      </section>


      {/* Navegación a clientes */}
      <nav style={{ marginTop: "24px" }}>
        <Link to="/clients">
          Ver clientes de mi empresa
        </Link>

        {" | "}

        <Link to="/debts">
          Ver deudas de mi empresa
        </Link>
      </nav>

      {/* Verificación de autenticación */}
      <section style={{ marginTop: "24px" }}>
        <h3>Verificación de sesión</h3>

        <button
          type="button"
          onClick={handleVerifySession}
          disabled={verifying}
        >
          {verifying
            ? "Verificando..."
            : "Verificar mi sesión"}
        </button>

        <p role="status">{verification}</p>
      </section>

      {/* Cerrar sesión */}
      <button
        type="button"
        onClick={handleLogout}
        style={{ marginTop: "24px" }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
