
const { generarRespuesta } = require("./llm.service");

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

    // Por ahora no enviamos información de clientes ni deudas.
    const respuesta = await generarRespuesta(pregunta.trim());

    // Devolvemos la respuesta generada.
    return res.status(200).json({
      respuesta,
    });
  } catch (error) {
    console.error("Error al consultar Gemini:", error.message);

    return res.status(502).json({
      message: "No fue posible obtener una respuesta de Gemini",
    });
  }
};

module.exports = { consultarGemini };
