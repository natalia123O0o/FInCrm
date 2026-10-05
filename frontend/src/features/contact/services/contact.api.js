// Importa la función auxiliar 'apiPost' encargada de realizar peticiones HTTP POST (o simularlas en desarrollo)
import { apiPost } from '../../../services/apiClient.js';

// Importa el diccionario de constantes centralizadas con los endpoints de la API
import { ENDPOINTS } from '../../../services/endpoints.js';

/**
 * Servicio encargado de enviar la información del formulario de contacto hacia el backend.
 *
 * @param {Object} data - Objeto con los datos del formulario ya validados (nombre, empresa, correo, teléfono, mensaje).
 * @returns {Promise<Object>} Promesa que resuelve la respuesta del servidor o la simulación.
 */
export function sendContact(data) {
  // Invoca apiPost pasando el endpoint centralizado de contacto (ej. '/api/v1/contact') y los datos del usuario
  return apiPost(ENDPOINTS.contact, data);
}