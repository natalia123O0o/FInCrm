/**
 * Componente funcional que renderiza una tarjeta de módulo individual (ModuleCard).
 * Muestra información resumida de un módulo (icono, título, descripción corta) 
 * y un botón para abrir sus detalles.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.module - Objeto con los datos del módulo (color, title, short, id, etc.).
 * @param {Function} props.onOpen - Función callback que recibe el ID del módulo al hacer clic.
 */
export default function ModuleCard({ module, onOpen }) {
  return (
    // Etiqueta semántica HTML5 <article> con clases BEM dinámicas según la variante de color del módulo
    <article className={`module-card module-card--${module.color}`}>
      
      {/* Contenedor del ícono o forma decorativa; aria-hidden="true" lo oculta a lectores de pantalla */}
      <span className="module-card__icon" aria-hidden="true">
        <span className="module-card__icon-shape" />
      </span>

      {/* Título principal del módulo */}
      <h3 className="module-card__title">{module.title}</h3>

      {/* Descripción corta o resumen del módulo */}
      <p className="module-card__desc">{module.short}</p>

      {/* Botón de acción para abrir la vista detallada o modal del módulo */}
      <button
        className="btn btn--ghost module-card__btn"
        onClick={() => onOpen(module.id)} // Invoca la función pasando el identificador único del módulo
        aria-label={`Ver detalle de ${module.title}`} // Mejora la accesibilidad especificando el contexto completo para lectores de pantalla
      >
        Ver detalle
      </button>
    </article>
  );
}