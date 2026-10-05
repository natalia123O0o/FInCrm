import { useEffect, useState } from 'react';

/**
 * Hook personalizado de React para alternar dinámicamente el tema de la barra de navegación o UI
 * ('light', 'dark', 'navy', etc.) según la sección del DOM visible en el viewport.
 *
 * Utiliza IntersectionObserver con una "zona activa" centrada en la pantalla para una detección precisa.
 *
 * @returns {string} El tema activo actual (por defecto 'light').
 */
export function useScrollTheme() {
  // Estado para almacenar el nombre del tema activo ('light', 'dark', etc.)
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Selecciona todos los elementos HTML que tengan el atributo `data-nav-theme` (ej: <section data-nav-theme="navy">)
    const sections = document.querySelectorAll('[data-nav-theme]');
    if (!sections.length) return;

    // Crea el observador de intersección para evaluar qué sección está en pantalla
    const observer = new IntersectionObserver(
      (entries) => {
        // Filtra solo las secciones que están intersecando (visibles) y obtiene la que tiene mayor área visible
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        // Si hay una sección visible, lee su atributo `data-nav-theme` y actualiza el estado
        if (visible) {
          const next = visible.target.getAttribute('data-nav-theme');
          if (next) setTheme(next);
        }
      },
      { 
        // Genera una franja activa horizontal del 10% en el centro vertical de la pantalla (-45% arriba y abajo)
        rootMargin: '-45% 0px -45% 0px', 
        threshold: [0, 0.2, 0.5, 1] // Umbrales de porcentaje de visibilidad para activar el callback
      }
    );

    // Registra cada sección encontrada en el observador
    sections.forEach((s) => observer.observe(s));

    // Desconecta el observador al desmontar el componente para prevenir fugas de memoria
    return () => observer.disconnect();
  }, []);

  // Retorna el tema actual para consumir en la barra de navegación u otros componentes
  return theme;
}