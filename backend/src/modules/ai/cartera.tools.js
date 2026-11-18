
const Debt = require("../debts/debt.model");
const mongoose = require("mongoose");

// Consulta el resumen de cartera de una empresa.
const consultarResumenCartera = async (tenantId) => {
  // La empresa siempre debe estar identificada.
  if (!tenantId) {
    throw new Error("Empresa no identificada");
  }

  // Consultamos únicamente las deudas de la empresa.
  const deudas = await Debt.find({
    tenantId,
    isActive: true,
  })
    .select(
      "outstandingBalance originalAmount dueDate status"
    )
    .lean();

  const ahora = new Date();

  // Contadores y acumuladores.
  let saldoPendiente = 0;
  let deudasVencidas = 0;
  let deudasPagadas = 0;
  let deudasParciales = 0;

  for (const deuda of deudas) {
    const saldo = deuda.outstandingBalance;

    saldoPendiente += saldo;

    if (deuda.status === "PAID") {
      deudasPagadas++;
    }

    if (deuda.status === "PARTIAL") {
      deudasParciales++;
    }

    if (
      saldo > 0 &&
      deuda.dueDate < ahora
    ) {
      deudasVencidas++;
    }
  }

  return {
    totalDeudas: deudas.length,
    saldoPendiente,
    deudasVencidas,
    deudasPagadas,
    deudasParciales,
  };
};


const consultarDetalleDeudas = async (tenantId) => {
  if (!tenantId) {
    throw new Error("Empresa no identificada");
  }

  // Consultar únicamente deudas activas de la empresa.
  const deudas = await Debt.find({
    tenantId,
    isActive: true,
  })
    .select(
      "clientId description originalAmount outstandingBalance dueDate status"
    )
    .populate("clientId", "name")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Enviamos a la IA solamente los datos necesarios.
  return deudas.map((deuda) => ({
    cliente: deuda.clientId?.name ?? "Cliente no disponible",
    descripcion: deuda.description,
    valorOriginal: deuda.originalAmount,
    saldoPendiente: deuda.outstandingBalance,
    fechaVencimiento: deuda.dueDate,
    estado: deuda.status,
  }));
};


const consultarSaldosPorCliente = async (tenantId) => {
  if (!tenantId) {
    throw new Error("Empresa no identificada");
  }

  // Agrupamos las deudas activas por cliente.
  const resultados = await Debt.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(
          tenantId.toString()
        ),
        isActive: true,
        outstandingBalance: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: "$clientId",
        totalDeudas: { $sum: 1 },
        saldoPendiente: {
          $sum: "$outstandingBalance",
        },
      },
    },
    {
      $sort: {
        saldoPendiente: -1,
      },
    },
    {
      $limit: 50,
    },
    {
      $lookup: {
        from: "clients",
        localField: "_id",
        foreignField: "_id",
        as: "cliente",
      },
    },
    {
      $unwind: {
        path: "$cliente",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        nombre: {
          $ifNull: [
            "$cliente.name",
            "Cliente no disponible",
          ],
        },
        totalDeudas: 1,
        saldoPendiente: 1,
      },
    },
  ]);

  return resultados;
};


module.exports = {
  consultarResumenCartera,
  consultarDetalleDeudas,
  consultarSaldosPorCliente,
};
