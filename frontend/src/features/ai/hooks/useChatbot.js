import { useState } from "react";
import { consultarIA } from "../services/ai.api";

export function useChatbot(token) {
  // Guarda las preguntas y respuestas.
  const [mensajes, setMensajes] = useState([]);

  // Indica si Gemini está respondiendo.
  const [cargando, setCargando] = useState(false);

  // Guarda los errores.
  const [error, setError] = useState(null);

  // Envía una pregunta a Gemini.
  const enviarMensaje = async (pregunta) => {
    const texto = pregunta.trim();

    if (!texto || cargando) {
      return;
    }

    // Agregamos la pregunta al historial.
    setMensajes((anteriores) => [
      ...anteriores,
      { rol: "usuario", contenido: texto },
    ]);

    setCargando(true);
    setError(null);

    try {
      // Consultamos el backend de FinCRM.
      const respuesta = await consultarIA(token, texto);

      // Agregamos la respuesta de Gemini.
      setMensajes((anteriores) => [
        ...anteriores,
        { rol: "asistente", contenido: respuesta },
      ]);
    } catch (errorConsulta) {
      setError(errorConsulta.message);
    } finally {
      // Se ejecuta tanto si funciona como si falla.
      setCargando(false);
    }
  };

  return {
    mensajes,
    cargando,
    error,
    enviarMensaje,
  };
}
