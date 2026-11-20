const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const Product = require('./product.model');
const Sale = require('./sale.model');
const { METHODS, REF, safeInt, cleanRef, cleanSku, localDay, localStart, normalizeProduct } = require('./pos.helpers');

const PRODUCT_COLUMNS = ['sku', 'nombre', 'categoria', 'precio', 'existencias', 'minimo'];
const SALES_COLUMNS = ['referenciaVenta', 'fechaVenta', 'sku', 'cantidad', 'precioUnitario', 'medioPago'];
const MAX_ERRORS = 30;
const fail = (res, status, message, extra = {}) => res.status(status).json({ message, ...extra });

function readCsv(file, columns, maxRows) {
  if (!file) throw new Error('Selecciona un archivo CSV.');
  if (!file.originalname.toLowerCase().endsWith('.csv')) throw new Error('Se requiere un archivo .csv.');
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer); }
  catch { throw new Error('Guarda el CSV con codificación UTF-8.'); }
  if (source.includes('\0')) throw new Error('El archivo no es un CSV de texto válido.');
  const raw = source.replace(/^\uFEFF/, '').trim();
  const first = raw.split(/\r?\n/, 1)[0] || '';
  const delimiter = first.includes(';') && !first.includes(',') ? ';' : ',';
  let rows;
  try {
    rows = parse(raw, { columns: header => {
      const keys = header.map(x => String(x).trim());
      if (keys.length !== new Set(keys).size || keys.length !== columns.length ||
          columns.some(key => !keys.includes(key))) {
        throw new Error(`Encabezados requeridos: ${columns.join(',')}`);
      }
      return keys;
    }, bom: true, skip_empty_lines: true, trim: true, delimiter, relax_column_count: false });
  } catch (err) {
    throw new Error(`CSV inválido: ${err.message}`);
  }
  if (!rows.length) throw new Error('El CSV no contiene registros.');
  if (rows.length > maxRows) throw new Error(`Máximo ${maxRows} filas.`);
  return rows;
}
function pushError(errors, row, message) {
  if (errors.length < MAX_ERRORS) errors.push({ fila: row, motivo: message });
}
async function validateProducts(req) {
  const rows = readCsv(req.file, PRODUCT_COLUMNS, 500);
  const errors = [];
  const products = [];
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { data, errors: problems } = normalizeProduct({
      sku: row.sku, name: row.nombre, category: row.categoria || 'General',
      price: row.precio, stock: row.existencias, minStock: row.minimo || '0',
    });
    if (String(row.existencias || '').trim() === '') problems.push('Existencias obligatorias');
    if (seen.has(data.sku)) problems.push('SKU duplicado dentro del CSV');
    seen.add(data.sku);
    if (problems.length) pushError(errors, i + 2, problems.join('; '));
    products.push(data);
  }
  const existing = await Product.find({ tenantId: req.user.tenantId,
    sku: { $in: products.map(p => p.sku) } }).select('sku').lean();
  const duplicate = new Set(existing.map(p => p.sku));
  products.forEach((p, i) => {
    if (duplicate.has(p.sku)) pushError(errors, i + 2, 'El SKU ya existe en tu empresa');
  });
  return { products, errors, count: rows.length, sample: products.slice(0, 5) };
}

async function previewProducts(req, res) {
  try {
    const result = await validateProducts(req);
    return res.json({ type: 'PRODUCTS', total: result.count, valid: result.errors.length === 0,
      errors: result.errors, sample: result.sample });
  } catch (err) { return fail(res, 400, err.message); }
}
async function commitProducts(req, res) {
  let result;
  try { result = await validateProducts(req); }
  catch (err) { return fail(res, 400, err.message); }
  if (result.errors.length) return fail(res, 400, 'Corrige el CSV antes de confirmar. No se guardó nada.', { errors: result.errors });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Product.insertMany(result.products.map(product => ({ ...product,
        tenantId: req.user.tenantId })), { session, ordered: true });
    });
    return res.status(201).json({ message: `${result.count} productos importados.`, imported: result.count });
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, 'Un SKU fue creado por otro usuario. Revisa nuevamente; no se importó el lote.');
    console.error('Error importando productos:', err);
    return fail(res, 500, 'No se pudo confirmar la importación. Verifica MongoDB.');
  } finally { await session.endSession(); }
}

const METHOD_ALIASES = {
  EFECTIVO: 'CASH', TRANSFERENCIA: 'TRANSFER', TARJETA: 'CARD', OTRO: 'OTHER',
  CASH: 'CASH', TRANSFER: 'TRANSFER', CARD: 'CARD', OTHER: 'OTHER',
};
async function validateSales(req) {
  const rows = readCsv(req.file, SALES_COLUMNS, 1500);
  const errors = [];
  const groups = new Map();
  const skus = new Set();
  rows.forEach((row, i) => {
    const number = i + 2;
    const externalRef = cleanRef(row.referenciaVenta);
    const day = String(row.fechaVenta || '');
    const sku = cleanSku(row.sku);
    const quantity = Number(row.cantidad);
    const unitPrice = Number(row.precioUnitario);
    const paymentMethod = METHOD_ALIASES[String(row.medioPago || '').trim().toUpperCase()];
    const problems = [];
    if (!REF.test(externalRef)) problems.push('Referencia inválida (3-80 caracteres: A-Z, números, - o _)');
    if (!localStart(day) || day > localDay()) problems.push('Fecha inválida o futura, usa AAAA-MM-DD');
    if (!/^[A-Z0-9_-]{2,50}$/.test(sku)) problems.push('SKU inválido');
    if (!safeInt(quantity, 1)) problems.push('Cantidad debe ser entero positivo');
    if (!safeInt(unitPrice, 1)) problems.push('Precio unitario debe ser entero positivo');
    if (!METHODS.includes(paymentMethod)) problems.push('Medio: EFECTIVO, TRANSFERENCIA, TARJETA u OTRO');
    const subtotal = quantity * unitPrice;
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0) problems.push('Subtotal fuera de rango');
    if (problems.length) pushError(errors, number, problems.join('; '));
    skus.add(sku);
    if (!groups.has(externalRef)) groups.set(externalRef, { externalRef, day, paymentMethod, lines: [], total: 0 });
    const group = groups.get(externalRef);
    if (group.day !== day || group.paymentMethod !== paymentMethod) {
      pushError(errors, number, 'Las filas de la misma venta deben tener igual fecha y medio de pago');
    }
    if (group.lines.some(l => l.sku === sku)) pushError(errors, number, 'SKU repetido dentro de una misma venta');
    group.lines.push({ sku, quantity, unitPrice, subtotal, fila: number });
    group.total += subtotal;
    if (!Number.isSafeInteger(group.total)) pushError(errors, number, 'Total de venta fuera de rango');
  });
  const [products, existingSales] = await Promise.all([
    Product.find({ tenantId: req.user.tenantId, sku: { $in: [...skus] } }).select('_id sku name').lean(),
    Sale.find({ tenantId: req.user.tenantId, externalRef: { $in: [...groups.keys()] } }).select('externalRef').lean(),
  ]);
  const bySku = new Map(products.map(p => [p.sku, p]));
  const existing = new Set(existingSales.map(s => s.externalRef));
  const sales = [...groups.values()].map(group => {
    if (existing.has(group.externalRef)) pushError(errors, 2, `Referencia ${group.externalRef} ya importada o registrada`);
    return { externalRef: group.externalRef, paymentMethod: group.paymentMethod,
      soldAt: localStart(group.day), total: group.total,
      lines: group.lines.map(line => {
        const product = bySku.get(line.sku);
        if (!product) pushError(errors, line.fila, `SKU ${line.sku} no existe en esta empresa. Importa productos primero.`);
        return { productId: product?._id, name: product?.name || '',
          sku: line.sku, quantity: line.quantity, unitPrice: line.unitPrice, subtotal: line.subtotal };
      }) };
  });
  return { sales, errors, rowCount: rows.length, count: sales.length,
    sample: sales.slice(0, 5).map(s => ({ reference: s.externalRef, date: s.soldAt,
      lines: s.lines.length, total: s.total, paymentMethod: s.paymentMethod })) };
}
async function previewSales(req, res) {
  try {
    const result = await validateSales(req);
    return res.json({ type: 'HISTORICAL_SALES', rows: result.rowCount, total: result.count,
      valid: result.errors.length === 0, errors: result.errors, sample: result.sample,
      notice: 'No se modificará el stock actual ni el cierre de caja.' });
  } catch (err) { return fail(res, 400, err.message); }
}
async function commitSales(req, res) {
  let result;
  try { result = await validateSales(req); }
  catch (err) { return fail(res, 400, err.message); }
  if (result.errors.length) return fail(res, 400, 'Corrige el CSV antes de confirmar. No se guardó nada.', { errors: result.errors });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Sale.insertMany(result.sales.map(sale => ({ ...sale, source: 'HISTORICAL',
        createdBy: req.user._id, tenantId: req.user.tenantId })), { session, ordered: true });
    });
    return res.status(201).json({ message: `${result.count} ventas históricas importadas sin tocar inventario.`,
      imported: result.count, stockChanged: false });
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, 'Se detectó una referencia duplicada. No se importó el lote.');
    console.error('Error importando ventas históricas:', err);
    return fail(res, 500, 'No se pudo confirmar la importación. Verifica MongoDB.');
  } finally { await session.endSession(); }
}
module.exports = { previewProducts, commitProducts, previewSales, commitSales };
