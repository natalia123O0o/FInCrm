// Componente de ícono para "Factura" (Invoice)
export function IconInvoice({ size = 24, color = 'currentColor' }) {
  return (
    // Contenedor principal SVG que define tamaño, viewBox y oculta el ícono para lectores de pantalla
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Rectángulo exterior con esquinas redondeadas que representa el cuerpo de la factura */}
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="2" />
      {/* Líneas horizontales internas que simulan el texto o renglones de la factura */}
      <path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Componente de ícono para "Escudo / Seguridad" (Shield)
export function IconShield({ size = 24, color = 'currentColor' }) {
  return (
    // Contenedor principal SVG
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Silueta exterior que dibuja la forma de un escudo */}
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Marca de verificación o "check" (✓) en el centro del escudo para indicar aprobación/seguridad */}
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Componente de ícono para "Chispa / IA / Destello" (Spark)
export function IconSpark({ size = 24, color = 'currentColor' }) {
  return (
    // Contenedor principal SVG
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* 8 líneas distribuidas en cruz y diagonales saliendo del centro para simular un destello de luz o estrella */}
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Componente de ícono para "Gráfico / Estadísticas" (Chart)
export function IconChart({ size = 24, color = 'currentColor' }) {
  return (
    // Contenedor principal SVG
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Ejes X e Y que forman el marco del gráfico */}
      <path d="M4 20V6M4 20h16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Primera barra del gráfico (pequeña) */}
      <rect x="8" y="14" width="3" height="6" rx="1" fill={color} />
      {/* Segunda barra del gráfico (mediana) */}
      <rect x="13" y="10" width="3" height="10" rx="1" fill={color} />
      {/* Tercera barra del gráfico (alta) */}
      <rect x="18" y="6" width="3" height="14" rx="1" fill={color} />
    </svg>
  );
}