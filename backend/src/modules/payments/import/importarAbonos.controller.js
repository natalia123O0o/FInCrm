
const mongoose = require("mongoose");
const Debt = require("../../debts/debt.model");
const Payment = require("../payment.model");

const {
  validarAbonosCsv,
} = require("./validarAbonosCsv");

async function previsualizarAbonosCsv(req, res) {
  try {
    // Empresa del administrador autenticado.
    const tenantId = req.user?.tenantId;

    if (!mongoose.isValidObjectId(tenantId)) {
      return res.status(403).json({
        message: "Usuario sin empresa valida",
      });
    }

    // Verificar que se haya recibido un archivo.
    if (!req.file?.buffer) {
      return res.status(400).json({
        message: "Debes seleccionar un archivo CSV",
      });
    }

    // Leer el CSV.
    const contenido = req.file.buffer.toString("utf8");

    // Primera validación: formato y columnas.
    const resultado = validarAbonosCsv(contenido);

    const errores = [...resultado.errores];

    // Referencias de las deudas incluidas en el CSV.
    const referenciasDeuda = [
      ...new Set(
        resultado.validos.map(
          (registro) => registro.externalReference
        )
      ),
    ];

    // Buscar deudas activas de esta empresa.
    const deudas = await Debt.find({
      tenantId,
      isActive: true,
      externalReference: { $in: referenciasDeuda },
    })
      .select(
        "_id externalReference outstandingBalance status"
      )
      .lean();

    const deudasPorReferencia = new Map(
      deudas.map((deuda) => [
        deuda.externalReference,
        deuda,
      ])
    );

    // Buscar abonos que ya fueron importados.
    const referenciasImportacion = resultado.validos.map(
      (registro) => registro.importReference
    );

    const pagosExistentes = await Payment.find({
      tenantId,
      importReference: {
        $in: referenciasImportacion,
      },
    })
      .select("importReference")
      .lean();

    const referenciasExistentes = new Set(
      pagosExistentes.map(
        (pago) => pago.importReference
      )
    );

    // Sumar los abonos de cada deuda.
    const totalesPorDeuda = new Map();

    for (const registro of resultado.validos) {
      const referencia = registro.externalReference;

      totalesPorDeuda.set(
        referencia,
        (totalesPorDeuda.get(referencia) || 0) +
          registro.amount
      );
    }

    const validos = [];

    // Revisar que los abonos no superen el saldo.
    for (const registro of resultado.validos) {
      const motivos = [];

      const deuda = deudasPorReferencia.get(
        registro.externalReference
      );

      if (!deuda) {
        motivos.push(
          "La deuda no existe o esta inactiva en esta empresa"
        );
      } else {
        if (
          !["PENDING", "PARTIAL"].includes(deuda.status)
        ) {
          motivos.push(
            "La deuda no admite mas abonos"
          );
        }

        if (
          totalesPorDeuda.get(
            registro.externalReference
          ) > deuda.outstandingBalance
        ) {
          motivos.push(
            "Los abonos del archivo superan el saldo disponible"
          );
        }
      }

      // Comprobar referencia de importación duplicada.
      if (
        referenciasExistentes.has(registro.importReference)
      ) {
        motivos.push(
          "Este abono ya fue importado anteriormente"
        );
      }

      if (motivos.length > 0) {
        errores.push({
          ...registro,
          motivos,
        });
      } else {
        validos.push({
          ...registro,
          saldoActual: deuda.outstandingBalance,
        });
      }
    }

    // Devolver los resultados sin guardar pagos.
    return res.status(200).json({
      total: resultado.total,
      cantidadValidos: validos.length,
      cantidadErrores: errores.length,
      puedeImportar:
        errores.length === 0 &&
        validos.length === resultado.total,
      validos,
      errores,
    });

  } catch (error) {
    // Errores del archivo CSV.
    if (
      error.message?.startsWith("Las columnas") ||
      error.message?.startsWith("El archivo") ||
      error.message?.startsWith("No se pudo leer") ||
      error.message?.startsWith("Encabezados")
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error al previsualizar abonos:",
      error
    );

    return res.status(500).json({
      message: "No se pudo revisar el CSV de abonos",
    });
  }
}


async function confirmarImportacionAbonos(req, res) {
  try {
    const tenantId = req.user?.tenantId;

    if (!mongoose.isValidObjectId(tenantId)) {
      return res.status(403).json({
        message: "Usuario sin empresa valida",
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        message: "Debes seleccionar un archivo CSV",
      });
    }

    // Validar otra vez el archivo original.
    // No confiar solamente en la vista previa.
    let resultado;

    try {
      resultado = validarAbonosCsv(
        req.file.buffer.toString("utf8")
      );
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (resultado.errores.length > 0) {
      return res.status(400).json({
        message: "El CSV contiene errores",
        errores: resultado.errores,
      });
    }

    const registros = resultado.validos;
    let pagosGuardados = 0;

    // Todos los cambios forman una sola transaccion.
    await mongoose.connection.transaction(async (session) => {
      // 1. Buscar las deudas de esta empresa.
      const referencias = [
        ...new Set(
          registros.map((r) => r.externalReference)
        ),
      ];

      const deudas = await Debt.find({
        tenantId,
        isActive: true,
        externalReference: { $in: referencias },
      }).session(session);

      const mapaDeudas = new Map(
        deudas.map((deuda) => [
          deuda.externalReference,
          deuda,
        ])
      );

      // 2. Comprobar referencias ya importadas.
      const referenciasImportacion = registros.map(
        (r) => r.importReference
      );

      const pagosExistentes = await Payment.find({
        tenantId,
        importReference: {
          $in: referenciasImportacion,
        },
      }).session(session);

      if (pagosExistentes.length > 0) {
        const error = new Error(
          "Uno o mas abonos ya fueron importados"
        );
        error.statusCode = 409;
        throw error;
      }

      // 3. Acumular los importes por deuda.
      const totales = new Map();

      for (const registro of registros) {
        const deuda = mapaDeudas.get(
          registro.externalReference
        );

        if (!deuda) {
          const error = new Error(
            `Deuda no encontrada: ${registro.externalReference}`
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          !["PENDING", "PARTIAL"].includes(deuda.status)
        ) {
          const error = new Error(
            "Una deuda ya esta pagada"
          );
          error.statusCode = 400;
          throw error;
        }

        const anterior =
          totales.get(registro.externalReference) || 0;

        const acumulado = anterior + registro.amount;

        if (!Number.isSafeInteger(acumulado)) {
          const error = new Error(
            "El total de abonos excede el limite permitido"
          );
          error.statusCode = 400;
          throw error;
        }

        totales.set(
          registro.externalReference,
          acumulado
        );
      }

      // 4. Descontar saldos de manera condicionada.
      // Si otra operacion modifico la deuda,
      // la transaccion debe fallar, no producir sobrepagos.
      for (const [referencia, importe] of totales) {
        const deuda = mapaDeudas.get(referencia);

        if (importe > deuda.outstandingBalance) {
          const error = new Error(
            `Saldo insuficiente: ${referencia}`
          );
          error.statusCode = 400;
          throw error;
        }

        const deudaActualizada =
          await Debt.findOneAndUpdate(
            {
              _id: deuda._id,
              tenantId,
              isActive: true,
              status: { $in: ["PENDING", "PARTIAL"] },
              outstandingBalance: {
                $gte: importe,
              },
            },
            {
              $inc: {
                outstandingBalance: -importe,
              },
            },
            {
              new: true,
              session,
            }
          );

        if (!deudaActualizada) {
          const error = new Error(
            `La deuda cambio o no tiene saldo suficiente: ${referencia}`
          );
          error.statusCode = 409;
          throw error;
        }

        deudaActualizada.status =
          deudaActualizada.outstandingBalance === 0
            ? "PAID"
            : "PARTIAL";

        await deudaActualizada.save({ session });
      }

      // 5. Crear los pagos dentro de la misma transaccion.
      const pagos = registros.map((registro) => {
        const deuda = mapaDeudas.get(
          registro.externalReference
        );

        return {
          tenantId,
          debtId: deuda._id,
          clientId: deuda.clientId,
          amount: registro.amount,
          paymentDate: new Date(
            `${registro.paymentDate}T00:00:00.000Z`
          ),
          paymentMethod: registro.paymentMethod,
          reference: registro.reference,
          importReference: registro.importReference,
          notes: "Importado desde CSV",
        };
      });

      await Payment.insertMany(pagos, {
        session,
        ordered: true,
      });

      pagosGuardados = pagos.length;
    });

    return res.status(201).json({
      message: "Abonos importados correctamente",
      totalImportados: pagosGuardados,
    });

  } catch (error) {
    // Error por indice unico de MongoDB.
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Existe una referencia de importacion duplicada",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error(
      "Error al confirmar abonos:",
      error
    );

    return res.status(500).json({
      message:
        "No se pudo completar la importacion. No se confirmaron los cambios.",
    });
  }
}

module.exports = {
  previsualizarAbonosCsv,
  confirmarImportacionAbonos,
};
