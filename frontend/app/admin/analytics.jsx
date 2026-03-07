/**
 * app/admin/analytics.jsx
 * Admin Analytics - Feedback trends and insights
 */
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getFeedbackAnalytics } from '../../services/adminService';
import { TouchableOpacity } from 'react-native';

function AnalyticsCard({ title, children }) {
    const { isDark } = useColorScheme();
    
    return (
        <View className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-4`}>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-3`}>
                {title}
            </Text>
            {children}
        </View>
    );
}

function DataRow({ label, value, color = 'text-blue-500' }) {
    const { isDark } = useColorScheme();
    
    return (
        <View className="flex-row items-center justify-between py-2 border-b border-gray-700/30">
            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`} numberOfLines={1}>
                {label}
            </Text>
            <Text className={`font-bold ${color} ml-2`}>
                {value}
            </Text>
        </View>
    );
}

export default function AdminAnalytics() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const loadAnalytics = useCallback(async () => {
        try {
            const data = await getFeedbackAnalytics();
            setAnalytics(data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    
    useEffect(() => {
        if (user?.role !== 'admin') {
            router.replace('/');
            return;
        }
        
        loadAnalytics();
    }, [user]);
    
    const onRefresh = () => {
        setRefreshing(true);
        loadAnalytics();
    };
    
    if (loading) {
        return (
            <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} items-center justify-center`}>
                <Text className={isDark ? 'text-white' : 'text-gray-900'}>Loading analytics...</Text>
            </View>
        );
    }
    
    return (
        <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <View className={`p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Text className="text-blue-500 text-base">← Back to Dashboard</Text>
                </TouchableOpacity>
                
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Complaint Analytics
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    Insights and trends
                </Text>
            </View>
            
            <ScrollView
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Category Breakdown */}
                <AnalyticsCard title="📊 Complaint Categories">
                    {analytics?.categoryBreakdown?.length > 0 ? (
                        analytics.categoryBreakdown.map((item, index) => (
                            <DataRow
                                key={index}
                                label={item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                value={item.count}
                                color="text-purple-500"
                            />
                        ))
                    ) : (
                        <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            No data available
                        </Text>
                    )}
                </AnalyticsCard>
                
                {/* Top Reported Projects */}
                <AnalyticsCard title="🎯 Most Reported Locations">
                    {analytics?.topProjects?.length > 0 ? (
                        analytics.topProjects.map((item, index) => (
                            <DataRow
                                key={index}
                                label={`${item.area} - ${item.district}`}
                                value={`${item.complaint_count} reports`}
                                color="text-red-500"
                            />
                        ))
                    ) : (
                        <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            No data available
                        </Text>
                    )}
                </AnalyticsCard>
                
                {/* Status Distribution */}
                <AnalyticsCard title="✅ Status Distribution">
                    {analytics?.statusData?.length > 0 ? (
                        analytics.statusData.map((item, index) => (
                            <DataRow
                                key={index}
                                label={item.status}
                                value={item.count}
                                color="text-green-500"
                            />
                        ))
                    ) : (
                        <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            No data available
                        </Text>
                    )}
                </AnalyticsCard>
                
                {/* Trend (Last 30 Days) */}
                <AnalyticsCard title="📈 Recent Trend (Last 30 Days)">
                    {analytics?.trendData?.length > 0 ? (
                        analytics.trendData.slice(-10).map((item, index) => {
                            const date = new Date(item.date);
                            const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            
                            return (
                                <DataRow
                                    key={index}
                                    label={formatted}
                                    value={item.count}
                                    color="text-blue-500"
                                />
                            );
                        })
                    ) : (
                        <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            No data available
                        </Text>
                    )}
                </AnalyticsCard>
            </ScrollView>
        </View>
    );
}
