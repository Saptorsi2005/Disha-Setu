import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOCK_ACTIVITY } from '../../constants/mockData';

const STATUS_STYLE = {
    'Pending': { bg: '#F59E0B20', text: '#F59E0B' },
    'Under Review': { bg: '#6366F120', text: '#6366F1' },
    'Resolved': { bg: '#10B98120', text: '#10B981' },
    'Saved': { bg: '#00D4AA20', text: '#00D4AA' },
};

const TYPE_META = {
    feedback: { icon: 'chatbubble', color: '#6366F1' },
    saved: { icon: 'bookmark', color: '#00D4AA' },
    reported: { icon: 'alert-circle', color: '#EF4444' },
};

const STATS = [
    { label: 'Submitted', value: '2', icon: 'chatbubble', color: '#6366F1' },
    { label: 'Resolved', value: '1', icon: 'checkmark-circle', color: '#10B981' },
    { label: 'Saved', value: '1', icon: 'bookmark', color: '#00D4AA' },
];

export default function ActivityScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-[#0A0E1A]">
            <View className="px-4 pt-4 pb-4">
                <Text className="text-white text-2xl font-bold mb-1">
                    My <Text className="text-[#F59E0B]">Activity</Text>
                </Text>
                <Text className="text-[#9CA3AF] text-sm">Track your feedback and saved projects</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Quick Stats */}
                <View className="flex-row px-4 gap-3 mb-6">
                    {STATS.map(stat => (
                        <View key={stat.label} className="flex-1 bg-[#111827] rounded-2xl p-3 items-center border border-[#1F2937]">
                            <Ionicons name={stat.icon} size={22} color={stat.color} />
                            <Text style={{ color: stat.color }} className="text-xl font-bold mt-1">{stat.value}</Text>
                            <Text className="text-[#6B7280] text-xs">{stat.label}</Text>
                        </View>
                    ))}
                </View>

                <Text className="text-white font-bold text-base px-4 mb-3">Recent Activity</Text>
                {MOCK_ACTIVITY.map(item => {
                    const s = STATUS_STYLE[item.status] || STATUS_STYLE['Pending'];
                    const meta = TYPE_META[item.type] || TYPE_META.feedback;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => router.push(`/project/${item.type === 'saved' ? '2' : '1'}`)}
                            activeOpacity={0.85}
                            className="mx-4 mb-3 bg-[#111827] rounded-3xl p-4 border border-[#1F2937]"
                        >
                            <View className="flex-row items-start">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: meta.color + '15' }}>
                                    <Ionicons name={meta.icon} size={22} color={meta.color} />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-start justify-between mb-1">
                                        <Text className="text-white font-bold text-sm flex-1 mr-2">{item.title}</Text>
                                        <View style={{ backgroundColor: s.bg }} className="rounded-full px-2 py-0.5">
                                            <Text style={{ color: s.text }} className="text-xs font-bold">{item.status}</Text>
                                        </View>
                                    </View>
                                    <Text className="text-[#9CA3AF] text-xs mb-1.5">{item.projectName}</Text>
                                    <View className="flex-row items-center gap-3">
                                        <View className="flex-row items-center gap-1">
                                            <Ionicons name="calendar-outline" size={11} color="#4B5563" />
                                            <Text className="text-[#4B5563] text-xs">{item.date}</Text>
                                        </View>
                                        {item.ticketId && (
                                            <View className="bg-[#1A2035] rounded-full px-2 py-0.5">
                                                <Text className="text-[#6B7280] text-xs font-mono">{item.ticketId}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* CTA */}
                <View className="mx-4 mt-2 mb-6">
                    <TouchableOpacity
                        className="bg-[#111827] rounded-3xl p-5 border border-dashed border-[#1F2937] items-center"
                        onPress={() => router.push('/feedback')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="megaphone-outline" size={32} color="#4B5563" style={{ marginBottom: 8 }} />
                        <Text className="text-white font-bold text-base mb-1">Report an Issue</Text>
                        <Text className="text-[#6B7280] text-sm text-center">Spotted a problem? Submit a complaint and track its resolution.</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
