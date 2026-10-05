import { useEffect, useRef } from 'react';
import { gsap } from 'gsap'; // Librería de animaciones
import { stopLenis, startLenis } from '../../hooks/useLenis.js'; // Funciones para pausar/reanudar Lenis Scroll
import './Modal.css';

/**
 * Componente modal accesible y animado con GSAP.
 * Incluye trampa de foco (focus trap), restauración de foco, cierre con tecla Escape,
 * pausado del scroll suave (Lenis) y animaciones de entrada/salida.
 *
 * @param {Object} props
 * @param {boolean} props.open - Controla si el modal está abierto o cerrado.
 * @param {Function} props.onClose - Callback ejecutado al cerrar el modal.
 * @param {string} props.title - Título principal del modal.
 * @param {string} [props.label] - Etiqueta superior opcional (ej: "Módulo").
 * @param {React.ReactNode} props.children - Contenido interno renderizado dentro del modal.
 */
export default function Modal({ open, onClose, title, label, children }) {
  // Referencias a los elementos del DOM para animaciones GSAP y detección de clics
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  // Almacena el último elemento enfocado antes de abrir el modal para devolverle el foco al cerrar
  const prevFocus = useRef(null);

  useEffect(() => {
    // Si el modal no está abierto, no ejecuta la lógica de montaje
    if (!open) return;

    // Guarda el elemento actualmente enfocado en la página
    prevFocus.current = document.activeElement;

    // Pausa el scroll de Lenis y deshabilita el desplazamiento de la página de fondo
    stopLenis();
    document.body.style.overflow = 'hidden';

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    // Animación de entrada: Fade-in del fondo (overlay)
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25 });

    // Animación de entrada: Escala y desplazamiento vertical del panel
    gsap.fromTo(
      panel, 
      { opacity: 0, scale: 0.96, y: 16 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
    );

    // Selección de todos los elementos interactivos dentro del modal para la trampa de foco (Focus Trap)
    const focusable = panel.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Manejador de eventos de teclado (Escape para cerrar, Tab para mantener el foco atrapado)
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose();
      if (e.key === 'Tab') {
        // Shift + Tab en el primer elemento vuelve al último elemento del modal
        if (e.shiftKey && document.activeElement === first) { 
          e.preventDefault(); 
          last.focus(); 
        } 
        // Tab en el último elemento vuelve al primer elemento del modal
        else if (!e.shiftKey && document.activeElement === last) { 
          e.preventDefault(); 
          first.focus(); 
        }
      }
    };

    document.addEventListener('keydown', onKey);
    first?.focus(); // Enfoca automáticamente el primer elemento interactivo del modal

    // Limpieza al desmontar o cerrar el modal
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = ''; // Restaura el scroll nativo
      startLenis();                     // Reanuda el scroll suave de Lenis
      prevFocus.current?.focus?.();      // Devuelve el foco al elemento que lo tenía antes de abrir el modal
    };
  }, [open, onClose]);

  // Maneja la animación de salida suave antes de invocar onClose()
  const handleClose = () => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return onClose();

    // Animación de salida en paralelo
    gsap.to(overlay, { opacity: 0, duration: 0.2 });
    gsap.to(panel, { 
      opacity: 0, 
      scale: 0.96, 
      y: 8, 
      duration: 0.25, 
      onComplete: onClose // Ejecuta el callback onClose solo cuando finaliza la animación
    });
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      // Cierra el modal solo si se hace clic exactamente sobre el fondo oscuro (overlay)
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      <div 
        className="modal" 
        ref={panelRef} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
      >
        {/* Botón de cierre superior */}
        <button className="modal__close" onClick={handleClose} aria-label="Cerrar">×</button>
        
        {/* Etiqueta / Badge opcional */}
        {label && <span className="modal__label">{label}</span>}
        
        {/* Título dinámico referenciado por aria-labelledby */}
        <h3 id="modal-title" className="modal__title">{title}</h3>
        
        {/* Contenido inyectado dinámicamente */}
        {children}
      </div>
    </div>
  );
}