
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ImportDebtsCsv({ token, onImported }) {
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Controla el proceso de guardado.
  const [importando, setImportando] = useState(false);

  // Mensaje de éxito.
  const [resultadoImportacion, setResultadoImportacion] = useState("");

  // Seleccionar archivo CSV.
  function seleccionarArchivo(evento) {
    const seleccionado = evento.target.files?.[0] || null;

    setArchivo(seleccionado);
    setVistaPrevia(null);
    setError("");
  }

  // Validar deudas mediante el backend.
  async function revisarArchivo(evento) {
    evento.preventDefault();

    if (!archivo || !token || cargando) {
      return;
    }

    setCargando(true);
    setError("");
    setVistaPrevia(null);

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);

      const respuesta = await fetch(
        `${API_URL}/api/debts/import/preview`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.detalle || data.message ||
          "No fue posible validar las deudas"
        );
      }

      setVistaPrevia(data);
    } catch (err) {
      setError(
        err.message || "Error al revisar el archivo CSV"
      );
    } finally {
      setCargando(false);
    }
  }

  const estiloCelda = {
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
    textAlign: "left",
  };


  async function confirmarImportacion() {
    // Comprobar que la vista previa sea válida.
    if (
      !archivo ||
      !token ||
      !vistaPrevia?.puedeImportar ||
      cargando ||
      importando
    ) {
      return;
    }

    // Pedir autorización al administrador.
    const confirmado = window.confirm(
      `¿Deseas importar ${vistaPrevia.cantidadValidos} deudas a FinCRM?`
    );

    if (!confirmado) return;

    setImportando(true);
    setError("");
    setResultadoImportacion("");

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);

      // Enviar el CSV nuevamente al backend.
      const respuesta = await fetch(
        `${API_URL}/api/debts/import/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const tipoContenido =
        respuesta.headers.get("content-type") || "";

      if (!tipoContenido.includes("application/json")) {
        throw new Error(
          `Respuesta inesperada del servidor (HTTP ${respuesta.status}).`
        );
      }

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || "No fue posible importar las deudas"
        );
      }

      // Mostrar el resultado.
      setResultadoImportacion(
        `Se importaron correctamente ${data.totalImportados} deudas.`
      );

      // Bloquear la confirmación repetida.
      setVistaPrevia(null);
      setArchivo(null);

      // Actualizar la lista de deudas.
      if (onImported) {
        try {
          await onImported();
        } catch {
          setError(
            "Las deudas se guardaron, pero no se pudo actualizar la tabla. Recarga la página."
          );
        }
      }
    } catch (err) {
      setError(err.message || "Error durante la importación");
    } finally {
      setImportando(false);
    }
  }


  return (
    <section
      style={{
        marginTop: "32px",
        padding: "20px",
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        backgroundColor: "#f8fafc",
      }}
    >
      <h2>Importar deudas desde CSV</h2>

      <p>
        Carga un archivo CSV con las deudas de clientes
        registrados en tu empresa.
      </p>

      <p>
        <strong>Columnas esperadas:</strong>
      </p>

      <code style={{ overflowWrap: "anywhere" }}>
        documentNumber,description,amount,dueDate,externalReference
      </code>

      <p>Máximo 500 deudas y 1 MB por archivo.</p>

      <form onSubmit={revisarArchivo}>
        <label htmlFor="archivo-deudas">
          Seleccionar archivo CSV
        </label>

        <div style={{ marginTop: "8px" }}>
          <input
            id="archivo-deudas"
            type="file"
            accept=".csv,text/csv"
            onChange={seleccionarArchivo}
            disabled={cargando}
          />
        </div>

        <button
          type="submit"
          disabled={!archivo || !token || cargando}
          style={{
            marginTop: "16px",
            padding: "10px 16px",
            backgroundColor: "#142c49",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {cargando
            ? "Validando deudas..."
            : "Revisar archivo CSV"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}

      {vistaPrevia && (
        <div style={{ marginTop: "24px" }}>
          <h3>Resultado de la validación</h3>

          <p>Total de registros: {vistaPrevia.total}</p>

          <p>
            Deudas válidas: {vistaPrevia.cantidadValidos}
          </p>

          <p>
            Deudas con errores: {vistaPrevia.cantidadErrores}
          </p>

          {vistaPrevia.validos.length > 0 && (
            <>
              <h4>Deudas válidas</h4>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={estiloCelda}>Fila</th>
                      <th style={estiloCelda}>Cliente</th>
                      <th style={estiloCelda}>Documento</th>
                      <th style={estiloCelda}>Descripción</th>
                      <th style={estiloCelda}>Valor</th>
                      <th style={estiloCelda}>Vencimiento</th>
                      <th style={estiloCelda}>Referencia</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vistaPrevia.validos.map((deuda) => (
                      <tr key={deuda.fila}>
                        <td style={estiloCelda}>{deuda.fila}</td>

                        <td style={estiloCelda}>
                          {deuda.clientName}
                        </td>

                        <td style={estiloCelda}>
                          {deuda.documentNumber}
                        </td>

                        <td style={estiloCelda}>
                          {deuda.description}
                        </td>

                        <td style={estiloCelda}>
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            maximumFractionDigits: 0,
                          }).format(deuda.amount)}
                        </td>

                        <td style={estiloCelda}>
                          {deuda.dueDate}
                        </td>

                        <td style={estiloCelda}>
                          {deuda.externalReference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}



          {vistaPrevia.errores.length > 0 && (
            <>
              <h4 style={{ color: "#c62828" }}>
                Deudas con errores
              </h4>

              <ul>
                {vistaPrevia.errores.map((registro) => (
                  <li key={registro.fila}>
                    <strong>Fila {registro.fila}:</strong>{" "}
                    {registro.problemas.join("; ")}
                  </li>
                ))}
              </ul>
            </>
          )}


          {vistaPrevia.puedeImportar ? (
            <>
              <p style={{ color: "#166534" }}>
                Todas las deudas cumplen las validaciones
                iniciales y sus clientes fueron encontrados.
              </p>

              <button
                type="button"
                onClick={confirmarImportacion}
                disabled={importando || cargando}
                style={{
                  padding: "12px 20px",
                  marginTop: "12px",
                  backgroundColor: "#166534",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                {importando
                  ? "Importando deudas..."
                  : `Confirmar importación de ${vistaPrevia.cantidadValidos} deudas`}
              </button>
            </>
          ) : (
            <p style={{ color: "#c62828" }}>
              Corrige los errores antes de importar.
            </p>
          )}

          <p style={{ color: "#c62828" }}>
            Corrige los errores antes de importar.
          </p>
          )

          <p>
            <strong>Importante:</strong> esta es una vista
            previa. No se ha guardado ninguna deuda.
          </p>
        </div>
      )}

      {resultadoImportacion && (
        <p role="status" style={{ color: "#166534" }}>
          {resultadoImportacion}
        </p>
      )}
    </section>
  );
}
