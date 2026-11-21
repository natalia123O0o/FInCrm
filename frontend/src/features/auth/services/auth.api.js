import { requireApiUrl } from '../../../config/api.js';

// Auth contra Express publicado (nunca a GitHub Pages ni a localhost desde producción).
async function authRequest(path, { method = 'GET', body, token } = {}) {
  const base = requireApiUrl();
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de FinCRM.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
  return data;
}

export async function loginUser(email, password) {
  const data = await authRequest('/api/auth/login', {
    method: 'POST', body: { email, password },
  });
  if (!data?.token) throw new Error('El servidor no devolvió un token de sesión.');
  // La respuesta del backend puede incluir o no el usuario: LoginForm lo valida con /me.
  return data;
}

export async function getAuthenticatedUser(token) {
  const data = await authRequest('/api/auth/me', { token });
  if (!data?.user) throw new Error('El servidor no devolvió los datos del usuario.');
  return data.user;
}

