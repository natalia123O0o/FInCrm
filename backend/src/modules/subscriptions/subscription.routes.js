'use strict';
const router = require('express').Router();
const protect = require('../../middlewares/auth.middleware');
const roles = require('../../middlewares/role.middleware');
const User = require('../users/user.model');
const { activeUserFilter } = require('../users/user.status');
const { readUsage } = require('./usage.service');
router.get('/', protect, roles('ADMIN', 'USER'), async (req, res, next) => {
  try {
    const [usage, activeUsers] = await Promise.all([
      readUsage(req.user.tenantId), User.countDocuments(activeUserFilter(req.user.tenantId)),
    ]);
    res.json({ subscription: req.tenant.subscription || null, activeUsers, usage,
      tenant: { id: req.tenant._id, name: req.tenant.name, status: req.tenant.status,
        managementVersion: req.tenant.managementVersion || 0 } });
  } catch (error) { next(error); }
});
module.exports = router;
