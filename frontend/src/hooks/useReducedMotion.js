import { useEffect, useState } from 'react';

/**
 * Hook personalizado de React para detectar si el usuario ha activado la opción
 * "reducir movimiento" (prefers-reduced-motion) en la configuración de su sistema operativo.
 *
 * Útil para desactivar o simplificar animaciones complejas (ej: GSAP, Lenis, CSS)
 * y mejorar la accesibilidad para personas con trastornos vestibulares.
 *
 * @returns {boolean} `true` si el usuario prefiere movimiento reducido, `false` de lo contrario.
 */
export function useReducedMotion() {
  // Estado para almacenar si la preferencia de movimiento reducido está activa
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Media Query de CSS para consultar la preferencia del sistema operativo
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Establece el valor inicial en el estado según el resultado actual de la media query
    setReduced(mq.matches);

    // Handler / Callback para actualizar el estado cuando el usuario cambie esta preferencia en su sistema
    const onChange = (e) => setReduced(e.matches);

    // Escucha activamente los cambios en la preferencia del sistema operativo
    mq.addEventListener('change', onChange);

    // Función de limpieza al desmontar el componente para prevenir memory leaks
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Retorna el valor booleano (true/false)
  return reduced;
}