
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

// Registra un pago en una deuda.
export async function createPayment(token, paymentData) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor de FinCRM."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo registrar el pago."
    );
  }

  if (!data.payment || !data.debt) {
    throw new Error(
      "La respuesta del servidor está incompleta."
    );
  }

  // Entregamos el pago y la deuda actualizada.
  return data;
}



export async function getPayments(token) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/payments`, {
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudieron consultar los pagos."
    );
  }

  if (!Array.isArray(data.payments)) {
    throw new Error(
      "El servidor devolvió un formato de pagos inesperado."
    );
  }

  return data.payments;
}
