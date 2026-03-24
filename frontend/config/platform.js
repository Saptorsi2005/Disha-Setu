/**
 * config/platform.js
 * Platform-specific configuration and utilities
 * Ensures compatibility across Web and Expo Go
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Platform detection utilities
 */
export const IS_WEB = Platform.OS === 'web';
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
export const IS_NATIVE = IS_IOS || IS_ANDROID;

/**
 * Environment configuration
 */
const BACKEND_PORT = parseInt(process.env.EXPO_PUBLIC_BACKEND_PORT) || 3000;

// Auto-detect the backend host from Expo's Metro bundler host
// (e.g. "192.168.x.x:8081" → "192.168.x.x"), so no manual IP changes needed
const getAutoHost = () => {
  if (Platform.OS === 'web') return 'localhost';
  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;
  return expoHost ? expoHost.split(':')[0] : 'localhost';
};

const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (!__DEV__) {
    console.warn("⚠️ API URL missing in production, using fallback");
    return "https://disha-setu.onrender.com/api";
  }

  return `http://${getAutoHost()}:${BACKEND_PORT}/api`;
};

const getSocketUrl = () => {
  const base = process.env.EXPO_PUBLIC_API_URL;

  if (base) return base.replace(/\/api\/?$/, '');

  if (!__DEV__) {
    return "https://disha-setu.onrender.com";
  }

  return `http://${getAutoHost()}:${BACKEND_PORT}`;
};

export const config = {
  // API endpoints
  API_BASE_URL: getApiBaseUrl(),
  SOCKET_URL: getSocketUrl(),

  // Storage configuration
  storage: {
    // Expo Go doesn't support AsyncStorage encryption
    // Web uses IndexedDB/localStorage bridge
    useEncryption: false,

    // Keys
    TOKEN_KEY: 'auth_token',
    USER_KEY: 'auth_user',
  },

  // Socket.io configuration
  socket: {
    // Longer timeout for mobile due to AsyncStorage initialization
    connectionTimeout: IS_WEB ? 10000 : 20000,

    // Delay socket connection on mobile
    initializationDelay: IS_WEB ? 0 : 500,

    // Enable/disable features based on platform
    enableAutoReconnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  },

  // Authentication configuration
  auth: {
    // Google OAuth configuration pulled from environment variables
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,

    // OAuth redirect URIs (Dynamic for Web in production)
    redirectUri: IS_WEB ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081') : undefined,

    // Token expiration
    tokenExpiryHours: 720, // 30 days
  },

  // Feature flags
  features: {
    // All features supported on all platforms
    enablePushNotifications: true,
    enableGeolocation: true,
    enableImagePicker: true,
    enableGoogleAuth: true,
    enableOTPAuth: true,
    enableGuestAuth: true,

    // Socket.io features (graceful degradation if connection fails)
    enableRealtimeUpdates: true,
    enableGeofencing: true,
  },
};

/**
 * Get platform-specific storage engine
 * (Currently AsyncStorage works on all platforms)
 */
export function getStorageEngine() {
  return '@react-native-async-storage/async-storage';
}

/**
 * Platform-specific initialization tasks
 */
export async function initializePlatform() {
  if (IS_NATIVE) {
    console.log('[Platform] Initializing native platform...');
    // Add any native-specific initialization here

    // Wait for AsyncStorage to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  } else {
    console.log('[Platform] Initializing web platform...');
    // Add any web-specific initialization here
  }
}

/**
 * Get appropriate keyboard behavior for platform
 */
export function getKeyboardBehavior() {
  return IS_IOS ? 'padding' : 'height';
}

/**
 * Check if feature is available on current platform
 */
export function isFeatureAvailable(featureName) {
  return config.features[featureName] ?? false;
}

export default config;
