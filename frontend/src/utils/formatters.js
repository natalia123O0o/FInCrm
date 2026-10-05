/**
 * Formatea un número como moneda en Pesos Colombianos (COP) con el símbolo '$'.
 * Redondea el valor al entero más cercano y aplica la separación de miles según el formato colombiano (puntos para miles).
 * 
 * @param {number} value - El número o monto a formatear.
 * @return {string} Cadena formateada (ej: 15000 -> "$15.000").
 */
export const formatCOP = (value) =>
  `$${Math.round(value).toLocaleString('es-CO')}`;

/**
 * Formatea un número agregando separadores de miles según la configuración regional de Colombia (es-CO).
 * Redondea el valor al entero más cercano antes de formatear.
 * 
 * @param {number} value - El número a formatear.
 * @return {string} Cadena formateada con puntos de miles (ej: 1250000 -> "1.250.000").
 */
export const formatNumber = (value) =>
  Math.round(value).toLocaleString('es-CO');