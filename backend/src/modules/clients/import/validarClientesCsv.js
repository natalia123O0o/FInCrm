const { parse } = require("csv-parse/sync");

// Columnas que debe contener el archivo CSV.
const COLUMNAS = ["name", "documentNumber", "email", "phone", "address"];

const validarClientesCsv = (contenido) => {
  // Leemos el CSV sin guardar nada en MongoDB.
  const registros = parse(contenido, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    delimiter: ",",
  });

  const validos = [];
  const errores = [];
  const documentos = new Set();

  if (registros.length === 0) {
    throw new Error("El archivo CSV está vacío");
  }

  if (registros.length > 500) {
    throw new Error("El archivo no puede superar 500 clientes");
  }

  for (let indice = 0; indice < registros.length; indice++) {
    const cliente = registros[indice];
    const fila = indice + 2;
    const problemas = [];

    const name = String(cliente.name || "").trim();

    const documentNumber = String(cliente.documentNumber || "").trim();

    const email = String(cliente.email || "")
      .trim()
      .toLowerCase();

    const phone = String(cliente.phone || "").trim();

    const address = String(cliente.address || "").trim();

    // Validar nombre obligatorio.
    if (!name) {
      problemas.push("El nombre es obligatorio");
    }

    // Validar documento obligatorio.
    if (!documentNumber) {
      problemas.push("El documento del cliente es obligatorio");
    } else if (!/^[0-9]+$/.test(documentNumber)) {
      problemas.push("El documento debe contener únicamente números");
    }

    // Validar correo electrónico opcional.
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      problemas.push("El correo no tiene un formato válido");
    }

    // Detectar documentos repetidos en el archivo.
    if (documentNumber) {
      if (documentos.has(documentNumber)) {
        problemas.push("Documento duplicado en el CSV");
      } else {
        documentos.add(documentNumber);
      }
    }

    if (problemas.length > 0) {
      errores.push({
        fila,
        documento: documentNumber,
        problemas,
      });
    } else {
      validos.push({
        fila,
        name,
        documentNumber,
        email,
        phone,
        address,
      });
    }
  }

  return {
    total: registros.length,
    validos,
    errores,
    puedeImportar: errores.length === 0,
  };
};

module.exports = { validarClientesCsv };
