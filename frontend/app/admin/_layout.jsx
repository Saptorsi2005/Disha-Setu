/**
 * app/admin/_layout.jsx
 * Layout for admin section
 */
import { Stack } from 'expo-router';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function AdminLayout() {
    const { isDark } = useColorScheme();
    
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: {
                    backgroundColor: isDark ? '#0A0E1A' : '#FAFAFA',
                },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="feedback" />
            <Stack.Screen name="analytics" />
            <Stack.Screen name="navigation" />
        </Stack>
    );
}
