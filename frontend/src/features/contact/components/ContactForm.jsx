import { useState } from 'react';
// Importa el esquema de validación de Zod previamente definido
import { contactSchema } from '../schemas/contact.schema.js';
// Importa la función del servicio API para enviar el formulario
import { sendContact } from '../services/contact.api.js';

// Estado inicial reseteado para todos los campos del formulario
const INITIAL = { nombre: '', empresa: '', correo: '', telefono: '', mensaje: '' };

/**
 * Componente funcional para el Formulario de Contacto.
 * Gestiona validación del lado del cliente en tiempo real, comunicación con API,
 * estados de carga/error y accesibilidad (atributos aria-*).
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Function} [props.onSuccess] - Callback opcional ejecutado al enviar con éxito.
 * @param {Function} [props.onError] - Callback opcional ejecutado si ocurre un error en el servidor.
 * @param {Function} [props.onSending] - Callback opcional ejecutado al iniciar el envío.
 */
export default function ContactForm({ onSuccess, onError, onSending }) {
  // Estado para controlar los valores ingresados en los inputs
  const [values, setValues] = useState(INITIAL);

  // Estado para almacenar los mensajes de error por campo ({ nombre: "Mínimo 2 caracteres", ... })
  const [errors, setErrors] = useState({});

  // Estado del ciclo de envío: 'idle' | 'sending' | 'success' | 'error'
  const [status, setStatus] = useState('idle');

  // Estado para guardar mensajes de error provenientes de la respuesta del servidor
  const [serverError, setServerError] = useState('');

  // Handler unificado para la actualización de cualquier input/textarea
  const onChange = (e) => {
    const { name, value } = e.target;

    // Actualiza el estado del campo modificado manteniendo el resto intactos
    setValues((v) => ({ ...v, [name]: value }));

    // Si el campo tenía un error activo, lo limpia inmediatamente para mejorar la experiencia de usuario (UX)
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  // Handler para la sumisión del formulario
  const onSubmit = async (e) => {
    e.preventDefault(); // Previene la recarga por defecto de la página
    setServerError(''); // Resetea errores previos del servidor

    // Valida los datos recopilados contra el esquema de Zod
    const parsed = contactSchema.safeParse(values);

    // Si la validación falla, mapea los errores de Zod al estado de errores por campo
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.issues.forEach((i) => { fieldErrors[i.path[0]] = i.message; });
      setErrors(fieldErrors);
      return; // Detiene la ejecución si hay errores de validación
    }

    // Cambia el estado a 'sending' e invoca el callback opcional 'onSending'
    setStatus('sending');
    onSending?.();

    try {
      // Envía los datos validados (parsed.data) mediante la función del servicio
      await sendContact(parsed.data);
      setStatus('success');
      onSuccess?.(); // Notifica el éxito al componente padre
    } catch {
      // Manejo de errores de red o del servidor HTTP
      setStatus('error');
      setServerError('No pudimos enviar tu solicitud. Intenta de nuevo en unos segundos.');
      onError?.(); // Notifica el error al componente padre
    }
  };

  // Flag booleano derivado para deshabilitar campos y mostrar loader durante el envío
  const sending = status === 'sending';

  return (
    <form className="cf" onSubmit={onSubmit} noValidate>
      {/* Campo: Nombre Completo */}
      <div className="cf__field">
        <label htmlFor="nombre">Nombre completo</label>
        <input 
          id="nombre" 
          name="nombre" 
          value={values.nombre} 
          onChange={onChange} 
          disabled={sending} 
          aria-invalid={!!errors.nombre} 
        />
        {errors.nombre && <small className="cf__error" aria-live="polite">{errors.nombre}</small>}
      </div>

      {/* Campo: Empresa */}
      <div className="cf__field">
        <label htmlFor="empresa">Empresa</label>
        <input 
          id="empresa" 
          name="empresa" 
          value={values.empresa} 
          onChange={onChange} 
          disabled={sending} 
          aria-invalid={!!errors.empresa} 
        />
        {errors.empresa && <small className="cf__error" aria-live="polite">{errors.empresa}</small>}
      </div>

      {/* Campo: Correo Electrónico */}
      <div className="cf__field">
        <label htmlFor="correo">Correo</label>
        <input 
          id="correo" 
          name="correo" 
          type="email" 
          value={values.correo} 
          onChange={onChange} 
          disabled={sending} 
          aria-invalid={!!errors.correo} 
        />
        {errors.correo && <small className="cf__error" aria-live="polite">{errors.correo}</small>}
      </div>

      {/* Campo: Teléfono de Contacto */}
      <div className="cf__field">
        <label htmlFor="telefono">Teléfono</label>
        <input 
          id="telefono" 
          name="telefono" 
          type="tel" 
          placeholder="3001234567" 
          value={values.telefono} 
          onChange={onChange} 
          disabled={sending} 
          aria-invalid={!!errors.telefono} 
        />
        {errors.telefono && <small className="cf__error" aria-live="polite">{errors.telefono}</small>}
      </div>

      {/* Campo: Mensaje + Contador de Caracteres */}
      <div className="cf__field">
        <label htmlFor="mensaje">Mensaje</label>
        <textarea 
          id="mensaje" 
          name="mensaje" 
          rows={4} 
          value={values.mensaje} 
          onChange={onChange} 
          disabled={sending} 
          aria-invalid={!!errors.mensaje} 
        />
        {/* Contador dinámico de caracteres ingresados */}
        <div className="cf__counter">{values.mensaje.length}/1000</div>
        {errors.mensaje && <small className="cf__error" aria-live="polite">{errors.mensaje}</small>}
      </div>

      {/* Banner de error general procedente del servidor */}
      {serverError && <div className="cf__server-error" role="alert">{serverError}</div>}

      {/* Botón de envío con cambio dinámico de estado */}
      <button 
        type="submit" 
        className="btn btn--primary cf__submit" 
        disabled={sending} 
        aria-label="Enviar solicitud"
      >
        {sending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  );
}