// Importa el componente base reutilizable 'Modal' desde la carpeta de componentes comunes
import Modal from '../../../components/common/Modal.jsx';

/**
 * Componente funcional que renderiza un modal con los detalles completos de un módulo de la aplicación.
 * Muestra información sobre la descripción técnica, interoperabilidad e impacto en el flujo de caja.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.open - Controla si el modal debe estar visible o no.
 * @param {Object|null} props.module - Objeto con la información detallada del módulo (title, detail: { technical, interop, impact }).
 * @param {Function} props.onClose - Función callback para cerrar el modal cuando el usuario interactúe con el botón de cierre o el fondo.
 */
export default function ModuleDetailModal({ open, module, onClose }) {
  // Retorno temprano (Early return): Si no hay ningún módulo seleccionado/definido, evita renderizar el DOM del modal
  if (!module) return null;

  return (
    // Renderiza el contenedor Modal pasando el estado de apertura, la función de cierre, el título del módulo y la etiqueta/badge superior
    <Modal open={open} onClose={onClose} title={module.title} label="Módulo">
      
      {/* Sección 1: Descripción técnica del módulo */}
      <div className="modal__section">
        <h4>Descripción técnica</h4>
        <p>{module.detail.technical}</p>
      </div>

      {/* Sección 2: Información sobre la integración e interoperabilidad con otros sistemas */}
      <div className="modal__section">
        <h4>Interoperabilidad</h4>
        <p>{module.detail.interop}</p>
      </div>

      {/* Sección 3: Explicación del impacto que tiene el módulo en el flujo de caja (Cash Flow) */}
      <div className="modal__section">
        <h4>Impacto en flujo de caja</h4>
        <p>{module.detail.impact}</p>
      </div>

    </Modal>
  );
}