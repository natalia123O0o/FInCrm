
const { GoogleGenAI } = require("@google/genai");

// Función que envía una pregunta a Google Gemini.
const generarRespuesta = async (pregunta) => {
  // Verificamos que exista la clave de acceso.
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  // Creamos el cliente de Google Gemini.
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Enviamos la pregunta al modelo de IA.
  const respuesta = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: pregunta,
  });

  // Devolvemos únicamente el texto generado.
  return respuesta.text;
};

// Exportamos la función para utilizarla en otros archivos.
module.exports = { generarRespuesta };
