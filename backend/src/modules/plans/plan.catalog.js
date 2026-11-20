'use strict';

// Identificadores estables: los textos visibles pueden cambiar sin romper las licencias.
const MODULES = Object.freeze([
  { key: 'crm', label: 'Clientes, deudas y pagos', available: true },
  { key: 'activities', label: 'Actividades y tareas', available: true },
  { key: 'opportunities', label: 'Oportunidades comerciales', available: true },
  { key: 'quotes', label: 'Cotizaciones', available: true },
  { key: 'campaigns', label: 'Campañas', available: true },
  { key: 'messaging', label: 'Mensajería', available: true },
  { key: 'ai', label: 'Asistente de inteligencia artificial', available: true },
  { key: 'pos', label: 'FinPOS e inventario', available: true },
  { key: 'radar', label: 'FinRadar (próximamente)', available: false },
]);

const LIMITS = Object.freeze([
  { key: 'maxActiveUsers', label: 'Usuarios activos, incluido el ADMIN', min: 1 },
  { key: 'aiRequestsPerMonth', label: 'Consultas de IA por mes', min: 0 },
  { key: 'quotesPerMonth', label: 'Cotizaciones nuevas por mes', min: 0 },
  { key: 'campaignsPerMonth', label: 'Campañas nuevas por mes', min: 0 },
  { key: 'emailsPerMonth', label: 'Intentos de correo por mes', min: 0 },
]);

// Configuración inicial editable; los cupos se deben ajustar según uso y costos.
const DEFAULT_PLANS = Object.freeze([
  {
    code: 'ESSENTIAL', name: 'Esencial', monthlyPriceCOP: 39900,
    description: 'CRM comercial, cotizaciones e IA para empezar.',
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'messaging', 'ai'],
    limits: { maxActiveUsers: 3, aiRequestsPerMonth: 50, quotesPerMonth: 30, campaignsPerMonth: 0, emailsPerMonth: 100 },
  },
  {
    code: 'BUSINESS', name: 'Negocio', monthlyPriceCOP: 79900,
    description: 'CRM, campañas personalizadas y mayor capacidad de IA.',
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'campaigns', 'messaging', 'ai'],
    limits: { maxActiveUsers: 10, aiRequestsPerMonth: 200, quotesPerMonth: 200, campaignsPerMonth: 5, emailsPerMonth: 1000 },
  },
  {
    code: 'INTELLIGENT', name: 'Inteligente', monthlyPriceCOP: 129900,
    description: 'CRM, campañas, IA y FinPOS con inventario.',
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'campaigns', 'messaging', 'ai', 'pos'],
    limits: { maxActiveUsers: 25, aiRequestsPerMonth: 600, quotesPerMonth: 1000, campaignsPerMonth: 20, emailsPerMonth: 5000 },
  },
]);

module.exports = { MODULES, LIMITS, DEFAULT_PLANS };
