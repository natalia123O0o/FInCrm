
const mongoose = require("mongoose");

const Payment = require("./payment.model");
const Debt = require("../debts/debt.model");

// Registrar un pago y actualizar el saldo
const createPayment = async (req, res) => {
  const tenantId = req.user.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      message: "Usuario sin empresa asignada"
    });
  }

  const {
    debtId,
    amount,
    paymentMethod,
    reference,
    notes
  } = req.body || {};

  // Validar ID de la deuda
  if (!mongoose.isValidObjectId(debtId)) {
    return res.status(400).json({
      message: "ID de deuda inválido"
    });
  }

  // Validar valor del pago
  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      message: "El pago debe ser un entero positivo"
    });
  }

  // Validar medio de pago
  const allowedMethods = [
    "CASH",
    "TRANSFER",
    "CARD",
    "OTHER"
  ];

  if (!allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({
      message: "Medio de pago inválido"
    });
  }

  // Validar campos opcionales
  if (
    (reference !== undefined &&
      typeof reference !== "string") ||
    (notes !== undefined &&
      typeof notes !== "string")
  ) {
    return res.status(400).json({
      message: "Referencia u observaciones inválidas"
    });
  }

  try {
    let result;

    await mongoose.connection.transaction(async (session) => {

      // 1. Descontar el saldo de forma atómica
      // Solo si la deuda pertenece a la empresa
      // y tiene saldo suficiente
      const debt = await Debt.findOneAndUpdate(
        {
          _id: debtId,
          tenantId: tenantId,
          isActive: true,
          status: { $in: ["PENDING", "PARTIAL"] },
          outstandingBalance: { $gte: amount }
        },
        {
          $inc: {
            outstandingBalance: -amount
          }
        },
        {
          new: true,
          session: session
        }
      );

      if (!debt) {
        const error = new Error(
          "Deuda no encontrada o saldo insuficiente"
        );
        error.statusCode = 404;
        throw error;
      }

      // 2. Calcular el estado después del pago
      debt.status =
        debt.outstandingBalance === 0
          ? "PAID"
          : "PARTIAL";

      await debt.save({ session });

      // 3. Crear el historial del pago
      const payments = await Payment.create(
        [
          {
            tenantId: tenantId,
            debtId: debt._id,
            clientId: debt.clientId,
            amount: amount,
            paymentMethod: paymentMethod,
            reference: reference || "",
            notes: notes || ""
          }
        ],
        { session }
      );

      result = {
        payment: payments[0],
        debt: debt
      };
    });

    // 4. Confirmar el resultado
    return res.status(201).json({
      message: "Pago registrado correctamente",
      payment: result.payment,
      debt: result.debt
    });

  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        message: error.message
      });
    }

    console.error("Error al registrar pago:", error);

    return res.status(500).json({
      message: "Error interno al registrar el pago"
    });
  }
};


const getPayments = async (req, res) => {
  try {
    // 1. Obtener la empresa del administrador
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada"
      });
    }

    // 2. Consultar los pagos de esa empresa
    const payments = await Payment.find({
      tenantId: tenantId
    }).sort({ paymentDate: -1 });

    // 3. Devolver el historial
    return res.status(200).json({
      message: "Pagos obtenidos correctamente",
      total: payments.length,
      payments: payments
    });

  } catch (error) {
    console.error("Error al consultar pagos:", error);

    return res.status(500).json({
      message: "Error interno al consultar pagos"
    });
  }
};


module.exports = {
  createPayment,
  getPayments
};
