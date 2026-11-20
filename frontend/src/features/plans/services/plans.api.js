const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

// Las operaciones de administración siempre consultan el servidor; no hay modo simulado.
export async function platformRequest(token, path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible completar la operación.');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
