/**
 * src/routes/analytics.routes.js
 */
const router = require('express').Router();
const { getDistrictAnalytics } = require('../controllers/analytics.controller');

router.get('/district', getDistrictAnalytics);

module.exports = router;
