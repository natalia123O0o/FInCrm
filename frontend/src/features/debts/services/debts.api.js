
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

// Consulta las deudas de la empresa autenticada.
export async function getDebts(token) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/debts`, {
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

  // Convertimos la respuesta JSON a JavaScript.
  const data = await response.json();

  // Comprobamos si hubo un error HTTP.
  if (!response.ok) {
    throw new Error(
      data.message || "No se pudieron consultar las deudas."
    );
  }

  // Verificamos que el backend devolvió una lista.
  if (!Array.isArray(data.debts)) {
    throw new Error(
      "El servidor devolvió un formato inesperado."
    );
  }

  // Entregamos las deudas al componente React.
  return data.debts;
}


export async function createDebt(token, debtData) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(debtData),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor de FinCRM."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo registrar la deuda."
    );
  }

  if (!data.debt) {
    throw new Error(
      "El servidor no devolvió la deuda registrada."
    );
  }

  return data.debt;
}
