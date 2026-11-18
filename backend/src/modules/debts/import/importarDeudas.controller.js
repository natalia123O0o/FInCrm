
const Client = require("../../clients/client.model");
const Debt = require("../debt.model");
const mongoose = require("mongoose");

const {
  validarDeudasCsv,
} = require("./validarDeudasCsv");

// POST /api/debts/import/preview
// Revisar el CSV sin guardar deudas.
const previsualizarDeudasCsv = async (req, res) => {
  // Obtener la empresa del usuario autenticado.
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      message: "Usuario sin empresa asignada",
    });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({
      message: "Debes seleccionar un archivo CSV",
    });
  }

  let resultado;

  try {
    // Decodificar el CSV como UTF-8.
    const contenido = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(req.file.buffer);

    // Reutilizar las validaciones del archivo anterior.
    resultado = validarDeudasCsv(contenido);
  } catch (error) {
    return res.status(400).json({
      message: "No fue posible validar el archivo CSV",
      detalle: error.message,
    });
  }

  try {
    // Obtener documentos de las filas válidas.
    const documentos = [
      ...new Set(
        resultado.validos.map(
          (deuda) => deuda.documentNumber
        )
      ),
    ];

    // Consultar clientes activos de esta empresa.
    const clientes = await Client.find({
      tenantId,
      isActive: true,
      documentNumber: { $in: documentos },
    })
      .select("_id name documentNumber")
      .lean();

    // Asociar cada documento con su cliente.
    const clientesPorDocumento = new Map(
      clientes.map((cliente) => [
        cliente.documentNumber,
        cliente,
      ])
    );

    // Buscar referencias de deudas ya registradas.
    const referencias = resultado.validos.map(
      (deuda) => deuda.externalReference
    );

    const deudasExistentes = await Debt.find({
      tenantId,
      externalReference: { $in: referencias },
    })
      .select("externalReference")
      .lean();

    const referenciasExistentes = new Set(
      deudasExistentes.map(
        (deuda) => deuda.externalReference
      )
    );

    const validos = [];
    const errores = [...resultado.errores];

    for (const deuda of resultado.validos) {
      const problemas = [];

      const cliente = clientesPorDocumento.get(
        deuda.documentNumber
      );

      // Verificar que el cliente exista y esté activo.
      if (!cliente) {
        problemas.push(
          "El cliente no existe o está inactivo en esta empresa"
        );
      }

      // Verificar que la referencia no esté registrada.
      if (
        referenciasExistentes.has(deuda.externalReference)
      ) {
        problemas.push(
          "La referencia de esta deuda ya existe"
        );
      }

      if (problemas.length > 0) {
        errores.push({
          fila: deuda.fila,
          documentNumber: deuda.documentNumber,
          problemas,
        });
      } else {
        validos.push({
          fila: deuda.fila,
          documentNumber: deuda.documentNumber,
          clientName: cliente.name,
          description: deuda.description,
          amount: deuda.amount,
          dueDate: deuda.dueDate,
          externalReference: deuda.externalReference,
        });
      }
    }

    return res.status(200).json({
      message: "Archivo de deudas analizado correctamente",
      total: resultado.total,
      validos,
      errores,
      cantidadValidos: validos.length,
      cantidadErrores: errores.length,
      puedeImportar:
        errores.length === 0 && validos.length > 0,
    });
  } catch (error) {
    console.error(
      "Error al previsualizar deudas CSV:",
      error.message
    );

    return res.status(500).json({
      message: "No fue posible verificar las deudas",
    });
  }
};


const confirmarImportacionDeudas = async (req, res) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      message: "Usuario sin empresa asignada",
    });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({
      message: "Debes seleccionar un archivo CSV",
    });
  }

  let resultado;

  try {
    // Leer el archivo.
    const contenido = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(req.file.buffer);

    // Volver a validar todas las filas.
    resultado = validarDeudasCsv(contenido);

    // No aceptar archivos con errores.
    if (
      resultado.errores.length > 0 ||
      resultado.validos.length === 0
    ) {
      return res.status(400).json({
        message: "El archivo contiene errores",
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
    session = await mongoose.startSession();

    let cantidadImportada = 0;

    // Todo se guarda o todo se cancela.
    await session.withTransaction(async () => {
      const documentos = [
        ...new Set(
          resultado.validos.map(
            (deuda) => deuda.documentNumber
          )
        ),
      ];

      const referencias = resultado.validos.map(
        (deuda) => deuda.externalReference
      );

      // Buscar clientes activos de la empresa.
      const clientes = await Client.find({
        tenantId,
        isActive: true,
        documentNumber: { $in: documentos },
      })
        .select("_id name documentNumber")
        .session(session)
        .lean();

      const clientesPorDocumento = new Map(
        clientes.map((cliente) => [
          cliente.documentNumber,
          cliente,
        ])
      );

      // Comprobar que existan todos los clientes.
      const documentosNoEncontrados = documentos.filter(
        (documento) => !clientesPorDocumento.has(documento)
      );

      if (documentosNoEncontrados.length > 0) {
        const error = new Error(
          "Uno o más clientes no existen o están inactivos"
        );

        error.statusCode = 400;
        error.detalles = documentosNoEncontrados;
        throw error;
      }

      // Comprobar referencias ya registradas.
      const existentes = await Debt.find({
        tenantId,
        externalReference: { $in: referencias },
      })
        .select("externalReference")
        .session(session)
        .lean();

      if (existentes.length > 0) {
        const error = new Error(
          "Una o más referencias ya están registradas"
        );

        error.statusCode = 409;
        error.detalles = existentes.map(
          (deuda) => deuda.externalReference
        );
        throw error;
      }

      // Preparar los registros con sus clientes reales.
      const nuevasDeudas = resultado.validos.map(
        (deuda) => ({
          tenantId,
          clientId: clientesPorDocumento.get(
            deuda.documentNumber
          )._id,
          description: deuda.description,
          originalAmount: deuda.amount,
          outstandingBalance: deuda.amount,
          dueDate: new Date(
            `${deuda.dueDate}T00:00:00.000Z`
          ),
          externalReference: deuda.externalReference,
          status: "PENDING",
          isActive: true,
        })
      );

      // Guardar dentro de la transacción.
      const guardadas = await Debt.insertMany(
        nuevasDeudas,
        {
          session,
          ordered: true,
        }
      );

      cantidadImportada = guardadas.length;
    });

    return res.status(201).json({
      message: "Deudas importadas correctamente",
      totalImportados: cantidadImportada,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        detalles: error.detalles,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Se encontró una referencia duplicada. No se completó la importación.",
      });
    }

    console.error(
      "Error al importar deudas:",
      error.message
    );

    return res.status(500).json({
      message: "No fue posible importar las deudas",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};


module.exports = {
  previsualizarDeudasCsv,
  confirmarImportacionDeudas,
};
