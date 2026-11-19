function protegerValorCsv(valor) {
  const texto = String(valor ?? "");

  // Evitar que Excel interprete datos como fórmulas.
  const seguro = /^[\s]*[=+\-@\t\r\n]/.test(texto)
    ? `'${texto}`
    : texto;

  // Escapar comillas dobles y encerrar el campo.
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function exportarClientesCsv(clientes) {
  if (!Array.isArray(clientes) || clientes.length === 0) {
    throw new Error("No hay clientes para exportar");
  }

  // Columnas que tendrá el archivo.
  const encabezados = [
    "Nombre",
    "Documento",
    "Correo",
    "Telefono",
    "Direccion",
    "Fecha de registro",
  ];

  const filas = clientes.map((cliente) => [
    cliente.name,
    cliente.documentNumber,
    cliente.email || "",
    cliente.phone || "",
    cliente.address || "",
    cliente.createdAt
      ? String(cliente.createdAt).slice(0, 10)
      : "",
  ]);

  const contenido = [
    encabezados,
    ...filas,
  ]
    .map((fila) =>
      fila.map(protegerValorCsv).join(",")
    )
    .join("\r\n");

  // BOM UTF-8 para mejorar la lectura de acentos en Excel.
  const blob = new Blob(
    ["\uFEFF", contenido],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "FinCRM_clientes_filtrados.csv";

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
}
