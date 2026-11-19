import ExcelJS from "exceljs";

export async function exportarDeudasXlsx(deudas) {
  // 1. Validar que existan deudas.
  if (!Array.isArray(deudas) || deudas.length === 0) {
    throw new Error("No hay deudas para exportar.");
  }

  // 2. Crear el libro y la hoja de Excel.
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "FinCRM";
  workbook.created = new Date();

  const hoja = workbook.addWorksheet("Deudas", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // 3. Definir las columnas.
  hoja.columns = [
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Documento", key: "documento", width: 22 },
    { header: "Descripcion", key: "descripcion", width: 38 },
    { header: "Valor original", key: "original", width: 20 },
    { header: "Saldo pendiente", key: "saldo", width: 22 },
    { header: "Vencimiento", key: "vencimiento", width: 19 },
    { header: "Estado", key: "estado", width: 16 },
    { header: "Referencia externa", key: "referencia", width: 25 },
  ];

  // 4. Agregar cada deuda como una fila.
  deudas.forEach((deuda) => {
    hoja.addRow({
      cliente: String(deuda.clientId?.name || ""),
      documento: String(deuda.clientId?.documentNumber || ""),
      descripcion: String(deuda.description || ""),
      original: Number(deuda.originalAmount ?? 0),
      saldo: Number(deuda.outstandingBalance ?? 0),
      vencimiento: deuda.dueDate
        ? String(deuda.dueDate).slice(0, 10)
        : "",
      estado: String(deuda.status || ""),
      referencia: String(deuda.externalReference || ""),
    });
  });

  // 5. Estilos del encabezado.
  const encabezado = hoja.getRow(1);
  encabezado.height = 30;

  encabezado.eachCell((celda) => {
    celda.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF142C49" },
    };

    celda.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };

    celda.alignment = {
      vertical: "middle",
    };
  });

  // 6. Formato para los valores monetarios.
  hoja.getColumn("original").numFmt = '"$"#,##0.00';
  hoja.getColumn("saldo").numFmt = '"$"#,##0.00';

  // 7. Documentos como texto.
  hoja.getColumn("documento").numFmt = "@";
  hoja.getColumn("referencia").numFmt = "@";

  // 8. Activar filtros en los encabezados.
  hoja.autoFilter = {
    from: "A1",
    to: `H${deudas.length + 1}`,
  };

  // 9. Descargar Excel.
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "FinCRM_deudas_filtradas.xlsx";

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
