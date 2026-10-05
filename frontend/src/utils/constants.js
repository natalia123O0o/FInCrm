/**
 * Configuración de enlaces de navegación para la barra de navegación (Navbar).
 * Define los elementos del menú principal y sus respectivos anclas de desplazamiento (#).
 */
export const NAV_LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Módulos', href: '#modulos' },
  { label: 'Ley 2300', href: '#ley-2300' },
  { label: 'Contacto', href: '#contacto' },
];

/**
 * Paleta de colores de fondo para las distintas secciones de la aplicación.
 */
export const SECTION_BG = {
  light: '#F8FAFC', // Fondo claro/blanco azulado
  gray: '#E2E8F0',  // Fondo gris claro para contraste
  navy: '#0F172A',  // Fondo oscuro (azul marino profundo)
};

/**
 * Configuración global de animaciones (diseñada principalmente para GSAP o Framer Motion).
 */
export const MOTION = {
  // Tipos de aceleración/curvas de transición (Eases de GSAP)
  ease: {
    out: 'power3.out',        // Entrada suave con desaceleración al final
    inOut: 'power2.inOut',    // Transición suave al iniciar y al finalizar
    back: 'back.out(1.4)',     // Efecto de rebote estándar al finalizar la animación
    backSoft: 'back.out(1.2)', // Efecto de rebote ligero
    backStrong: 'back.out(1.6)',// Efecto de rebote pronunciado
    backMax: 'back.out(2)',    // Efecto de rebote máximo
    none: 'none',             // Animación lineal sin aceleración
    sine: 'sine.inOut',       // Transición sinusoidal suave de ida y vuelta
  },

  // Duración de las animaciones en segundos
  duration: {
    fast: 0.3,              // Transiciones rápidas (ej. hovers, modales simples)
    base: 0.8,              // Duración estándar para animaciones de entrada
    slow: 1.0,              // Animaciones lentas para elementos prominentes
    heroMockup: 1.1,        // Duración de la animación del mockup en la sección Hero
    preloaderBars: 0.45,    // Animación de las barras del preloader
    preloaderArrow: 0.5,    // Animación de la flecha en el preloader
    preloaderWord: 0.6,     // Animación del texto/palabra en el preloader
    preloaderLift: 0.9,     // Elevación y salida del preloader
    pageFade: 0.3,          // Transición de desvanecimiento entre páginas o secciones
  },

  // Tiempos de desfase (stagger) para animar listas o grupos de elementos secuencialmente
  stagger: { 
    xs: 0.07, 
    sm: 0.08, 
    md: 0.1, 
    lg: 0.12, 
    xl: 0.15 
  },

  // Configuración de efectos Parallax al hacer scroll
  parallax: { 
    mockupY: -60, // Desplazamiento vertical en píxeles para el mockup
    textY: -20,   // Desplazamiento vertical en píxeles para los textos
    scrub: 1      // Sincronización con la barra de desplazamiento (1 segundo de suavizado)
  },

  // Configuración para marquesinas animadas (cintas de texto o íconos continuos)
  marquee: { 
    duration: 28,        // Duración total de un ciclo completo de marquesina
    hoverSlow: 0.15,     // Factor de desaceleración cuando el usuario pasa el cursor por encima
    maxTimeScale: 3,     // Escala máxima de velocidad al interactuar
    velocityDivisor: 400 // Divisor para calcular la velocidad según el desplazamiento
  },

  // Parámetros de comportamiento para el Scroll y la Barra de Navegación
  scrollOffset: -80,     // Desfase en píxeles para compensar la altura del header al hacer scroll a un ancla
  navbarHideAfter: 80,   // Distancia en píxeles de scroll para ocultar la barra de navegación
  navbarSolidAfter: 160, // Distancia en píxeles de scroll para volver el fondo de la barra sólido/opaco
};