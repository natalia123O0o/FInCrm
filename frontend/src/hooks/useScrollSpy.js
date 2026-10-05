import { useEffect, useState } from 'react';

/**
 * Hook personalizado de React para detectar qué sección de la página se encuentra
 * actualmente en el viewport del navegador según el desplazamiento (scroll).
 * 
 * Útil para iluminar o activar dinámicamente los enlaces del menú de navegación.
 *
 * @param {string} selector - Selector CSS para encontrar las secciones (por defecto 'section[id]').
 * @param {number} offset - Desfase en píxeles para anticipar la activación antes de llegar al borde superior (por defecto 200px).
 * @returns {string} El hash ID de la sección activa (ej: '#inicio', '#modulos') o una cadena vacía.
 */
export function useScrollSpy(selector = 'section[id]', offset = 200) {
  // Estado para guardar el ID de la sección visible activa
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    // Busca todos los elementos en el DOM que coincidan con el selector pasándole id
    const sections = document.querySelectorAll(selector);

    // Función que evalúa la posición del scroll respecto a cada sección
    const onScroll = () => {
      let current = '';

      // Recorre cada sección registrada
      sections.forEach((s) => {
        // Calcula el límite superior de la sección menos el offset configurado
        const top = s.offsetTop - offset;

        // Si el scroll vertical actual del navegador supera dicho límite, asigna el id
        if (window.scrollY >= top) current = s.id;
      });

      // Actualiza el estado formateando como hash (#) o vacío si no hay coincidencia
      setActiveId(current ? `#${current}` : '');
    };

    // Ejecuta la verificación inmediatamente al montar el componente
    onScroll();

    // Escucha el evento 'scroll' con { passive: true } para optimizar el rendimiento y evitar tirones
    window.addEventListener('scroll', onScroll, { passive: true });

    // Limpia el listener cuando el componente se desmonta o cambian las dependencias
    return () => window.removeEventListener('scroll', onScroll);
  }, [selector, offset]);

  // Retorna el ID de la sección activa
  return activeId;
}