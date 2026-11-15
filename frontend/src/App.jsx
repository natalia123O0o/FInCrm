import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { useLenis } from "./hooks/useLenis.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";

// Importamos nuestro contexto
import { AuthProvider } from "./features/auth/context/AuthContext.jsx";

export default function App() {
  const reduced = useReducedMotion();

  useLenis(!reduced);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
