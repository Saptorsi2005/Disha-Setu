/**
 * src/services/notifications.service.js
 * Create, store, and push notifications to users
 */
const { query } = require('../config/db');
const { sendPushNotifications } = require('../utils/expoPush');

/**
 * Create a notification record for a user and push to device
 */
const createNotification = async ({ userId, projectId, type, title, message }) => {
    // Store in DB
    const result = await query(
        `INSERT INTO notifications (user_id, project_id, type, title, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, projectId || null, type, title, message]
    );

    // Get user's push tokens
    const tokenResult = await query(
        `SELECT token FROM push_tokens WHERE user_id = $1`,
        [userId]
    );

    if (tokenResult.rows.length > 0) {
        const pushMessages = tokenResult.rows.map(row => ({
            token: row.token,
            title,
            body: message,
            data: { notificationId: result.rows[0].id, projectId, type },
        }));
        await sendPushNotifications(pushMessages);
    }

    return result.rows[0].id;
};

/**
 * Broadcast a notification to all users who have a push token
 * (used for new project alerts nearby)
 */
const broadcastToUsers = async (userIds, payload) => {
    for (const userId of userIds) {
        await createNotification({ userId, ...payload });
    }
};

module.exports = { createNotification, broadcastToUsers };
