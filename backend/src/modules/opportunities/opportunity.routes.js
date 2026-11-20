const router = require('express').Router();
const protect = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const controller = require('./opportunity.controller');

router.use(protect);
router.get('/', authorizeRoles('ADMIN', 'USER'), controller.list);
router.post('/', authorizeRoles('ADMIN'), controller.create);
router.get('/:id', authorizeRoles('ADMIN', 'USER'), controller.getOne);
router.put('/:id', authorizeRoles('ADMIN'), controller.update);
router.post('/:id/encounters', authorizeRoles('ADMIN', 'USER'), controller.addEncounter);
router.post('/:id/recommend', authorizeRoles('ADMIN', 'USER'), controller.recommend);
router.post('/:id/decisions', authorizeRoles('ADMIN', 'USER'), controller.decision);
module.exports = router;
