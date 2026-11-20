const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const Product = require('./product.model');
const Sale = require('./sale.model');
const StockMovement = require('./stock-movement.model');
const CashClosure = require('./cash-closure.model');
const {
  REF, METHODS, safeInt, text, cleanRef, idOk, escapeRegex,
  limitPage, localDay, localStart, localEnd, normalizeProduct,
} = require('./pos.helpers');

const fail = (res, status, message) => res.status(status).json({ message });
function errorResponse(err, res, context) {
  if (err.code === 11000) return fail(res, 409, 'La referencia ya existe en tu empresa. Actualiza y verifica antes de reintentar.');
  if (err.httpStatus) return fail(res, err.httpStatus, err.message);
  console.error(`Error ${context}:`, err);
  return fail(res, 500, 'No se pudo completar la operación. Verifica el historial antes de reintentar.');
}
function httpError(message, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  return error;
}

async function listProducts(req, res) {
  try {
    const { page, limit } = limitPage(req.query);
    const query = { tenantId: req.user.tenantId };
    if (req.query.includeInactive !== 'true' || req.user.role !== 'ADMIN') query.isActive = true;
    if (req.query.q && String(req.query.q).trim()) {
      const re = new RegExp(escapeRegex(String(req.query.q).trim().slice(0, 80)), 'i');
      query.$or = [{ name: re }, { sku: re }, { category: re }];
    }
    if (req.query.category) query.category = String(req.query.category).slice(0, 60);
    if (req.query.stockStatus === 'out') query.stock = 0;
    if (req.query.stockStatus === 'low') query.$expr = {
      $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$minStock', 3] }] }],
    };
    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query).select('name sku category price stock minStock isActive createdAt updatedAt')
        .sort({ name: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ products, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) { return errorResponse(err, res, 'listar productos'); }
}

async function createProduct(req, res) {
  try {
    const { data, errors } = normalizeProduct(req.body || {});
    if (errors.length) return fail(res, 400, errors.join('. '));
    const product = await Product.create({ ...data, tenantId: req.user.tenantId });
    return res.status(201).json({ product });
  } catch (err) { return errorResponse(err, res, 'crear producto'); }
}

async function updateProduct(req, res) {
  try {
    if (!idOk(req.params.id)) return fail(res, 400, 'ID de producto inválido.');
    const { name, category, price, minStock, isActive } = req.body || {};
    if (!text(name, 2, 120) || !text(category, 1, 60) || !safeInt(price, 1) ||
        !safeInt(minStock) || typeof isActive !== 'boolean') {
      return fail(res, 400, 'Revisa nombre, categoría, precio, mínimo y estado.');
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { name: name.trim(), category: category.trim(), price, minStock, isActive } },
      { new: true, runValidators: true }
    );
    if (!product) return fail(res, 404, 'Producto no encontrado en tu empresa.');
    return res.json({ product });
  } catch (err) { return errorResponse(err, res, 'editar producto'); }
}

async function adjustStock(req, res) {
  const { delta, reason } = req.body || {};
  if (!idOk(req.params.id) || !Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 100000 ||
      !text(reason, 5, 200)) return fail(res, 400, 'Indica una variación entera distinta de cero y un motivo (5-200 caracteres).');
  const session = await mongoose.startSession();
  try {
    let product;
    await session.withTransaction(async () => {
      const condition = { _id: req.params.id, tenantId: req.user.tenantId, isActive: true };
      if (delta < 0) condition.stock = { $gte: -delta };
      const before = await Product.findOneAndUpdate(condition, { $inc: { stock: delta } }, { session, new: false });
      if (!before) throw httpError('Producto inexistente o existencias insuficientes.', 409);
      if (!Number.isSafeInteger(before.stock + delta)) throw httpError('La nueva existencia excede el rango permitido.');
      await StockMovement.create([{ tenantId: req.user.tenantId, productId: before._id,
        changedBy: req.user._id, delta, before: before.stock, after: before.stock + delta, reason: reason.trim() }], { session });
      product = { _id: before._id, sku: before.sku, stock: before.stock + delta };
    });
    return res.json({ product, message: 'Ajuste registrado con auditoría.' });
  } catch (err) { return errorResponse(err, res, 'ajustar inventario'); }
  finally { await session.endSession(); }
}

async function listSales(req, res) {
  try {
    const { page, limit } = limitPage(req.query);
    const query = { tenantId: req.user.tenantId };
    if (req.user.role === 'USER') query.createdBy = req.user._id;
    if (METHODS.includes(req.query.paymentMethod)) query.paymentMethod = req.query.paymentMethod;
    if (req.query.source === 'POS') query.source = { $ne: 'HISTORICAL' };
    if (req.query.source === 'HISTORICAL') query.source = 'HISTORICAL';
    if (req.query.from || req.query.to) {
      query.soldAt = {};
      if (req.query.from) {
        const start = localStart(String(req.query.from));
        if (!start) return fail(res, 400, 'Fecha desde inválida.');
        query.soldAt.$gte = start;
      }
      if (req.query.to) {
        const end = localEnd(String(req.query.to));
        if (!end) return fail(res, 400, 'Fecha hasta inválida.');
        query.soldAt.$lt = end;
      }
    }
    if (req.query.q && String(req.query.q).trim()) {
      const re = new RegExp(escapeRegex(String(req.query.q).trim().slice(0, 80)), 'i');
      query.$or = [{ externalRef: re }, { 'lines.sku': re }, { 'lines.name': re }];
    }
    const [total, sales] = await Promise.all([
      Sale.countDocuments(query),
      Sale.find(query).sort({ soldAt: -1, _id: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ sales, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) { return errorResponse(err, res, 'listar ventas'); }
}

async function createSale(req, res) {
  const { items, paymentMethod } = req.body || {};
  const externalRef = req.body?.externalRef
    ? cleanRef(req.body.externalRef)
    : `POS-${randomUUID()}`.toUpperCase();
  if (!REF.test(externalRef) || !METHODS.includes(paymentMethod) || !Array.isArray(items) ||
      items.length < 1 || items.length > 30 ||
      items.some(item => !idOk(item?.productId) || !safeInt(item?.quantity, 1))) {
    return fail(res, 400, 'Venta inválida: referencia, producto, cantidad o medio de pago.');
  }
  if (new Set(items.map(item => String(item.productId))).size !== items.length) {
    return fail(res, 400, 'No repitas el mismo producto; agrupa su cantidad.');
  }
  const session = await mongoose.startSession();
  try {
    let sale;
    await session.withTransaction(async () => {
      const tenantId = req.user.tenantId;
      const now = new Date();
      const closed = await CashClosure.findOne({ tenantId, day: localDay(now) }).session(session);
      if (closed) throw httpError('El día ya tiene cierre de caja. No se permiten más ventas del día.', 409);
      const existing = await Sale.findOne({ tenantId, externalRef }).session(session);
      if (existing) throw httpError('Esta referencia ya tiene una venta. No se descontará stock nuevamente.', 409);
      const lines = [];
      let total = 0;
      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, tenantId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: false, session }
        );
        if (!product) throw httpError('Producto ajeno, inactivo o stock insuficiente.', 409);
        const subtotal = product.price * item.quantity;
        if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total + subtotal)) {
          throw httpError('El total excede el rango permitido.');
        }
        total += subtotal;
        lines.push({ productId: product._id, name: product.name, sku: product.sku,
          quantity: item.quantity, unitPrice: product.price, subtotal });
      }
      const docs = await Sale.create([{
        tenantId, createdBy: req.user._id, lines, total, paymentMethod,
        source: 'POS', externalRef, soldAt: now,
      }], { session });
      sale = docs[0];
    });
    return res.status(201).json({ sale, message: 'Venta registrada. Inventario actualizado.' });
  } catch (err) { return errorResponse(err, res, 'registrar venta'); }
  finally { await session.endSession(); }
}

async function listClosures(req, res) {
  try {
    const closures = await CashClosure.find({ tenantId: req.user.tenantId })
      .sort({ day: -1 }).limit(60).lean();
    return res.json({ closures });
  } catch (err) { return errorResponse(err, res, 'consultar cierres'); }
}

async function createClosure(req, res) {
  const { day, declaredCash, note = '' } = req.body || {};
  if (!localStart(day) || day !== localDay() || !safeInt(declaredCash) || !text(note, 0, 300)) {
    return fail(res, 400, 'Solo se permite cerrar la caja del día actual con monto declarado válido.');
  }
  const session = await mongoose.startSession();
  try {
    let closure;
    await session.withTransaction(async () => {
      const exists = await CashClosure.findOne({ tenantId: req.user.tenantId, day }).session(session);
      if (exists) throw httpError('La caja de hoy ya fue cerrada.', 409);
      const sales = await Sale.find({ tenantId: req.user.tenantId, source: { $ne: 'HISTORICAL' },
        $or: [
          { soldAt: { $gte: localStart(day), $lt: localEnd(day) } },
          { soldAt: { $exists: false }, createdAt: { $gte: localStart(day), $lt: localEnd(day) } },
        ] }).session(session).lean();
      const totals = { CASH: 0, TRANSFER: 0, CARD: 0, OTHER: 0 };
      for (const sale of sales) totals[sale.paymentMethod] += sale.total;
      if (!Object.values(totals).every(Number.isSafeInteger)) throw httpError('Total fuera de rango.');
      const created = await CashClosure.create([{
        tenantId: req.user.tenantId, createdBy: req.user._id, day,
        expectedCash: totals.CASH, declaredCash, difference: declaredCash - totals.CASH,
        salesCount: sales.length, totals, note: String(note).trim(),
      }], { session });
      closure = created[0];
    });
    return res.status(201).json({ closure });
  } catch (err) { return errorResponse(err, res, 'cerrar caja'); }
  finally { await session.endSession(); }
}

module.exports = { listProducts, createProduct, updateProduct, adjustStock,
  listSales, createSale, listClosures, createClosure };
