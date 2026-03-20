/**
 * src/routes/room-insights.routes.js
 */
const express = require('express');
const router = express.Router();
const roomInsightsController = require('../controllers/room-insights.controller');

// GET /api/navigation/room-insights?room_id=xxx
router.get('/navigation/room-insights', roomInsightsController.getInsights);

module.exports = router;
