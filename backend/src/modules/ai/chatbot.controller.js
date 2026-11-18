const {
  generarRespuesta,
  generarRespuestaEmpresarial,
} = require("./llm.service");

const Client = require("../clients/client.model");

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

    if (preguntaCantidadClientes) {
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
    const respuesta = await generarRespuestaEmpresarial(
      pregunta.trim(),
      tenantId,
    );

    // Devolvemos la respuesta generada.
    return res.status(200).json({
      respuesta,
    });
  } catch (error) {
    console.error("Error al consultar Gemini:", error.message);

    return res.status(502).json({
      message: "No fue posible obtener una respuesta de FinCrm",
    });
  }
};

module.exports = { consultarGemini };
