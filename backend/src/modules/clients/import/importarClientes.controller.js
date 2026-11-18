const mongoose = require("mongoose");

const { parse } = require("csv-parse/sync");

const Client = require("../client.model");

const {
  validarClientesCsv,
} = require("./validarClientesCsv");

// Columnas que esperamos recibir.
const COLUMNAS_ESPERADAS = [
  "name",
  "documentNumber",
  "email",
  "phone",
  "address",
];

// POST /api/clients/import/preview
const previsualizarClientesCsv = async (req, res) => {
  // 1. Verificar que el usuario tenga una empresa.
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      message: "Usuario sin empresa asignada",
    });
  }

  // 2. Verificar que se haya enviado un archivo.
  if (!req.file?.buffer) {
    return res.status(400).json({
      message: "Debes seleccionar un archivo CSV",
    });
  }

  // 3. Verificar el tamaño.
  const LIMITE_BYTES = 1024 * 1024;

  if (req.file.size > LIMITE_BYTES) {
    return res.status(400).json({
      message: "El archivo no puede superar 1 MB",
    });
  }

  // 4. Verificar la extensión.
  if (!req.file.originalname?.toLowerCase().endsWith(".csv")) {
    return res.status(400).json({
      message: "Solo se permiten archivos CSV",
    });
  }

  let contenido;
  let resultado;

  try {
    // 5. Decodificar el archivo como UTF-8.
    // Rechazamos archivos con codificación inválida.
    contenido = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(req.file.buffer);

    if (!contenido.trim()) {
      return res.status(400).json({
        message: "El archivo CSV está vacío",
      });
    }

    // 6. Leer la primera fila: encabezados.
    const encabezados = parse(contenido, {
      bom: true,
      to_line: 1,
      skip_empty_lines: true,
      trim: true,
    })[0];

    // 7. Comprobar las columnas obligatorias.
    const columnasValidas =
      Array.isArray(encabezados) &&
      encabezados.length === COLUMNAS_ESPERADAS.length &&
      COLUMNAS_ESPERADAS.every(
        (columna, indice) =>
          encabezados[indice] === columna
      );

    if (!columnasValidas) {
      return res.status(400).json({
        message: "Las columnas del CSV no son válidas",
        columnasEsperadas: COLUMNAS_ESPERADAS,
      });
    }

    // 8. Validar registros sin modificar MongoDB.
    resultado = validarClientesCsv(contenido);
  } catch (error) {
    return res.status(400).json({
      message: "No fue posible validar el archivo CSV",
      detalle: error.message,
    });
  }

  try {
    // 9. Obtener documentos de las filas válidas.
    const documentos = resultado.validos.map(
      (cliente) => cliente.documentNumber
    );

    // 10. Buscar documentos existentes en la empresa.
    // Incluimos clientes inactivos para evitar conflictos
    // con el índice único de MongoDB.
    const existentes = await Client.find({
      tenantId,
      documentNumber: { $in: documentos },
    })
      .select("documentNumber")
      .lean();

    const documentosExistentes = new Set(
      existentes.map(
        (cliente) => cliente.documentNumber
      )
    );

    // 11. Separar clientes nuevos de los duplicados.
    const validos = [...resultado.validos];
    const errores = [...resultado.errores];

    const nuevos = [];

    for (const cliente of validos) {
      if (documentosExistentes.has(cliente.documentNumber)) {
        errores.push({
          fila: cliente.fila,
          documento: cliente.documentNumber,
          problemas: [
            "El documento ya existe en esta empresa",
          ],
        });
      } else {
        nuevos.push(cliente);
      }
    }

    // 12. Mostrar la vista previa.
    return res.status(200).json({
      message: "Archivo CSV analizado correctamente",
      total: resultado.total,
      validos: nuevos,
      errores,
      cantidadValidos: nuevos.length,
      cantidadErrores: errores.length,
      puedeImportar: errores.length === 0,
    });

  } catch (error) {
    console.error(
      "Error al verificar clientes existentes:",
      error.message
    );

    return res.status(500).json({
      message:
        "No fue posible verificar los documentos en MongoDB",
    });
  }
};


const confirmarImportacionClientes = async (req, res) => {
  const tenantId = req.user?.tenantId;

  // 1. Verificar que el usuario pertenezca a una empresa.
  if (!tenantId) {
    return res.status(403).json({
      message: "Usuario sin empresa asignada",
    });
  }

  // 2. Verificar que exista un archivo.
  if (!req.file?.buffer) {
    return res.status(400).json({
      message: "Debes seleccionar un archivo CSV",
    });
  }

  // 3. Verificar extensión y tamaño.
  if (
    !req.file.originalname?.toLowerCase().endsWith(".csv") ||
    req.file.size > 1024 * 1024
  ) {
    return res.status(400).json({
      message: "Debes enviar un CSV de máximo 1 MB",
    });
  }

  let resultado;

  try {
    // 4. Leer el archivo como UTF-8.
    const contenido = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(req.file.buffer);

    // 5. Comprobar las columnas esperadas.
    const encabezados = parse(contenido, {
      bom: true,
      to_line: 1,
      skip_empty_lines: true,
      trim: true,
    })[0];

    const columnasValidas =
      Array.isArray(encabezados) &&
      encabezados.length === COLUMNAS_ESPERADAS.length &&
      COLUMNAS_ESPERADAS.every(
        (columna, indice) =>
          encabezados[indice] === columna
      );

    if (!columnasValidas) {
      return res.status(400).json({
        message: "Las columnas del CSV no son válidas",
        columnasEsperadas: COLUMNAS_ESPERADAS,
      });
    }

    // 6. Reutilizar las validaciones existentes.
    resultado = validarClientesCsv(contenido);

    // No permitimos importaciones parciales.
    if (
      resultado.errores.length > 0 ||
      resultado.validos.length === 0
    ) {
      return res.status(400).json({
        message: "El CSV contiene errores",
        errores: resultado.errores,
      });
    }
  } catch (error) {
    return res.status(400).json({
      message: "No fue posible validar el CSV",
      detalle: error.message,
    });
  }

  let session;

  try {
    // 7. Iniciar una transacción.
    session = await mongoose.startSession();

    let clientesGuardados = [];

    await session.withTransaction(async () => {
      const documentos = resultado.validos.map(
        (cliente) => cliente.documentNumber
      );

      // 8. Volver a comprobar duplicados en MongoDB.
      const existentes = await Client.find({
        tenantId,
        documentNumber: { $in: documentos },
      })
        .select("documentNumber")
        .session(session)
        .lean();

      if (existentes.length > 0) {
        const error = new Error(
          "Hay documentos que ya existen en esta empresa"
        );

        error.statusCode = 409;
        error.documentos = existentes.map(
          (cliente) => cliente.documentNumber
        );

        throw error;
      }

      // 9. Preparar los clientes.
      // El tenantId SIEMPRE viene del JWT.
      const nuevosClientes = resultado.validos.map(
        (cliente) => ({
          tenantId,
          name: cliente.name,
          documentNumber: cliente.documentNumber,
          email: cliente.email,
          phone: cliente.phone,
          address: cliente.address,
        })
      );

      // 10. Guardar todos los clientes en la transacción.
      clientesGuardados = await Client.insertMany(
        nuevosClientes,
        {
          session,
          ordered: true,
        }
      );
    });

    // 11. Responder únicamente después del guardado.
    return res.status(201).json({
      message: "Clientes importados correctamente",
      totalImportados: clientesGuardados.length,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        message: error.message,
        documentos: error.documentos,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Se detectó un documento duplicado. No se completó la importación.",
      });
    }

    console.error(
      "Error al importar clientes:",
      error.message
    );

    return res.status(500).json({
      message:
        "No fue posible completar la importación de clientes",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

module.exports = {
  previsualizarClientesCsv,
  confirmarImportacionClientes,
};
