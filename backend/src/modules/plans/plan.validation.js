'use strict';
const mongoose = require('mongoose');
const { MODULES, LIMITS } = require('./plan.catalog');
const { PlanError } = require('./plan.errors');

function objectBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PlanError(400, 'INVALID_DATA', 'El cuerpo debe ser un objeto.');
  return value;
}
function allowedKeys(body, keys) {
  objectBody(body);
  if (Object.keys(body).some((key) => !keys.includes(key))) throw new PlanError(400, 'UNKNOWN_FIELD', 'La solicitud contiene campos no permitidos.');
}
function objectId(id, label = 'Identificador') {
  if (!mongoose.isObjectIdOrHexString(id)) throw new PlanError(400, 'INVALID_ID', `${label} inválido.`);
  return id;
}
function text(value, label, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new PlanError(400, 'INVALID_DATA', `${label}: escribe entre ${min} y ${max} caracteres.`);
  }
  return value.trim();
}
function reason(value) { return text(value, 'Motivo', 5, 500); }
function expectedVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new PlanError(400, 'VERSION_REQUIRED', 'Recarga los datos y envía su versión actual.');
  return value;
}
function modules(value) {
  if (!Array.isArray(value) || value.length > MODULES.length || value.some((key) => typeof key !== 'string')) {
    throw new PlanError(400, 'INVALID_MODULES', 'Selecciona una lista válida de módulos.');
  }
  if (new Set(value).size !== value.length) throw new PlanError(400, 'INVALID_MODULES', 'No repitas módulos.');
  for (const key of value) {
    const definition = MODULES.find((item) => item.key === key);
    if (!definition) throw new PlanError(400, 'INVALID_MODULES', 'Hay un módulo desconocido.');
    if (!definition.available) throw new PlanError(400, 'MODULE_UNAVAILABLE', `${definition.label} todavía no se puede contratar.`);
  }
  if (!value.includes('crm')) throw new PlanError(400, 'CRM_REQUIRED', 'Todos los planes incluyen el módulo CRM.');
  if ((value.includes('campaigns') || value.includes('quotes')) && !value.includes('opportunities')) {
    throw new PlanError(400, 'MODULE_DEPENDENCY', 'Cotizaciones y Campañas requieren Oportunidades comerciales.');
  }
  return [...value];
}
function limits(value, base = null) {
  objectBody(value);
  const keys = LIMITS.map((item) => item.key);
  allowedKeys(value, keys);
  const merged = { ...(base || {}), ...value };
  for (const { key, label, min } of LIMITS) {
    if (!Number.isSafeInteger(merged[key]) || merged[key] < min || merged[key] > 1000000000) {
      throw new PlanError(400, 'INVALID_LIMIT', `${label}: usa un entero entre ${min} y 1000000000.`);
    }
  }
  return merged;
}
function date(value, label, nullable = false) {
  if (nullable && value === null) return null;
  // Fechas con hora/zona explícitas evitan vencimientos ambiguos entre Colombia y UTC.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new PlanError(400, 'INVALID_DATE', `${label}: envía fecha y hora ISO con zona horaria.`);
  }
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) throw new PlanError(400, 'INVALID_DATE', `${label} inválida.`);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) {
    throw new PlanError(400, 'INVALID_DATE', `${label}: esa fecha no existe en el calendario.`);
  }
  return result;
}
function planInput(body, existing = null) {
  allowedKeys(body, existing
    ? ['name', 'description', 'monthlyPriceCOP', 'modules', 'limits', 'isActive', 'reason', 'expectedVersion']
    : ['code', 'name', 'description', 'monthlyPriceCOP', 'modules', 'limits', 'isActive', 'reason']);
  const result = existing ? { ...existing } : {};
  if (!existing) {
    if (typeof body.code !== 'string' || !/^[A-Z][A-Z0-9_]{2,39}$/.test(body.code)) throw new PlanError(400, 'INVALID_CODE', 'El código debe tener de 3 a 40 letras mayúsculas, números o guiones bajos.');
    result.code = body.code;
  }
  if (!existing || body.name !== undefined) result.name = text(body.name, 'Nombre', 2, 100);
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 1000) throw new PlanError(400, 'INVALID_DATA', 'Descripción inválida (máximo 1000 caracteres).');
    result.description = body.description.trim();
  }
  if (!existing || body.monthlyPriceCOP !== undefined) {
    if (!Number.isSafeInteger(body.monthlyPriceCOP) || body.monthlyPriceCOP < 0 || body.monthlyPriceCOP > 1000000000) throw new PlanError(400, 'INVALID_PRICE', 'El precio debe ser un entero en pesos colombianos, mayor o igual a cero.');
    result.monthlyPriceCOP = body.monthlyPriceCOP;
  }
  if (!existing || body.modules !== undefined) result.modules = modules(body.modules);
  if (!existing || body.limits !== undefined) result.limits = limits(body.limits, existing?.limits);
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') throw new PlanError(400, 'INVALID_DATA', 'Estado de plan inválido.');
    result.isActive = body.isActive;
  }
  return result;
}
module.exports = { objectBody, allowedKeys, objectId, text, reason, expectedVersion, modules, limits, date, planInput };
