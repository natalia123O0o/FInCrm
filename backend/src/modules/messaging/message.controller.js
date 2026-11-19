
const mongoose = require("mongoose");

const Client = require("../clients/client.model");
const Tenant = require("../tenants/tenant.model");
const Debt = require("../debts/debt.model");
const Message = require("./message.model");

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cada tipo de comunicación utiliza una plantilla diferente.
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

// Horarios permitidos para pruebas de cobranza en Colombia.
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

    // 1. Verificar usuario.
    if (!tenantId || !userId) {
      return res.status(401).json({
        message: "Sesión inválida.",
      });
    }

    // 2. Verificar cliente y tipo de plantilla.
    if (
      !mongoose.isValidObjectId(clientId) ||
      !Object.hasOwn(TEMPLATE_ENV_BY_PURPOSE, purpose)
    ) {
      return res.status(400).json({
        message: "Cliente o tipo de comunicación inválido.",
      });
    }

    // 3. Validar el borrador recibido desde React.
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

    // Confirmación manual durante la fase de pruebas.
    if (authorizationConfirmed !== true) {
      return res.status(400).json({
        message:
          "Debes confirmar que verificaste la autorización del cliente.",
      });
    }

    // 4. Buscar únicamente clientes de la empresa.
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

    const recipient = String(client.email || "")
      .trim()
      .toLowerCase();

    if (!EMAIL_PATTERN.test(recipient)) {
      return res.status(400).json({
        message: "El cliente no tiene un correo válido.",
      });
    }

    // 5. Permitir únicamente destinatarios de prueba.
    const allowedRecipients = String(
      process.env.EMAIL_ALLOWED_RECIPIENTS || ""
    )
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedRecipients.includes(recipient)) {
      return res.status(403).json({
        message: "Este destinatario no está habilitado para pruebas.",
      });
    }

    // 6. Elegir automáticamente la plantilla de Brevo.
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

    // 7. Obtener el nombre real de la empresa.
    const tenant = await Tenant.findById(tenantId)
      .select("name")
      .lean();

    if (!tenant) {
      return res.status(404).json({
        message: "Empresa no encontrada.",
      });
    }

    // 8. Verificaciones adicionales para cobranza.
    if (purpose === "cobranza") {
      // No contactar fuera de estos horarios.
      if (!isCollectionTimeAllowed()) {
        return res.status(403).json({
          message:
            "El horario actual no está habilitado para comunicaciones de cobranza.",
        });
      }

      // Solo clientes con obligaciones vencidas y saldo pendiente.
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

      // Límite conservador para el módulo de correo.
      const recentCollection = await Message.findOne({
        tenantId,
        clientId,
        purpose: "cobranza",
        status: { $in: ["PROCESSING", "ACCEPTED"] },
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      });

      if (recentCollection) {
        return res.status(429).json({
          message:
            "Ya existe una comunicación de cobranza registrada durante los últimos siete días.",
        });
      }
    }

    // 9. Limitar el número de pruebas diarias.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await Message.countDocuments({
      tenantId,
      createdAt: { $gte: startOfDay },
    });

    if (todayCount >= 20) {
      return res.status(429).json({
        message: "Se alcanzó el límite diario de pruebas.",
      });
    }

    // Evitar repetir correos muy rápidamente.
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

    // 10. Registrar el intento antes de enviarlo.
    // El asunto enviado realmente será el de la plantilla Brevo.
    const message = await Message.create({
      tenantId,
      clientId,
      sentBy: userId,
      to: recipient,
      subject: TEMPLATE_SUBJECTS[purpose],
      body: `Plantilla Brevo ID ${templateId}. ` +
        `Borrador preparado: ${cleanBody}`,
      purpose,
      authorizationConfirmed: true,
      status: "PROCESSING",
    });

    try {
      // 11. Enviar la plantilla seleccionada a Brevo.
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

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.messageId) {
        throw new Error(
          result.message ||
          result.code ||
          "Brevo no aceptó el correo."
        );
      }

      // 12. Guardar la respuesta de Brevo.
      message.status = "ACCEPTED";
      message.providerId = result.messageId;

      await message.save();

      return res.status(200).json({
        message: "Brevo aceptó el correo para su envío.",
        status: "ACCEPTED",
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
    console.error("Error de mensajería:", error.message);

    return res.status(500).json({
      message: "Error interno al procesar el correo.",
    });
  }
}

// Historial de comunicaciones por empresa.
async function getMessages(req, res) {
  try {
    const messages = await Message.find({
      tenantId: req.user.tenantId,
    })
      .select(
        "to subject purpose status providerId createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({
      message: "No se pudo consultar el historial.",
    });
  }
}

module.exports = {
  sendEmail,
  getMessages,
};
