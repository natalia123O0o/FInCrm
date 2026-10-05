import { Routes, Route } from 'react-router-dom'; // Importa los componentes principales de React Router v6 para definir el árbol de navegación
import LandingPage from '../features/landing/pages/LandingPage.jsx'; // Vista/Página principal pública (Landing de FinCRM)
import { PATHS } from './paths.js'; // Objeto que centraliza las constantes de rutas URL de la aplicación

/**
 * Componente principal de rutas (`AppRoutes`).
 * Mapea las URLs de la aplicación con sus respectivos componentes y pantallas placeholder.
 */
export default function AppRoutes() {
  return (
    // Contenedor principal que gestiona el renderizado de la ruta que coincida con la URL actual
    <Routes>
      {/* Ruta para la landing page principal */}
      <Route path={PATHS.landing} element={<LandingPage />} />
      
      {/* Ruta temporal para el Login (Placeholder a la espera del módulo de Autenticación) */}
      <Route
        path={PATHS.login}
        element={
          <div style={{ padding: 40, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <h1>Login</h1>
            <p>Pantalla placeholder — se implementará en el módulo de Auth.</p>
            <a href="/" style={{ color: 'var(--orange)' }}>← Volver al inicio</a>
          </div>
        }
      />
    </Routes>
  );
}