
function protegerCsv(valor) {
  const texto = String(valor ?? "");

  // Evitar que los datos sean interpretados como formulas.
  const seguro = /^[\s]*[=+\-@]/.test(texto)
    ? "'" + texto
    : texto;

  return `"${seguro.replace(/"/g, '""')}"`;
}

export function exportarDeudasCsv(deudas) {
  if (!Array.isArray(deudas) || deudas.length === 0) {
    throw new Error("No hay deudas para exportar.");
  }

  const encabezados = [
    "Cliente",
    "Documento",
    "Descripcion",
    "Valor original",
    "Saldo pendiente",
    "Fecha de vencimiento",
    "Estado",
    "Referencia externa",
  ];

  const filas = deudas.map((deuda) => [
    deuda.clientId?.name || "",
    deuda.clientId?.documentNumber || "",
    deuda.description || "",
    deuda.originalAmount ?? 0,
    deuda.outstandingBalance ?? 0,
    deuda.dueDate ? String(deuda.dueDate).slice(0, 10) : "",
    deuda.status || "",
    deuda.externalReference || "",
  ]);

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map(protegerCsv).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", contenido], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "FinCRM_deudas_filtradas.csv";

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
