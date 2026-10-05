import { useEffect } from 'react';
import Lenis from 'lenis';
import { MOTION } from '../utils/constants.js';

let lenisInstance = null;

export const getLenis = () => lenisInstance;

export const stopLenis = () => {
  lenisInstance?.stop();
};

export const startLenis = () => {
  lenisInstance?.start();
};

/**
 * Desplazamiento programático hacia una sección.
 *
 * El scroll manual de la página NO depende de Lenis.
 * Lenis solamente se utiliza cuando el código solicita
 * explícitamente un desplazamiento suave.
 */
export function scrollToSection(selector) {
  const target =
    typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

  if (!target) return;

  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset: MOTION.scrollOffset,
      duration: 1.1,
    });

    return;
  }

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

/**
 * Inicializa Lenis únicamente para desplazamientos
 * programáticos.
 *
 * El navegador conserva el control del scroll normal:
 *
 * barra lateral
 * trackpad
 * rueda
 * touch
 *
 * Todos modifican directamente window.scrollY.
 */
export function useLenis(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      if (lenisInstance) {
        lenisInstance.destroy();
        lenisInstance = null;
      }

      return undefined;
    }

    if (lenisInstance) {
      return undefined;
    }

    const lenis = new Lenis({
      /*
       * Fundamental:
       * Lenis NO intercepta el wheel/trackpad.
       */
      smoothWheel: false,

      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenisInstance = lenis;

    /*
     * RAF necesario para los scrollTo() programáticos.
     */
    let animationFrame = null;

    const raf = (time) => {
      lenis.raf(time * 1000);
      animationFrame = requestAnimationFrame(raf);
    };

    animationFrame = requestAnimationFrame(raf);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      lenis.destroy();

      if (lenisInstance === lenis) {
        lenisInstance = null;
      }
    };
  }, [enabled]);
}