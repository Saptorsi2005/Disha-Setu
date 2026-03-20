/**
 * src/controllers/incident-routing.controller.js
 * Handles incident-aware route requests and incident management.
 */
const incidentService = require('../services/incident-routing.service');

/**
 * GET /api/navigation/incident-route
 * Query: start_room_id, end_room_id, accessible (optional), building_id (optional)
 */
async function getIncidentAwareRoute(req, res, next) {
    try {
        const { start_room_id, end_room_id, accessible, building_id } = req.query;

        if (!start_room_id || !end_room_id) {
            return res.status(400).json({ error: 'start_room_id and end_room_id are required' });
        }

        const route = await incidentService.findIncidentAwareRoute(
            start_room_id,
            end_room_id,
            {
                accessibleOnly: accessible === 'true',
                buildingId: building_id || null,
            }
        );

        return res.json({
            success: true,
            ...route,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/navigation/incidents
 * Returns all active incidents. Optionally filter by building_id.
 */
async function getActiveIncidents(req, res, next) {
    try {
        const { building_id } = req.query;
        const incidents = await incidentService.getActiveIncidents(building_id || null);
        return res.json({ success: true, data: incidents });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/navigation/incidents
 * Create a new incident.
 * Body: { type, room_id, connection_id, message, severity }
 */
async function createIncident(req, res, next) {
    try {
        const { type, room_id, connection_id, message, severity } = req.body;
        if (!type || !message) {
            return res.status(400).json({ error: 'type and message are required' });
        }
        const incident = await incidentService.createIncident({ type, roomId: room_id, connectionId: connection_id, message, severity });
        return res.status(201).json({ success: true, data: incident });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/navigation/incidents/:id/resolve
 * Marks an incident as resolved.
 */
async function resolveIncident(req, res, next) {
    try {
        const { id } = req.params;
        const incident = await incidentService.resolveIncident(id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });
        return res.json({ success: true, data: incident });
    } catch (err) {
        next(err);
    }
}

module.exports = { getIncidentAwareRoute, getActiveIncidents, createIncident, resolveIncident };
