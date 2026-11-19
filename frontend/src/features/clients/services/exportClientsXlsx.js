
import ExcelJS from "exceljs";

// Exportar únicamente los clientes recibidos.
export async function exportarClientesXlsx(clientes) {
  if (!Array.isArray(clientes) || clientes.length === 0) {
    throw new Error("No hay clientes para exportar");
  }

  // 1. Crear el libro de Excel.
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "FinCRM";
  workbook.created = new Date();

  // 2. Crear la hoja.
  const hoja = workbook.addWorksheet("Clientes", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // 3. Definir las columnas.
  hoja.columns = [
    { header: "Nombre", key: "name", width: 30 },
    { header: "Documento", key: "documentNumber", width: 22 },
    { header: "Correo", key: "email", width: 35 },
    { header: "Telefono", key: "phone", width: 20 },
    { header: "Direccion", key: "address", width: 35 },
    { header: "Fecha de registro", key: "createdAt", width: 22 },
  ];

  // 4. Agregar los clientes.
  clientes.forEach((cliente) => {
    hoja.addRow({
      name: String(cliente.name || ""),
      documentNumber: String(cliente.documentNumber || ""),
      email: String(cliente.email || ""),
      phone: String(cliente.phone || ""),
      address: String(cliente.address || ""),
      createdAt: cliente.createdAt
        ? String(cliente.createdAt).slice(0, 10)
        : "",
    });
  });

  // 5. Aplicar estilos al encabezado.
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
      horizontal: "left",
    };
  });

  // 6. Formatear los registros.
  hoja.eachRow((fila, numero) => {
    if (numero === 1) return;

    fila.height = 23;

    fila.eachCell((celda) => {
      celda.alignment = {
        vertical: "middle",
      };

      celda.font = {
        color: { argb: "FF263548" },
        size: 10,
      };
    });
  });

  // 7. Mantener los documentos como texto.
  hoja.getColumn("documentNumber").numFmt = "@";
  hoja.getColumn("phone").numFmt = "@";

  // 8. Activar los filtros de Excel.
  hoja.autoFilter = {
    from: "A1",
    to: `F${clientes.length + 1}`,
  };

  // 9. Convertir el libro en un archivo descargable.
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "FinCRM_clientes_filtrados.xlsx";

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
