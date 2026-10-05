import Navbar from '../common/Navbar.jsx'; // Componente de la barra de navegación superior
import Footer from '../common/Footer.jsx'; // Componente del pie de página

/**
 * Componente de diseño (Layout) para las páginas públicas de la aplicación.
 * Funciona como un envoltorio (wrapper) reutilizable que mantiene la estructura
 * consistente con la barra de navegación en la parte superior, el contenido dinámico 
 * en el centro y el pie de página al final.
 *
 * @param {Object} props - Propiedades recibidas por el componente.
 * @param {React.ReactNode} props.children - Elementos o componentes hijos que se renderizan dentro del tag <main>.
 * @param {boolean} props.ready - Estado booleano que indica si la aplicación o los recursos/fuentes ya cargaron,
 *                                 utilizado por el Navbar para sincronizar e iniciar animaciones (por ejemplo, con GSAP).
 */
export default function PublicLayout({ children, ready }) {
  return (
    <>
      {/* Barra de navegación común pasándole la prop 'ready' para sincronizar sus animaciones */}
      <Navbar ready={ready} />
      
      {/* Etapa principal semántica HTML5 donde se inyecta la vista o contenido de cada página */}
      <main>{children}</main>
      
      {/* Pie de página común de la aplicación */}
      <Footer />
    </>
  );
}