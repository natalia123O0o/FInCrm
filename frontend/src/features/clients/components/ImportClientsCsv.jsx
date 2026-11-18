
import { useRef, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ImportClientsCsv({ token, onImported }) {
  // Referencia al campo de selección de archivos.
  const inputArchivoRef = useRef(null);

  // Archivo CSV seleccionado.
  const [archivo, setArchivo] = useState(null);

  // Resultado de la validación del backend.
  const [vistaPrevia, setVistaPrevia] = useState(null);

  // Estados para controlar las solicitudes.
  const [cargando, setCargando] = useState(false);
  const [importando, setImportando] = useState(false);

  // Mensajes para el administrador.
  const [error, setError] = useState("");
  const [resultadoImportacion, setResultadoImportacion] =
    useState("");

  // 1. Seleccionar un archivo CSV.
  function seleccionarArchivo(evento) {
    if (cargando || importando) return;

    const seleccionado = evento.target.files?.[0] || null;

    setArchivo(seleccionado);
    setVistaPrevia(null);
    setError("");
    setResultadoImportacion("");
  }

  // 2. Validar el archivo sin guardar clientes.
  async function revisarArchivo(evento) {
    evento.preventDefault();

    if (!archivo || !token || cargando || importando) {
      return;
    }

    setCargando(true);
    setError("");
    setVistaPrevia(null);
    setResultadoImportacion("");

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);

      const respuesta = await fetch(
        `${API_URL}/api/clients/import/preview`,
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
          data.message || "No se pudo validar el archivo"
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

  // 3. Confirmar y guardar clientes en MongoDB.
  async function confirmarImportacion() {
    if (
      !archivo ||
      !token ||
      !vistaPrevia?.puedeImportar ||
      cargando ||
      importando
    ) {
      return;
    }

    // Pedir autorización antes de guardar.
    const confirmado = window.confirm(
      `¿Deseas importar ${vistaPrevia.cantidadValidos} clientes a FinCRM?`
    );

    if (!confirmado) {
      return;
    }

    setImportando(true);
    setError("");
    setResultadoImportacion("");

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);

      const respuesta = await fetch(
        `${API_URL}/api/clients/import/confirm`,
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
          data.message ||
            "No fue posible confirmar la importación"
        );
      }

      // Mostrar el resultado del guardado.
      setResultadoImportacion(
        `Se importaron correctamente ${data.totalImportados} clientes.`
      );

      // Limpiar la vista previa y el archivo.
      setVistaPrevia(null);
      setArchivo(null);

      // Limpiar el campo HTML de selección.
      if (inputArchivoRef.current) {
        inputArchivoRef.current.value = "";
      }

      // Actualizar la tabla de la página de clientes.
      if (onImported) {
        try {
          await onImported();
        } catch (errorActualizacion) {
          setError(
            "Los clientes se importaron, pero no se pudo actualizar la lista. Recarga la página."
          );
        }
      }
    } catch (err) {
      setError(
        err.message || "Error durante la importación"
      );
    } finally {
      setImportando(false);
    }
  }

  // Estilos de tabla.
  const thStyle = {
    padding: "10px",
    textAlign: "left",
    borderBottom: "2px solid #cbd5e1",
  };

  const tdStyle = {
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
  };

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
      <h2>Importar clientes desde CSV</h2>

      <p>
        Selecciona un archivo CSV. FinCRM comprobará
        los datos antes de permitir guardarlos.
      </p>

      <p>
        <strong>Columnas esperadas:</strong>{" "}
        <code>
          name,documentNumber,email,phone,address
        </code>
      </p>

      <p>
        Tamaño máximo: 1 MB. Hasta 500 clientes por archivo.
      </p>

      {/* FORMULARIO DE SELECCIÓN */}
      <form onSubmit={revisarArchivo}>
        <label htmlFor="archivo-clientes">
          Archivo de clientes
        </label>

        <div style={{ marginTop: "8px" }}>
          <input
            ref={inputArchivoRef}
            id="archivo-clientes"
            type="file"
            accept=".csv,text/csv"
            onChange={seleccionarArchivo}
            disabled={cargando || importando}
          />
        </div>

        <button
          type="submit"
          disabled={
            !archivo || !token || cargando || importando
          }
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
            ? "Validando archivo..."
            : "Revisar archivo CSV"}
        </button>
      </form>

      {/* MENSAJES DE ERROR */}
      {error && (
        <p
          role="alert"
          style={{
            color: "#c62828",
            marginTop: "16px",
          }}
        >
          {error}
        </p>
      )}

      {/* MENSAJE DESPUÉS DEL GUARDADO */}
      {resultadoImportacion && (
        <p
          role="status"
          style={{
            color: "#166534",
            marginTop: "16px",
            fontWeight: "bold",
          }}
        >
          {resultadoImportacion}
        </p>
      )}

      {/* VISTA PREVIA DEL ARCHIVO */}
      {vistaPrevia && (
        <div style={{ marginTop: "24px" }}>
          <h3>Resultado de la validación</h3>

          <p>Total de registros: {vistaPrevia.total}</p>

          <p>
            Registros válidos:{" "}
            {vistaPrevia.cantidadValidos}
          </p>

          <p>
            Registros con errores:{" "}
            {vistaPrevia.cantidadErrores}
          </p>

          {/* TABLA DE CLIENTES VÁLIDOS */}
          {vistaPrevia.validos.length > 0 && (
            <>
              <h4>Clientes válidos</h4>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Fila</th>
                      <th style={thStyle}>Nombre</th>
                      <th style={thStyle}>Documento</th>
                      <th style={thStyle}>Correo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vistaPrevia.validos.map((cliente) => (
                      <tr key={cliente.fila}>
                        <td style={tdStyle}>
                          {cliente.fila}
                        </td>

                        <td style={tdStyle}>
                          {cliente.name}
                        </td>

                        <td style={tdStyle}>
                          {cliente.documentNumber}
                        </td>

                        <td style={tdStyle}>
                          {cliente.email || "Sin correo"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* REGISTROS CON ERRORES */}
          {vistaPrevia.errores.length > 0 && (
            <>
              <h4 style={{ color: "#c62828" }}>
                Registros con errores
              </h4>

              <ul>
                {vistaPrevia.errores.map((registro) => (
                  <li key={registro.fila}>
                    <strong>
                      Fila {registro.fila}:
                    </strong>{" "}
                    {registro.problemas.join("; ")}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* RESULTADO DE LA VALIDACIÓN */}
          {vistaPrevia.puedeImportar ? (
            <>
              <p style={{ color: "#166534" }}>
                Archivo validado. Todos los registros
                cumplen las comprobaciones iniciales.
              </p>

              <button
                type="button"
                onClick={confirmarImportacion}
                disabled={importando || cargando || !token}
                style={{
                  marginTop: "16px",
                  padding: "12px 20px",
                  backgroundColor: "#166534",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    importando
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {importando
                  ? "Importando clientes..."
                  : `Confirmar importación de ${vistaPrevia.cantidadValidos} clientes`}
              </button>
            </>
          ) : (
            <p style={{ color: "#c62828" }}>
              Corrige los errores del CSV antes de importar.
            </p>
          )}

          <p style={{ marginTop: "16px" }}>
            <strong>Importante:</strong> esta es solo una
            vista previa. Todavía no se han guardado
            clientes en MongoDB.
          </p>
        </div>
      )}
    </section>
  );
}
