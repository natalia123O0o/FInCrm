// Define la URL base de la API. Intenta leerla desde las variables de entorno de Vite (VITE_API_URL).
// Si no existe ninguna configurada, usa "http://localhost:4000" por defecto (útil para desarrollo local).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Exporta una función asíncrona llamada 'loginUser' que recibe el correo (email) y la contraseña (password).
export async function loginUser(email, password) {
  
  // Declara una variable 'response' que almacenará la respuesta obtenida de la petición HTTP.
  let response;

  // Inicia un bloque 'try...catch' para capturar posibles errores de red o caídas del servidor.
  try {
    
    // Realiza una petición HTTP asíncrona de tipo POST a la ruta de inicio de sesión del servidor.
    response = await fetch(`${API_URL}/api/auth/login`, {
      
      // Especifica que el método de la petición es POST (ideal para enviar credenciales de forma segura).
      method: "POST",
      
      // Define los encabezados (headers) de la petición HTTP.
      headers: {
        // Indica al servidor que los datos enviados en el cuerpo (body) están formateados como JSON.
        "Content-Type": "application/json",
      },
      
      // Convierte el objeto con las variables 'email' y 'password' en una cadena de texto JSON para enviarlo al servidor.
      body: JSON.stringify({ email, password }),
    });
    
  } catch {
    
    // Si ocurre un fallo en la red (ej. el servidor está apagado o no hay internet), interrumpe la ejecución lanzando un error descriptivo.
    throw new Error("No se pudo conectar con el servidor de FinCRM.");
  }

  // Espera y procesa la respuesta HTTP del servidor, convirtiéndola de formato JSON a un objeto de JavaScript accesible.
  const data = await response.json();

  // Verifica si la respuesta HTTP NO fue exitosa (es decir, si el código de estado está fuera del rango 200-299, como un 400 o 500).
  if (!response.ok) {
    
    // Lanza un error mostrando el mensaje que envió el servidor (ej. "Credenciales incorrectas") o uno por defecto.
    throw new Error(data.message || "No se pudo iniciar sesión.");
  }

  // Comprueba que la respuesta del servidor contenga tanto el token de autenticación como los datos del usuario.
  if (!data.token || !data.user) {
    
    // Si falta alguno de los dos, lanza un error indicando que la estructura de la respuesta está incompleta.
    throw new Error("La respuesta del servidor está incompleta.");
  }

  // Si todo sale bien, retorna el objeto de datos completo (que usualmente incluye el token y la información del usuario).
  return data;
}


export async function getAuthenticatedUser(token) {
  let response;

  try {
    response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "No se pudo verificar la sesión."
    );
  }

  if (!data.user) {
    throw new Error("El servidor no devolvió el usuario.");
  }

  return data.user;
}

