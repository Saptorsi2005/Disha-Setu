/**
 * src/utils/expoPush.js
 * Expo Push Notification helper
 */
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send push notifications to a list of Expo push tokens
 * @param {Array<{token: string, title: string, body: string, data?: object}>} messages
 */
const sendPushNotifications = async (messages) => {
    const validMessages = messages
        .filter(msg => Expo.isExpoPushToken(msg.token))
        .map(msg => ({
            to: msg.token,
            sound: 'default',
            title: msg.title,
            body: msg.body,
            data: msg.data || {},
            badge: 1,
        }));

    if (validMessages.length === 0) return;

    const chunks = expo.chunkPushNotifications(validMessages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (err) {
            console.error('[Push] Error sending chunk:', err.message);
        }
    }

    return tickets;
};

module.exports = { expo, sendPushNotifications };
