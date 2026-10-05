import { Route } from 'react-router-dom'; // Componente de React Router para definir la correspondencia entre rutas URL y componentes
import LandingPage from '../features/landing/pages/LandingPage.jsx'; // Página principal pública/landing de FinCRM
import { PATHS } from './paths.js'; // Objeto o constante que centraliza las definiciones de rutas URL del proyecto

/**
 * Fragmento de rutas públicas accesible para todos los usuarios sin requerir autenticación previa.
 * Se exporta como una constante para ser integrada dentro de la configuración general de <Routes>.
 */
export const publicRoutes = (
  <Route path={PATHS.landing} element={<LandingPage />} />
);