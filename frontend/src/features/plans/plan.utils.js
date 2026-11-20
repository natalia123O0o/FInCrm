export const MODULES = [
  { key: 'crm', label: 'Clientes, deudas y pagos', available: true },
  { key: 'activities', label: 'Actividades', available: true },
  { key: 'opportunities', label: 'Oportunidades', available: true },
  { key: 'quotes', label: 'Cotizaciones', available: true },
  { key: 'campaigns', label: 'Campañas', available: true },
  { key: 'messaging', label: 'Mensajería', available: true },
  { key: 'ai', label: 'Asistente de IA', available: true },
  { key: 'pos', label: 'FinPOS e inventario', available: true },
  { key: 'radar', label: 'FinRadar', available: false },
];

export const LIMITS = [
  { key: 'maxActiveUsers', label: 'Usuarios activos, incluido ADMIN', min: 1 },
  { key: 'aiRequestsPerMonth', label: 'Consultas de IA al mes', min: 0 },
  { key: 'quotesPerMonth', label: 'Cotizaciones al mes', min: 0 },
  { key: 'campaignsPerMonth', label: 'Campañas al mes', min: 0 },
  { key: 'emailsPerMonth', label: 'Correos al mes', min: 0 },
];

export const INITIAL_LIMITS = {
  maxActiveUsers: 3, aiRequestsPerMonth: 50, quotesPerMonth: 30,
  campaignsPerMonth: 0, emailsPerMonth: 100,
};

export const STATUS_LABELS = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', BLOCKED: 'Bloqueado', SUSPENDED: 'Suspendida' };
export function userStatus(user) {
  return user.status || (user.isActive === true ? 'ACTIVE' : 'INACTIVE');
}
export function money(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
}
export function dateTime(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota',
  }).format(date);
}

// Los formularios usan hora Colombia de manera explícita, independientemente del navegador.
export function colombiaInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
export function colombiaISO(value) { return value ? new Date(`${value}:00-05:00`).toISOString() : null; }

export function subscriptionProblem(subscription, now = Date.now()) {
  if (!subscription?.planId) return 'Tu empresa todavía no tiene un plan asignado.';
  if (subscription.startsAt && new Date(subscription.startsAt).getTime() > now) return 'Tu suscripción todavía no ha iniciado.';
  if (subscription.endsAt && new Date(subscription.endsAt).getTime() <= now) return 'La vigencia de tu suscripción terminó.';
  return '';
}

export function canUseFeature(subscription, feature) {
  return !subscriptionProblem(subscription) && Boolean(subscription.modules?.includes(feature));
}
