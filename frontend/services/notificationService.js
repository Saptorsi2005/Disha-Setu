/**
 * services/notificationService.js
 * Notification API calls
 */
import { apiFetch } from './api';

export const fetchNotifications = async (limit = 30) => {
    const data = await apiFetch(`/notifications?limit=${limit}`);
    return {
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
    };
};

export const markNotificationsRead = async (ids = []) => {
    return apiFetch('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
};
