const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(token, path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE}/api/opportunities${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
  } catch { throw new Error('No hay conexión con el backend de FinCRM.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Ocurrió un error con las oportunidades.');
  return result;
}
export const listOpportunities = token => request(token, '/').then(data => data.opportunities || []);
export const getOpportunity = (token, id) => request(token, `/${id}`).then(data => data.opportunity);
export const createOpportunity = (token, payload) => request(token, '/', { method: 'POST', body: JSON.stringify(payload) });
export const updateOpportunity = (token, id, payload) => request(token, `/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const addEncounter = (token, id, payload) => request(token, `/${id}/encounters`, { method: 'POST', body: JSON.stringify(payload) });
export const requestRecommendation = (token, id) => request(token, `/${id}/recommend`, { method: 'POST' });
export const registerAIDecision = (token, id, payload) => request(token, `/${id}/decisions`, { method: 'POST', body: JSON.stringify(payload) });

export async function loadReference(token, endpoint, key) {
  let response;
  try { response = await fetch(`${BASE}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } }); }
  catch { throw new Error('No se pudo consultar el listado de clientes o empleados.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data[key])) throw new Error(data.message || `Respuesta inválida de ${endpoint}.`);
  return data[key];
}
