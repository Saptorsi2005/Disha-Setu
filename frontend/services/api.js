/**
 * services/api.js
 * Base HTTP client — all API calls go through here
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://localhost:3000/api';

/**
 * Authenticated fetch wrapper.
 * Automatically attaches Bearer token if stored.
 */
export const apiFetch = async (path, options = {}) => {
    const token = await AsyncStorage.getItem('auth_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
};

/**
 * Multipart form upload (for feedback photos)
 */
export const apiUpload = async (path, formData) => {
    const token = await AsyncStorage.getItem('auth_token');

    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Upload failed: ${response.status}`);
    return data;
};
