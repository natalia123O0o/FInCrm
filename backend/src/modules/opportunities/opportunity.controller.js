const mongoose = require('mongoose');
const Opportunity = require('./opportunity.model');
const Client = require('../clients/client.model');
const User = require('../users/user.model');
const { recommendOpportunity } = require('./opportunity.ai');
const { STAGES, ENCOUNTERS, OUTCOMES } = Opportunity;

const isId = value => typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
const clean = value => typeof value === 'string' ? value.trim() : '';
const allowed = req => ({
  tenantId: req.user.tenantId,
  ...(req.user.role === 'USER' ? { assignedTo: req.user._id } : {})
});
const populate = query => query.populate('clientId', 'name documentNumber')
  .populate('assignedTo', 'name email')
  .populate('createdBy', 'name');

function formData(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Datos inválidos' };
  const { title, description = '', clientId, assignedTo, stage = 'NEW', estimatedValue = 0, expectedCloseAt = null } = body;
  const value = Number(estimatedValue);
  if (!clean(title) || clean(title).length > 120 || typeof description !== 'string' || description.length > 1500)
    return { error: 'Título o descripción inválidos.' };
  if (!isId(clientId) || !isId(assignedTo) || !STAGES.includes(stage))
    return { error: 'Selecciona un cliente, empleado y etapa válidos.' };
  if (!Number.isFinite(value) || value < 0 || value > 1e15)
    return { error: 'El valor estimado debe ser un número positivo válido.' };
  let close = null;
  if (expectedCloseAt) {
    close = new Date(expectedCloseAt);
    if (Number.isNaN(close.getTime())) return { error: 'Fecha estimada de cierre inválida.' };
  }
  return { data: {
    title: clean(title), description: clean(description), clientId, assignedTo,
    stage, estimatedValue: value, expectedCloseAt: close
  } };
}

async function checkReferences(data, tenantId) {
  const [client, employee] = await Promise.all([
    Client.findOne({ _id: data.clientId, tenantId, isActive: true }).select('_id'),
    User.findOne({ ...require('../users/user.status').activeUserFilter(tenantId), _id: data.assignedTo, role: 'USER' }).select('_id')
  ]);
  return Boolean(client && employee);
}

async function list(req, res) {
  try {
    const opportunities = await populate(Opportunity.find(allowed(req))
      .select('-encounters -decisions').sort({ updatedAt: -1 }).limit(200));
    return res.json({ opportunities });
  } catch (error) {
    console.error('Listar oportunidades:', error.message);
    return res.status(500).json({ message: 'No se pudieron consultar las oportunidades.' });
  }
}

async function getOne(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' });
    const opportunity = await populate(Opportunity.findOne({ ...allowed(req), _id: req.params.id }))
      .populate('encounters.recordedBy', 'name')
      .populate('decisions.recordedBy', 'name');
    if (!opportunity) return res.status(404).json({ message: 'Oportunidad no encontrada.' });
    return res.json({ opportunity });
  } catch (error) {
    console.error('Detalle oportunidad:', error.message);
    return res.status(500).json({ message: 'No se pudo consultar la oportunidad.' });
  }
}

async function create(req, res) {
  try {
    const parsed = formData(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    if (!await checkReferences(parsed.data, req.user.tenantId))
      return res.status(404).json({ message: 'Cliente o empleado no disponible en tu empresa.' });
    const item = await Opportunity.create({ ...parsed.data, tenantId: req.user.tenantId, createdBy: req.user._id });
    const opportunity = await populate(Opportunity.findOne({ _id: item._id, tenantId: req.user.tenantId }));
    return res.status(201).json({ opportunity });
  } catch (error) {
    console.error('Crear oportunidad:', error.message);
    return res.status(500).json({ message: 'No se pudo crear la oportunidad.' });
  }
}

async function update(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' });
    const parsed = formData(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    if (!await checkReferences(parsed.data, req.user.tenantId))
      return res.status(404).json({ message: 'Cliente o empleado no disponible en tu empresa.' });
    const opportunity = await Opportunity.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: parsed.data }, { new: true, runValidators: true }
    );
    if (!opportunity) return res.status(404).json({ message: 'Oportunidad no encontrada.' });
    return res.json({ opportunity: await populate(Opportunity.findById(opportunity._id)) });
  } catch (error) {
    console.error('Editar oportunidad:', error.message);
    return res.status(500).json({ message: 'No se pudo actualizar la oportunidad.' });
  }
}

async function addEncounter(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' });
    const { type, outcome, summary, nextAction = '', happenedAt } = req.body ?? {};
    if (!ENCOUNTERS.includes(type) || !OUTCOMES.includes(outcome) || !clean(summary)
      || clean(summary).length > 2000 || typeof nextAction !== 'string' || nextAction.length > 500)
      return res.status(400).json({ message: 'Completa el tipo, resultado y resumen del encuentro.' });
    const date = happenedAt ? new Date(happenedAt) : new Date();
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86400000)
      return res.status(400).json({ message: 'Fecha del encuentro inválida.' });
    const opportunity = await Opportunity.findOneAndUpdate(
      { _id: req.params.id, ...allowed(req), 'encounters.199': { $exists: false } },
      { $push: { encounters: { type, outcome, summary: clean(summary), nextAction: clean(nextAction), happenedAt: date, recordedBy: req.user._id } } },
      { new: true, runValidators: true }
    );
    if (!opportunity) return res.status(404).json({ message: 'Oportunidad no disponible o historial lleno (máximo 199 encuentros).' });
    return res.status(201).json({ message: 'Encuentro registrado.', id: opportunity._id });
  } catch (error) {
    console.error('Registrar encuentro:', error.message);
    return res.status(500).json({ message: 'No se pudo registrar el encuentro.' });
  }
}

async function recommend(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' });
    const opportunity = await Opportunity.findOne({ ...allowed(req), _id: req.params.id });
    if (!opportunity) return res.status(404).json({ message: 'Oportunidad no encontrada.' });
    if (!opportunity.encounters.length) return res.status(400).json({ message: 'Registra al menos un encuentro antes de pedir una recomendación.' });
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ message: 'Gemini no está configurado.' });
    const { consumeQuota, requestQuota } = require('../subscriptions/usage.service');
    await consumeQuota(requestQuota(req, 'aiRequests', 'opportunities'));
    let recommendation;
    try { recommendation = await recommendOpportunity(opportunity); }
    catch (error) {
      console.error('Gemini oportunidades:', error.message);
      return res.status(error.code === 'NO_GEMINI_KEY' ? 503 : 502)
        .json({ message: error.code === 'NO_GEMINI_KEY' ? error.message : 'Gemini no está disponible en este momento. No se generó una recomendación.' });
    }
    await Opportunity.updateOne({ _id: opportunity._id, ...allowed(req) }, { $set: {
      recommendation: { text: recommendation, generatedAt: new Date(), generatedBy: req.user._id }
    } });
    return res.json({ recommendation });
  } catch (error) {
    const { respondAccessError } = require('../../middlewares/feature.middleware');
    if (respondAccessError(res, error)) return;
    console.error('Recomendar oportunidad:', error.message);
    return res.status(500).json({ message: 'No fue posible preparar la recomendación.' });
  }
}

async function decision(req, res) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' });
    const { action, reason } = req.body ?? {};
    if (!['ACCEPT', 'REJECT', 'POSTPONE'].includes(action) || !clean(reason) || clean(reason).length > 1000)
      return res.status(400).json({ message: 'Indica aceptar, rechazar o posponer y registra un motivo (máximo 1000 caracteres).' });
    const opportunity = await Opportunity.findOneAndUpdate(
      { _id: req.params.id, ...allowed(req), 'recommendation.text': { $ne: '' }, 'decisions.99': { $exists: false } },
      { $push: { decisions: { action, reason: clean(reason), recordedBy: req.user._id } } },
      { new: true, runValidators: true }
    );
    if (!opportunity) return res.status(404).json({ message: 'Oportunidad sin recomendación o límite de decisiones alcanzado.' });
    return res.status(201).json({ message: 'Decisión registrada para seguimiento.' });
  } catch (error) {
    console.error('Decisión oportunidad:', error.message);
    return res.status(500).json({ message: 'No se pudo guardar la decisión.' });
  }
}

module.exports = { list, getOne, create, update, addEncounter, recommend, decision };
