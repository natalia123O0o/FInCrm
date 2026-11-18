
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

// Descarga el reporte Excel de cartera.
export async function descargarReporteCartera(token) {
  if (!token) {
    throw new Error("Debes iniciar sesión para descargar el reporte");
  }

  // Solicitamos el archivo al backend usando el JWT.
  const response = await fetch(
    `${API_URL}/api/ai/reportes/cartera`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Verificamos que la solicitud haya funcionado.
  if (!response.ok) {
    let mensaje = "No fue posible descargar el reporte";

    try {
      const error = await response.json();
      mensaje = error.message || mensaje;
    } catch {
      // Conservamos el mensaje general.
    }

    throw new Error(mensaje);
  }

  // Convertimos la respuesta HTTP en un archivo.
  const blob = await response.blob();

  // Creamos una URL temporal dentro del navegador.
  const url = URL.createObjectURL(blob);

  // Creamos un enlace temporal para descargar el archivo.
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "fincrm-cartera.xlsx";

  document.body.appendChild(enlace);

  // Iniciamos la descarga.
  enlace.click();

  // Eliminamos el enlace temporal.
  enlace.remove();

  // Liberamos la URL temporal.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
