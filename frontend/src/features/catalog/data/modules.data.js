// Contenido comercial de FinCRM. La disponibilidad real depende del plan y del avance del desarrollo.
export const MODULES = [
  {
    id:'crm', title:'FinCRM · Relaciones comerciales', color:'navy',
    short:'Clientes, oportunidades, reuniones, actividades y seguimiento para no perder ninguna venta.',
    detail:{
      technical:'Gestiona fichas de clientes, oportunidades y actividades con responsable, prioridad, fecha y estado. Integra cartera, deudas y pagos.',
      interop:'Roles SUPER_ADMIN, ADMIN y USER; los datos de cada empresa se aíslan mediante tenantId.',
      impact:'Permite priorizar oportunidades y reducir el trabajo disperso entre múltiples herramientas.'
    }
  },
  {
    id:'quotes', title:'Cotizaciones inteligentes', color:'orange',
    short:'Prepara propuestas comerciales, calcula totales y apóyate en IA para comunicar mejor su valor.',
    detail:{
      technical:'Cotizaciones con productos o servicios, cantidades, precios, descuentos y estados. Posibilidad de generar documentos PDF.',
      interop:'Las cotizaciones se relacionan con los clientes y las oportunidades; el acceso y los cupos se controlan por plan.',
      impact:'Reduce errores de cálculo y agiliza la respuesta a clientes potenciales.'
    }
  },
  {
    id:'assistant', title:'Asistente con inteligencia artificial', color:'cyan',
    short:'Consulta la información autorizada del negocio y recibe ayuda para redactar y decidir.',
    detail:{
      technical:'Asistente integrado con Google Gemini para preguntas sobre clientes, cartera y actividad de la empresa, según permisos.',
      interop:'Las consultas deben respetar la empresa, los roles, la privacidad y la cuota de IA del plan contratado.',
      impact:'Agiliza la consulta de información y la preparación de propuestas sin sustituir la aprobación humana.'
    }
  },
  {
    id:'campaigns', title:'Campañas y comunicaciones', color:'blue',
    short:'Organiza campañas, mensajes de seguimiento y comunicaciones más personales con tus clientes.',
    detail:{
      technical:'Planifica campañas con público, objetivos, historial y estadísticas. Las plantillas admiten datos del destinatario.',
      interop:'Los envíos reales requieren proveedor, autorizaciones y validaciones de frecuencia y finalidad.',
      impact:'Ayuda a mantener una relación activa con los clientes sin perder el contexto de cada conversación.'
    }
  },
  {
    id:'pos', title:'FinPOS · Ventas e inventario', color:'orange',
    short:'Registra ventas, controla existencias y consulta productos. FinVoice propone comandos por voz.',
    detail:{
      technical:'Productos, ventas, medios de pago, inventario y cierre de caja. FinVoice es una extensión para consultas y operaciones asistidas.',
      interop:'Comparte información del negocio y aplica los permisos de los módulos contratados.',
      impact:'Facilita el registro operativo y el control de inventario en temporadas de alta demanda.'
    }
  },
  {
    id:'radar', title:'FinRadar · Analítica', color:'navy',
    short:'Indicadores, alertas y recomendaciones para anticipar riesgos y entender mejor el negocio.',
    detail:{
      technical:'Propuesta de análisis de ventas, cartera, rentabilidad y simulación de decisiones mediante datos e IA.',
      interop:'Se plantea como extensión avanzada y su disponibilidad se habilitará conforme avance el desarrollo.',
      impact:'Ofrece un panorama de indicadores para fundamentar decisiones comerciales y financieras.'
    }
  },
];
