
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getClients } from "../services/clients.api.js";

import ClientForm from "../components/ClientForm.jsx";
import EditClientForm from "../components/EditClientForm.jsx";

import ImportClientsCsv from "../components/ImportClientsCsv.jsx";

export default function ClientsListPage() {
  const { token } = useAuth();

  // Clientes obtenidos desde MongoDB.
  const [clients, setClients] = useState([]);

  // Filtros de búsqueda.
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Estados de la página.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cliente seleccionado para editar.
  const [editingClient, setEditingClient] = useState(null);

  // Actualiza la lista cuando se crea un cliente.
  function handleClientCreated(newClient) {
    setClients((previousClients) => [
      newClient,
      ...previousClients,
    ]);
  }

  // Actualiza la lista cuando se modifica un cliente.
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

  // Obtener clientes desde el backend.
  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        setLoading(true);
        setError("");

        const data = await getClients(token);

        if (active) {
          setClients(data);
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

  // Aplicar filtros a los clientes cargados.
  const clientesFiltrados = clients.filter((client) => {
    // Buscar por nombre o documento.
    const textoBusqueda = busquedaCliente.trim().toLowerCase();

    const nombre = String(client.name || "").toLowerCase();

    const documento = String(
      client.documentNumber || ""
    ).toLowerCase();

    const coincideBusqueda =
      nombre.includes(textoBusqueda) ||
      documento.includes(textoBusqueda);

    // Fecha de creación del cliente.
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

  // Restablecer los filtros.
  function limpiarFiltros() {
    setBusquedaCliente("");
    setFechaDesde("");
    setFechaHasta("");
  }

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "6px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    boxSizing: "border-box",
  };

  const thStyle = {
    padding: "12px",
    borderBottom: "2px solid #e2e8f0",
    textAlign: "left",
    backgroundColor: "#f1f5f9",
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
  };

  return (
    <main style={{ padding: "24px" }}>
      <Link to="/dashboard">
        Volver al panel
      </Link>

      <h1>Clientes de FinCRM</h1>

      <p>Consulta y administra los clientes de tu empresa.</p>

      {/* FORMULARIO PARA REGISTRAR CLIENTES */}
      <section style={{ marginTop: "24px" }}>
        <ClientForm onClientCreated={handleClientCreated} />
      </section>

      <ImportClientsCsv token={token} />

      {/* FILTROS */}
      <section
        aria-label="Filtros de clientes"
        style={{
          marginTop: "32px",
          marginBottom: "24px",
          padding: "20px",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          backgroundColor: "#f8fafc",
        }}
      >
        <h2>Buscar y filtrar clientes</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "16px",
          }}
        >
          {/* BUSCAR POR NOMBRE O DOCUMENTO */}
          <div style={{ flex: "1 1 220px" }}>
            <label htmlFor="buscar-cliente">
              Nombre o documento
            </label>

            <input
              id="buscar-cliente"
              type="search"
              placeholder="Ej. Ana o 10203040"
              value={busquedaCliente}
              onChange={(evento) =>
                setBusquedaCliente(evento.target.value)
              }
              style={inputStyle}
            />
          </div>

          {/* FECHA INICIAL */}
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="cliente-fecha-desde">
              Registrado desde
            </label>

            <input
              id="cliente-fecha-desde"
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(evento) =>
                setFechaDesde(evento.target.value)
              }
              style={inputStyle}
            />
          </div>

          {/* FECHA FINAL */}
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="cliente-fecha-hasta">
              Registrado hasta
            </label>

            <input
              id="cliente-fecha-hasta"
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(evento) =>
                setFechaHasta(evento.target.value)
              }
              style={inputStyle}
            />
          </div>

          {/* LIMPIAR FILTROS */}
          <button
            type="button"
            onClick={limpiarFiltros}
            style={{
              padding: "10px 16px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              cursor: "pointer",
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* ESTADOS DE CARGA */}
      {loading && <p>Cargando clientes...</p>}

      {error && (
        <p role="alert" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}

      {/* LISTADO DE CLIENTES */}
      {!loading && !error && (
        <section aria-label="Listado de clientes">
          <p>
            Mostrando {clientesFiltrados.length} de {clients.length} clientes
          </p>

          {clientesFiltrados.length === 0 ? (
            <p>
              {clients.length === 0
                ? "No hay clientes activos registrados."
                : "No se encontraron clientes con los filtros seleccionados."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Nombre</th>
                    <th style={thStyle}>Documento</th>
                    <th style={thStyle}>Correo</th>
                    <th style={thStyle}>Teléfono</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {clientesFiltrados.map((client) => (
                    <tr key={client._id}>
                      <td style={tdStyle}>{client.name}</td>

                      <td style={tdStyle}>
                        {client.documentNumber}
                      </td>

                      <td style={tdStyle}>
                        {client.email || "Sin correo"}
                      </td>

                      <td style={tdStyle}>
                        {client.phone || "Sin teléfono"}
                      </td>

                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => setEditingClient(client)}
                          style={{
                            padding: "8px 14px",
                            backgroundColor: "#142c49",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* FORMULARIO PARA EDITAR CLIENTES */}
      {editingClient && (
        <section
          style={{
            marginTop: "32px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
          }}
        >
          <h2>Editar cliente</h2>

          <EditClientForm
            key={editingClient._id}
            client={editingClient}
            onClientUpdated={handleClientUpdated}
            onCancel={() => setEditingClient(null)}
          />
        </section>
      )}
    </main>
  );
}
