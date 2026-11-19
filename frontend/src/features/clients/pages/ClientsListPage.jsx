
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getClients } from "../services/clients.api.js";

import ClientForm from "../components/ClientForm.jsx";
import EditClientForm from "../components/EditClientForm.jsx";
import ImportClientsCsv from "../components/ImportClientsCsv.jsx";

import { exportarClientesCsv } from "../services/exportClientsCsv.js";
import { exportarClientesXlsx } from "../services/exportClientsXlsx.js";
import { exportarClientesPdf } from "../services/exportClientsPdf.js";

import ExportButtons from "../../../components/ExportButtons.jsx";
import Modal from "../../../components/common/Modal.jsx";

import "./ClientsListPage.css";

export default function ClientsListPage() {
  const { token } = useAuth();

  // Datos de clientes.
  const [clients, setClients] = useState([]);

  // Filtros.
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Estados de consulta.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Control de modales.
  const [showClientForm, setShowClientForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Paginación.
  const [paginaActual, setPaginaActual] = useState(1);
  const clientesPorPagina = 10;

  // Actualizar lista después de registrar.
  function handleClientCreated(newClient) {
    setClients((previousClients) => [
      newClient,
      ...previousClients,
    ]);

    setShowClientForm(false);
    setPaginaActual(1);
  }

  // Actualizar lista después de editar.
  function handleClientUpdated(updatedClient) {
    setClients((previousClients) =>
      previousClients.map((client) =>
        client._id === updatedClient._id
          ? updatedClient
          : client
      )
    );

    setEditingClient(null);
  }

  // Actualizar lista después de importar CSV.
  async function handleClientsImported() {
    const data = await getClients(token);
    setClients(data);
    setPaginaActual(1);
    setShowImportModal(false);
  }

  // Consultar clientes del backend.
  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        setLoading(true);
        setError("");

        const data = await getClients(token);

        if (active) {
          setClients(data);
          setPaginaActual(1);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "No fue posible consultar los clientes"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (token) {
      loadClients();
    } else {
      setClients([]);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [token]);

  // Filtrar clientes.
  const clientesFiltrados = clients.filter((client) => {
    const textoBusqueda = busquedaCliente.trim().toLowerCase();

    const nombre = String(client.name || "").toLowerCase();
    const documento = String(
      client.documentNumber || ""
    ).toLowerCase();

    const coincideBusqueda =
      nombre.includes(textoBusqueda) ||
      documento.includes(textoBusqueda);

    const fechaRegistro = client.createdAt
      ? String(client.createdAt).slice(0, 10)
      : "";

    const coincideDesde =
      fechaDesde === "" ||
      (fechaRegistro !== "" && fechaRegistro >= fechaDesde);

    const coincideHasta =
      fechaHasta === "" ||
      (fechaRegistro !== "" && fechaRegistro <= fechaHasta);

    return (
      coincideBusqueda &&
      coincideDesde &&
      coincideHasta
    );
  });

  // Calcular paginación.
  const totalPaginas = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / clientesPorPagina)
  );

  const paginaVisible = Math.min(paginaActual, totalPaginas);

  const indiceInicial = (paginaVisible - 1) * clientesPorPagina;

  const clientesPaginados = clientesFiltrados.slice(
    indiceInicial,
    indiceInicial + clientesPorPagina
  );

  const indiceFinal = Math.min(
    indiceInicial + clientesPorPagina,
    clientesFiltrados.length
  );

  // Limpiar filtros.
  function limpiarFiltros() {
    setBusquedaCliente("");
    setFechaDesde("");
    setFechaHasta("");
    setPaginaActual(1);
  }

  return (
    <main className="clients-page">

      {/* ENCABEZADO */}
      <header className="clients-header">
        <div>
          <Link to="/dashboard" className="clients-back">
            ← Volver al panel
          </Link>

          <h1>Clientes</h1>

          <p>
            Administra la información y las relaciones
            comerciales de tus clientes.
          </p>
        </div>

        <div className="clients-actions">
          <button
            type="button"
            className="clients-btn clients-btn-primary"
            onClick={() => setShowClientForm(true)}
          >
            + Nuevo cliente
          </button>

          <button
            type="button"
            className="clients-btn clients-btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            Importar CSV
          </button>
        </div>
      </header>

      {/* MODAL NUEVO CLIENTE */}
      <Modal
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        title="Registrar nuevo cliente"
        label="GESTIÓN DE CLIENTES"
      >
        <ClientForm
          onClientCreated={handleClientCreated}
        />
      </Modal>

      {/* MODAL IMPORTACIÓN CSV */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar clientes"
        label="GESTIÓN DE DATOS"
      >
        <ImportClientsCsv
          token={token}
          onImported={handleClientsImported}
        />
      </Modal>

      {/* FILTROS */}
      <section
        className="clients-filters"
        aria-label="Filtros de clientes"
      >
        <div className="clients-section-heading">
          <h2>Buscar clientes</h2>
          <p>
            Encuentra clientes por nombre, documento
            o fecha de registro.
          </p>
        </div>

        <div className="clients-filter-grid">
          <div className="clients-field clients-search">
            <label htmlFor="buscar-cliente">
              Nombre o documento
            </label>

            <input
              id="buscar-cliente"
              type="search"
              placeholder="Buscar cliente..."
              value={busquedaCliente}
              onChange={(evento) => {
                setBusquedaCliente(evento.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          <div className="clients-field">
            <label htmlFor="cliente-fecha-desde">
              Registrado desde
            </label>

            <input
              id="cliente-fecha-desde"
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(evento) => {
                setFechaDesde(evento.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          <div className="clients-field">
            <label htmlFor="cliente-fecha-hasta">
              Registrado hasta
            </label>

            <input
              id="cliente-fecha-hasta"
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(evento) => {
                setFechaHasta(evento.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          <button
            type="button"
            className="clients-btn clients-btn-secondary"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* ESTADOS DE CARGA */}
      {loading && (
        <p className="clients-message">
          Cargando clientes...
        </p>
      )}

      {error && (
        <p className="clients-error" role="alert">
          {error}
        </p>
      )}

      {/* LISTADO */}
      {!loading && !error && (
        <section
          className="clients-list"
          aria-label="Listado de clientes"
        >
          <div className="clients-list-header">
            <div>
              <h2>Directorio de clientes</h2>
              <p>
                {clientesFiltrados.length} de {clients.length} clientes
              </p>
            </div>

            <div className="clients-export">
              <ExportButtons
                data={clientesFiltrados}
                onExportCsv={exportarClientesCsv}
                onExportXlsx={exportarClientesXlsx}
                onExportPdf={exportarClientesPdf}
              />
            </div>
          </div>

          {clientesFiltrados.length === 0 ? (
            <div className="clients-empty">
              <h3>
                {clients.length === 0
                  ? "Todavía no tienes clientes"
                  : "No encontramos resultados"}
              </h3>

              <p>
                {clients.length === 0
                  ? "Registra tu primer cliente para comenzar."
                  : "Prueba con otros criterios de búsqueda."}
              </p>
            </div>
          ) : (
            <>
              <div className="clients-table-scroll">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Documento</th>
                      <th>Correo electrónico</th>
                      <th>Teléfono</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {clientesPaginados.map((client) => (
                      <tr key={client._id}>
                        <td className="clients-name">
                          {client.name}
                        </td>

                        <td>{client.documentNumber}</td>

                        <td>
                          {client.email || "Sin correo"}
                        </td>

                        <td>
                          {client.phone || "Sin teléfono"}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="clients-btn-edit"
                            onClick={() => setEditingClient(client)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINACIÓN */}
              <div className="clients-pagination">
                <p>
                  Mostrando {indiceInicial + 1}–{indiceFinal} de{" "}
                  {clientesFiltrados.length}
                </p>

                <div className="clients-pagination-controls">
                  <button
                    type="button"
                    disabled={paginaVisible === 1}
                    onClick={() =>
                      setPaginaActual(paginaVisible - 1)
                    }
                  >
                    Anterior
                  </button>

                  <span>
                    Página {paginaVisible} de {totalPaginas}
                  </span>

                  <button
                    type="button"
                    disabled={paginaVisible === totalPaginas}
                    onClick={() =>
                      setPaginaActual(paginaVisible + 1)
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* MODAL EDITAR CLIENTE */}
      <Modal
        open={Boolean(editingClient)}
        onClose={() => setEditingClient(null)}
        title="Editar cliente"
        label="GESTIÓN DE CLIENTES"
      >
        {editingClient && (
          <EditClientForm
            key={editingClient._id}
            client={editingClient}
            onClientUpdated={handleClientUpdated}
            onCancel={() => setEditingClient(null)}
          />
        )}
      </Modal>
    </main>
  );
}
