
import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { useLenis } from "./hooks/useLenis.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { AuthProvider } from "./features/auth/context/AuthContext.jsx";

export default function App() {
  const reducedMotion = useReducedMotion();

  useLenis(!reducedMotion);

  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
