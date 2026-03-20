/**
 * src/controllers/room-insights.controller.js
 */
const roomInsightsService = require('../services/room-insights.service');

/**
 * Get insights for a room or building
 * GET /api/navigation/room-insights?room_id=xxx&building_id=yyy
 */
async function getInsights(req, res) {
    try {
        const { room_id, building_id } = req.query;
        
        if (room_id) {
            const insights = await roomInsightsService.getInsightsByRoom(room_id);
            return res.json({ success: true, data: insights });
        }
        
        if (building_id) {
            const groupedInsights = await roomInsightsService.getInsightsByBuilding(building_id);
            return res.json({ success: true, data: groupedInsights });
        }
        
        return res.status(400).json({ success: false, error: 'Either room_id or building_id is required' });
    } catch (err) {
        console.error('[RoomInsightsController]', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch insights' });
    }
}

module.exports = {
    getInsights
};
