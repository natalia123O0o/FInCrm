import { z } from 'zod'; // Importa la librería Zod para la declaración y validación de esquemas de datos

/**
 * Esquema de validación para el formulario de contacto usando Zod.
 * Define la estructura, tipos de datos, transformaciones (trim) y mensajes de error
 * para cada uno de los campos del formulario.
 */
export const contactSchema = z.object({
  // Campo 'nombre': Debe ser string, limpia espacios iniciales/finales (.trim()) y exige entre 2 y 80 caracteres.
  nombre: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres'),

  // Campo 'empresa': Nombre de la empresa o negocio, de 2 a 100 caracteres.
  empresa: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  // Campo 'correo': Valida el formato estándar de dirección de correo electrónico.
  correo: z
    .string()
    .trim()
    .email('Correo inválido'),

  // Campo 'telefono': Valida que la cadena cumpla con el formato de celular o línea fija colombiana usando regex personalizada (.refine()).
  telefono: z
    .string()
    .trim()
    .refine(
      // Expresión regular que acepta números celulares (3XX...) y fijosa (60X...) con o sin +57
      (v) => /^(\+?57)?\s?3\d{9}$/.test(v) || /^(\+?57)?\s?60[1-8]\d{7}$/.test(v),
      'Teléfono colombiano inválido (ej. 3001234567)'
    ),

  // Campo 'mensaje': Cuerpo del mensaje de contacto, entre 10 y 1000 caracteres.
  mensaje: z
    .string()
    .trim()
    .min(10, 'Mínimo 10 caracteres')
    .max(1000, 'Máximo 1000 caracteres'),
});