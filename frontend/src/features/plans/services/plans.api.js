import { requireApiUrl } from '../../../config/api.js';

// Consumido por las pantallas autenticadas de los tres roles.
export async function platformRequest(token, path, { method = 'GET', body, signal } = {}) {
  const base = requireApiUrl();
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal,
      cache: 'no-store',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw new Error('No se pudo conectar con el servidor de FinCRM.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible completar la operación.');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
