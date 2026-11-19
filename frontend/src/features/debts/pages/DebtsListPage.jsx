import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext.jsx";
import { getDebts } from "../services/debts.api.js";

import DebtForm from "../components/DebtForm.jsx";
import PaymentForm from "../../payments/components/PaymentForm.jsx";
import PaymentsHistory from "../../payments/components/PaymentsHistory.jsx";
import ImportDebtsCsv from "../components/ImportDebtsCsv.jsx";
import ImportPaymentsCsv from "../../payments/components/ImportPaymentsCsv.jsx";
import ExportButtons from "../../../components/ExportButtons.jsx";
import Modal from "../../../components/common/Modal.jsx";

import { exportarDeudasCsv } from "../services/exportDebtsCsv.js";
import { exportarDeudasXlsx } from "../services/exportDebtsXlsx.js";
import { exportarDeudasPdf } from "../services/exportDebtsPdf.js";

import "./DebtsListPage.css";

const dineroCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatearDinero(valor) {
  return dineroCOP.format(Number(valor) || 0);
}

function formatearFecha(valor) {
  return valor ? String(valor).slice(0, 10) : "Sin fecha";
}

function fechaActualColombia() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function estaVencida(deuda, hoy) {
  return Number(deuda.outstandingBalance) > 0 &&
    Boolean(deuda.dueDate) &&
    formatearFecha(deuda.dueDate) < hoy;
}

function datosEstado(deuda, hoy) {
  if (deuda.status === "PAID") {
    return { texto: "Pagada", clase: "pagada" };
  }
  if (estaVencida(deuda, hoy)) {
    return {
      texto: deuda.status === "PARTIAL" ? "Parcial · vencida" : "Vencida",
      clase: "vencida",
    };
  }
  if (deuda.status === "PARTIAL") {
    return { texto: "Pago parcial", clase: "parcial" };
  }
  return { texto: "Pendiente", clase: "pendiente" };
}

export default function DebtsListPage() {
  const { token } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Conservamos los filtros originales y añadimos búsqueda por documento.
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [saldoMinimo, setSaldoMinimo] = useState("");
  const [saldoMaximo, setSaldoMaximo] = useState("");

  // Un único modal abierto a la vez.
  const [modalAbierto, setModalAbierto] = useState("");
  const [deudaPagoId, setDeudaPagoId] = useState("");
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  const [paginaActual, setPaginaActual] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const hoy = fechaActualColombia();

  async function recargarDeudas() {
    const datos = await getDebts(token);
    setDebts(datos);
    setError("");
  }

  async function handleDebtCreated() {
    await recargarDeudas();
    setPaginaActual(1);
    setModalAbierto("");
  }

  async function handlePaymentCreated() {
    await recargarDeudas();
    setPaymentsRefreshKey((anterior) => anterior + 1);
    setModalAbierto("");
    setDeudaPagoId("");
  }

  // Dejamos el modal de importación abierto para mostrar el resultado final.
  async function handleDebtsImported() {
    await recargarDeudas();
    setPaginaActual(1);
  }

  async function handlePaymentsImported() {
    await recargarDeudas();
    setPaymentsRefreshKey((anterior) => anterior + 1);
  }

  function abrirPago(id = "") {
    setDeudaPagoId(id);
    setModalAbierto("pago");
  }

  function cerrarModal() {
    setModalAbierto("");
    setDeudaPagoId("");
  }

  useEffect(() => {
    let activo = true;

    async function cargarDeudas() {
      try {
        setLoading(true);
        setError("");
        const datos = await getDebts(token);
        if (activo) setDebts(datos);
      } catch (err) {
        if (activo) setError(err.message || "No se pudieron consultar las deudas.");
      } finally {
        if (activo) setLoading(false);
      }
    }

    if (token) {
      cargarDeudas();
    } else {
      setDebts([]);
      setLoading(false);
    }

    return () => {
      activo = false;
    };
  }, [token]);

  const deudasFiltradas = debts.filter((deuda) => {
    const texto = busquedaCliente.trim().toLowerCase();
    const nombre = String(deuda.clientId?.name || "").toLowerCase();
    const documento = String(deuda.clientId?.documentNumber || "").toLowerCase();
    const coincideCliente = nombre.includes(texto) || documento.includes(texto);
    const coincideEstado = filtroEstado === "TODAS" ||
      (filtroEstado === "VENCIDAS" ? estaVencida(deuda, hoy) : deuda.status === filtroEstado);

    const vencimiento = formatearFecha(deuda.dueDate);
    const coincideDesde = !fechaDesde || (vencimiento !== "Sin fecha" && vencimiento >= fechaDesde);
    const coincideHasta = !fechaHasta || (vencimiento !== "Sin fecha" && vencimiento <= fechaHasta);
    const saldo = Number(deuda.outstandingBalance) || 0;
    const coincideMinimo = saldoMinimo === "" || saldo >= Number(saldoMinimo);
    const coincideMaximo = saldoMaximo === "" || saldo <= Number(saldoMaximo);

    return coincideCliente && coincideEstado && coincideDesde && coincideHasta && coincideMinimo && coincideMaximo;
  });

  const saldoPorCobrar = debts.reduce(
    (total, deuda) => total + (Number(deuda.outstandingBalance) || 0), 0
  );
  const saldoVencido = debts.reduce(
    (total, deuda) => total + (estaVencida(deuda, hoy) ? Number(deuda.outstandingBalance) || 0 : 0), 0
  );
  const pagadas = debts.filter((deuda) => deuda.status === "PAID").length;

  const totalPaginas = Math.max(1, Math.ceil(deudasFiltradas.length / filasPorPagina));
  const paginaVisible = Math.min(paginaActual, totalPaginas);
  const desde = (paginaVisible - 1) * filasPorPagina;
  const deudasPaginadas = deudasFiltradas.slice(desde, desde + filasPorPagina);

  function actualizarFiltro(setter, valor) {
    setter(valor);
    setPaginaActual(1);
  }

  function limpiarFiltros() {
    setBusquedaCliente("");
    setFiltroEstado("TODAS");
    setFechaDesde("");
    setFechaHasta("");
    setSaldoMinimo("");
    setSaldoMaximo("");
    setPaginaActual(1);
  }

  return (
    <main className="debts-page">
      <header className="debts-page-header">
        <div>
          <h1>Deudas</h1>
          <p>Controla tu cartera y registra abonos de forma organizada.</p>
        </div>
        <div className="debts-main-actions">
          <button
            type="button"
            className="debts-btn debts-btn--primary"
            onClick={() => setModalAbierto("deuda")}
          >
            + Nueva deuda
          </button>
          <button
            type="button"
            className="debts-btn debts-btn--outline"
            onClick={() => abrirPago()}
          >
            Registrar abono
          </button>
        </div>
      </header>

      <section className="debts-summary" aria-label="Resumen de cartera">
        <div className="debts-kpi">
          <span>Deudas registradas</span>
          <strong>{loading ? "—" : debts.length}</strong>
        </div>
        <div className="debts-kpi debts-kpi--featured">
          <span>Saldo por cobrar</span>
          <strong>{loading ? "—" : formatearDinero(saldoPorCobrar)}</strong>
        </div>
        <div className="debts-kpi">
          <span>Cartera vencida</span>
          <strong>{loading ? "—" : formatearDinero(saldoVencido)}</strong>
        </div>
        <div className="debts-kpi">
          <span>Deudas pagadas</span>
          <strong>{loading ? "—" : pagadas}</strong>
        </div>
      </section>

      <section className="debts-panel" aria-label="Filtros de deudas">
        <div className="debts-panel-heading">
          <h2>Buscar y filtrar deudas</h2>
          <p>Combina los filtros para encontrar las obligaciones que necesitas.</p>
        </div>

        <div className="debts-filter-grid">
          <div className="debts-field debts-field--search">
            <label htmlFor="deudas-buscar">Cliente o documento</label>
            <input
              id="deudas-buscar"
              type="search"
              placeholder="Buscar por nombre o documento"
              value={busquedaCliente}
              onChange={(e) => actualizarFiltro(setBusquedaCliente, e.target.value)}
            />
          </div>
          <div className="debts-field">
            <label htmlFor="deudas-estado">Estado</label>
            <select
              id="deudas-estado"
              value={filtroEstado}
              onChange={(e) => actualizarFiltro(setFiltroEstado, e.target.value)}
            >
              <option value="TODAS">Todas</option>
              <option value="PENDING">Pendientes</option>
              <option value="PARTIAL">Pagos parciales</option>
              <option value="PAID">Pagadas</option>
              <option value="VENCIDAS">Vencidas</option>
            </select>
          </div>
          <div className="debts-field">
            <label htmlFor="deudas-desde">Vence desde</label>
            <input
              id="deudas-desde"
              type="date"
              max={fechaHasta || undefined}
              value={fechaDesde}
              onChange={(e) => actualizarFiltro(setFechaDesde, e.target.value)}
            />
          </div>
          <div className="debts-field">
            <label htmlFor="deudas-hasta">Vence hasta</label>
            <input
              id="deudas-hasta"
              type="date"
              min={fechaDesde || undefined}
              value={fechaHasta}
              onChange={(e) => actualizarFiltro(setFechaHasta, e.target.value)}
            />
          </div>
          <div className="debts-field">
            <label htmlFor="deudas-saldo-min">Saldo mínimo (COP)</label>
            <input
              id="deudas-saldo-min"
              type="number"
              min="0"
              step="1"
              placeholder="100000"
              value={saldoMinimo}
              max={saldoMaximo || undefined}
              onChange={(e) => actualizarFiltro(setSaldoMinimo, e.target.value)}
            />
          </div>
          <div className="debts-field">
            <label htmlFor="deudas-saldo-max">Saldo máximo (COP)</label>
            <input
              id="deudas-saldo-max"
              type="number"
              min={saldoMinimo || "0"}
              step="1"
              placeholder="1000000"
              value={saldoMaximo}
              onChange={(e) => actualizarFiltro(setSaldoMaximo, e.target.value)}
            />
          </div>
          <button type="button" className="debts-btn debts-btn--outline debts-clear" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </section>

      <section className="debts-panel" aria-label="Listado de deudas">
        <div className="debts-table-heading">
          <div>
            <h2>Directorio de deudas</h2>
            <p>{loading ? "Consultando cartera..." : `${deudasFiltradas.length} de ${debts.length} deudas`}</p>
          </div>
          <div className="debts-tools">
            <button type="button" className="debts-btn debts-btn--outline" onClick={() => setModalAbierto("importar-deudas")}>
              Importar deudas
            </button>
            <button type="button" className="debts-btn debts-btn--outline" onClick={() => setModalAbierto("importar-abonos")}>
              Importar abonos
            </button>
            <button type="button" className="debts-btn debts-btn--outline" onClick={() => setModalAbierto("historial")}>
              Historial de pagos
            </button>
            <details className="debts-export-dropdown">
              <summary className="debts-btn debts-btn--outline">Exportar <span aria-hidden="true">⌄</span></summary>
              <div className="debts-export-options">
                <ExportButtons
                  data={deudasFiltradas}
                  onExportCsv={exportarDeudasCsv}
                  onExportXlsx={exportarDeudasXlsx}
                  onExportPdf={exportarDeudasPdf}
                />
              </div>
            </details>
          </div>
        </div>

        {loading && <p className="debts-notice" role="status">Cargando deudas...</p>}
        {error && <p className="debts-notice debts-notice--error" role="alert">{error}</p>}

        {!loading && !error && (
          deudasFiltradas.length === 0 ? (
            <div className="debts-empty">
              <h3>{debts.length ? "No hay deudas con esos filtros" : "Todavía no hay deudas"}</h3>
              <p>{debts.length ? "Prueba con otros criterios o limpia los filtros." : "Registra una deuda para comenzar a administrar la cartera."}</p>
            </div>
          ) : (
            <>
              <div className="debts-table-scroll">
                <table className="debts-table">
                  <thead>
                    <tr>
                      <th scope="col">Cliente</th>
                      <th scope="col">Descripción</th>
                      <th scope="col" className="debts-number">Valor original</th>
                      <th scope="col" className="debts-number">Saldo pendiente</th>
                      <th scope="col">Vencimiento</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deudasPaginadas.map((deuda) => {
                      const estado = datosEstado(deuda, hoy);
                      const puedeAbonar = Number(deuda.outstandingBalance) > 0 && deuda.status !== "PAID";
                      return (
                        <tr key={deuda._id}>
                          <td>
                            <strong className="debts-client-name">{deuda.clientId?.name || "Cliente no disponible"}</strong>
                            {deuda.clientId?.documentNumber && <span className="debts-client-document">{deuda.clientId.documentNumber}</span>}
                          </td>
                          <td>{deuda.description}</td>
                          <td className="debts-number">{formatearDinero(deuda.originalAmount)}</td>
                          <td className="debts-number debts-balance">{formatearDinero(deuda.outstandingBalance)}</td>
                          <td>{formatearFecha(deuda.dueDate)}</td>
                          <td><span className={`debts-status debts-status--${estado.clase}`}>{estado.texto}</span></td>
                          <td>
                            <button
                              type="button"
                              className="debts-btn debts-btn--dark debts-btn--small"
                              onClick={() => abrirPago(deuda._id)}
                              disabled={!puedeAbonar}
                              aria-label={`Registrar abono para ${deuda.clientId?.name || "cliente"}`}
                            >
                              Abonar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="debts-pagination">
                <p>Mostrando {desde + 1}–{Math.min(desde + filasPorPagina, deudasFiltradas.length)} de {deudasFiltradas.length}</p>
                <div className="debts-pagination-controls">
                  <label htmlFor="deudas-filas">Filas</label>
                  <select
                    id="deudas-filas"
                    value={filasPorPagina}
                    onChange={(e) => {
                      setFilasPorPagina(Number(e.target.value));
                      setPaginaActual(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <button type="button" disabled={paginaVisible === 1} onClick={() => setPaginaActual(paginaVisible - 1)}>Anterior</button>
                  <span>Página {paginaVisible} de {totalPaginas}</span>
                  <button type="button" disabled={paginaVisible === totalPaginas} onClick={() => setPaginaActual(paginaVisible + 1)}>Siguiente</button>
                </div>
              </div>
            </>
          )
        )}
      </section>

      {/* El Modal compartido conserva el cierre con Escape y el manejo del foco. */}
      <Modal open={modalAbierto === "deuda"} onClose={cerrarModal} title="Registrar nueva deuda" label="GESTIÓN DE CARTERA">
        <div className="debts-modal-body"><DebtForm onDebtCreated={handleDebtCreated} /></div>
      </Modal>

      <Modal open={modalAbierto === "pago"} onClose={cerrarModal} title="Registrar abono" label="GESTIÓN DE PAGOS">
        <div className="debts-modal-body">
          <PaymentForm
            key={deudaPagoId || "seleccion-manual"}
            debts={debts}
            initialDebtId={deudaPagoId}
            onPaymentCreated={handlePaymentCreated}
          />
        </div>
      </Modal>

      <Modal open={modalAbierto === "importar-deudas"} onClose={cerrarModal} title="Importar deudas" label="IMPORTACIÓN CSV">
        <div className="debts-modal-body debts-modal-body--import">
          <ImportDebtsCsv token={token} onImported={handleDebtsImported} />
        </div>
      </Modal>

      <Modal open={modalAbierto === "importar-abonos"} onClose={cerrarModal} title="Importar abonos" label="IMPORTACIÓN CSV">
        <div className="debts-modal-body debts-modal-body--import">
          <ImportPaymentsCsv token={token} onImported={handlePaymentsImported} />
        </div>
      </Modal>

      <Modal open={modalAbierto === "historial"} onClose={cerrarModal} title="Historial de pagos" label="GESTIÓN DE PAGOS">
        <div className="debts-modal-body debts-modal-body--history">
          <PaymentsHistory refreshKey={paymentsRefreshKey} />
        </div>
      </Modal>
    </main>
  );
}
