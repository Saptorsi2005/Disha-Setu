import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOCK_NOTIFICATIONS } from '../../constants/mockData';

const NOTIF_META = {
    new_project: { icon: 'location', color: '#00D4AA' },
    status_change: { icon: 'refresh-circle', color: '#6366F1' },
    completed: { icon: 'checkmark-circle', color: '#10B981' },
    delay: { icon: 'warning', color: '#EF4444' },
};

export default function NotificationsScreen() {
    const router = useRouter();
    const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

    return (
        <SafeAreaView className="flex-1 bg-[#0A0E1A]">
            {/* Header */}
            <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
                <View>
                    <Text className="text-white text-2xl font-bold">Notifications</Text>
                    {unreadCount > 0 && (
                        <Text className="text-[#9CA3AF] text-sm">{unreadCount} unread</Text>
                    )}
                </View>
                <View className="bg-[#00D4AA20] rounded-full px-3 py-1.5 border border-[#00D4AA]/30">
                    <Text className="text-[#00D4AA] text-xs font-bold">{unreadCount} New</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Geo-fence alert banner */}
                <View className="mx-4 mb-4 bg-[#00D4AA15] rounded-3xl p-4 border border-[#00D4AA]/30 flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-[#00D4AA] items-center justify-center mr-3">
                        <Ionicons name="radio" size={20} color="#000" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[#00D4AA] font-bold text-sm">Geo-Fence Active</Text>
                        <Text className="text-[#9CA3AF] text-xs mt-0.5">You'll be alerted when entering project zones</Text>
                    </View>
                </View>

                {/* Notifications list */}
                {MOCK_NOTIFICATIONS.map((notif) => {
                    const meta = NOTIF_META[notif.type] || NOTIF_META.new_project;
                    return (
                        <TouchableOpacity
                            key={notif.id}
                            onPress={() => router.push(`/project/${notif.projectId}`)}
                            activeOpacity={0.85}
                            className="mx-4 mb-3"
                        >
                            <View className={`bg-[#111827] rounded-3xl p-4 border ${notif.read ? 'border-[#1F2937]' : 'border-[#00D4AA]/20'}`}>
                                <View className="flex-row items-start">
                                    <View
                                        className="w-12 h-12 rounded-2xl items-center justify-center mr-3 flex-shrink-0"
                                        style={{ backgroundColor: meta.color + '20' }}
                                    >
                                        <Ionicons name={meta.icon} size={22} color={meta.color} />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center justify-between mb-1">
                                            <Text className="text-white font-bold text-sm flex-1 mr-2" numberOfLines={1}>
                                                {notif.title}
                                            </Text>
                                            {!notif.read && (
                                                <View className="w-2 h-2 rounded-full bg-[#00D4AA]" />
                                            )}
                                        </View>
                                        <Text className="text-[#9CA3AF] text-xs leading-4 mb-2">{notif.body}</Text>
                                        <View className="flex-row items-center gap-1">
                                            <Ionicons name="time-outline" size={11} color="#4B5563" />
                                            <Text className="text-[#4B5563] text-xs">{notif.time}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Reminder */}
                <View className="mx-4 mt-2 mb-6 items-center rounded-3xl bg-[#111827] p-6 border border-[#1F2937]">
                    <Ionicons name="notifications-outline" size={32} color="#4B5563" style={{ marginBottom: 12 }} />
                    <Text className="text-[#6B7280] text-sm text-center">
                        You'll receive alerts when entering{'\n'}a geo-fenced project zone
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
