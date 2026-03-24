/**
 * services/api.js
 * Base HTTP client — all API calls go through here
 * Expo Go compatible with automatic host detection
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BACKEND_PORT = parseInt(process.env.EXPO_PUBLIC_BACKEND_PORT) || 3000;

/**
 * Automatically resolve the backend URL:
 * 1. If EXPO_PUBLIC_API_URL is set (e.g. in .env for production), use it.
 * 2. On web: use localhost.
 * 3. On Android/iOS in Expo Go: extract the host IP from Expo's debugger host
 *    (e.g. "192.168.31.95:8081" → "http://192.168.31.95:3000/api").
 *    This works automatically for every developer on any Wi-Fi network.
 */
const getBaseUrl = () => {
    // 1. Production / env override
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. Production safety fallback
    if (!__DEV__) {
        console.warn("[API] ⚠️ Missing EXPO_PUBLIC_API_URL in production. Using default backend.");
        return "https://disha-setu.onrender.com/api";
    }

    // 3. Development (Expo Go)
    if (Platform.OS === 'web') {
        return `http://localhost:${BACKEND_PORT}/api`;
    }

    const expoHost =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.manifest?.debuggerHost;

    if (expoHost) {
        const ip = expoHost.split(':')[0];
        return `http://${ip}:${BACKEND_PORT}/api`;
    }

    // LAST fallback (dev only)
    return `http://localhost:${BACKEND_PORT}/api`;
};

export const BASE_URL = getBaseUrl();
console.log(`[API] Base URL initialized as: ${BASE_URL}`);

/**
 * Authenticated fetch wrapper.
 * Automatically attaches Bearer token if stored.
 */
export const apiFetch = async (path, options = {}) => {
    try {
        const token = await AsyncStorage.getItem('auth_token').catch(() => null);

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
        });

        const textResponse = await response.text();
        let data;
        try {
            data = textResponse ? JSON.parse(textResponse) : {};
        } catch (e) {
            data = { error: textResponse || `Request failed: ${response.status}` };
        }

        if (!response.ok) {
            throw new Error(data.error || `Request failed: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`[API] ${path} error:`, error.message);
        throw error;
    }
};

/**
 * Multipart form upload (for feedback photos)
 */
export const apiUpload = async (path, formData) => {
    try {
        const token = await AsyncStorage.getItem('auth_token').catch(() => null);

        const response = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });

        const textResponse = await response.text();
        let data;
        try {
            data = textResponse ? JSON.parse(textResponse) : {};
        } catch (e) {
            data = { error: textResponse || `Upload failed: ${response.status}` };
        }

        if (!response.ok) throw new Error(data.error || `Upload failed: ${response.status}`);
        return data;
    } catch (error) {
        console.error(`[API Upload] ${path} error:`, error.message);
        throw error;
    }
};
