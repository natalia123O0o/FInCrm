'use strict';
const router = require('express').Router();
const protect = require('../../middlewares/auth.middleware');
const roles = require('../../middlewares/role.middleware');
const Plan = require('./plan.model');
const { MODULES, LIMITS } = require('./plan.catalog');
const { createPlan, updatePlan } = require('./plan.service');
const { sendError } = require('./plan.errors');
const catalog = { modules: MODULES, limits: LIMITS };
router.use(protect, roles('SUPER_ADMIN'));
router.get('/catalog', (req, res) => res.json(catalog));
router.get('/', async (req, res) => {
  try { return res.json({ plans: await Plan.find().sort({ monthlyPriceCOP: 1, name: 1 }).lean(), catalog }); }
  catch (error) { return sendError(res, error); }
});
router.post('/', async (req, res) => {
  try { return res.status(201).json({ message: 'Plan creado.', plan: await createPlan(req.user, req.body) }); }
  catch (error) { return sendError(res, error); }
});
router.patch('/:id', async (req, res) => {
  try { return res.json({ message: 'Catálogo actualizado. Las suscripciones existentes conservan su versión hasta reasignarlas.', plan: await updatePlan(req.user, req.params.id, req.body) }); }
  catch (error) { return sendError(res, error); }
});
router.delete('/:id', (req, res) => res.status(405).json({ code: 'DELETION_NOT_ALLOWED', message: 'Inactiva el plan para conservar su historial.' }));
module.exports = router;
