/**
 * app/analytics.jsx — Real analytics data from backend
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/use-color-scheme';
import { fetchDistrictAnalytics } from '../services/analyticsService';

export default function AnalyticsScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDistrictAnalytics()
            .then(res => { setData(res); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">Loading analytics...</Text>
            </SafeAreaView>
        );
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center px-8">
                <Ionicons name="bar-chart-outline" size={48} color={iconDim} />
                <Text className="text-txt font-bold text-lg mt-4">Could not load analytics</Text>
                <Text className="text-txtMuted text-sm mt-2 text-center">{error || 'Please check your connection.'}</Text>
                <TouchableOpacity className="mt-6 bg-[#00D4AA] py-3 px-6 rounded-xl" onPress={() => router.back()}>
                    <Text className="text-main font-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { overview, byCategory, byStatus, mostDelayedCategory } = data;
    const maxCount = byCategory ? Math.max(...byCategory.map(c => c.count), 1) : 1;

    const STATUS_COLORS = {
        'In Progress': '#00D4AA',
        'Completed': '#10B981',
        'Delayed': '#EF4444',
        'Planned': '#6366F1',
    };

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center px-5 pt-4 pb-3">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={22} color="#00D4AA" />
                </TouchableOpacity>
                <View>
                    <Text className="text-txt text-xl font-bold">District Analytics</Text>
                    <Text className="text-txtMuted text-xs">Civic intelligence dashboard</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                {/* Overview Cards */}
                <Text className="text-txtMuted text-xs font-semibold uppercase tracking-wider mb-4">Overview</Text>
                <View className="flex-row flex-wrap gap-3 mb-8">
                    {[
                        { label: 'Total Projects', value: overview.total, color: '#6366F1', icon: 'layers-outline' },
                        { label: 'In Progress', value: overview.inProgress, color: '#00D4AA', icon: 'reload-outline' },
                        { label: 'Completed', value: overview.completed, color: '#10B981', icon: 'checkmark-circle-outline' },
                        { label: 'Delayed', value: overview.delayed, color: '#EF4444', icon: 'warning-outline' },
                    ].map(card => (
                        <View key={card.label} className="bg-card rounded-2xl p-4 border border-cardBorder" style={{ width: '47%' }}>
                            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: `${card.color}20` }}>
                                <Ionicons name={card.icon} size={20} color={card.color} />
                            </View>
                            <Text style={{ color: card.color }} className="text-3xl font-bold mb-1">{card.value}</Text>
                            <Text className="text-txtMuted text-xs font-medium">{card.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Budget & Completion */}
                <View className="flex-row gap-3 mb-8">
                    <View className="flex-1 bg-card rounded-2xl p-4 border border-cardBorder items-center">
                        <Text className="text-txtMuted text-xs mb-2">Total Budget</Text>
                        <Text className="text-txt font-bold text-lg">{overview.totalBudget}</Text>
                    </View>
                    <View className="flex-1 bg-card rounded-2xl p-4 border border-cardBorder items-center">
                        <Text className="text-txtMuted text-xs mb-2">Avg. Completion</Text>
                        <Text className="text-[#00D4AA] font-bold text-lg">{overview.avgCompletion}%</Text>
                    </View>
                </View>

                {/* Status breakdown */}
                {byStatus && byStatus.length > 0 && (
                    <>
                        <Text className="text-txtMuted text-xs font-semibold uppercase tracking-wider mb-4">Status Breakdown</Text>
                        <View className="bg-card rounded-2xl border border-cardBorder p-4 mb-8">
                            {byStatus.map(s => (
                                <View key={s.status} className="mb-3">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center">
                                            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS[s.status] || '#9CA3AF' }} />
                                            <Text className="text-txt text-sm font-medium">{s.status}</Text>
                                        </View>
                                        <Text className="text-txt font-bold text-sm">{s.count}</Text>
                                    </View>
                                    <View className="w-full h-2 bg-surface rounded-full overflow-hidden">
                                        <View className="h-full rounded-full" style={{
                                            width: `${(s.count / (overview.total || 1)) * 100}%`,
                                            backgroundColor: STATUS_COLORS[s.status] || '#9CA3AF',
                                        }} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* By Category */}
                {byCategory && byCategory.length > 0 && (
                    <>
                        <Text className="text-txtMuted text-xs font-semibold uppercase tracking-wider mb-4">Projects by Category</Text>
                        <View className="bg-card rounded-2xl border border-cardBorder p-4 mb-8">
                            {byCategory.map((cat, i) => (
                                <View key={cat.category} className="mb-4">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="text-txt text-sm font-medium">{cat.category}</Text>
                                        <View className="flex-row items-center gap-3">
                                            <Text className="text-txtMuted text-xs">{cat.budget}</Text>
                                            <Text className="text-txt font-bold text-sm">{cat.count}</Text>
                                        </View>
                                    </View>
                                    <View className="w-full h-3 bg-surface rounded-full overflow-hidden">
                                        <View
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${(cat.count / maxCount) * 100}%`,
                                                backgroundColor: ['#00D4AA', '#6366F1', '#F59E0B', '#EF4444', '#10B981'][i % 5],
                                            }}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Most Delayed */}
                {mostDelayedCategory && (
                    <View className="bg-[#EF444415] rounded-2xl p-4 border border-[#EF4444]/30">
                        <View className="flex-row items-center gap-2 mb-2">
                            <Ionicons name="warning" size={18} color="#EF4444" />
                            <Text className="text-[#EF4444] font-bold text-sm">Most Delayed Category</Text>
                        </View>
                        <Text className="text-txt font-bold text-lg">{mostDelayedCategory.category}</Text>
                        <Text className="text-[#FCA5A5] text-sm mt-1">{mostDelayedCategory.count} delayed project{mostDelayedCategory.count !== 1 ? 's' : ''}</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
