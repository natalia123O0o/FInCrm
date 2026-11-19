
const { parse } = require("csv-parse/sync");

// Columnas que debe contener el archivo CSV.
const COLUMNAS = [
  "externalReference",
  "amount",
  "paymentDate",
  "paymentMethod",
  "reference",
  "importReference",
];

// Medios de pago permitidos.
const METODOS = new Set([
  "CASH",
  "TRANSFER",
  "CARD",
  "OTHER",
]);

// Verificar que una fecha sea real.
function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

// Validar el contenido del archivo CSV.
function validarAbonosCsv(contenido) {
  let registros;

  try {
    registros = parse(contenido.replace(/^\uFEFF/, ""), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: false,
    });
  } catch {
    throw new Error(
      "No se pudo leer el CSV. Revisa las columnas y comillas."
    );
  }

  // Revisar los encabezados del archivo.
  const primeraLinea = contenido
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)[0];

  let encabezados;

  try {
    encabezados = parse(primeraLinea, {
      trim: true,
      bom: true,
    })[0] || [];
  } catch {
    throw new Error("Encabezados CSV invalidos.");
  }

  if (
    encabezados.length !== COLUMNAS.length ||
    encabezados.some((columna, i) => columna !== COLUMNAS[i])
  ) {
    throw new Error(
      `Las columnas deben ser: ${COLUMNAS.join(",")}`
    );
  }

  // Máximo 500 abonos por archivo.
  if (registros.length === 0 || registros.length > 500) {
    throw new Error(
      "El archivo debe contener entre 1 y 500 abonos."
    );
  }

  const referenciasVistas = new Set();
  const validos = [];
  const errores = [];

  registros.forEach((registro, indice) => {
    const fila = indice + 2;
    const motivos = [];

    const externalReference =
      String(registro.externalReference || "").trim();

    const amountText =
      String(registro.amount || "").trim();

    const paymentDate =
      String(registro.paymentDate || "").trim();

    const paymentMethod =
      String(registro.paymentMethod || "").trim();

    const reference =
      String(registro.reference || "").trim();

    const importReference =
      String(registro.importReference || "").trim();

    const amount = Number(amountText);

    // Validar referencia de deuda.
    if (!externalReference) {
      motivos.push("Falta la referencia de la deuda");
    }

    // Validar que el abono sea un entero positivo.
    if (
      !/^[1-9]\d*$/.test(amountText) ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      motivos.push(
        "El abono debe ser un entero positivo en COP"
      );
    }

    // Validar fecha.
    if (!fechaValida(paymentDate)) {
      motivos.push("Fecha invalida: usa YYYY-MM-DD");
    }

    // Validar método de pago.
    if (!METODOS.has(paymentMethod)) {
      motivos.push("Medio de pago invalido");
    }

    // Detectar referencias repetidas.
    if (!importReference) {
      motivos.push("Falta importReference");
    } else if (referenciasVistas.has(importReference)) {
      motivos.push("importReference duplicada en el CSV");
    }

    if (importReference) {
      referenciasVistas.add(importReference);
    }

    // Evitar referencias demasiado largas.
    if (
      externalReference.length > 120 ||
      reference.length > 120 ||
      importReference.length > 120
    ) {
      motivos.push("Una referencia supera 120 caracteres");
    }

    const datos = {
      fila,
      externalReference,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      importReference,
    };

    if (motivos.length > 0) {
      errores.push({ ...datos, motivos });
    } else {
      validos.push(datos);
    }
  });

  return {
    total: registros.length,
    validos,
    errores,
  };
}

module.exports = { validarAbonosCsv };
