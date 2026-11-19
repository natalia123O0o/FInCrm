
import { useEffect, useMemo, useState } from "react";
import {
  History,
  RefreshCw,
  Search,
  Mail,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarDays,
} from "lucide-react";

import { useAuth } from "../../auth/context/AuthContext.jsx";
import "./MessageHistory.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

const TIPOS = {
  invitacion: "Invitación a reunión",
  seguimiento: "Seguimiento comercial",
  cobranza: "Comunicación de cobranza",
  fidelizacion: "Fidelización",
};

const ESTADOS = {
  ACCEPTED: {
    nombre: "Aceptado por Brevo",
    clase: "accepted",
    Icono: CheckCircle2,
  },
  FAILED: {
    nombre: "Fallido",
    clase: "failed",
    Icono: XCircle,
  },
  PROCESSING: {
    nombre: "En proceso",
    clase: "processing",
    Icono: Clock3,
  },
};

function formatearFecha(fecha) {
  if (!fecha) {
    return {
      dia: "Sin fecha",
      hora: "--:--",
    };
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return {
      dia: "Fecha no disponible",
      hora: "--:--",
    };
  }

  const zonaHoraria = "America/Bogota";

  const dia = new Intl.DateTimeFormat("es-CO", {
    timeZone: zonaHoraria,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(valor);

  const hora = new Intl.DateTimeFormat("es-CO", {
    timeZone: zonaHoraria,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(valor);

  return { dia, hora };
}

export default function MessageHistory({
  refreshKey = 0,
}) {
  const { token } = useAuth();

  const [mensajes, setMensajes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!token) {
      setMensajes([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function cargarHistorial() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/messaging/history`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message ||
              "No se pudo consultar el historial."
          );
        }

        if (!Array.isArray(data.messages)) {
          throw new Error(
            "El servidor devolvió un historial inválido."
          );
        }

        if (!controller.signal.aborted) {
          setMensajes(data.messages);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.message ||
              "No se pudo conectar con el servidor."
          );
          setMensajes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    cargarHistorial();

    return () => controller.abort();
  }, [token, refreshKey, recarga]);

  const resumen = useMemo(() => {
    return {
      total: mensajes.length,

      aceptados: mensajes.filter(
        (mensaje) => mensaje.status === "ACCEPTED"
      ).length,

      fallidos: mensajes.filter(
        (mensaje) => mensaje.status === "FAILED"
      ).length,
    };
  }, [mensajes]);

  const mensajesFiltrados = useMemo(() => {
    return mensajes.filter((mensaje) => {
      const texto = [
        mensaje.to,
        mensaje.subject,
        TIPOS[mensaje.purpose] || mensaje.purpose,
      ]
        .join(" ")
        .toLowerCase();

      const coincideBusqueda = texto.includes(
        busqueda.trim().toLowerCase()
      );

      const coincideTipo =
        filtroTipo === "todos" ||
        mensaje.purpose === filtroTipo;

      const coincideEstado =
        filtroEstado === "todos" ||
        mensaje.status === filtroEstado;

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideEstado
      );
    });
  }, [
    mensajes,
    busqueda,
    filtroTipo,
    filtroEstado,
  ]);

  return (
    <section
      className="fin-history"
      id="historial-correos"
    >
      {/* ENCABEZADO */}
      <div className="fin-history-heading">
        <div>
          <p className="fin-history-eyebrow">
            REGISTRO DE COMUNICACIONES
          </p>

          <h2>
            <History size={23} />
            Historial de correos
          </h2>

          <p>
            Consulta los últimos 50 intentos de envío
            registrados para tu empresa.
          </p>
        </div>

        <button
          type="button"
          className="fin-history-refresh"
          onClick={() =>
            setRecarga((actual) => actual + 1)
          }
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading ? "fin-history-spin" : ""
            }
          />
          Actualizar historial
        </button>
      </div>

      {/* INDICADORES */}
      <div className="fin-history-stats">
        <article className="fin-history-stat">
          <div className="fin-history-stat-icon">
            <Mail size={21} />
          </div>

          <span>Total registrados</span>

          <strong>
            {loading || error ? "—" : resumen.total}
          </strong>
        </article>

        <article className="fin-history-stat">
          <div
            className={
              "fin-history-stat-icon " +
              "fin-history-icon-success"
            }
          >
            <CheckCircle2 size={21} />
          </div>

          <span>Aceptados por Brevo</span>

          <strong>
            {loading || error ? "—" : resumen.aceptados}
          </strong>
        </article>

        <article className="fin-history-stat">
          <div
            className={
              "fin-history-stat-icon " +
              "fin-history-icon-error"
            }
          >
            <XCircle size={21} />
          </div>

          <span>Fallidos</span>

          <strong>
            {loading || error ? "—" : resumen.fallidos}
          </strong>
        </article>
      </div>

      {/* FILTROS */}
      <div className="fin-history-filters">
        <div className="fin-history-search">
          <Search size={18} />

          <input
            type="search"
            aria-label="Buscar correos"
            placeholder="Buscar por correo, asunto o tipo..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />
        </div>

        <select
          aria-label="Filtrar por tipo de comunicación"
          value={filtroTipo}
          onChange={(event) =>
            setFiltroTipo(event.target.value)
          }
        >
          <option value="todos">
            Todos los tipos
          </option>

          {Object.entries(TIPOS).map(
            ([valor, nombre]) => (
              <option key={valor} value={valor}>
                {nombre}
              </option>
            )
          )}
        </select>

        <select
          aria-label="Filtrar por estado"
          value={filtroEstado}
          onChange={(event) =>
            setFiltroEstado(event.target.value)
          }
        >
          <option value="todos">
            Todos los estados
          </option>

          <option value="ACCEPTED">
            Aceptados
          </option>

          <option value="FAILED">
            Fallidos
          </option>

          <option value="PROCESSING">
            En proceso
          </option>
        </select>
      </div>

      {/* ERRORES */}
      {error && (
        <p
          className="fin-history-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* TABLA */}
      <div className="fin-history-table-wrap">
        <table className="fin-history-table">
          <thead>
            <tr>
              <th>Destinatario</th>
              <th>Tipo de comunicación</th>
              <th>Asunto</th>
              <th>Fecha y hora</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="fin-history-empty"
                >
                  Cargando historial...
                </td>
              </tr>
            ) : mensajesFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="fin-history-empty"
                >
                  {error
                    ? "No se pudo cargar el historial."
                    : mensajes.length === 0
                    ? "Todavía no hay correos registrados."
                    : "No hay correos que coincidan con los filtros."}
                </td>
              </tr>
            ) : (
              mensajesFiltrados.map((mensaje) => {
                const estado =
                  ESTADOS[mensaje.status] ||
                  ESTADOS.PROCESSING;

                const IconoEstado = estado.Icono;

                // Día, fecha y hora en Colombia.
                const fecha = formatearFecha(
                  mensaje.createdAt
                );

                return (
                  <tr key={mensaje._id}>
                    <td>
                      <span className="fin-history-email">
                        {mensaje.to ||
                          "Sin destinatario"}
                      </span>
                    </td>

                    <td>
                      {TIPOS[mensaje.purpose] ||
                        mensaje.purpose ||
                        "Sin tipo"}
                    </td>

                    <td>
                      <span className="fin-history-subject">
                        {mensaje.subject ||
                          "Sin asunto"}
                      </span>
                    </td>

                    {/* DÍA Y HORA */}
                    <td>
                      <div className="fin-history-datetime">
                        <div className="fin-history-date">
                          <CalendarDays size={15} />

                          <strong>
                            {fecha.dia}
                          </strong>
                        </div>

                        <div className="fin-history-time">
                          <Clock3 size={14} />

                          <span>
                            {fecha.hora}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ESTADO */}
                    <td>
                      <span
                        className={
                          "fin-history-status " +
                          `fin-history-status--${estado.clase}`
                        }
                      >
                        <IconoEstado size={15} />
                        {estado.nombre}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="fin-history-footnote">
        Fechas y horas mostradas en la zona horaria
        de Bogotá, Colombia (UTC-5).
        La fecha corresponde al registro del intento
        de envío en FinCRM. El estado "Aceptado"
        significa que Brevo recibió la solicitud,
        no que el correo haya sido entregado o leído.
        Los indicadores corresponden únicamente
        a los últimos 50 registros consultados.
      </p>
    </section>
  );
}
