import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const TABS = [
    { name: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { name: 'search', label: 'Search', icon: 'search', iconOutline: 'search-outline' },
    { name: 'notifications', label: 'Alerts', icon: 'notifications', iconOutline: 'notifications-outline' },
    { name: 'activity', label: 'Activity', icon: 'list', iconOutline: 'list-outline' },
    { name: 'settings', label: 'Settings', icon: 'settings', iconOutline: 'settings-outline' },
];

function CustomTabBar({ state, descriptors, navigation }) {
    return (
        <View style={styles.container}>
            <View style={styles.bar}>
                {state.routes.map((route, index) => {
                    const tab = TABS.find(t => t.name === route.name) || TABS[0];
                    const focused = state.index === index;
                    return (
                        <TouchableOpacity
                            key={route.key}
                            style={styles.tab}
                            onPress={() => navigation.navigate(route.name)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                                <Ionicons
                                    name={focused ? tab.icon : tab.iconOutline}
                                    size={22}
                                    color={focused ? '#00D4AA' : '#4B5563'}
                                />
                            </View>
                            <Text style={[styles.label, focused && styles.labelActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0A0E1A',
        paddingBottom: 8,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
    },
    bar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 8,
    },
    tab: {
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    iconContainerActive: {
        backgroundColor: '#00D4AA20',
    },
    label: {
        fontSize: 10,
        color: '#4B5563',
        fontWeight: '500',
    },
    labelActive: {
        color: '#00D4AA',
        fontWeight: '700',
    },
});

export default function TabLayout() {
    return (
        <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="home" />
            <Tabs.Screen name="search" />
            <Tabs.Screen name="notifications" />
            <Tabs.Screen name="activity" />
            <Tabs.Screen name="settings" />
        </Tabs>
    );
}
