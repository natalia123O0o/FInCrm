
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

  const inicio = Date.now();

  // Máximo un intento.
  const maxIntentos = 1;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      console.log(`Consulta IA - intento ${intento}`);

      // Enviamos la pregunta a Gemini.
      const respuesta = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: pregunta,
        config: {
          httpOptions: {
            timeout: 20000,
          },
        },
      });

      const duracion = Date.now() - inicio;

      console.log(
        `Tiempo de respuesta de FinCRM IA: ${duracion} ms`
      );

      return respuesta.text;

    } catch (error) {
      const duracion = Date.now() - inicio;

      console.error(
        `Error de FinCRM IA después de ${duracion} ms:`,
        error.message
      );

      throw error;
    }
  }
};

module.exports = { generarRespuesta };
