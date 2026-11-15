
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getClients } from "../services/clients.api.js";

import ClientForm from "../components/ClientForm.jsx";

import EditClientForm from "../components/EditClientForm.jsx";

export default function ClientsListPage() {
  const { token } = useAuth();

  // Lista de clientes recibida del backend.
  const [clients, setClients] = useState([]);

  // Indica si estamos esperando la respuesta.
  const [loading, setLoading] = useState(true);

  // Guarda los posibles errores.
  const [error, setError] = useState("");

  const [editingClient, setEditingClient] = useState(null);


  function handleClientCreated(newClient) {
    setClients((previousClients) => [
      newClient,
      ...previousClients,
    ]);
  }


  function handleClientUpdated(updatedClient) {
    setClients((previousClients) =>
      previousClients.map((client) =>
        client._id === updatedClient._id
          ? updatedClient
          : client
      )
    );

    // Cerramos el formulario de edición.
    setEditingClient(null);
  }


  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const data = await getClients(token);

        if (active) {
          setClients(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main style={{ padding: "24px" }}>
      <Link to="/dashboard">
        Volver al panel
      </Link>

      <h1>Clientes de FinCRM</h1>

      <p>Consulta de clientes de tu empresa.</p>
      <section style={{ marginTop: "24px" }}>
        <ClientForm onClientCreated={handleClientCreated} />
      </section>

      {loading && <p>Cargando clientes...</p>}

      {error && (
        <p role="alert" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p>Total de clientes: {clients.length}</p>

          {clients.length === 0 ? (
            <p>No hay clientes activos registrados.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {clients.map((client) => (
                    <tr key={client._id}>
                      <td>{client.name}</td>
                      <td>{client.documentNumber}</td>
                      <td>{client.email || "Sin correo"}</td>
                      <td>{client.phone || "Sin teléfono"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setEditingClient(client)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {editingClient && (
                  <section style={{ marginTop: "32px" }}>
                    <EditClientForm
                      key={editingClient._id}
                      client={editingClient}
                      onClientUpdated={handleClientUpdated}
                      onCancel={() => setEditingClient(null)}
                    />
                  </section>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
