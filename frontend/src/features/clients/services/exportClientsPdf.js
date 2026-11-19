
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export function exportarClientesPdf(clientes) {
  if (!Array.isArray(clientes) || clientes.length === 0) {
    throw new Error("No hay clientes para exportar");
  }

  // Crear PDF horizontal para aprovechar el espacio.
  const documento = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Título.
  documento.setFontSize(18);
  documento.setTextColor(20, 44, 73);
  documento.text("FinCRM - Reporte de clientes", 14, 18);

  // Información del reporte.
  documento.setFontSize(10);
  documento.setTextColor(90, 100, 115);

  documento.text(
    `Total de clientes: ${clientes.length}`,
    14,
    26
  );

  documento.text(
    `Fecha de generacion: ${new Date().toLocaleDateString("es-CO")}`,
    14,
    32
  );

  // Construir las filas.
  const filas = clientes.map((cliente) => [
    String(cliente.name || ""),
    String(cliente.documentNumber || ""),
    String(cliente.email || ""),
    String(cliente.phone || ""),
    String(cliente.address || ""),
    cliente.createdAt
      ? String(cliente.createdAt).slice(0, 10)
      : "",
  ]);

  // Crear la tabla.
  autoTable(documento, {
    startY: 39,

    head: [[
      "Nombre",
      "Documento",
      "Correo",
      "Telefono",
      "Direccion",
      "Registro",
    ]],

    body: filas,

    theme: "grid",

    headStyles: {
      fillColor: [20, 44, 73],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },

    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
    },

    margin: {
      left: 14,
      right: 14,
    },
  });

  // Descargar el PDF.
  documento.save("FinCRM_clientes_filtrados.pdf");
}
