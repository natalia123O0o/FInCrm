
import { useState } from "react";

export default function ExportButtons({
  data = [],
  onExportCsv,
  onExportXlsx,
  onExportPdf,
}) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");

  async function manejarExportacion(funcionExportar) {
    if (typeof funcionExportar !== "function") return;

    try {
      setError("");
      setExportando(true);

      await funcionExportar(data);
    } catch (err) {
      setError(err.message || "No se pudo exportar el archivo");
    } finally {
      setExportando(false);
    }
  }

  const sinDatos = !Array.isArray(data) || data.length === 0;

  const estiloBase = {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 500,
  };

  return (
    <section aria-label="Exportar datos">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {onExportCsv && (
          <button
            type="button"
            disabled={sinDatos || exportando}
            onClick={() => manejarExportacion(onExportCsv)}
            style={{
              ...estiloBase,
              backgroundColor: "#142c49",
            }}
          >
            Exportar CSV
          </button>
        )}

        {onExportXlsx && (
          <button
            type="button"
            disabled={sinDatos || exportando}
            onClick={() => manejarExportacion(onExportXlsx)}
            style={{
              ...estiloBase,
              backgroundColor: "#166534",
            }}
          >
            Exportar Excel
          </button>
        )}

        {onExportPdf && (
          <button
            type="button"
            disabled={sinDatos || exportando}
            onClick={() => manejarExportacion(onExportPdf)}
            style={{
              ...estiloBase,
              backgroundColor: "#b91c1c",
            }}
          >
            Exportar PDF
          </button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </section>
  );
}
