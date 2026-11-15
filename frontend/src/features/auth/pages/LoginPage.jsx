// Importa el componente 'Link' de React Router para permitir la navegación interna entre páginas sin recargar el navegador.
import { Link } from "react-router-dom";
// Importa el componente 'LoginForm' que contiene la lógica y estructura del formulario de inicio de sesión.
import LoginForm from "../components/LoginForm.jsx";

// Define y exporta por defecto el componente funcional 'LoginPage' (la vista o página completa de login).
export default function LoginPage() {
  return (
    // Etiqueta semántica principal de HTML (<main>) que envuelve el contenido de la página.
    <main
      // Aplica estilos en línea para ocupar al menos toda la altura de la pantalla (100vh),
      // centrar los elementos tanto horizontal como verticalmente, añadir espacio interior (padding)
      // y establecer un fondo gris muy claro (#f8fafc).
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      {/* Renderiza el componente del formulario de inicio de sesión centrado dentro de la página */}
      <LoginForm />

      {/* Enlace de navegación utilizando 'Link' de React Router para regresar a la página principal ("/") */}
      {/* Se le aplica un margen superior de 24px para separarlo visualmente del formulario */}
      <Link to="/" style={{ marginTop: "24px" }}>
        Volver al inicio
      </Link>
    </main>
  );
}