// Importa el hook 'useState' de React para gestionar el estado local del componente (email, contraseña, carga y errores).
import { useState } from "react";
// Importa el hook 'useNavigate' de React Router para poder redirigir al usuario a otra página (como el dashboard).
import { useNavigate } from "react-router-dom";
// Importa la función 'loginUser' que creamos previamente para hacer la petición de inicio de sesión a la API.
import { loginUser } from "../services/auth.api.js";

import { useAuth } from "../context/AuthContext.jsx";
// Define y exporta por defecto el componente funcional 'LoginForm' (formulario de inicio de sesión).

import { PATHS } from "../../../routes/paths.js";


import { getAuthenticatedUser } from "../services/auth.api.js";
export default function LoginForm() {
    // Inicializa el hook de navegación para cambiar de ruta programáticamente.
    const navigate = useNavigate();

    const { login } = useAuth();

    // Declara el estado para almacenar el valor del correo electrónico introducido por el usuario.
    const [email, setEmail] = useState("");
    // Declara el estado para almacenar la contraseña introducida por el usuario.
    const [password, setPassword] = useState("");
    // Declara el estado para saber si la petición de inicio de sesión está en curso (controla el estado de carga).
    const [loading, setLoading] = useState(false);
    // Declara el estado para almacenar y mostrar posibles mensajes de error si falla el login.
    const [error, setError] = useState("");

    // Función asíncrona que se ejecuta al enviar el formulario (hacer clic en el botón o presionar Enter).
    async function handleSubmit(event) {
        // Previene el comportamiento por defecto del formulario (que recargaríía la página entera).
        event.preventDefault();
        // Limpia cualquier error anterior antes de intentar un nuevo inicio de sesión.
        setError("");
        // Activa el estado de carga (bloquea el botón y cambia el texto a "Verificando...").
        setLoading(true);

        try {
            // Llama a la función 'loginUser', eliminando espacios en blanco accidentales del email con '.trim()', y espera la respuesta.

            const data = await loginUser(email.trim(), password);

            // Verificamos el JWT consultando el backend.

            const respuestaUsuario = await getAuthenticatedUser(data.token);

            // Admite tanto una respuesta { user: {...} }
            // como un objeto de usuario directamente.
            const verifiedUser = respuestaUsuario?.user ?? respuestaUsuario;

            console.log("Rol recibido:", verifiedUser?.role);


            // Guardamos el token y el usuario verificado.


            const rutasPorRol = {
                SUPER_ADMIN: PATHS.superAdminDashboard,
                ADMIN: PATHS.dashboard,
                USER: PATHS.aiChat,
            };

            const rol = verifiedUser.role?.trim().toUpperCase();
            const destino = rutasPorRol[rol];

            console.log("Rol:", rol);
            console.log("Ruta de destino:", destino);

            if (!destino) {
                throw new Error("No se encontró una ruta para este rol.");
            }


            login({
                token: data.token,
                user: verifiedUser,
            });

            navigate(destino, { replace: true });


        } catch (err) {
            // Si ocurre cualquier error durante la petición (capturado en 'loginUser'), lo guarda en el estado 'error'.
            setError(err.message);
        } finally {
            // Independientemente de si tuvo éxito o falló, desactiva el estado de carga al terminar la petición.
            setLoading(false);
        }
    }

    // Renderiza la estructura visual del formulario en la interfaz de usuario.
    return (
        <form
            // Asocia la función 'handleSubmit' al evento de envío del formulario.
            onSubmit={handleSubmit}
            // Aplica estilos en línea para alinear los elementos en columna, separarlos y limitar el ancho máximo.
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                width: "100%",
                maxWidth: "380px",
            }}
        >
            {/* Título principal del formulario */}
            <h1>Iniciar sesión</h1>

            {/* Etiqueta asociada al campo de correo electrónico */}
            <label htmlFor="email">Correo electrónico</label>
            {/* Campo de entrada de texto para el correo */}
            <input
                id="email"
                type="email"
                value={email}
                // Actualiza el estado 'email' cada vez que el usuario escribe en el input.
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                autoComplete="username"
                required
                style={{ padding: "12px" }}
            />

            {/* Etiqueta asociada al campo de contraseña */}
            <label htmlFor="password">Contraseña</label>
            {/* Campo de entrada de texto oculto para la contraseña */}
            <input
                id="password"
                type="password"
                value={password}
                // Actualiza el estado 'password' cada vez que el usuario escribe en el input.
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
                style={{ padding: "12px" }}
            />

            {/* Renderizado condicional: si existe un mensaje en 'error', muestra un párrafo con estilo rojo y rol de alerta. */}
            {error && (
                <p role="alert" style={{ color: "#c62828" }}>
                    {error}
                </p>
            )}

            {/* Botón de envío del formulario */}
            <button
                type="submit"
                // Deshabilita el botón mientras 'loading' sea verdadero para evitar múltiples envíos simultáneos.
                disabled={loading}
                // Cambia el estilo dinámicamente: el cursor cambia a 'wait' si está cargando, y el fondo es naranja corporativo.
                style={{
                    padding: "14px",
                    background: "#f97316",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: loading ? "wait" : "pointer",
                }}
            >
                {/* Muestra un texto alternativo si está cargando o el texto normal si está inactivo */}
                {loading ? "Verificando..." : "Ingresar a FinCRM"}
            </button>
        </form>
    );
}