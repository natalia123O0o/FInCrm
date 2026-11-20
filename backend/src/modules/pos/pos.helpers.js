const mongoose = require('mongoose');

const SKU = /^[A-Z0-9_-]{2,50}$/;
const REF = /^[A-Z0-9_-]{3,80}$/;
const METHODS = ['CASH', 'TRANSFER', 'CARD', 'OTHER'];
const safeInt = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
const text = (s, min = 1, max = 120) => typeof s === 'string' && s.trim().length >= min && s.trim().length <= max;
const cleanSku = value => String(value || '').trim().toUpperCase();
const cleanRef = value => String(value || '').trim().toUpperCase();
const idOk = value => mongoose.isValidObjectId(value);
const escapeRegex = text => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const limitPage = query => ({
  page: Math.min(100000, Math.max(1, parseInt(query.page, 10) || 1)),
  limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25)),
});
function localDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const val = type => parts.find(x => x.type === type).value;
  return `${val('year')}-${val('month')}-${val('day')}`;
}
function localStart(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00-05:00`);
  if (Number.isNaN(date.getTime()) || localDay(date) !== day) return null;
  return date;
}
function localEnd(day) {
  const start = localStart(day);
  if (!start) return null;
  return new Date(start.getTime() + 86400000);
}
function normalizeProduct(row) {
  const name = String(row.name || '').trim();
  const sku = cleanSku(row.sku);
  const category = String(row.category || 'General').trim();
  const price = Number(row.price);
  const stock = Number(row.stock);
  const minStock = Number(row.minStock ?? 3);
  const errors = [];
  if (!text(name, 2, 120)) errors.push('Nombre: 2 a 120 caracteres');
  if (!SKU.test(sku)) errors.push('SKU inválido (A-Z, 0-9, guion o _)');
  if (!text(category, 1, 60)) errors.push('Categoría inválida');
  if (!safeInt(price, 1)) errors.push('Precio debe ser entero positivo en COP');
  if (row.stock === undefined || row.stock === null || row.stock === '' || !safeInt(stock)) errors.push('Existencias deben ser enteras no negativas');
  if (!safeInt(minStock)) errors.push('Mínimo debe ser entero no negativo');
  return { data: { name, sku, category, price, stock, minStock }, errors };
}
module.exports = { SKU, REF, METHODS, safeInt, text, cleanSku, cleanRef, idOk,
  escapeRegex, limitPage, localDay, localStart, localEnd, normalizeProduct };
