import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap'; // Librería principal para animaciones
import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Plugin de GSAP para animar elementos al hacer scroll
import { MOTION } from '../../utils/constants.js'; // Constantes globales de configuración (tiempos, easing, staggers)
import './Footer.css';

// Registra el plugin ScrollTrigger en el motor de GSAP
gsap.registerPlugin(ScrollTrigger);

/**
 * Componente Footer para la sección de pie de página de FinCRM.
 * Incluye animaciones de entrada activadas por scroll y un elemento decorativo ("totem") con oscilación continua.
 */
export default function Footer() {
  // Referencia al contenedor principal del pie de página
  const rootRef = useRef(null);
  // Referencia en forma de arreglo para guardar los elementos gráficos del logo (barras SVG)
  const barsRef = useRef([]);
  // Referencia al elemento decorativo abstracto (totem)
  const totemRef = useRef(null);

  // useLayoutEffect ejecuta las animaciones antes de que el navegador pinte en pantalla, evitando parpadeos
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Detecta si el usuario prefiere reducir el movimiento por motivos de accesibilidad
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // Cancela las animaciones si la preferencia está activa

    // gsap.context permite agrupar todas las animaciones dentro de un alcance y limpiarlas fácilmente
    const ctx = gsap.context(() => {
      // 1. Animación de revelado para las barras del Isotipo SVG (crecimiento desde la base)
      gsap.from(barsRef.current, {
        scaleY: 0, // Inicia con altura 0
        transformOrigin: '50% 100%', // El punto de origen se fija en la base de la barra
        duration: 0.5,
        stagger: MOTION.stagger.md, // Desfase temporal entre cada barra
        ease: MOTION.ease.back, // Efecto de rebote sutil al terminar de escalar
        scrollTrigger: { 
          trigger: root, 
          start: 'top 85%' // Se activa cuando la parte superior del footer llega al 85% de la pantalla
        },
      });

      // 2. Animación de entrada para las columnas de contenido
      gsap.from('.footer__col', {
        y: 24, // Inicia desplazado 24px hacia abajo
        opacity: 0, // Inicia completamente transparente
        duration: 0.7,
        stagger: MOTION.stagger.sm, // Desfase secuencial entre columnas
        ease: MOTION.ease.out,
        scrollTrigger: { 
          trigger: root, 
          start: 'top 80%' 
        },
      });

      // 3. Animación en bucle continuo para la figura decorativa (Totem)
      gsap.to(totemRef.current, {
        rotation: 5, // Rotación leve de 5 grados
        duration: 3,
        yoyo: true, // Alterna ida y vuelta (de 0° a 5° y de regreso)
        repeat: -1, // Repetición infinita
        ease: 'sine.inOut', // Transición suave y fluida
        transformOrigin: '50% 100%', // Pivota sobre el centro inferior
      });
    }, root);

    // Limpia y revierte todas las animaciones cuando el componente se desmonta
    return () => ctx.revert();
  }, []);

  return (
    <footer ref={rootRef} className="footer" data-bg="navy">
      <div className="container footer__grid">
        
        {/* Columna 1: Isotipo SVG animado, nombre de la marca y descripción */}
        <div className="footer__col">
          <div className="footer__brand">
            <svg viewBox="0 0 120 40" className="footer__mark" aria-hidden="true">
              {/* Se asigna la referencia de cada barra SVG dinámicamente al arreglo barsRef */}
              <rect ref={(el) => (barsRef.current[0] = el)} x="0" y="20" width="10" height="20" rx="3" fill="#F97316" />
              <rect ref={(el) => (barsRef.current[1] = el)} x="14" y="12" width="10" height="28" rx="3" fill="#06B6D4" />
              <rect ref={(el) => (barsRef.current[2] = el)} x="28" y="4" width="10" height="36" rx="3" fill="#F8FAFC" />
            </svg>
            <span>FinCRM</span>
          </div>
          <p>CRM SaaS de cobranza y flujo de caja para PYMES colombianas, con cumplimiento Ley 2300.</p>
        </div>

        {/* Columna 2: Navegación rápida con anclas internas */}
        <div className="footer__col">
          <h4>Enlaces rápidos</h4>
          <ul>
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#modulos">Módulos</a></li>
            <li><a href="#ley-2300">Ley 2300</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ul>
        </div>

        {/* Columna 3: Referencias normativas e informativas de la legislación colombiana */}
        <div className="footer__col">
          <h4>Legal</h4>
          <ul>
            <li>Ley 2300</li>
            <li>Ley 1581 de protección de datos</li>
            <li>RNE — Registro Nacional de Excluidos</li>
          </ul>
        </div>

        {/* Columna 4: Elemento gráfico decorativo compuesto (Totem animado) */}
        <div className="footer__col footer__col--totem">
          <div className="footer__totem" ref={totemRef} aria-hidden="true">
            <span className="footer__shape footer__shape--navy" />
            <span className="footer__shape footer__shape--circle" />
            <span className="footer__shape footer__shape--orange" />
          </div>
        </div>

      </div>

      {/* Sección inferior de derechos de autor y atribución */}
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} FinCRM. Todos los derechos reservados.</span>
        <span>Proyecto Yina Natalia Barbosa — Jóvenes Creativos</span>
      </div>
    </footer>
  );
}