/**
 * app/(tabs)/search.jsx — Real project search from backend
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { fetchProjects } from '../../services/projectService';
import { CATEGORY_ICONS } from '../../constants/mockData';
import { useTranslation } from 'react-i18next';

const CATEGORIES = ['All', 'Road', 'Bridge', 'Metro', 'Hospital', 'College', 'Water', 'Park'];

const STATUS_COLOR = {
    'In Progress': '#00D4AA',
    'Completed': '#10B981',
    'Delayed': '#EF4444',
    'Planned': '#6366F1',
};

export default function SearchScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [allProjects, setAllProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        fetchProjects().then(list => {
            setAllProjects(list);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const filtered = allProjects.filter(p => {
        const matchQuery = !query.trim() ||
            p.name?.toLowerCase().includes(query.toLowerCase()) ||
            p.area?.toLowerCase().includes(query.toLowerCase()) ||
            p.district?.toLowerCase().includes(query.toLowerCase()) ||
            p.id?.toLowerCase().includes(query.toLowerCase());
        const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchQuery && matchCategory;
    });

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            {/* Search bar */}
            <View className="px-4 pt-4 pb-3">
                <View className="flex-row items-center bg-card rounded-xl px-3 py-2.5 border border-cardBorder gap-2">
                    <Ionicons name="search-outline" size={18} color={iconDim} />
                    <TextInput
                        className="flex-1 text-txt text-sm"
                        placeholder={t('search.placeholder')}
                        placeholderTextColor={iconDim}
                        value={query}
                        onChangeText={setQuery}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={16} color={iconDim} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category filter */}
            <View className="h-12">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 6 }}
                >
                    {CATEGORIES.map(cat => {
                        const active = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                className="px-3.5 py-1.5 rounded-lg"
                                style={{
                                    backgroundColor: active ? '#00D4AA' : (isDark ? '#1F2937' : '#F3F4F6'),
                                }}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text
                                    className="font-semibold text-xs"
                                    style={{ color: active ? '#000' : iconDim }}
                                >
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Results */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00D4AA" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90 }}
                >
                    <Text className="text-txtMuted text-xs mb-3">
                        {filtered.length} {filtered.length !== 1 ? 'results' : 'result'}
                        {query ? ` for "${query}"` : ''}
                        {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                    </Text>

                    {filtered.length === 0 ? (
                        <View className="items-center py-16">
                            <Ionicons name="search-outline" size={44} color={iconDim} />
                            <Text className="text-txt font-bold text-lg mt-4">{t('common.no_results')}</Text>
                            <Text className="text-txtMuted text-sm mt-2 text-center">
                                {t('search.try_different', 'Try a different search term or category')}
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                            {filtered.map((project, idx) => {
                                const iconName = CATEGORY_ICONS[project.category] || 'construction';
                                const progress = project.progress_percentage ?? project.progress ?? 0;
                                const statusColor = STATUS_COLOR[project.status] || '#6B7280';
                                const isLast = idx === filtered.length - 1;
                                return (
                                    <TouchableOpacity
                                        key={project.id}
                                        className={`p-4 flex-row items-center ${!isLast ? 'border-b border-cardBorder' : ''}`}
                                        onPress={() => router.push(`/project/${project.id}`)}
                                        activeOpacity={0.75}
                                    >
                                        <View className="w-10 h-10 rounded-lg bg-surface items-center justify-center mr-3">
                                            <MaterialIcons name={iconName} size={20} color={statusColor} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-txt font-semibold text-sm mb-0.5" numberOfLines={1}>{project.name}</Text>
                                            <Text className="text-txtMuted text-xs mb-2" numberOfLines={1}>{project.area} · {project.department}</Text>
                                            <View className="w-full h-1 bg-surface rounded-full overflow-hidden">
                                                <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: statusColor }} />
                                            </View>
                                        </View>
                                        <View className="ml-4 items-end">
                                            <Text className="font-bold text-sm" style={{ color: statusColor }}>{progress}%</Text>
                                            <Text className="text-txtMuted text-[10px] mt-0.5">{project.status}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
