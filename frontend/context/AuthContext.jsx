/**
 * context/AuthContext.jsx
 * Global auth state — token, user, login/logout
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, clearAuth, saveUser } from '../services/authService';

import { registerForPushNotificationsAsync } from '../services/notificationService';

import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore user from storage on app start
    useEffect(() => {
        getUser().then(u => {
            setUser(u);
            setLoading(false);
            if (u) {
                // Register for push if already logged in
                registerForPushNotificationsAsync().catch(console.error);
            }
        });
    }, []);

    const login = async (userData) => {
        setUser(userData);
        // Persist to AsyncStorage to ensure avatar and other data is saved
        await saveUser(userData);
        // Register token
        registerForPushNotificationsAsync().catch(console.error);
    };

    const logout = async () => {
        try {
            // 🔥 Clear Google session
            if (Platform.OS === 'android') {
                try {
                    // This forces the account picker to appear next time
                    await GoogleSignin.revokeAccess();
                } catch (e) {
                    console.log("Google revokeAccess skipped/failed:", e);
                }

                try {
                    // This clears the current session
                    await GoogleSignin.signOut();
                } catch (e) {
                    console.log("Google signOut skipped/failed:", e);
                }
            }

            // Clear app auth
            await clearAuth();
            setUser(null);

        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

