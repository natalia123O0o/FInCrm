const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
async function request(token, path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/activities${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
  } catch {
    throw new Error('No fue posible conectarse con FinCRM.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
  return data;
}
export async function getActivities(token) { return (await request(token, '')).activities; }
export async function createActivity(token, data) { return (await request(token, '', { method: 'POST', body: JSON.stringify(data) })).activity; }
export async function updateActivity(token, id, data) { return (await request(token, `/${id}`, { method: 'PUT', body: JSON.stringify(data) })).activity; }
export async function completeActivity(token, id, result) { return (await request(token, `/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ result }) })).activity; }
