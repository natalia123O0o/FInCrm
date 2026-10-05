export const MODULES = [
  {
    id: 'facturacion',
    title: 'Facturación Electrónica DIAN',
    short: 'Simulación de documento electrónico DIAN con JSON, listo para integración real.',
    color: 'orange',
    detail: {
      technical: 'Genera el JSON del documento electrónico (emisor, receptor, ítems, impuestos, totales) y la respuesta simulada de la DIAN con CUFE, QR, estado ACEPTADO y fecha de validación.',
      interop: 'Estructura compatible con el estándar de la DIAN. Intercambio vía JSON con posibilidad de integración a un proveedor tecnológico autorizado.',
      impact: 'Reduce tiempos de emisión y elimina errores de digitación, acelerando el recaudo y mejorando la trazabilidad.',
    },
  },
  {
    id: 'ley2300',
    title: 'Algoritmo de Control Preventivo',
    short: 'Verifica RNE, horarios y frecuencia antes de cualquier contacto de cobranza.',
    color: 'cyan',
    detail: {
      technical: 'Motor de reglas aislado que evalúa horarios L–V 7:00–19:00, Sáb 8:00–15:00, domingos y festivos prohibidos, con máximo un contacto semanal por deudor. Consulta previa al RNE.',
      interop: 'Bitácora auditable por tenant, exportable a CSV. Job programado reevalúa encolados cada minuto.',
      impact: 'Elimina el riesgo de sanciones y protege la reputación de la PYME.',
    },
  },
  {
    id: 'ia',
    title: 'Recomendador Financiero y Chatbot IA',
    short: 'Clasifica el riesgo del cliente y negocia acuerdos de pago por chat.',
    color: 'navy',
    detail: {
      technical: 'Motor híbrido: reglas deterministas que deciden cuotas y descuentos dentro de los límites del tenant, y un LLM que solo redacta la respuesta. Si el LLM falla, se usan plantillas de respaldo.',
      interop: 'Chatbot embebido en el portal de pago del deudor, con identificación de tenant y cliente desde el token.',
      impact: 'Aumenta la tasa de recaudo efectivo y reduce la carga operativa del equipo humano.',
    },
  },
  {
    id: 'cartera',
    title: 'Panel de Control de Flujo de Caja y Cartera',
    short: 'Vista consolidada de saldos, facturas pendientes y días de mora.',
    color: 'blue',
    detail: {
      technical: 'Panel con saldo consolidado por cliente, facturas pendientes, cálculo de días de mora y bitácora de cobranza. Filtros por estado, canal y rango de fechas.',
      interop: 'Aislado por tenant. SUPER_ADMIN puede ver el consolidado global.',
      impact: 'Toma decisiones de cobranza con información en tiempo real y proyecta el flujo de caja.',
    },
  },
];