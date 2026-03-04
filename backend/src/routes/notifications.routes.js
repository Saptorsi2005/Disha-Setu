/**
 * src/routes/notifications.routes.js
 */
const router = require('express').Router();
const { getNotifications, markRead } = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/', requireAuth, getNotifications);
router.post('/read', requireAuth, markRead);

module.exports = router;
