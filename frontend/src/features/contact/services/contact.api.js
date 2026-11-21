import { requireApiUrl } from '../../../config/api.js';

// Nunca simula un envío. Brevo debe llamarse desde Express, nunca desde la landing.
export async function sendContact(data) {
  const base = requireApiUrl();
  let response;
  try {
    response = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de FinCRM. Comprueba que esté publicado y activo.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    throw new Error(result.message || 'No fue posible enviar la solicitud.');
  }
  return result;
}
