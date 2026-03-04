/**
 * context/AuthContext.jsx
 * Global auth state — token, user, login/logout
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, clearAuth } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore user from storage on app start
    useEffect(() => {
        getUser().then(u => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    const login = (userData) => setUser(userData);

    const logout = async () => {
        await clearAuth();
        setUser(null);
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
