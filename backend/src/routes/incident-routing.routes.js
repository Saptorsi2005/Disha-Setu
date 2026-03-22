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

// Toggle active state
router.patch('/navigation/incidents/:id/toggle', ctrl.toggleIncident);

// Delete an incident
router.delete('/navigation/incidents/:id', ctrl.deleteIncident);

// GET ALL incidents (active and inactive, for Admin)
router.get('/navigation/incidents/all', ctrl.getAllIncidents);

module.exports = router;
