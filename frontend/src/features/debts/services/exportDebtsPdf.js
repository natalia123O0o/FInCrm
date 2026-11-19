
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export function exportarDeudasPdf(deudas) {
  // 1. Validar que existan deudas.
  if (!Array.isArray(deudas) || deudas.length === 0) {
    throw new Error("No hay deudas para exportar.");
  }

  // 2. Crear el PDF horizontal.
  const documento = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // 3. Formato de dinero colombiano.
  const dinero = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(valor ?? 0));

  // 4. Calcular los totales de las deudas filtradas.
  const totalOriginal = deudas.reduce(
    (suma, deuda) =>
      suma + Number(deuda.originalAmount ?? 0),
    0
  );

  const totalPendiente = deudas.reduce(
    (suma, deuda) =>
      suma + Number(deuda.outstandingBalance ?? 0),
    0
  );

  // 5. Titulo del reporte.
  documento.setFontSize(18);
  documento.setTextColor(20, 44, 73);
  documento.text("FinCRM - Reporte de deudas", 14, 18);

  documento.setFontSize(10);
  documento.setTextColor(75, 85, 99);

  documento.text(
    `Total de deudas: ${deudas.length}`,
    14,
    26
  );

  documento.text(
    `Valor original: ${dinero(totalOriginal)}`,
    14,
    32
  );

  documento.text(
    `Saldo pendiente: ${dinero(totalPendiente)}`,
    14,
    38
  );

  documento.text(
    `Generado: ${new Date().toLocaleDateString("es-CO")}`,
    200,
    26
  );

  // 6. Preparar las filas.
  const filas = deudas.map((deuda) => [
    String(deuda.clientId?.name || ""),
    String(deuda.clientId?.documentNumber || ""),
    String(deuda.description || ""),
    dinero(deuda.originalAmount),
    dinero(deuda.outstandingBalance),
    deuda.dueDate
      ? String(deuda.dueDate).slice(0, 10)
      : "",
    String(deuda.status || ""),
    String(deuda.externalReference || ""),
  ]);

  // 7. Construir la tabla.
  autoTable(documento, {
    startY: 45,

    head: [[
      "Cliente",
      "Documento",
      "Descripcion",
      "Valor original",
      "Saldo pendiente",
      "Vencimiento",
      "Estado",
      "Referencia",
    ]],

    body: filas,
    theme: "grid",

    headStyles: {
      fillColor: [20, 44, 73],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },

    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      overflow: "linebreak",
    },

    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
    },

    margin: {
      left: 10,
      right: 10,
    },
  });

  // 8. Descargar el PDF.
  documento.save("FinCRM_deudas_filtradas.pdf");
}
