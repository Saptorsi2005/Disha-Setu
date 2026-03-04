import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOCK_PROJECTS, CATEGORY_ICONS } from '../../constants/mockData';

const CATEGORIES = ['All', 'Road', 'Bridge', 'Hospital', 'Metro', 'College'];
const STATUSES = ['All Status', 'In Progress', 'Completed', 'Delayed'];

const STATUS_STYLE = {
    'In Progress': { text: '#00D4AA' },
    'Completed': { text: '#10B981' },
    'Delayed': { text: '#EF4444' },
};

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [status, setStatus] = useState('All Status');

    const results = MOCK_PROJECTS.filter(p => {
        const q = query.toLowerCase();
        const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q) || p.department.toLowerCase().includes(q);
        const matchesCat = category === 'All' || p.category === category;
        const matchesStatus = status === 'All Status' || p.status === status;
        return matchesQuery && matchesCat && matchesStatus;
    });

    return (
        <SafeAreaView className="flex-1 bg-[#0A0E1A]">
            {/* Header */}
            <View className="px-4 pt-4 pb-3">
                <Text className="text-white text-2xl font-bold mb-4">
                    Search <Text className="text-[#6366F1]">Projects</Text>
                </Text>

                {/* Search bar */}
                <View className="flex-row items-center bg-[#111827] rounded-2xl border border-[#1F2937] mb-4 px-4">
                    <Ionicons name="search" size={18} color="#4B5563" style={{ marginRight: 10 }} />
                    <TextInput
                        className="flex-1 text-white py-3.5 text-base"
                        placeholder="Project name, area, department..."
                        placeholderTextColor="#4B5563"
                        value={query}
                        onChangeText={setQuery}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            className="mr-2 px-4 py-2 rounded-full flex-row items-center gap-1.5"
                            style={{ backgroundColor: category === cat ? '#6366F1' : '#111827', borderWidth: 1, borderColor: category === cat ? '#6366F1' : '#1F2937' }}
                            onPress={() => setCategory(cat)}
                        >
                            {cat !== 'All' && (
                                <MaterialIcons name={CATEGORY_ICONS[cat] || 'construction'} size={14} color={category === cat ? '#fff' : '#9CA3AF'} />
                            )}
                            <Text className={`text-sm font-semibold ${category === cat ? 'text-white' : 'text-[#9CA3AF]'}`}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Status filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {STATUSES.map(s => (
                        <TouchableOpacity
                            key={s}
                            className="mr-2 px-4 py-2 rounded-full"
                            style={{ backgroundColor: status === s ? '#1F2937' : 'transparent', borderWidth: 1, borderColor: '#1F2937' }}
                            onPress={() => setStatus(s)}
                        >
                            <Text className={`text-sm ${status === s ? 'text-white font-bold' : 'text-[#6B7280]'}`}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-[#6B7280] text-sm px-4 mb-3">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                </Text>

                {results.length === 0 && (
                    <View className="items-center mt-16">
                        <Ionicons name="search-outline" size={48} color="#374151" style={{ marginBottom: 16 }} />
                        <Text className="text-white font-bold text-lg mb-2">No projects found</Text>
                        <Text className="text-[#6B7280] text-sm text-center px-8">Try adjusting your search terms or filters</Text>
                    </View>
                )}

                {results.map(p => {
                    const s = STATUS_STYLE[p.status] || STATUS_STYLE['In Progress'];
                    return (
                        <TouchableOpacity
                            key={p.id}
                            onPress={() => router.push(`/project/${p.id}`)}
                            activeOpacity={0.85}
                            className="mx-4 mb-3 bg-[#111827] rounded-3xl p-4 border border-[#1F2937]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: s.text + '20' }}>
                                    <MaterialIcons name={CATEGORY_ICONS[p.category] || 'construction'} size={24} color={s.text} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>{p.name}</Text>
                                    <Text className="text-[#6B7280] text-xs mb-2">{p.area} · {p.department}</Text>
                                    <View className="flex-row items-center gap-3">
                                        <View className="flex-row items-center gap-1">
                                            <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.text }} />
                                            <Text style={{ color: s.text }} className="text-xs font-bold">{p.status}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                                            <Text className="text-[#9CA3AF] text-xs">{p.distance}</Text>
                                        </View>
                                        <Text className="text-[#9CA3AF] text-xs">{p.completion}% done</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                            </View>
                        </TouchableOpacity>
                    );
                })}
                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
}
