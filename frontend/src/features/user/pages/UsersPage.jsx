import { useEffect, useState } from "react";
import { Users, UserPlus, X, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext.jsx";
import "./UsersPage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UsersPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "No se pudieron consultar los empleados."
        );
      }

      if (!Array.isArray(data.users)) {
        throw new Error("El servidor no devolvió una lista válida.");
      }

      setUsers(data.users);
    } catch (err) {
      setError(err.message || "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;

    let active = true;
    const controller = new AbortController();

    async function fetchUsers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "No se pudieron consultar los empleados.");
        }

        if (!Array.isArray(data.users)) {
          throw new Error("El servidor no devolvió una lista válida.");
        }

        if (active) setUsers(data.users);
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(err.message || "Error de conexión.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchUsers();

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  function openModal() {
    setForm({ name: "", email: "", password: "" });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setFormError("");
    setForm({ name: "", email: "", password: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "No se pudo registrar el empleado."
        );
      }

      setSuccess("Empleado registrado correctamente.");
      setShowModal(false);
      setForm({ name: "", email: "", password: "" });

      // Consultar de nuevo para mostrar el empleado registrado.
      await loadUsers();
    } catch (err) {
      setFormError(err.message || "Error al registrar empleado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="fin-users-page">
      <div className="fin-users-header">
        <div>
          <p className="fin-users-eyebrow">
            ADMINISTRACIÓN DE EMPRESA
          </p>

          <h1>Empleados</h1>
          <p>
            Registra y consulta los usuarios de tu empresa.
          </p>
        </div>

        <button
          type="button"
          className="fin-users-primary"
          onClick={openModal}
        >
          <UserPlus size={18} />
          Nuevo empleado
        </button>
      </div>

      <section className="fin-users-summary">
        <div className="fin-users-summary-icon">
          <Users size={25} />
        </div>

        <div>
          <span>Empleados registrados</span>
          <strong>
            {loading || error ? "—" : users.length}
          </strong>
        </div>
      </section>

      {success && (
        <p className="fin-users-success" role="status">
          {success}
        </p>
      )}

      <section className="fin-users-table-card">
        <div className="fin-users-table-header">
          <h2>Listado de empleados</h2>

          <button
            type="button"
            className="fin-users-refresh"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        {loading && <p>Cargando empleados...</p>}

        {error && (
          <p className="fin-users-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="fin-users-empty">
            <Users size={32} />
            <h3>No hay empleados registrados</h3>
            <p>
              Utiliza el botón Nuevo empleado para crear
              el primer usuario de tu empresa.
            </p>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="fin-users-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {users.map((employee) => (
                  <tr key={employee._id || employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>
                      <span className="fin-users-role">
                        {employee.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          employee.isActive === false
                            ? "fin-users-inactive"
                            : "fin-users-active"
                        }
                      >
                        {employee.isActive === false
                          ? "Inactivo"
                          : "Activo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div
          className="fin-users-overlay"
          role="presentation"
        >
          <div
            className="fin-users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fin-users-modal-title"
          >
            <div className="fin-users-modal-head">
              <div>
                <p className="fin-users-eyebrow">
                  GESTIÓN DE EMPLEADOS
                </p>
                <h2 id="fin-users-modal-title">
                  Registrar empleado
                </h2>
              </div>

              <button
                type="button"
                className="fin-users-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="employee-name">
                Nombre completo
              </label>
              <input
                id="employee-name"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                required
                autoFocus
                placeholder="Nombre del empleado"
              />

              <label htmlFor="employee-email">
                Correo electrónico
              </label>
              <input
                id="employee-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                required
                placeholder="empleado@empresa.com"
              />

              <label htmlFor="employee-password">
                Contraseña inicial
              </label>
              <input
                id="employee-password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password: event.target.value,
                  })
                }
                autoComplete="new-password"
                minLength={8}
                required
                placeholder="Mínimo 8 caracteres"
              />

              <p className="fin-users-hint">
                El usuario se creará con rol USER
                y pertenecerá automáticamente a tu empresa.
              </p>

              {formError && (
                <p
                  className="fin-users-error"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              <div className="fin-users-modal-actions">
                <button
                  type="button"
                  className="fin-users-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="fin-users-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Registrando..."
                    : "Registrar empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
