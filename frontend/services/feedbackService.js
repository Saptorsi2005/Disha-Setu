/**
 * services/feedbackService.js
 * Feedback submission and retrieval
 */
import { apiFetch, apiUpload, BASE_URL } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Submit a feedback report.
 * @param {object} params
 * @param {string} params.project_id
 * @param {string} params.category
 * @param {string} params.description
 * @param {object|null} params.photo  — { uri, name, type } from image picker
 */
export const submitFeedback = async ({ project_id, category, description, photo }) => {
    if (photo) {
        // Use multipart form for photo upload
        const formData = new FormData();
        formData.append('project_id', project_id);
        formData.append('category', category);
        formData.append('description', description);
        formData.append('photo', {
            uri: photo.uri,
            name: photo.name || 'report.jpg',
            type: photo.type || 'image/jpeg',
        });
        return apiUpload('/feedback', formData);
    }

    // JSON-only path (no photo)
    return apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({ project_id, category, description }),
    });
};

export const fetchUserFeedback = async () => {
    const data = await apiFetch('/feedback/user');
    return data.reports || [];
};

export const fetchTicketStatus = async (ticketId) => {
    const data = await apiFetch(`/feedback/ticket/${ticketId}`);
    return data.report;
};
