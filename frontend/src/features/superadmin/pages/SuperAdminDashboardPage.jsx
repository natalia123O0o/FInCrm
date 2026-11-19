
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { PATHS } from "../../../routes/paths.js";

import Modal from "../../../components/common/Modal.jsx";
import TenantForm from "../components/TenantForm.jsx";
import TenantAdminForm from "../components/TenantAdminForm.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

const styles = {
  page: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "32px 24px",
    color: "#0F172A",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "32px",
  },

  title: {
    margin: "8px 0",
    fontSize: "clamp(28px, 3vw, 40px)",
    fontWeight: 800,
  },

  subtitle: {
    color: "#64748B",
    margin: "6px 0",
  },

  actions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },

  primaryButton: {
    padding: "12px 20px",
    background: "#F97316",
    color: "#0F172A",
    border: "none",
    borderRadius: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "12px 20px",
    background: "#FFFFFF",
    color: "#0F172A",
    border: "1px solid #CBD5E1",
    borderRadius: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  darkButton: {
    padding: "10px 14px",
    background: "#0F172A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },

  card: {
    padding: "24px",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "16px",
    marginBottom: "24px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },

  table: {
    width: "100%",
    minWidth: "750px",
    borderCollapse: "collapse",
    textAlign: "left",
  },

  th: {
    padding: "14px",
    background: "#F8FAFC",
    borderBottom: "1px solid #E2E8F0",
    color: "#64748B",
    fontSize: "13px",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #E2E8F0",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #CBD5E1",
    borderRadius: "10px",
    boxSizing: "border-box",
    marginTop: "8px",
    font: "inherit",
  },
};

export default function SuperAdminDashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // Modales
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Empresas
  const [empresas, setEmpresas] = useState([]);
  const [empresaCreada, setEmpresaCreada] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  // Administradores
  const [adminCreado, setAdminCreado] = useState(null);

  // Estados de consulta
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [errorEmpresas, setErrorEmpresas] = useState("");
  const [recargarEmpresas, setRecargarEmpresas] = useState(0);

  // Consultar empresas registradas
  useEffect(() => {
    if (!token) {
      setEmpresas([]);
      setCargandoEmpresas(false);
      return;
    }

    const controller = new AbortController();

    async function cargarEmpresas() {
      try {
        setCargandoEmpresas(true);
        setErrorEmpresas("");

        const response = await fetch(`${API_URL}/api/tenants`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "No fue posible consultar las empresas."
          );
        }

        if (!Array.isArray(data.tenants)) {
          throw new Error(
            "El servidor no devolvió una lista válida de empresas."
          );
        }

        if (!controller.signal.aborted) {
          setEmpresas(data.tenants);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorEmpresas(
            error.message || "Error al consultar empresas."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoEmpresas(false);
        }
      }
    }

    cargarEmpresas();

    return () => controller.abort();
  }, [token, recargarEmpresas]);

  // Empresa recién creada, disponible antes de recargar el listado
  const empresasDisponibles =
    empresaCreada?._id &&
    !empresas.some((empresa) => empresa._id === empresaCreada._id)
      ? [empresaCreada, ...empresas]
      : empresas;

  // Registrar nueva empresa
  function handleTenantCreated(tenant) {
    setEmpresaCreada(tenant);
    setEmpresaSeleccionada(tenant);
    setShowTenantModal(false);
    setRecargarEmpresas((valor) => valor + 1);
  }

  // Abrir modal de administrador
  function abrirModalAdministrador(tenant = null) {
    setEmpresaSeleccionada(tenant);
    setShowAdminModal(true);
  }

  // Registrar administrador
  function handleAdminCreated(admin) {
    setAdminCreado(admin);
    setShowAdminModal(false);
    setEmpresaSeleccionada(null);
  }

  // Cerrar sesión
  function handleLogout() {
    logout();
    navigate(PATHS.login, { replace: true });
  }

  return (
    <main style={styles.page}>
      {/* ENCABEZADO */}
      <header style={styles.header}>
        <div>
          <p style={styles.subtitle}>
            Administración de la plataforma
          </p>

          <h1 style={styles.title}>
            Panel de SUPER_ADMIN
          </h1>

          <p style={styles.subtitle}>
            Bienvenido, {user?.name || user?.email}.
          </p>

          <p style={styles.subtitle}>
            Gestiona las empresas y sus administradores.
          </p>
        </div>
      </header>

      {/* ACCIONES PRINCIPALES */}
      <section style={styles.actions}>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => setShowTenantModal(true)}
        >
          + Nueva empresa
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => abrirModalAdministrador()}
        >
          + Nuevo administrador
        </button>
      </section>

      {/* MENSAJES DE CONFIRMACIÓN */}
      {empresaCreada && (
        <p role="status" style={{ color: "#047857" }}>
          Empresa registrada: {empresaCreada.name}
        </p>
      )}

      {adminCreado && (
        <p role="status" style={{ color: "#047857" }}>
          Administrador registrado: {adminCreado.name}
        </p>
      )}

      {/* RESUMEN */}
      <section style={styles.grid}>
        <article style={styles.card}>
          <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>
            Empresas registradas
          </h2>

          <p
            style={{
              fontSize: "32px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {cargandoEmpresas || errorEmpresas
              ? "—"
              : empresas.length}
          </p>

          <p style={styles.subtitle}>
            Empresas disponibles en FinCRM
          </p>
        </article>

        <article style={styles.card}>
          <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>
            Administradores
          </h2>

          <p style={styles.subtitle}>
            Crea administradores asociados a cada empresa.
          </p>
        </article>
      </section>

      {/* LISTADO DE EMPRESAS */}
      <section style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", margin: "0 0 8px" }}>
              Empresas registradas
            </h2>

            <p style={styles.subtitle}>
              Consulta las empresas y administra sus accesos.
            </p>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() =>
              setRecargarEmpresas((valor) => valor + 1)
            }
            disabled={cargandoEmpresas}
          >
            Actualizar lista
          </button>
        </div>

        {cargandoEmpresas && (
          <p role="status">Cargando empresas...</p>
        )}

        {errorEmpresas && (
          <p role="alert" style={{ color: "#B91C1C" }}>
            {errorEmpresas}
          </p>
        )}

        {!cargandoEmpresas && !errorEmpresas && (
          <>
            {empresas.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  background: "#F8FAFC",
                  borderRadius: "12px",
                }}
              >
                <h3>No hay empresas registradas</h3>

                <p style={styles.subtitle}>
                  Registra una empresa para comenzar.
                </p>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => setShowTenantModal(true)}
                >
                  + Nueva empresa
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Empresa</th>
                      <th style={styles.th}>NIT</th>
                      <th style={styles.th}>Subdominio</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {empresas.map((empresa) => (
                      <tr key={empresa._id}>
                        <td style={styles.td}>
                          <strong>{empresa.name}</strong>
                        </td>

                        <td style={styles.td}>
                          {empresa.nit || "—"}
                        </td>

                        <td style={styles.td}>
                          {empresa.subdomain || "—"}
                        </td>

                        <td style={styles.td}>
                          {empresa.status || "Sin especificar"}
                        </td>

                        <td style={styles.td}>
                          <button
                            type="button"
                            style={styles.darkButton}
                            onClick={() =>
                              abrirModalAdministrador(empresa)
                            }
                          >
                            Crear administrador
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL REGISTRAR EMPRESA */}
      <Modal
        open={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        title="Registrar nueva empresa"
        label="ADMINISTRACIÓN DE FINCRM"
      >
        <TenantForm onCreated={handleTenantCreated} />
      </Modal>

      {/* MODAL REGISTRAR ADMINISTRADOR */}
      <Modal
        open={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setEmpresaSeleccionada(null);
        }}
        title="Registrar administrador"
        label="GESTIÓN DE EMPRESAS"
      >
        {empresasDisponibles.length > 0 ? (
          <>
            <label
              htmlFor="seleccionar-empresa-admin"
              style={{ fontSize: "13px", fontWeight: 600 }}
            >
              Seleccionar empresa
            </label>

            <select
              id="seleccionar-empresa-admin"
              value={empresaSeleccionada?._id || ""}
              onChange={(event) => {
                const empresa = empresasDisponibles.find(
                  (item) => item._id === event.target.value
                );

                setEmpresaSeleccionada(empresa || null);
              }}
              style={styles.input}
            >
              <option value="">
                Selecciona una empresa
              </option>

              {empresasDisponibles.map((empresa) => (
                <option
                  key={empresa._id}
                  value={empresa._id}
                >
                  {empresa.name}
                </option>
              ))}
            </select>

            {empresaSeleccionada?._id && (
              <div style={{ marginTop: "20px" }}>
                <TenantAdminForm
                  key={empresaSeleccionada._id}
                  tenant={empresaSeleccionada}
                  onCancel={() => {
                    setShowAdminModal(false);
                    setEmpresaSeleccionada(null);
                  }}
                  onCreated={handleAdminCreated}
                />
              </div>
            )}
          </>
        ) : (
          <p>
            Primero debes registrar una empresa para
            crear su administrador.
          </p>
        )}
      </Modal>

      {/* CERRAR SESIÓN */}
      <footer style={{ marginTop: "32px" }}>
        <button
          type="button"
          onClick={handleLogout}
          style={styles.darkButton}
        >
          Cerrar sesión
        </button>
      </footer>
    </main>
  );
}
