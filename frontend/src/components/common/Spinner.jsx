/**
 * Componente funcional para renderizar un indicador visual de carga (Spinner).
 * Utiliza estilos inline y una animación CSS pura para crear un anillo giratorio.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {number} [props.size=20] - Tamaño en píxeles para el ancho y alto del spinner (por defecto 20px).
 */
export default function Spinner({ size = 20 }) {
  return (
    <span
      aria-hidden="true" // Oculta el spinner a lectores de pantalla (elemento puramente decorativo)
      style={{
        display: 'inline-block', // Permite aplicar dimensiones explicitas sin romper el flujo del texto
        width: size,             // Ancho dinámico según la prop 'size'
        height: size,            // Alto dinámico según la prop 'size'
        border: '2px solid currentColor', // Borde continuo que hereda el color de texto del elemento padre
        borderTopColor: 'transparent',   // Borde superior transparente para crear el efecto de corte en el anillo
        borderRadius: '50%',              // Redondea el contenedor para formar un círculo perfecto
        animation: 'spin 0.8s linear infinite', // Aplica la keyframe animation 'spin' en bucle infinito a velocidad constante
      }}
    />
  );
}