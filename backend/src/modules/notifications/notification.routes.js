'use strict';
const router = require('express').Router();
const protect = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');
const { listNotifications, markRead, markAllRead } = require('./notification.controller');

router.use(protect, authorizeRoles('USER'));
router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
module.exports = router;
