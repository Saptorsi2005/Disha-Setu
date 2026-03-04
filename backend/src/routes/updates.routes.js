/**
 * src/routes/updates.routes.js
 */
const router = require('express').Router({ mergeParams: true });
const { getProjectUpdates, addProjectUpdate } = require('../controllers/updates.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');

// These are mounted at /api/projects/:id — mergeParams captures :id
router.get('/', optionalAuth, getProjectUpdates);
router.post('/', requireAuth, addProjectUpdate);

module.exports = router;
