export const STAGES = {
  NEW:'Nueva', CONTACTED:'Contactada', QUALIFIED:'Calificada', PROPOSAL:'Propuesta',
  NEGOTIATION:'Negociación', WON:'Ganada', LOST:'Perdida'
};
export const ENCOUNTERS = {
  CALL:'Llamada', MEETING:'Reunión', VISIT:'Visita', LUNCH:'Almuerzo comercial',
  DEMO:'Demostración', EMAIL:'Correo electrónico', OTHER:'Otro encuentro'
};
export const OUTCOMES = {
  POSITIVE:'Positivo', NEUTRAL:'Neutral', NEGATIVE:'Negativo', NO_RESPONSE:'Sin respuesta',
  AGREEMENT:'Acuerdo alcanzado', FOLLOW_UP:'Requiere seguimiento'
};
export const DECISIONS = { ACCEPT:'Aceptar recomendación', REJECT:'Rechazar recomendación', POSTPONE:'Posponer decisión' };
export const formatMoney = value => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(value || 0);
export const formatDate = date => date ? new Intl.DateTimeFormat('es-CO', { dateStyle:'medium', timeStyle:'short', timeZone:'America/Bogota' }).format(new Date(date)) : 'Sin fecha';
export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
