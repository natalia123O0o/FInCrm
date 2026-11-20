const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
async function request(token, path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}/api/campaigns${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch { throw new Error('No hay conexión con el backend de FinCRM.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
  return data;
}
export const campaignsApi = {
  options: token => request(token, '/options'),
  list: token => request(token, '/').then(x => x.campaigns || []),
  detail: (token,id) => request(token, `/${encodeURIComponent(id)}`),
  create: (token,body) => request(token, '/', {method:'POST',body}),
  update: (token,id,body) => request(token, `/${encodeURIComponent(id)}`, {method:'PUT',body}),
  status: (token,id,status) => request(token, `/${encodeURIComponent(id)}/status`, {method:'PATCH',body:{status}}),
  event: (token,id,body) => request(token, `/${encodeURIComponent(id)}/events`, {method:'POST',body}),
  analytics: token => request(token, '/analytics')
};
