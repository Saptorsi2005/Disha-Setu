/**
 * src/routes/feedback.routes.js
 */
const router = require('express').Router();
const { submitFeedback, getUserFeedback, getFeedbackByTicket } = require('../controllers/feedback.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/', optionalAuth, upload.single('photo'), submitFeedback);
router.get('/user', requireAuth, getUserFeedback);
router.get('/ticket/:ticketId', optionalAuth, getFeedbackByTicket);

module.exports = router;
