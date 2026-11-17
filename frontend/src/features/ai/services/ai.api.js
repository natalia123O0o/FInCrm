//frontend/src/features/ai/services/ai.api.js
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

// Envía una pregunta al asistente de FinCRM.
export async function consultarIA(token, pregunta) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pregunta }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor de FinCRM."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo consultar el asistente."
    );
  }

  if (typeof data.respuesta !== "string") {
    throw new Error(
      "El servidor devolvió una respuesta inesperada."
    );
  }

  return data.respuesta;
}
