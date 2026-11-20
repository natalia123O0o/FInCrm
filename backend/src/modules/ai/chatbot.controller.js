const {
  generarRespuesta,
  generarRespuestaEmpresarial,
} = require("./llm.service");

const Client = require("../clients/client.model");
const { consumeQuota, requestQuota } = require('../subscriptions/usage.service');
const { respondAccessError } = require('../../middlewares/feature.middleware');

const consultarGemini = async (req, res) => {
  try {
    // Obtenemos la pregunta enviada por el usuario.
    const { pregunta } = req.body ?? {};

    // Validamos que sea texto y no esté vacío.
    if (
      typeof pregunta !== "string" ||
      !pregunta.trim() ||
      pregunta.length > 1000
    ) {
      return res.status(400).json({
        message: "La pregunta debe contener entre 1 y 1000 caracteres",
      });
    }

    // Normalizamos la pregunta para reconocer distintas formas
    // de preguntar por la cantidad de clientes.
    const texto = pregunta
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Detectamos preguntas sobre la cantidad de clientes.
    const preguntaCantidadClientes =
      /\b(cuantos|numero de|cantidad de|total de)\b/.test(texto) &&
      /\bclientes\b/.test(texto);

    if (preguntaCantidadClientes && req.user.role === 'ADMIN' && req.entitlements.modules.includes('crm')) {
      // Obtenemos la empresa del usuario autenticado.
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(403).json({
          message: "Usuario sin empresa asignada",
        });
      }

      // Contamos únicamente los clientes activos
      // de la empresa autenticada.
      const total = await Client.countDocuments({
        tenantId: tenantId,
        isActive: true,
      });

      return res.status(200).json({
        respuesta: `Actualmente tienes ${total} clientes activos registrados en tu empresa.`,
      });
    }

    // Por ahora no enviamos información de clientes ni deudas.
    // Identificamos la empresa del usuario autenticado.
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        message: "Usuario sin empresa asignada",
      });
    }

    // Gemini podrá solicitar herramientas empresariales
    // utilizando únicamente los datos de esta empresa.
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ message: 'Gemini no está configurado.' });
    await consumeQuota(requestQuota(req, 'aiRequests'));
    const respuesta = await generarRespuestaEmpresarial(
      pregunta.trim(),
      tenantId,
      { role: req.user.role, actorId: req.user._id, tokenVersion: req.user.tokenVersion || 0 },
    );

    // Devolvemos la respuesta generada.
    return res.status(200).json({
      respuesta,
    });
  } catch (error) {
    if (respondAccessError(res, error)) return;
    console.error("Error al consultar Gemini:", error.message);

    return res.status(502).json({
      message: "No fue posible obtener una respuesta de FinCrm",
    });
  }
};

module.exports = { consultarGemini };
