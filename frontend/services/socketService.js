/**
 * services/socketService.js
 * Socket.io client for DishaSetu real-time events
 * Uses socket.io-client
 */
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://localhost:3000';

let socket = null;

export const connectSocket = async () => {
    if (socket?.connected) return socket;

    const token = await AsyncStorage.getItem('auth_token');

    socket = io(SOCKET_URL, {
        auth: token ? { token } : {},
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const subscribeToProject = (projectId) => {
    if (socket?.connected) {
        socket.emit('subscribe_project', projectId);
    }
};

export const unsubscribeFromProject = (projectId) => {
    if (socket?.connected) {
        socket.emit('unsubscribe_project', projectId);
    }
};

export const emitLocation = (lat, lng) => {
    if (socket?.connected) {
        socket.emit('update_location', { lat, lng });
    }
};

export const onProjectUpdate = (callback) => {
    socket?.on('project_update', callback);
    return () => socket?.off('project_update', callback);
};

export const onNewNotification = (callback) => {
    socket?.on('new_notification', callback);
    return () => socket?.off('new_notification', callback);
};

export const onGeoAlert = (callback) => {
    socket?.on('geo_alert', callback);
    return () => socket?.off('geo_alert', callback);
};
