// Etiquetas para la interfaz. Los valores del backend se mantienen en inglés.
export const ACTIVITY_TYPES = {
  TASK: 'Tarea',
  CALL: 'Llamada',
  MEETING: 'Reunión',
  FOLLOW_UP: 'Seguimiento',
};

export const ACTIVITY_PRIORITIES = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };

export function isOverdue(activity, now = new Date()) {
  return activity.status === 'PENDING' && new Date(activity.dueAt).getTime() < now.getTime();
}

export function isUpcoming(activity, days = 7, now = new Date()) {
  const due = new Date(activity.dueAt).getTime();
  const start = now.getTime();
  return activity.status === 'PENDING' && due >= start && due <= start + days * 86400000;
}

export function activityStatus(activity) {
  if (activity.status === 'COMPLETED') return { label: 'Completada', kind: 'success' };
  if (isOverdue(activity)) return { label: 'Vencida', kind: 'danger' };
  return { label: 'Pendiente', kind: 'warning' };
}

export function formatActivityDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(date);
}

// Convierte una fecha ISO a la zona horaria local para el control datetime-local.
export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
