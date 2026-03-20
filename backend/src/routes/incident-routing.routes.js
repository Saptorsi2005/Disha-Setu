/**
 * src/routes/incident-routing.routes.js
 * Routes for incident-aware navigation.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/incident-routing.controller');

// Incident-aware route calculation
router.get('/navigation/incident-route', ctrl.getIncidentAwareRoute);

// Active incidents list
router.get('/navigation/incidents', ctrl.getActiveIncidents);

// Create a new incident
router.post('/navigation/incidents', ctrl.createIncident);

// Resolve / deactivate an incident
router.patch('/navigation/incidents/:id/resolve', ctrl.resolveIncident);

module.exports = router;
