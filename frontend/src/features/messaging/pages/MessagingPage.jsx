
import { useEffect, useState } from "react";

import {
  Mail,
  Sparkles,
  RefreshCw,
  Send,
  Info,
} from "lucide-react";

import { useAuth } from "../../auth/context/AuthContext.jsx";

import ConfirmEmailModal from "../components/ConfirmEmailModal.jsx";

import MessageHistory from "./MessageHistory.jsx";

import "./MessagingPage.css";

// =============================================
// CONFIGURACIÓN DE LA API
// =============================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

// =============================================
// PLANTILLAS DE BREVO
// =============================================

const plantillas = {
  seguimiento: {
    nombre: "Seguimiento comercial",
    asunto: "Queremos retomar nuestra conversación",
    mensaje:
      "Hola, {nombre}.\n\n" +
      "En {empresa} queremos retomar nuestra conversación " +
      "y conocer si necesitas información adicional " +
      "sobre nuestros productos o servicios.\n\n" +
      "Estamos atentos a tus preguntas.\n\n" +
      "Saludos cordiales,\n{empresa}",
  },

  invitacion: {
    nombre: "Invitación a reunión",
    asunto:
      "Invitación para conversar y conocer nuestras soluciones",
    mensaje:
      "Hola, {nombre}.\n\n" +
      "En {empresa} nos gustaría invitarte a una " +
      "reunión para conocer mejor tus necesidades " +
      "y conversar sobre nuestros servicios.\n\n" +
      "Podemos coordinar una fecha según tu disponibilidad.\n\n" +
      "Saludos cordiales,\n{empresa}",
  },

  cobranza: {
    nombre: "Comunicación de cobranza",
    asunto: "Información importante sobre tu cuenta",
    mensaje:
      "Hola, {nombre}.\n\n" +
      "Desde {empresa} nos comunicamos para invitarte " +
      "a revisar el estado de tu cuenta.\n\n" +
      "Si ya realizaste un pago o necesitas aclarar " +
      "alguna información, puedes responder a este correo.\n\n" +
      "Cordialmente,\n{empresa}",
  },

  fidelizacion: {
    nombre: "Fidelización",
    asunto: "Gracias por confiar en nosotros",
    mensaje:
      "Hola, {nombre}.\n\n" +
      "En {empresa} queremos agradecerte por confiar " +
      "en nosotros.\n\n" +
      "Valoramos nuestra relación comercial y " +
      "queremos seguir acompañándote con una atención " +
      "cercana y de calidad.\n\n" +
      "¡Gracias por acompañarnos!\n\n" +
      "Con aprecio,\n{empresa}",
  },
};

// =============================================
// PERSONALIZACIÓN DEL BORRADOR
// =============================================

function personalizar(texto, nombre, empresa) {
  return String(texto || "")
    .replaceAll(
      "{nombre}",
      nombre || "[Nombre del cliente]"
    )
    .replaceAll(
      "{empresa}",
      empresa || "[Nombre de la empresa]"
    );
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export default function MessagingPage() {
  const { token } = useAuth();

  // Clientes
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");

  // Plantillas
  const [tipo, setTipo] = useState("invitacion");

  // Estados de carga y envío
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Mensajes de la interfaz
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [exito, setExito] = useState(false);

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] =
    useState(false);

  // Confirmación de autorización
  const [consentConfirmed, setConsentConfirmed] =
    useState(false);

  // Actualización de clientes
  const [recarga, setRecarga] = useState(0);

  // Actualización del historial
  const [historyRefreshKey, setHistoryRefreshKey] =
    useState(0);

  // Plantilla actualmente seleccionada
  const plantilla = plantillas[tipo];

  // =============================================
  // 1. CARGAR CLIENTES
  // =============================================

  useEffect(() => {
    if (!token) {
      setClientes([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function cargarClientes() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/clients`,
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
              "No se pudieron consultar los clientes."
          );
        }

        const lista = Array.isArray(data)
          ? data
          : data.clients;

        if (!Array.isArray(lista)) {
          throw new Error(
            "El servidor no devolvió una lista válida."
          );
        }

        if (!controller.signal.aborted) {
          setClientes(lista);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.message ||
              "No se pudo conectar con el servidor."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    cargarClientes();

    return () => controller.abort();
  }, [token, recarga]);

  // =============================================
  // 2. CLIENTE SELECCIONADO
  // =============================================

  const clienteSeleccionado = clientes.find(
    (cliente) =>
      String(cliente._id || cliente.id) === clienteId
  );

  const nombreCliente =
    clienteSeleccionado?.name || "";

  const correo =
    clienteSeleccionado?.email || "";

  // El backend obtiene el nombre auténtico
  // de la empresa desde el tenant del usuario.
  // Este texto es únicamente ilustrativo.
  const empresaVistaPrevia =
    "Tu empresa registrada en FinCRM";

  const asuntoVistaPrevia = personalizar(
    plantilla.asunto,
    nombreCliente,
    empresaVistaPrevia
  );

  const mensajeVistaPrevia = personalizar(
    plantilla.mensaje,
    nombreCliente,
    empresaVistaPrevia
  );

  // =============================================
  // 3. CAMBIAR PLANTILLA
  // =============================================

  function cambiarPlantilla(event) {
    setTipo(event.target.value);
    setConsentConfirmed(false);
    setShowConfirmModal(false);
    setAviso("");
    setExito(false);
  }

  // =============================================
  // 4. CAMBIAR CLIENTE
  // =============================================

  function cambiarCliente(event) {
    setClienteId(event.target.value);
    setConsentConfirmed(false);
    setShowConfirmModal(false);
    setAviso("");
    setExito(false);
  }

  // =============================================
  // 5. ABRIR MODAL
  // =============================================

  function abrirConfirmacion() {
    if (sending) return;

    setAviso("");
    setExito(false);

    if (!clienteSeleccionado) {
      setAviso("Primero selecciona un cliente.");
      return;
    }

    if (!correo) {
      setAviso(
        "El cliente no tiene correo electrónico registrado."
      );
      return;
    }

    if (!consentConfirmed) {
      setAviso(
        "Debes verificar la autorización del destinatario."
      );
      return;
    }

    setShowConfirmModal(true);
  }

  // =============================================
  // 6. CERRAR MODAL
  // =============================================

  function cerrarConfirmacion() {
    if (sending) return;

    setShowConfirmModal(false);
  }

  // =============================================
  // 7. ENVIAR CORREO
  // =============================================

  async function enviarCorreo() {
    if (sending) return;

    if (!clienteSeleccionado) {
      setAviso("Primero selecciona un cliente.");
      setExito(false);
      setShowConfirmModal(false);
      return;
    }

    if (!correo) {
      setAviso(
        "El cliente no tiene correo electrónico registrado."
      );
      setExito(false);
      setShowConfirmModal(false);
      return;
    }

    if (!consentConfirmed) {
      setAviso(
        "Debes verificar la autorización del destinatario."
      );
      setExito(false);
      setShowConfirmModal(false);
      return;
    }

    // Cerramos el modal de confirmación.
    setShowConfirmModal(false);

    setSending(true);
    setAviso("");
    setExito(false);

    try {
      // Envío hacia el backend.
      const response = await fetch(
        `${API_URL}/api/messaging/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            clientId:
              clienteSeleccionado._id ||
              clienteSeleccionado.id,

            purpose: tipo,

            // Campos requeridos por el controlador.
            // El contenido final del email lo define
            // la plantilla publicada en Brevo.
            subject: plantilla.asunto,
            body: mensajeVistaPrevia,

            authorizationConfirmed: true,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "No se pudo confirmar el envío del correo."
        );
      }

      // El proveedor aceptó la solicitud.
      setExito(true);

      setAviso(
        "Brevo aceptó el correo para su envío. " +
        "Consulta el historial para verificar " +
        "el registro de la comunicación."
      );

      // Quitar la confirmación de autorización
      // para el próximo envío.
      setConsentConfirmed(false);

      // IMPORTANTE:
      // Actualizar automáticamente el historial
      // después de un envío aceptado.
      setHistoryRefreshKey(
        (actual) => actual + 1
      );

    } catch (err) {
      setExito(false);

      setAviso(
        err.message ||
          "No se pudo conectar con el servidor."
      );

      // Actualizar también después de un error:
      // el backend pudo haber registrado
      // un intento fallido en MongoDB.
      setHistoryRefreshKey(
        (actual) => actual + 1
      );

    } finally {
      setSending(false);
    }
  }

  // =============================================
  // 8. INTERFAZ
  // =============================================

  return (
    <main className="fin-messaging">

      {/* ENCABEZADO */}
      <header className="fin-messaging-header">
        <div>
          <p className="fin-messaging-eyebrow">
            COMUNICACIÓN EMPRESARIAL
          </p>

          <h1>Mensajería personalizada</h1>

          <p>
            Selecciona un cliente y envía una
            plantilla profesional mediante Brevo.
          </p>
        </div>

        <span className="fin-messaging-badge">
          <Sparkles size={16} />
          Integración Brevo
        </span>
      </header>

      {/* CONTENEDOR DE DOS COLUMNAS */}
      <div className="fin-messaging-grid">

        {/* COLUMNA 1: CONFIGURACIÓN */}
        <section className="fin-messaging-card">
          <h2>Preparar comunicación</h2>

          {/* SELECCIÓN DEL CLIENTE */}
          <label htmlFor="msg-cliente">
            Cliente destinatario
          </label>

          <select
            id="msg-cliente"
            value={clienteId}
            onChange={cambiarCliente}
            disabled={loading || sending}
          >
            <option value="">
              {loading
                ? "Cargando clientes..."
                : "Selecciona un cliente"}
            </option>

            {clientes.map((cliente) => (
              <option
                key={cliente._id || cliente.id}
                value={cliente._id || cliente.id}
              >
                {cliente.name}
              </option>
            ))}
          </select>

          {/* ERROR AL CARGAR CLIENTES */}
          {error && (
            <p
              className="fin-messaging-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* CORREO DEL CLIENTE */}
          {clienteSeleccionado && (
            <p className="fin-messaging-hint">
              Correo del destinatario:{" "}
              <strong>
                {correo || "No registrado"}
              </strong>
            </p>
          )}

          {/* SELECCIÓN DE PLANTILLA */}
          <label htmlFor="msg-tipo">
            Tipo de comunicación
          </label>

          <select
            id="msg-tipo"
            value={tipo}
            onChange={cambiarPlantilla}
            disabled={sending}
          >
            {Object.entries(plantillas).map(
              ([clave, item]) => (
                <option
                  key={clave}
                  value={clave}
                >
                  {item.nombre}
                </option>
              )
            )}
          </select>

          {/* INFORMACIÓN DE PLANTILLA */}
          <div
            style={{
              marginTop: "22px",
              padding: "16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
            }}
          >
            <p
              style={{
                fontWeight: 700,
                margin: "0 0 10px",
              }}
            >
              Plantilla seleccionada
            </p>

            <p
              style={{
                margin: "0 0 8px",
                fontSize: "14px",
              }}
            >
              {plantilla.nombre}
            </p>

            <p
              className="fin-messaging-hint"
              style={{ marginBottom: 0 }}
            >
              Diseño y contenido administrados
              desde Brevo.
            </p>
          </div>

          {/* NOTA INFORMATIVA */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginTop: "22px",
              color: "#475569",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            <Info
              size={18}
              style={{ flexShrink: 0 }}
            />

            <span>
              El correo utilizará el contenido
              publicado en Brevo y los datos
              reales del cliente y la empresa.
              La vista de la derecha es una
              referencia en texto, no una
              reproducción exacta del HTML.
            </span>
          </div>

          {/* ACTUALIZAR CLIENTES */}
          <button
            type="button"
            className="fin-messaging-reset"
            onClick={() =>
              setRecarga((valor) => valor + 1)
            }
            disabled={loading || sending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              border: "1px solid #CBD5E1",
              borderRadius: "10px",
              background: "#FFFFFF",
              marginTop: "22px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            Actualizar clientes
          </button>
        </section>

        {/* COLUMNA 2: RESUMEN */}
        <section className="fin-messaging-card">

          <div className="fin-messaging-preview-title">
            <div>
              <h2>Resumen del mensaje</h2>

              <p>
                Revisa el destinatario y
                la plantilla seleccionada.
              </p>
            </div>

            <Mail size={25} />
          </div>

          {/* VISTA PREVIA */}
          <div className="fin-messaging-preview">
            <p>
              <strong>Para:</strong>{" "}
              {correo ||
                "Selecciona un destinatario"}
            </p>

            <p>
              <strong>Plantilla:</strong>{" "}
              {plantilla.nombre}
            </p>

            <p>
              <strong>Asunto de referencia:</strong>{" "}
              {asuntoVistaPrevia}
            </p>

            <hr />

            <div className="fin-messaging-preview-body">
              {mensajeVistaPrevia}
            </div>
          </div>

          {/* AUTORIZACIÓN */}
          <div style={{ marginTop: "22px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(event) =>
                  setConsentConfirmed(
                    event.target.checked
                  )
                }
                disabled={sending}
                style={{
                  width: "18px",
                  height: "18px",
                  flexShrink: 0,
                }}
              />

              <span>
                Confirmo que verifiqué la
                autorización del destinatario
                para esta comunicación y
                que corresponde a una finalidad
                permitida.
              </span>
            </label>
          </div>

          {/* BOTÓN DE ENVÍO */}
          <div
            className="fin-messaging-actions"
            style={{ marginTop: "20px" }}
          >
            <button
              type="button"
              onClick={abrirConfirmacion}
              disabled={
                sending ||
                !clienteSeleccionado ||
                !correo ||
                !consentConfirmed
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                background: "#F97316",
                color: "#0F172A",
                border: "none",
                borderRadius: "10px",
                padding: "13px 20px",
                fontWeight: 700,
                cursor: sending
                  ? "wait"
                  : "pointer",
              }}
            >
              <Send size={17} />

              {sending
                ? "Enviando..."
                : "Enviar correo real"}
            </button>
          </div>

          {/* RESPUESTA DEL ENVÍO */}
          {aviso && (
            <p
              className={
                exito
                  ? "fin-messaging-notice"
                  : "fin-messaging-error"
              }
              role={exito ? "status" : "alert"}
              style={{ marginTop: "18px" }}
            >
              {aviso}
            </p>
          )}

          <div className="fin-messaging-warning">
            Los correos se envían realmente.
            Durante las pruebas solo se permiten
            destinatarios autorizados en el backend.
            La aceptación de Brevo no garantiza
            la entrega final.
          </div>
        </section>
      </div>

      {/* ======================================= */}
      {/* HISTORIAL DE CORREOS */}
      {/* ======================================= */}

      <MessageHistory
        refreshKey={historyRefreshKey}
      />

      {/* ======================================= */}
      {/* MODAL DE CONFIRMACIÓN */}
      {/* ======================================= */}

      <ConfirmEmailModal
        open={showConfirmModal}
        onClose={cerrarConfirmacion}
        onConfirm={enviarCorreo}
        sending={sending}
        cliente={nombreCliente}
        correo={correo}
        plantilla={plantilla.nombre}
      />

    </main>
  );
}
