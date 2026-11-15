
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

// Consulta los clientes de la empresa autenticada.
export async function getClients(token) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/clients`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor de FinCRM."
    );
  }

  // Convertimos la respuesta HTTP en datos JavaScript.
  const data = await response.json();

  // Comprobamos si el backend aceptó la solicitud.
  if (!response.ok) {
    throw new Error(
      data.message || "No se pudieron consultar los clientes."
    );
  }

  // Verificamos que recibimos una lista.
  if (!Array.isArray(data.clients)) {
    throw new Error(
      "El servidor devolvió un formato de clientes inesperado."
    );
  }
  return data.clients;
}
  
export async function createClient(token, clientData) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(clientData),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor de FinCRM."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo registrar el cliente."
    );
  }

  if (!data.client) {
    throw new Error(
      "El servidor no devolvió el cliente registrado."
    );
  }

  return data.client;
}


 // FUNCIÓN 3: ACTUALIZAR UN CLIENTE

export async function updateClient(token, clientId, clientData) {
  let response;

  try {
    response = await fetch(
      `${API_URL}/api/clients/${clientId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(clientData),
      }
    );
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor de FinCRM."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo actualizar el cliente."
    );
  }

  if (!data.client) {
    throw new Error(
      "El servidor no devolvió el cliente actualizado."
    );
  }

  return data.client;
}
