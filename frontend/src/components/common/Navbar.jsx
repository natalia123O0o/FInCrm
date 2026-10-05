import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap'; // Librería para animaciones avanzadas
import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Plugin de GSAP para sincronizar animaciones con el scroll
import { NAV_LINKS } from '../../utils/constants.js'; // Enlaces de navegación estáticos [{ href, label }]
import { MOTION } from '../../utils/constants.js'; // Constantes de configuración (umbrales de scroll)
import { scrollToSection } from '../../hooks/useLenis.js'; // Función para scroll suave con Lenis
import { useScrollTheme } from '../../hooks/useScrollTheme.js'; // Hook para alternar temas (light/dark)
import { useScrollSpy } from '../../hooks/useScrollSpy.js'; // Hook para detectar la sección activa
import './Navbar.css';

// Registra ScrollTrigger en GSAP
gsap.registerPlugin(ScrollTrigger);

/**
 * Componente Navbar para la navegación principal.
 * Incluye comportamiento inteligente en scroll (ocultar/mostrar), redimensionamiento de logo,
 * subrayado dinámico animado (sliding underline) y menú responsivo para móviles.
 *
 * @param {Object} props
 * @param {boolean} props.ready - Indica si la aplicación cargó sus recursos iniciales para activar animaciones.
 */
export default function Navbar({ ready }) {
  // Referencias a elementos del DOM para manipular con GSAP
  const headerRef = useRef(null);
  const logoWrapRef = useRef(null);
  const underlineRef = useRef(null);
  const panelRef = useRef(null);

  // Estado del menú desplegable móvil
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hooks personalizados para obtener el enlace activo y el tema actual según la posición del scroll
  const active = useScrollSpy();
  const theme = useScrollTheme();

  // EFEITO 1: Configuración de ScrollTrigger para el logo y el header (Smart Navbar)
  useLayoutEffect(() => {
    if (!ready) return;
    const header = headerRef.current;
    if (!header) return;

    // Utiliza gsap.context para un manejo y limpieza eficiente del estado de las animaciones
    const ctx = gsap.context(() => {
      // Reduce el tamaño del logo suavemente a medida que se desplaza la página (primeros 160px)
      const stLogo = ScrollTrigger.create({
        start: 'top top',
        end: '+=160',
        scrub: 0.6,
        onUpdate: (self) => {
          gsap.set(logoWrapRef.current, {
            scale: gsap.utils.interpolate(1, 0.42, self.progress),
          });
        },
      });

      // Alterna clases e intercala ocultar/mostrar la barra según la dirección del desplazamiento
      const stHeader = ScrollTrigger.create({
        start: 'top top',
        end: 99999,
        onUpdate: (self) => {
          const y = self.scroll();

          // Aplica fondo sólido cuando supera el umbral configurado
          header.classList.toggle('is-solid', y > MOTION.navbarSolidAfter);

          // Oculta el header hacia arriba si se desplaza hacia abajo (Scroll Down)
          // Mantiene o muestra el header si se desplaza hacia arriba (Scroll Up) o el menú móvil está abierto
          if (y > MOTION.navbarHideAfter && self.direction === 1 && !mobileOpen) {
            gsap.to(header, { yPercent: -100, duration: 0.4, ease: 'power2.out', overwrite: true });
          } else {
            gsap.to(header, { yPercent: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
          }
        },
      });

      // Función de limpieza de los triggers creados
      return () => { stLogo.kill(); stHeader.kill(); };
    }, header);

    return () => ctx.revert(); // Revierte todos los cambios de GSAP al desmontar
  }, [ready, mobileOpen]);

  // EFECTO 2: Animación de la barra/subrayado deslizante (sliding underline) bajo el enlace activo
  useLayoutEffect(() => {
    const container = headerRef.current?.querySelector('.navbar__links');
    const activeEl = container?.querySelector(`a[href="${active}"]`);
    const underline = underlineRef.current;

    if (!container || !activeEl || !underline) return;

    // Calcula la posición y ancho del enlace activo respecto al contenedor
    const cRect = container.getBoundingClientRect();
    const aRect = activeEl.getBoundingClientRect();

    // Anima la barra hacia la posición X y ancho del enlace actual
    gsap.to(underline, { 
      x: aRect.left - cRect.left, 
      width: aRect.width, 
      opacity: 1, 
      duration: 0.35, 
      ease: 'power3.out' 
    });
  }, [active]);

  // EFECTO 3: Animación de apertura y cierre del panel del menú desplegable móvil
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (mobileOpen) {
      // Muestra el panel y realiza una animación de cortinilla con clip-path
      gsap.set(panel, { display: 'flex' });
      gsap.fromTo(
        panel, 
        { clipPath: 'inset(0 0 100% 0)' }, 
        { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power2.inOut' }
      );
      // Escalona (stagger) la aparición de los enlaces internos del menú móvil
      gsap.fromTo(
        panel.querySelectorAll('a, button'), 
        { y: 24, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', delay: 0.15 }
      );
    } else {
      // Cierra la cortinilla y oculta el elemento al finalizar
      gsap.to(panel, { 
        clipPath: 'inset(0 0 100% 0)', 
        duration: 0.4, 
        ease: 'power2.inOut', 
        onComplete: () => gsap.set(panel, { display: 'none' }) 
      });
    }
  }, [mobileOpen]);

  // Handler para la navegación por anclas internas
  const handleAnchor = (e, href) => {
    e.preventDefault();
    setMobileOpen(false); // Cierra el menú móvil si estaba abierto
    scrollToSection(href); // Desplaza suavemente hacia la sección deseada usando Lenis
  };

  return (
    <header ref={headerRef} className={`navbar ${theme === 'dark' ? 'is-dark' : ''}`}>
      <div className="navbar__inner container">
        {/* Logo principal de la aplicación */}
        <a href="#inicio" className="navbar__logo" onClick={(e) => handleAnchor(e, '#inicio')}>
          <div ref={logoWrapRef} className="navbar__logo-wrap">
            <img src="/logo-fincrm.png" alt="FinCRM" />
          </div>
        </a>

        {/* Menú de navegación desktop */}
        <nav className="navbar__nav" aria-label="Principal">
          <ul className="navbar__links">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a 
                  href={l.href} 
                  onClick={(e) => handleAnchor(e, l.href)} 
                  className={active === l.href ? 'is-active' : ''}
                >
                  {l.label}
                </a>
              </li>
            ))}
            {/* Indicador o subrayado dinámico administrado por GSAP */}
            <span ref={underlineRef} className="navbar__underline" aria-hidden="true" />
          </ul>
        </nav>

        {/* Acciones y botón hamburguesa */}
        <div className="navbar__actions">
          <a href="/login" className="btn btn--primary navbar__cta" aria-label="Iniciar sesión">
            Iniciar sesión
          </a>
          <button
            className={`navbar__burger ${mobileOpen ? 'is-open' : ''}`}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span /><span />
          </button>
        </div>
      </div>

      {/* Panel responsivo del menú desplegable para dispositivos móviles */}
      <div ref={panelRef} className="navbar__panel" aria-hidden={!mobileOpen}>
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={(e) => handleAnchor(e, l.href)}>
            {l.label}
          </a>
        ))}
        <a href="/login" className="btn btn--primary">Iniciar sesión</a>
      </div>
    </header>
  );
}