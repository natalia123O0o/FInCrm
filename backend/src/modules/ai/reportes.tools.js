
const ExcelJS = require("exceljs");
const Debt = require("../debts/debt.model");

const generarExcelCartera = async (tenantId) => {
  if (!tenantId) {
    throw new Error("Empresa no identificada");
  }

  // Evitamos entregar archivos incompletos sin avisar.
  const LIMITE = 1000;

  // Consultamos solamente las deudas pendientes
  // de la empresa autenticada.
  const deudas = await Debt.find({
    tenantId,
    isActive: true,
    outstandingBalance: { $gt: 0 },
  })
    .select(
      "clientId description originalAmount outstandingBalance dueDate status"
    )
    .populate("clientId", "name")
    .sort({ createdAt: -1 })
    .limit(LIMITE + 1)
    .lean();

  if (deudas.length > LIMITE) {
    throw new Error(
      "El reporte supera 1000 deudas. Se necesita exportación por lotes."
    );
  }

  const libro = new ExcelJS.Workbook();

  const hoja = libro.addWorksheet("Cartera pendiente");

  hoja.columns = [
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Descripción", key: "descripcion", width: 35 },
    { header: "Valor original", key: "valorOriginal", width: 20 },
    { header: "Saldo pendiente", key: "saldoPendiente", width: 22 },
    { header: "Vencimiento", key: "vencimiento", width: 20 },
    { header: "Estado", key: "estado", width: 18 },
  ];

  // Evita que un texto procedente de MongoDB se
  // interprete como fórmula al abrir el Excel.
  const textoSeguro = (valor) => {
    const texto = String(valor ?? "");
    return /^[\s]*[=+\-@\t\r]/.test(texto)
      ? `'${texto}`
      : texto;
  };

  for (const deuda of deudas) {
    hoja.addRow({
      cliente: textoSeguro(
        deuda.clientId?.name ?? "Cliente no disponible"
      ),
      descripcion: textoSeguro(deuda.description),
      valorOriginal: deuda.originalAmount,
      saldoPendiente: deuda.outstandingBalance,
      vencimiento: deuda.dueDate,
      estado: deuda.status,
    });
  }

  // Formato de valores monetarios.
  hoja.getColumn("valorOriginal").numFmt = '"$"#,##0';
  hoja.getColumn("saldoPendiente").numFmt = '"$"#,##0';

  // Formato de fecha.
  hoja.getColumn("vencimiento").numFmt = "dd/mm/yyyy";

  // Encabezados destacados.
  hoja.getRow(1).font = { bold: true };
  hoja.getRow(1).height = 24;

  hoja.autoFilter = {
    from: "A1",
    to: "F1",
  };

  hoja.views = [
    { state: "frozen", ySplit: 1 },
  ];

  // Generamos el Excel en memoria.
  const buffer = await libro.xlsx.writeBuffer();

  return Buffer.from(buffer);
};

module.exports = { generarExcelCartera };
