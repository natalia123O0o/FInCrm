import { useEffect, useState } from 'react';

/**
 * Hook personalizado de React para sincronizar un estado local con `localStorage`.
 *
 * Mantiene el estado persistente en el navegador para que no se pierda al recargar la página.
 * Incluye manejo de errores de parseo o bloqueos de almacenamiento local.
 *
 * @param {string} key - La clave/identificador bajo la cual se guardará el dato en `localStorage`.
 * @param {any} initial - El valor por defecto si no existe una entrada previa guardada.
 * @returns {[any, Function]} Un par formado por el valor actual y la función para actualizarlo.
 */
export function useLocalStorage(key, initial) {
  // Estado de React inicializado de forma diferida (lazy initialization) para leer de localStorage solo una vez al montar
  const [value, setValue] = useState(() => {
    try {
      // Intenta obtener el valor almacenado en localStorage con la clave dada
      const raw = localStorage.getItem(key);

      // Si existe el valor, lo parsea de JSON a JS; de lo contrario, usa el valor inicial
      return raw ? JSON.parse(raw) : initial;
    } catch {
      // Si el JSON falla o localStorage está deshabilitado/bloqueado, retorna el valor inicial por defecto
      return initial;
    }
  });

  // Efecto secundario que guarda el estado actualizado en localStorage cada vez que cambia 'key' o 'value'
  useEffect(() => {
    try { 
      // Convierte el valor a cadena JSON y lo guarda en el almacenamiento local
      localStorage.setItem(key, JSON.stringify(value)); 
    } catch {
      // Captura silenciosamente errores (ej: almacenamiento lleno o modo privado restrictivo)
    }
  }, [key, value]);

  // Retorna el par [valor, funciónActualizadora] idéntico a useState estándar
  return [value, setValue];
}