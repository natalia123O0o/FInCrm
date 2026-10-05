import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { useLenis } from './hooks/useLenis.js';
import { useReducedMotion } from './hooks/useReducedMotion.js';

export default function App() {
  const reduced = useReducedMotion();

  // Lenis permanece disponible para scrollToSection(),
  // pero NO controla el scroll normal del navegador.
  useLenis(!reduced);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}