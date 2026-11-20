const mongoose = require("mongoose");

const Client = require("../clients/client.model");
const Tenant = require("../tenants/tenant.model");
const Debt = require("../debts/debt.model");
const Message = require("./message.model");
const { withQuota, requestQuota } = require('../subscriptions/usage.service');
const { respondAccessError } = require('../../middlewares/feature.middleware');

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEMPLATE_ENV_BY_PURPOSE = {
  invitacion: "BREVO_TEMPLATE_INVITACION",
  seguimiento: "BREVO_TEMPLATE_SEGUIMIENTO",
  cobranza: "BREVO_TEMPLATE_COBRANZA",
  fidelizacion: "BREVO_TEMPLATE_FIDELIZACION",
};

const TEMPLATE_SUBJECTS = {
  invitacion: "Invitación para conversar y conocer nuestras soluciones",
  seguimiento: "Queremos retomar nuestra conversación",
  cobranza: "Información importante sobre tu cuenta",
  fidelizacion: "Gracias por confiar en nosotros",
};

// Verificar horario de cobranza en Colombia.
function isCollectionTimeAllowed() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value;

  const weekday = getPart("weekday");
  const hour = Number(getPart("hour"));
  const minute = Number(getPart("minute"));

  const minutes = hour * 60 + minute;

  if (weekday === "Sun") return false;

  if (weekday === "Sat") {
    return minutes >= 8 * 60 && minutes < 15 * 60;
  }

  return minutes >= 7 * 60 && minutes < 19 * 60;
}

// En modo test solo se permite enviar a correos autorizados.
// En modo live se utiliza el correo registrado del cliente.
function isRecipientAllowed(email) {
  const mode = String(
    process.env.EMAIL_SEND_MODE || "test"
  ).trim().toLowerCase();

  if (mode === "live") {
    return true;
  }

  const allowedRecipients = String(
    process.env.EMAIL_ALLOWED_RECIPIENTS || ""
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowedRecipients.includes(email);
}

// Enviar correo al cliente seleccionado.
async function sendEmail(req, res) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?._id || req.user?.id;

    const {
      clientId,
      subject,
      body,
      purpose,
      authorizationConfirmed,
    } = req.body || {};

    // 1. Verificar sesión.
    if (!tenantId || !userId) {
      return res.status(401).json({
        message: "Sesión inválida.",
      });
    }

    // 2. Validar cliente y plantilla.
    if (
      !mongoose.isValidObjectId(clientId) ||
      !Object.prototype.hasOwnProperty.call(
        TEMPLATE_ENV_BY_PURPOSE,
        purpose
      )
    ) {
      return res.status(400).json({
        message: "Cliente o tipo de comunicación inválido.",
      });
    }

    // 3. Validar el borrador.
    if (
      typeof subject !== "string" ||
      typeof body !== "string"
    ) {
      return res.status(400).json({
        message: "Asunto o contenido inválido.",
      });
    }

    const cleanSubject = subject.trim();
    const cleanBody = body.trim();

    if (
      cleanSubject.length < 3 ||
      cleanSubject.length > 180 ||
      cleanBody.length < 10 ||
      cleanBody.length > 10000 ||
      /[\r\n]/.test(cleanSubject)
    ) {
      return res.status(400).json({
        message: "Revisa el asunto y el contenido del mensaje.",
      });
    }

    // 4. Confirmación obligatoria del administrador.
    if (authorizationConfirmed !== true) {
      return res.status(400).json({
        message:
          "Debes confirmar que verificaste la autorización del cliente.",
      });
    }

    // 5. Buscar el cliente dentro de la empresa autenticada.
    const client = await Client.findOne({
      _id: clientId,
      tenantId,
      isActive: true,
    });

    if (!client) {
      return res.status(404).json({
        message: "Cliente no encontrado en tu empresa.",
      });
    }

    // 6. Obtener el correo REAL registrado en MongoDB.
    const recipient = String(client.email || "")
      .trim()
      .toLowerCase();

    if (!EMAIL_PATTERN.test(recipient)) {
      return res.status(400).json({
        message: "El cliente no tiene un correo electrónico válido.",
      });
    }

    // 7. Controlar el modo de envío.
    if (!isRecipientAllowed(recipient)) {
      return res.status(403).json({
        message:
          "El destinatario no está autorizado en modo de pruebas. " +
          "Revisa EMAIL_SEND_MODE en el archivo .env.",
      });
    }

    // 8. Obtener la plantilla correspondiente.
    const envName = TEMPLATE_ENV_BY_PURPOSE[purpose];
    const templateId = Number(process.env[envName]);

    if (
      !process.env.BREVO_API_KEY ||
      !Number.isInteger(templateId) ||
      templateId <= 0
    ) {
      return res.status(503).json({
        message:
          `La plantilla "${purpose}" no está configurada en Brevo.`,
      });
    }

    // 9. Obtener la empresa.
    const tenant = await Tenant.findById(tenantId)
      .select("name")
      .lean();

    if (!tenant) {
      return res.status(404).json({
        message: "Empresa no encontrada.",
      });
    }

    // 10. Validaciones específicas de cobranza.
    if (purpose === "cobranza") {
      if (!isCollectionTimeAllowed()) {
        return res.status(403).json({
          message:
            "El horario actual no está habilitado para cobranza.",
        });
      }

      // Esta consulta conserva los campos del controlador original.
      // Deben coincidir con el modelo real de Debt.
      const pendingDebt = await Debt.findOne({
        tenantId,
        clientId,
        isActive: true,
        outstandingBalance: { $gt: 0 },
        status: { $in: ["PENDING", "PARTIAL"] },
        dueDate: { $lte: new Date() },
      })
        .select("_id")
        .lean();

      if (!pendingDebt) {
        return res.status(400).json({
          message:
            "El cliente no tiene una deuda vencida con saldo pendiente.",
        });
      }

      const recentCollection = await Message.findOne({
        tenantId,
        clientId,
        purpose: "cobranza",
        status: { $in: ["PROCESSING", "ACCEPTED"] },
        createdAt: {
          $gte: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ),
        },
      });

      if (recentCollection) {
        return res.status(429).json({
          message:
            "Ya existe una comunicación de cobranza registrada " +
            "durante los últimos siete días.",
        });
      }
    }

    // 11. Límite diario por empresa.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await Message.countDocuments({
      tenantId,
      createdAt: { $gte: startOfDay },
    });

    if (todayCount >= 20) {
      return res.status(429).json({
        message: "Se alcanzó el límite diario de envíos.",
      });
    }

    // 12. Evitar envíos repetidos en un minuto.
    const recentMessage = await Message.findOne({
      tenantId,
      clientId,
      createdAt: {
        $gte: new Date(Date.now() - 60000),
      },
    });

    if (recentMessage) {
      return res.status(429).json({
        message:
          "Espera un minuto antes de enviar otro correo a este cliente.",
      });
    }

    // 13. Registrar el intento.
    const message = await withQuota(requestQuota(req, 'emails'), async session => {
      const [item] = await Message.create([{
      tenantId,
      clientId,
      sentBy: userId,
      to: recipient,
      subject: TEMPLATE_SUBJECTS[purpose],
      body:
        `Plantilla Brevo ID ${templateId}. ` +
        `Borrador preparado: ${cleanBody}`,
      purpose,
      authorizationConfirmed: true,
      status: "PROCESSING",
      }], { session });
      return item;
    });

    try {
      // 14. Preparar mensaje con destinatario real.
      const payload = {
        to: [
          {
            email: recipient,
            name: client.name,
          },
        ],
        templateId,
        params: {
          NOMBRE_CLIENTE: client.name,
          EMPRESA: tenant.name,
        },
      };

      // 15. Enviar a Brevo.
      const response = await fetch(BREVO_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result.messageId) {
        throw new Error(
          result.message ||
          result.code ||
          "Brevo no aceptó el correo."
        );
      }

      // 16. Actualizar historial.
      message.status = "ACCEPTED";
      message.providerId = result.messageId;

      await message.save();

      return res.status(200).json({
        message: "Brevo aceptó el correo para su envío.",
        status: "ACCEPTED",
        to: recipient,
        providerId: result.messageId,
        purpose,
        templateId,
      });
    } catch (error) {
      message.status = "FAILED";
      message.errorMessage = String(
        error.message || "Error de comunicación con Brevo."
      ).slice(0, 500);

      await message.save();

      return res.status(502).json({
        message:
          "No se pudo confirmar el envío. " +
          "Consulta el historial de Brevo antes de reintentar.",
      });
    }
  } catch (error) {
    if (respondAccessError(res, error)) return;
    console.error("Error de mensajería:", error.message);

    return res.status(500).json({
      message: "Error interno al procesar el correo.",
    });
  }
}

// Historial de comunicaciones de la empresa.
async function getMessages(req, res) {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        message: "Sesión inválida.",
      });
    }

    const messages = await Message.find({
      tenantId,
    })
      .select(
        "to subject purpose status providerId createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error al consultar mensajes:", error.message);

    return res.status(500).json({
      message: "No se pudo consultar el historial.",
    });
  }
}

module.exports = {
  sendEmail,
  getMessages,
};
