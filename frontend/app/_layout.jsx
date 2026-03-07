/**
 * app/_layout.jsx
 * Root layout — wraps app in AuthProvider, connects Socket.io
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useEffect } from 'react';
import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider } from '../context/AuthContext';
import { connectSocket } from '../services/socketService';
import '../global.css';

export const unstable_settings = {
  initialRouteName: 'index',
};

function AppShell() {
  const { isDark } = useColorScheme();

  useEffect(() => {
    // Connect Socket.io when app loads
    connectSocket().catch(err => console.warn('[Layout] Socket connect error:', err.message));
  }, []);

  return (
    <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0A0E1A' : '#FAFAFA'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="feedback" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="updates" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="analytics" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
