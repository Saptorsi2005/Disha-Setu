/**
 * app/admin/index.jsx
 * Admin Dashboard Home - Overview page with stats
 */
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../services/adminService';

function StatCard({ title, value, icon, color, onPress }) {
    const { isDark } = useColorScheme();
    
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
            style={{ elevation: 2 }}
        >
            <View className="flex-row items-center justify-between mb-2">
                <Text className={`text-3xl ${color}`}>{icon}</Text>
            </View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {value}
            </Text>
            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const loadStats = useCallback(async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    
    useEffect(() => {
        // Check if user is admin
        if (user?.role !== 'admin') {
            router.replace('/');
            return;
        }
        
        loadStats();
    }, [user]);
    
    const onRefresh = () => {
        setRefreshing(true);
        loadStats();
    };
    
    if (loading) {
        return (
            <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} items-center justify-center`}>
                <Text className={isDark ? 'text-white' : 'text-gray-900'}>Loading...</Text>
            </View>
        );
    }
    
    return (
        <ScrollView
            className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View className="p-6">
                <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Admin Dashboard
                </Text>
                <Text className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    Welcome back, {user?.name || 'Admin'}
                </Text>
            </View>
            
            {/* Stats Grid */}
            <View className="px-6 pb-6">
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                        <StatCard
                            title="Total Feedback"
                            value={stats?.stats?.totalFeedback || 0}
                            icon="📝"
                            color="text-blue-500"
                            onPress={() => router.push('/admin/feedback')}
                        />
                    </View>
                    <View className="flex-1">
                        <StatCard
                            title="Total Projects"
                            value={stats?.stats?.totalProjects || 0}
                            icon="🏗️"
                            color="text-green-500"
                        />
                    </View>
                </View>
                
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                        <StatCard
                            title="Buildings"
                            value={stats?.stats?.totalBuildings || 0}
                            icon="🏢"
                            color="text-purple-500"
                            onPress={() => router.push('/admin/navigation')}
                        />
                    </View>
                    <View className="flex-1">
                        <StatCard
                            title="Navigation Nodes"
                            value={stats?.stats?.totalRooms || 0}
                            icon="📍"
                            color="text-orange-500"
                            onPress={() => router.push('/admin/navigation')}
                        />
                    </View>
                </View>
            </View>
            
            {/* Quick Actions */}
            <View className="px-6 pb-6">
                <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                    Quick Actions
                </Text>
                
                <TouchableOpacity
                    onPress={() => router.push('/admin/feedback')}
                    className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-3`}
                    style={{ elevation: 2 }}
                >
                    <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">💬</Text>
                        <View className="flex-1">
                            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Manage Feedback
                            </Text>
                            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                View and respond to citizen feedback
                            </Text>
                        </View>
                        <Text className={`text-2xl ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>›</Text>
                    </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                    onPress={() => router.push('/admin/analytics')}
                    className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-3`}
                    style={{ elevation: 2 }}
                >
                    <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">📊</Text>
                        <View className="flex-1">
                            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                View Analytics
                            </Text>
                            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Complaint trends and insights
                            </Text>
                        </View>
                        <Text className={`text-2xl ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>›</Text>
                    </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                    onPress={() => router.push('/admin/navigation')}
                    className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                    style={{ elevation: 2 }}
                >
                    <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">🗺️</Text>
                        <View className="flex-1">
                            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Indoor Navigation
                            </Text>
                            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Manage buildings, rooms, and connections
                            </Text>
                        </View>
                        <Text className={`text-2xl ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>›</Text>
                    </View>
                </TouchableOpacity>
            </View>
            
            {/* Recent Activity */}
            {stats?.recentActivity && stats.recentActivity.length > 0 && (
                <View className="px-6 pb-6">
                    <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                        Recent Feedback
                    </Text>
                    {stats.recentActivity.slice(0, 5).map((item) => (
                        <View
                            key={item.id}
                            className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-2`}
                            style={{ elevation: 1 }}
                        >
                            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {item.ticket_id}
                            </Text>
                            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.category} • {item.status}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
