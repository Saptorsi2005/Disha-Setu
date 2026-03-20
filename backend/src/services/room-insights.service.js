/**
 * src/services/room-insights.service.js
 * Service for fetching context-aware room insights
 */
const { query } = require('../config/db');

/**
 * Get insights for a specific room
 * @param {string} roomId 
 * @returns {Array} List of insights
 */
async function getInsightsByRoom(roomId) {
    const result = await query(
        `SELECT id, title, description, type, created_at
         FROM room_insights
         WHERE room_id = $1
         ORDER BY created_at DESC`,
        [roomId]
    );
    
    return result.rows;
}

/**
 * Get insights for a building (useful for caching)
 * @param {string} buildingId 
 * @returns {Object} { roomId: [insights] }
 */
async function getInsightsByBuilding(buildingId) {
    const result = await query(
        `SELECT ri.room_id, ri.title, ri.description, ri.type, ri.created_at
         FROM room_insights ri
         JOIN rooms r ON ri.room_id = r.id
         JOIN floors f ON r.floor_id = f.id
         WHERE f.building_id = $1
         ORDER BY ri.created_at DESC`,
        [buildingId]
    );
    
    // Group by room_id
    const grouped = {};
    result.rows.forEach(row => {
        if (!grouped[row.room_id]) grouped[row.room_id] = [];
        grouped[row.room_id].push({
            title: row.title,
            description: row.description,
            type: row.type,
            created_at: row.created_at
        });
    });
    
    return grouped;
}

module.exports = {
    getInsightsByRoom,
    getInsightsByBuilding
};
