import { Component } from 'react';

/**
 * Componente de clase ErrorBoundary (Límite de Errores) en React.
 * Captura errores de JavaScript en cualquier parte del árbol de componentes hijos,
 * registra esos errores y muestra una interfaz de usuario alternativa en lugar del árbol colapsado.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    // Estado inicial: indica si ha ocurrido un error no controlado en algún componente hijo
    this.state = { hasError: false };
  }

  /**
   * Método de ciclo de vida estático que se ejecuta cuando un componente hijo lanza un error.
   * Se utiliza para actualizar el estado y desencadenar un nuevo renderizado con la UI de reserva.
   * 
   * @returns {Object} Nuevo estado con hasError en true.
   */
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }

  /**
   * Método de ciclo de vida que captura el error e información adicional de la pila (stack trace).
   * Ideal para enviar reportes a servicios de monitoreo de errores (Sentry, LogRocket, etc.).
   * 
   * @param {Error} error - El error lanzado por el componente hijo.
   * @param {Object} info - Objeto que contiene el componente de la pila que generó el error (componentStack).
   */
  componentDidCatch(error, info) { 
    console.error('ErrorBoundary', error, info); 
  }

  render() {
    // Si se capturó un error, renderiza la vista alternativa de contingencia (Fallback UI)
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <h2>Algo salió mal.</h2>
          <p>Recarga la página para continuar.</p>
        </div>
      );
    }

    // Si no hay errores, renderiza los componentes hijos normalmente
    return this.props.children;
  }
}