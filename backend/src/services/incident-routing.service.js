/**
 * src/services/incident-routing.service.js
 * Incident-aware routing using composition over modification.
 *
 * DESIGN: This service wraps the existing indoor-navigation service.
 * It does NOT modify Dijkstra or existing graph logic.
 * Instead, it:
 *   1. Fetches active incidents
 *   2. Filters affected rooms/connections from the graph
 *   3. Calls the existing findRoute() with the filtered graph overlay
 *   4. Returns route + incident metadata
 */
const { query } = require('../config/db');

// Simple in-memory cache (TTL: 30 seconds)
let incidentCache = null;
let incidentCacheTime = 0;
const CACHE_TTL_MS = 30000;

/**
 * Fetch all active incidents (with caching)
 */
async function getActiveIncidents(buildingId = null) {
    const now = Date.now();
    if (incidentCache && (now - incidentCacheTime) < CACHE_TTL_MS) {
        return incidentCache;
    }

    let sql = `
        SELECT ni.*, r.name AS room_name, r.type AS room_type
        FROM navigation_incidents ni
        LEFT JOIN rooms r ON ni.room_id = r.id
        WHERE ni.is_active = true
    `;
    const params = [];

    if (buildingId) {
        sql += `
            AND (ni.room_id IS NULL OR ni.room_id IN (
                SELECT r2.id FROM rooms r2
                JOIN floors f ON r2.floor_id = f.id
                WHERE f.building_id = $1
            ))
        `;
        params.push(buildingId);
    }

    sql += ' ORDER BY ni.severity DESC, ni.created_at DESC';

    const result = await query(sql, params);
    incidentCache = result.rows;
    incidentCacheTime = now;
    return result.rows;
}

/** Invalidate the cache (e.g., after creating/updating an incident) */
function invalidateCache() {
    incidentCache = null;
    incidentCacheTime = 0;
}

/**
 * Build an incident-filtered graph overlay.
 * Fetches all connections, then removes edges blocked by incidents.
 * Does NOT mutate any existing tables or logic.
 */
async function buildFilteredGraph(blockedRoomIds, blockedConnectionIds, accessibleOnly = false) {
    const graph = {};

    const result = await query(
        `SELECT id, from_room, to_room, distance, is_bidirectional, is_accessible
         FROM connections`
    );

    for (const conn of result.rows) {
        const fromId = conn.from_room;
        const toId   = conn.to_room;

        // Skip if either endpoint is blocked
        if (blockedRoomIds.has(fromId) || blockedRoomIds.has(toId)) continue;

        // Skip if this specific connection is blocked
        if (blockedConnectionIds.has(conn.id)) continue;

        const distance   = parseFloat(conn.distance);
        const accessible = conn.is_accessible;

        if (!graph[fromId]) graph[fromId] = [];
        if (!graph[toId])   graph[toId]   = [];

        if (!accessibleOnly || accessible) {
            graph[fromId].push({ id: toId, distance, accessible });
        }
        if (conn.is_bidirectional && (!accessibleOnly || accessible)) {
            graph[toId].push({ id: fromId, distance, accessible });
        }
    }

    return graph;
}

/**
 * Main incident-aware route finder.
 * Composition pattern: augments existing routing without modifying it.
 *
 * @param {string} fromRoomId
 * @param {string} toRoomId
 * @param {Object} options - { accessibleOnly, buildingId }
 */
async function findIncidentAwareRoute(fromRoomId, toRoomId, options = {}) {
    const { accessibleOnly = false, buildingId = null } = options;

    // Pull active incidents
    let incidents = [];
    try {
        incidents = await getActiveIncidents(buildingId);
    } catch (err) {
        console.warn('[IncidentRouting] Could not fetch incidents, falling back to normal route:', err.message);
        // Fallback: use normal routing
        const { findRoute } = require('./indoor-navigation.service');
        const route = await findRoute(fromRoomId, toRoomId, { accessibleOnly });
        return { ...route, adjusted: false, incidents: [] };
    }

    // Separate affected rooms and connections
    const blockedRoomIds       = new Set();
    const blockedConnectionIds = new Set();
    const activeIncidentSummary = [];

    for (const inc of incidents) {
        if (inc.room_id)       blockedRoomIds.add(inc.room_id);
        if (inc.connection_id) blockedConnectionIds.add(inc.connection_id);

        activeIncidentSummary.push({
            id:       inc.id,
            type:     inc.type,
            message:  inc.message,
            severity: inc.severity,
            roomName: inc.room_name || null,
        });
    }

    const wasAdjusted = blockedRoomIds.size > 0 || blockedConnectionIds.size > 0;

    // Build filtered graph (existing rooms/connections minus blocked ones)
    const filteredGraph = await buildFilteredGraph(blockedRoomIds, blockedConnectionIds, accessibleOnly);

    // Use the raw dijkstra + getRoomDetails from the existing service
    // by re-building graph with our filter — we call generateDirections from existing service
    const { dijkstra, generateDirections, getRoomDetails } = require('./indoor-navigation.service');

    // Ensure start/end nodes exist in graph (may have been added as leaf nodes only)
    if (!filteredGraph[fromRoomId]) filteredGraph[fromRoomId] = [];
    if (!filteredGraph[toRoomId])   filteredGraph[toRoomId]   = [];

    const result = dijkstra(filteredGraph, fromRoomId, toRoomId, accessibleOnly);

    if (!result.found) {
        // Fallback: try the unfiltered route so user is never stranded
        const { findRoute } = require('./indoor-navigation.service');
        const fallbackRoute = await findRoute(fromRoomId, toRoomId, { accessibleOnly });
        return {
            ...fallbackRoute,
            adjusted: false,
            fallback: true,
            incidents: activeIncidentSummary,
            note: 'Incident-aware route not found; using standard route as fallback.',
        };
    }

    const directions = await generateDirections(result.path);

    return {
        found:       true,
        path:        result.path,
        distance:    result.distance,
        directions,
        adjusted:    wasAdjusted,
        incidents:   activeIncidentSummary,
    };
}

/**
 * Create a new incident (admin-facing helper).
 */
async function createIncident({ type, roomId, connectionId, message, severity }) {
    const result = await query(
        `INSERT INTO navigation_incidents (type, room_id, connection_id, message, severity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [type, roomId || null, connectionId || null, message, severity || 'medium']
    );
    invalidateCache();
    return result.rows[0];
}

/**
 * Deactivate an incident by ID.
 */
async function resolveIncident(id) {
    const result = await query(
        `UPDATE navigation_incidents SET is_active = false WHERE id = $1 RETURNING *`,
        [id]
    );
    invalidateCache();
    return result.rows[0];
}

module.exports = {
    findIncidentAwareRoute,
    getActiveIncidents,
    createIncident,
    resolveIncident,
    invalidateCache,
};
