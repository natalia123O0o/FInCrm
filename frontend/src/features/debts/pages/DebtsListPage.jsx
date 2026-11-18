// Importa los hooks 'useEffect' y 'useState' de React para manejar efectos secundarios (peticiones HTTP) y estados locales.
import { useEffect, useState } from "react";
// Importa el componente 'Link' de React Router para permitir la navegación interna hacia otras páginas.
import { Link } from "react-router-dom";

// Importa el hook 'useAuth' para acceder al contexto de autenticación y obtener el token del administrador.
import { useAuth } from "../../auth/context/AuthContext.jsx";
// Importa la función 'getDebts' encargada de realizar la petición HTTP para obtener la lista de deudas desde el backend.
import { getDebts } from "../services/debts.api.js";

import DebtForm from "../components/DebtForm.jsx";

import PaymentForm from "../../payments/components/PaymentForm.jsx";

import PaymentsHistory from "../../payments/components/PaymentsHistory.jsx";

import ImportDebtsCsv from "../components/ImportDebtsCsv.jsx";

// Define y exporta por defecto el componente funcional 'DebtsListPage' (página de listado de deudas).
export default function DebtsListPage() {

  // Extrae el token de autenticación del usuario administrador usando el hook 'useAuth'.
  const { token } = useAuth();

  // Define el estado 'debts' para almacenar la lista de deudas obtenidas del servidor (inicia como un arreglo vacío).
  const [debts, setDebts] = useState([]);

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");

  // Fecha inicial y final de vencimiento.
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Saldo mínimo y máximo.
  const [saldoMinimo, setSaldoMinimo] = useState("");
  const [saldoMaximo, setSaldoMaximo] = useState("");

  // Define el estado 'loading' para controlar el indicador de carga mientras se obtienen los datos (inicia en true).
  const [loading, setLoading] = useState(true);

  // Define el estado 'error' para almacenar y mostrar posibles mensajes de error si falla la petición.
  const [error, setError] = useState("");

  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);


  async function handleDebtCreated() {
    const updatedDebts = await getDebts(token);

    setDebts(updatedDebts);
  }


  async function handlePaymentCreated() {
    // Primero actualizamos los saldos de las deudas.
    await handleDebtCreated();

    // Después avisamos al historial que debe actualizarse.
    setPaymentsRefreshKey((previous) => previous + 1);
  }




  // Hook 'useEffect' que ejecuta la función de carga de deudas al montar el componente o cuando el 'token' cambia.
  useEffect(() => {
    // Bandera local 'active' para evitar actualizaciones de estado si el componente se desmonta antes de que termine la petición.
    let active = true;

    // Función asíncrona interna para consultar las deudas al backend.
    async function loadDebts() {
      try {
        // Llama a la API pasándole el token y espera la respuesta con las deudas.
        const data = await getDebts(token);

        // Si el componente sigue montado, actualiza el estado con las deudas obtenidas.
        if (active) {
          setDebts(data);
        }
      } catch (err) {
        // Si ocurre un error y el componente sigue montado, guarda el mensaje de error en el estado.
        if (active) {
          setError(err.message);
        }
      } finally {
        // Al finalizar (éxito o error), si el componente sigue montado, desactiva el estado de carga.
        if (active) {
          setLoading(false);
        }
      }
    }

    // Ejecuta la función para cargar las deudas.
    loadDebts();

    // Función de limpieza que se ejecuta al desmontar el componente, cambiando 'active' a falso.
    return () => {
      active = false;
    };
  }, [token]);

  // Función auxiliar para formatear valores numéricos a moneda local (Pesos Colombianos - COP).
  function formatMoney(value) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Función auxiliar para extraer solo la fecha (YYYY-MM-DD) de una cadena de texto de fecha y hora.
  function formatDate(value) {
    if (!value) return "Sin fecha";

    return value.slice(0, 10);
  }


  // Filtramos las deudas según la búsqueda del usuario.

  const deudasFiltradas = debts.filter((debt) => {
    // 1. Buscar por nombre del cliente.
    const nombreCliente = debt.clientId?.name || "";

    const coincideCliente = nombreCliente
      .toLowerCase()
      .includes(busquedaCliente.trim().toLowerCase());

    // 2. Filtrar por estado.
    const coincideEstado =
      filtroEstado === "TODAS" ||
      debt.status === filtroEstado;

    // 3. Filtrar por fechas de vencimiento.
    const vencimiento = debt.dueDate
      ? debt.dueDate.slice(0, 10)
      : "";

    const coincideFechaDesde =
      fechaDesde === "" ||
      (vencimiento !== "" && vencimiento >= fechaDesde);

    const coincideFechaHasta =
      fechaHasta === "" ||
      (vencimiento !== "" && vencimiento <= fechaHasta);

    // 4. Filtrar por saldo pendiente.
    const saldo = Number(debt.outstandingBalance);

    const coincideSaldoMinimo =
      saldoMinimo === "" ||
      saldo >= Number(saldoMinimo);

    const coincideSaldoMaximo =
      saldoMaximo === "" ||
      saldo <= Number(saldoMaximo);

    // 5. Verificar que cumpla TODOS los filtros.
    return (
      coincideCliente &&
      coincideEstado &&
      coincideFechaDesde &&
      coincideFechaHasta &&
      coincideSaldoMinimo &&
      coincideSaldoMaximo
    );
  });




  // Renderiza la estructura visual de la página de listado de deudas.
  return (
    // Etiqueta semántica principal con un margen interior (padding) de 24px.
    <main style={{ padding: "24px" }}>
      {/* Enlace para regresar al panel principal del sistema */}
      <Link to="/dashboard">
        Volver al panel
      </Link>

      {/* Título y subtítulo de la página */}
      <h1>Deudas de FinCRM</h1>
      <p>Consulta de deudas de tu empresa.</p>
      <section style={{ marginTop: "24px" }}>
        <DebtForm onDebtCreated={handleDebtCreated} />
      </section>

      {/* IMPORTACIÓN MASIVA DE DEUDAS */}
      <ImportDebtsCsv
        token={token}
        onImported={handleDebtCreated}
      />

      <section style={{ marginTop: "32px" }}>
        <PaymentForm
          debts={debts}
          onPaymentCreated={handlePaymentCreated}
        />
      </section>

      <section style={{ marginTop: "32px" }}>
        <PaymentsHistory
          refreshKey={paymentsRefreshKey}
        />
      </section>


      <hr style={{ margin: "32px 0" }} />

      <section
        aria-label="Filtros de deudas"
        style={{
          marginBottom: "24px",
          padding: "20px",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          backgroundColor: "#f8fafc",
        }}
      >
        <h2>Buscar y filtrar deudas</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "flex-end",
          }}
        >
          {/* Buscar por nombre del cliente */}
          <div style={{ flex: "1 1 220px" }}>
            <label htmlFor="buscar-cliente-deuda">
              Nombre del cliente
            </label>

            <input
              id="buscar-cliente-deuda"
              type="search"
              placeholder="Ej. Juan Pérez"
              value={busquedaCliente}
              onChange={(evento) =>
                setBusquedaCliente(evento.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filtrar por estado */}
          <div style={{ flex: "1 1 220px" }}>
            <label htmlFor="filtro-estado-deuda">
              Estado de la deuda
            </label>

            <select
              id="filtro-estado-deuda"
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(evento.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
              }}
            >
              <option value="TODAS">Todas las deudas</option>
              <option value="PENDING">Pendientes</option>
              <option value="PARTIAL">
                Parcialmente pagadas
              </option>
              <option value="PAID">Pagadas</option>
            </select>
          </div>


          {/* Fecha inicial */}
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="fecha-desde-deuda">
              Vencimiento desde
            </label>

            <input
              id="fecha-desde-deuda"
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(evento) =>
                setFechaDesde(evento.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Fecha final */}
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="fecha-hasta-deuda">
              Vencimiento hasta
            </label>

            <input
              id="fecha-hasta-deuda"
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(evento) =>
                setFechaHasta(evento.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Saldo mínimo */}
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="saldo-minimo-deuda">
              Saldo mínimo (COP)
            </label>

            <input
              id="saldo-minimo-deuda"
              type="number"
              min="0"
              step="1"
              placeholder="Ej. 100000"
              value={saldoMinimo}
              max={saldoMaximo || undefined}
              onChange={(evento) =>
                setSaldoMinimo(evento.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Saldo máximo */}
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="saldo-maximo-deuda">
              Saldo máximo (COP)
            </label>

            <input
              id="saldo-maximo-deuda"
              type="number"
              min="0"
              step="1"
              placeholder="Ej. 1000000"
              value={saldoMaximo}
              min={saldoMinimo || "0"}
              onChange={(evento) =>
                setSaldoMaximo(evento.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>


          {/* Limpiar filtros */}
          <button
            type="button"
            onClick={() => {
              setBusquedaCliente("");
              setFiltroEstado("TODAS");
              setFechaDesde("");
              setFechaHasta("");
              setSaldoMinimo("");
              setSaldoMaximo("");
            }}
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


      {/* Renderizado condicional: muestra un mensaje mientras 'loading' sea verdadero. */}
      {loading && <p>Cargando deudas...</p>}

      {/* Renderizado condicional: muestra una alerta roja si existe algún mensaje de error. */}
      {error && (
        <p role="alert" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}

      {/* Renderizado condicional: se muestra solo cuando ya terminó de cargar y no hay errores. */}
      {!loading && !error && (
        <>
          {/* Muestra el número total de deudas encontradas */}
          <p>
            Mostrando {deudasFiltradas.length} de {debts.length} deudas
          </p>

          {/* Validación ternaria: si no hay deudas, muestra un texto informativo; si hay, dibuja la tabla. */}
          {deudasFiltradas.length === 0 ? (
            <p>No hay deudas registradas.</p>
          ) : (
            // Contenedor con scroll horizontal automático por si la tabla es muy ancha en pantallas pequeñas.
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                {/* Cabecera de la tabla con los nombres de las columnas */}
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Descripción</th>
                    <th>Valor original</th>
                    <th>Saldo pendiente</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                {/* Cuerpo de la tabla: recorre el arreglo 'debts' para generar una fila (tr) por cada deuda. */}
                <tbody>
                  {deudasFiltradas.map((debt) => (
                    <tr key={debt._id}>
                      {/* Muestra el nombre del cliente (usando encadenamiento opcional) o un texto alternativo si no está disponible. */}
                      <td>
                        {debt.clientId?.name ||
                          "Cliente no disponible"}
                      </td>

                      {/* Muestra la descripción de la deuda */}
                      <td>{debt.description}</td>

                      {/* Muestra el valor original formateado como dinero */}
                      <td>
                        {formatMoney(debt.originalAmount)}
                      </td>

                      {/* Muestra el saldo pendiente formateado como dinero */}
                      <td>
                        {formatMoney(debt.outstandingBalance)}
                      </td>

                      {/* Muestra la fecha de vencimiento formateada */}
                      <td>{formatDate(debt.dueDate)}</td>

                      {/* Muestra el estado actual de la deuda */}
                      <td>{debt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}