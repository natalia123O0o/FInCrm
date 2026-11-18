const { parse } = require("csv-parse/sync");

const COLUMNAS_DEUDAS = [
  "documentNumber",
  "description",
  "amount",
  "dueDate",
  "externalReference",
];

function esFechaValida(fecha) {
  // Exigir formato AAAA-MM-DD.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);

  const fechaConstruida = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fechaConstruida.getUTCFullYear() === anio &&
    fechaConstruida.getUTCMonth() === mes - 1 &&
    fechaConstruida.getUTCDate() === dia
  );
}

function validarDeudasCsv(contenido) {
  const encabezados = parse(contenido, {
    bom: true,
    to_line: 1,
    skip_empty_lines: true,
    trim: true,
  })[0];

  const columnasValidas =
    Array.isArray(encabezados) &&
    encabezados.length === COLUMNAS_DEUDAS.length &&
    COLUMNAS_DEUDAS.every((columna, indice) => encabezados[indice] === columna);

  if (!columnasValidas) {
    throw new Error(
      `Columnas incorrectas. Se esperan: ${COLUMNAS_DEUDAS.join(",")}`,
    );
  }

  const registros = parse(contenido, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (registros.length === 0) {
    throw new Error("El CSV no contiene deudas");
  }

  if (registros.length > 500) {
    throw new Error("El archivo no puede superar 500 deudas");
  }

  const validos = [];
  const errores = [];
  const referencias = new Set();

  for (let indice = 0; indice < registros.length; indice++) {
    const registro = registros[indice];
    const fila = indice + 2;
    const problemas = [];

    const documentNumber = String(registro.documentNumber || "").trim();

    const description = String(registro.description || "").trim();

    const amountTexto = String(registro.amount || "").trim();

    const dueDate = String(registro.dueDate || "").trim();

    const externalReference = String(registro.externalReference || "").trim();

    // Documento del cliente.
    if (!documentNumber) {
      problemas.push("El documento del cliente es obligatorio");
    } else if (!/^[0-9]+$/.test(documentNumber)) {
      problemas.push("El documento debe contener únicamente números");
    }

    // Descripción de la deuda.
    if (!description) {
      problemas.push("La descripción es obligatoria");
    }

    // Valor monetario positivo.
    // No aceptar símbolos de moneda ni separadores.
    const formatoMontoValido = /^\d+(\.\d{1,2})?$/.test(amountTexto);

    const amount = Number(amountTexto);

    if (!formatoMontoValido || !Number.isFinite(amount) || amount <= 0) {
      problemas.push("El valor debe ser un número mayor que cero");
    }

    // Fecha real de vencimiento.
    if (!esFechaValida(dueDate)) {
      problemas.push("Fecha de vencimiento inválida. Usa AAAA-MM-DD");
    }

    // Referencia para detectar cargas repetidas.
    if (!externalReference) {
      problemas.push("La referencia externa es obligatoria");
    } else if (referencias.has(externalReference)) {
      problemas.push("Referencia duplicada dentro del CSV");
    } else {
      referencias.add(externalReference);
    }

    if (problemas.length > 0) {
      errores.push({
        fila,
        documentNumber,
        problemas,
      });
    } else {
      validos.push({
        fila,
        documentNumber,
        description,
        amount,
        dueDate,
        externalReference,
      });
    }
  }

  return {
    total: registros.length,
    validos,
    errores,
    puedeImportar: errores.length === 0,
  };
}

module.exports = {
  validarDeudasCsv,
};
