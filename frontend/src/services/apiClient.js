// Obtiene la URL base de la API desde las variables de entorno de Vite (.env).
// Si VITE_API_URL no está definida, se asigna una cadena vacía ('') como fallback.
const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Realiza una petición HTTP POST a un endpoint específico.
 * Si no hay una URL de API configurada (`BASE_URL`), simula una respuesta exitosa con retardo.
 *
 * @param {string} path - Ruta relativa del endpoint (ej: '/api/v1/auth/login').
 * @param {object} body - Datos que se enviarán en el cuerpo de la petición (se serializan a JSON).
 * @returns {Promise<object>} Promesa que resuelve a los datos JSON de la respuesta o al objeto simulado.
 */
export async function apiPost(path, body) {
  // Modo simulación (Mock/Development sin Backend activo)
  if (!BASE_URL) {
    // Simula una latencia de red de 900 ms antes de responder
    await new Promise((r) => setTimeout(r, 900));
    // Retorna una respuesta ficticia de éxito
    return { ok: true, simulated: true };
  }

  // Petición real al servidor backend utilizando Fetch API
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', // Método de la petición HTTP
    headers: { 'Content-Type': 'application/json' }, // Indica al servidor que los datos están en formato JSON
    body: JSON.stringify(body), // Convierte el objeto de JavaScript a una cadena JSON
  });

  // Si el servidor responde con un código de estado fuera del rango 200-299, lanza un error con el código HTTP
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Parsea y retorna la respuesta en formato JSON desde el servidor
  return res.json();
}