
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext.jsx";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // 1. Verificar si existe una sesión
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // 2. Verificar el rol del usuario
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    return (
      <main style={{ padding: "32px" }}>
        <h1>Acceso denegado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
      </main>
    );
  }

  // 3. Mostrar la página autorizada
  return <Outlet />;
}
