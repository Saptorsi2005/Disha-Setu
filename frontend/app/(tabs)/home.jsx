import { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Modal,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOCK_PROJECTS, CATEGORY_ICONS } from '../../constants/mockData';
import { useLocation, PRESET_LOCATIONS } from '../../hooks/use-location';
import { haversineKm, formatDistance } from '../../utils/distance';

const STATUS_STYLE = {
    'In Progress': { bg: '#00D4AA20', text: '#00D4AA' },
    'Completed': { bg: '#10B98120', text: '#10B981' },
    'Delayed': { bg: '#EF444420', text: '#EF4444' },
};

// ─── Location Picker Modal ────────────────────────────────────────────────────

function LocationPickerModal({ visible, onClose, location }) {
    const [customLat, setCustomLat] = useState('');
    const [customLng, setCustomLng] = useState('');
    const [customName, setCustomName] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handlePreset = (preset) => {
        location.setManual({ lat: preset.lat, lng: preset.lng, label: preset.label });
        onClose();
    };

    const handleCustomSubmit = () => {
        const lat = parseFloat(customLat);
        const lng = parseFloat(customLng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            location.setManual({ lat, lng, label: customName.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
            setCustomLat('');
            setCustomLng('');
            setCustomName('');
            setShowCustom(false);
            onClose();
        }
    };

    const handleGPS = async () => {
        onClose();
        await location.startGPS();
    };

    const isCustomValid =
        !isNaN(parseFloat(customLat)) &&
        !isNaN(parseFloat(customLng)) &&
        parseFloat(customLat) >= -90 && parseFloat(customLat) <= 90 &&
        parseFloat(customLng) >= -180 && parseFloat(customLng) <= 180;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity
                className="flex-1 bg-black/60"
                activeOpacity={1}
                onPress={onClose}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
            >
                <View className="bg-[#111827] rounded-t-3xl pt-2 pb-8" style={{ borderTopWidth: 1, borderTopColor: '#1F2937' }}>
                    {/* Handle */}
                    <View className="w-10 h-1 bg-[#374151] rounded-full self-center mb-4" />

                    <View className="px-5">
                        <View className="flex-row items-center justify-between mb-5">
                            <Text className="text-white text-lg font-bold">Set Location</Text>
                            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-[#1F2937] items-center justify-center">
                                <Ionicons name="close" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* GPS button */}
                        <TouchableOpacity
                            className="flex-row items-center bg-[#00D4AA15] rounded-2xl p-4 mb-4 border border-[#00D4AA]/30"
                            onPress={handleGPS}
                            activeOpacity={0.85}
                        >
                            {location.loading ? (
                                <ActivityIndicator size="small" color="#00D4AA" style={{ marginRight: 14 }} />
                            ) : (
                                <View className="w-10 h-10 rounded-xl bg-[#00D4AA] items-center justify-center mr-4">
                                    <Ionicons name="navigate" size={20} color="#000" />
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-[#00D4AA] font-bold text-base">
                                    {location.loading ? 'Getting GPS location…' : 'Use GPS Location'}
                                </Text>
                                <Text className="text-[#9CA3AF] text-xs mt-0.5">
                                    {location.mode === 'gps'
                                        ? `Active · accuracy ±${location.accuracy ? Math.round(location.accuracy) : '?'}m`
                                        : 'Uses device GPS — requires permission'}
                                </Text>
                            </View>
                            {location.mode === 'gps' && (
                                <View className="w-2 h-2 rounded-full bg-[#00D4AA]" />
                            )}
                        </TouchableOpacity>

                        {/* Error */}
                        {location.error && (
                            <View className="flex-row items-center bg-[#EF444415] rounded-xl p-3 mb-4 border border-[#EF4444]/20 gap-2">
                                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                                <Text className="text-[#EF4444] text-xs flex-1">{location.error}</Text>
                            </View>
                        )}

                        {/* Preset areas */}
                        <Text className="text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-3">
                            Test Locations — Bangalore
                        </Text>
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {PRESET_LOCATIONS.map((p) => {
                                const isActive = location.mode === 'manual' && location.label === p.label;
                                return (
                                    <TouchableOpacity
                                        key={p.label}
                                        onPress={() => handlePreset(p)}
                                        activeOpacity={0.8}
                                        className="rounded-full px-4 py-2"
                                        style={{
                                            backgroundColor: isActive ? '#6366F1' : '#1F2937',
                                            borderWidth: 1,
                                            borderColor: isActive ? '#6366F1' : '#374151',
                                        }}
                                    >
                                        <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-[#9CA3AF]'}`}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom coords toggle */}
                        <TouchableOpacity
                            className="flex-row items-center justify-between bg-[#1F2937] rounded-2xl px-4 py-3 mb-3"
                            onPress={() => setShowCustom(v => !v)}
                            activeOpacity={0.85}
                        >
                            <View className="flex-row items-center gap-3">
                                <Ionicons name="code-working-outline" size={18} color="#9CA3AF" />
                                <Text className="text-[#9CA3AF] font-semibold text-sm">Custom Coordinates</Text>
                            </View>
                            <Ionicons name={showCustom ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
                        </TouchableOpacity>

                        {showCustom && (
                            <View className="bg-[#1A2035] rounded-2xl p-4 border border-[#1F2937] mb-2">
                                <Text className="text-[#6B7280] text-xs mb-3">Enter decimal degrees (e.g. 12.9716, 77.5946)</Text>
                                <View className="flex-row gap-2 mb-2">
                                    <View className="flex-1">
                                        <Text className="text-[#6B7280] text-xs mb-1">Latitude</Text>
                                        <TextInput
                                            className="bg-[#111827] text-white rounded-xl px-3 py-2.5 border border-[#374151] text-sm"
                                            placeholder="12.9716"
                                            placeholderTextColor="#4B5563"
                                            keyboardType="numeric"
                                            value={customLat}
                                            onChangeText={setCustomLat}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[#6B7280] text-xs mb-1">Longitude</Text>
                                        <TextInput
                                            className="bg-[#111827] text-white rounded-xl px-3 py-2.5 border border-[#374151] text-sm"
                                            placeholder="77.5946"
                                            placeholderTextColor="#4B5563"
                                            keyboardType="numeric"
                                            value={customLng}
                                            onChangeText={setCustomLng}
                                        />
                                    </View>
                                </View>
                                <View className="mb-3">
                                    <Text className="text-[#6B7280] text-xs mb-1">Location Name (optional)</Text>
                                    <TextInput
                                        className="bg-[#111827] text-white rounded-xl px-3 py-2.5 border border-[#374151] text-sm"
                                        placeholder="My Custom Location"
                                        placeholderTextColor="#4B5563"
                                        value={customName}
                                        onChangeText={setCustomName}
                                    />
                                </View>
                                <TouchableOpacity
                                    className="rounded-xl py-3 items-center"
                                    style={{ backgroundColor: isCustomValid ? '#6366F1' : '#1F2937' }}
                                    onPress={handleCustomSubmit}
                                    disabled={!isCustomValid}
                                    activeOpacity={0.85}
                                >
                                    <Text className={`font-bold text-sm ${isCustomValid ? 'text-white' : 'text-[#4B5563]'}`}>
                                        Apply Coordinates
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE['In Progress'];
    return (
        <View style={{ backgroundColor: s.bg }} className="rounded-full px-3 py-1">
            <Text style={{ color: s.text }} className="text-xs font-bold">{status}</Text>
        </View>
    );
}

// ─── Map Placeholder ──────────────────────────────────────────────────────────

function MapPlaceholder({ onToggle, location, projects }) {
    // Pick 3 closest projects to show as markers
    const markers = [...projects]
        .slice(0, 3)
        .map((p, i) => {
            const positions = [
                { top: 80, left: 120 },
                { top: 50, left: 220 },
                { top: 130, left: 60 },
            ];
            const colors = ['#00D4AA', '#6366F1', '#EF4444'];
            return { project: p, pos: positions[i], color: colors[i] };
        });

    return (
        <View className="mx-4 mb-4 rounded-3xl overflow-hidden" style={{ height: 220, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' }}>
            <View className="flex-1 relative">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                    <View key={i} style={{ position: 'absolute', top: 0, left: i * 80, width: 1, height: '100%', backgroundColor: '#1F2937' }} />
                ))}
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={{ position: 'absolute', left: 0, top: i * 55, width: '100%', height: 1, backgroundColor: '#1F2937' }} />
                ))}
                {/* Roads */}
                <View style={{ position: 'absolute', top: 110, left: 0, right: 0, height: 3, backgroundColor: '#374151' }} />
                <View style={{ position: 'absolute', left: 160, top: 0, bottom: 0, width: 3, backgroundColor: '#374151' }} />

                {/* Dynamic project markers */}
                {markers.map(({ project, pos, color }) => {
                    const iconName = CATEGORY_ICONS[project.category] || 'construction';
                    const dist = haversineKm(location.coords.lat, location.coords.lng, project.coordinates.lat, project.coordinates.lng);
                    return (
                        <View key={project.id} style={{ position: 'absolute', top: pos.top, left: pos.left }} className="items-center">
                            <View className="w-10 h-10 rounded-full items-center justify-center"
                                style={{ backgroundColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 8 }}>
                                <MaterialIcons name={iconName} size={18} color={color === '#00D4AA' ? '#000' : '#fff'} />
                            </View>
                            <View className="rounded-full px-2 py-0.5 mt-1" style={{ backgroundColor: color }}>
                                <Text style={{ color: color === '#00D4AA' ? '#000' : '#fff' }} className="text-xs font-bold">
                                    {formatDistance(dist)}
                                </Text>
                            </View>
                        </View>
                    );
                })}

                {/* User location dot */}
                <View style={{ position: 'absolute', top: 88, left: 148 }} className="items-center">
                    <View className="w-3 h-3 rounded-full bg-white/20 absolute" style={{ width: 24, height: 24, borderRadius: 12, top: -6, left: -6 }} />
                    <View className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"
                        style={{ shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 6 }} />
                </View>

                {/* Location label */}
                <View className="absolute top-3 left-3 bg-[#0A0E1A]/90 rounded-xl px-3 py-1.5 border border-[#1F2937] flex-row items-center gap-1.5">
                    <Ionicons
                        name={location.mode === 'gps' ? 'navigate' : 'location'}
                        size={11}
                        color={location.mode === 'gps' ? '#00D4AA' : '#9CA3AF'}
                    />
                    <Text className="text-white text-xs font-medium" numberOfLines={1}>
                        {location.label}
                    </Text>
                    {location.mode === 'gps' && location.accuracy && (
                        <Text className="text-[#00D4AA] text-xs">±{Math.round(location.accuracy)}m</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                className="absolute bottom-3 right-3 bg-[#00D4AA] rounded-xl px-3 py-1.5 flex-row items-center gap-1"
                onPress={onToggle}
            >
                <Ionicons name="list" size={12} color="#000" />
                <Text className="text-black text-xs font-bold">List View</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onPress, userCoords }) {
    const iconName = CATEGORY_ICONS[project.category] || 'construction';
    const s = STATUS_STYLE[project.status] || STATUS_STYLE['In Progress'];
    const dist = haversineKm(userCoords.lat, userCoords.lng, project.coordinates.lat, project.coordinates.lng);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            className="mx-4 mb-3 bg-[#111827] rounded-3xl p-4 border border-[#1F2937]"
        >
            <View className="flex-row items-start">
                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: s.bg }}>
                    <MaterialIcons name={iconName} size={24} color={s.text} />
                </View>
                <View className="flex-1">
                    <View className="flex-row items-start justify-between mb-1">
                        <Text className="text-white font-bold text-base flex-1 mr-2" numberOfLines={1}>
                            {project.name}
                        </Text>
                        <StatusBadge status={project.status} />
                    </View>
                    <Text className="text-[#6B7280] text-xs mb-2" numberOfLines={1}>{project.department}</Text>

                    <View className="flex-row items-center gap-3 mb-2">
                        <View className="flex-1 h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                            <View className="h-full rounded-full" style={{ width: `${project.completion}%`, backgroundColor: s.text }} />
                        </View>
                        <Text style={{ color: s.text }} className="text-xs font-bold">{project.completion}%</Text>
                    </View>

                    <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                            <Text className="text-[#9CA3AF] text-xs">{formatDistance(dist)}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
                            <Text className="text-[#9CA3AF] text-xs">{project.expectedCompletion}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="cash-outline" size={11} color="#9CA3AF" />
                            <Text className="text-[#9CA3AF] text-xs">{project.budget}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
    const router = useRouter();
    const location = useLocation();
    const [viewMode, setViewMode] = useState('map');
    const [filter, setFilter] = useState('All');
    const [pickerVisible, setPickerVisible] = useState(false);

    const FILTERS = ['All', 'In Progress', 'Completed', 'Delayed'];

    // Sort projects by distance from current location
    const allProjects = MOCK_PROJECTS.map(p => ({
        ...p,
        _dist: haversineKm(location.coords.lat, location.coords.lng, p.coordinates.lat, p.coordinates.lng),
    })).sort((a, b) => a._dist - b._dist);

    const filtered = filter === 'All' ? allProjects : allProjects.filter(p => p.status === filter);

    const STATS = [
        { label: 'Active', value: String(MOCK_PROJECTS.filter(p => p.status === 'In Progress').length), icon: 'construct', color: '#00D4AA' },
        { label: 'Completed', value: String(MOCK_PROJECTS.filter(p => p.status === 'Completed').length), icon: 'checkmark-circle', color: '#10B981' },
        { label: 'Delayed', value: String(MOCK_PROJECTS.filter(p => p.status === 'Delayed').length), icon: 'warning', color: '#EF4444' },
        { label: 'Budget', value: '₹1.2k Cr', icon: 'cash', color: '#F59E0B' },
    ];

    const nearestProject = allProjects[0];
    const nearestDist = nearestProject ? haversineKm(location.coords.lat, location.coords.lng, nearestProject.coordinates.lat, nearestProject.coordinates.lng) : null;

    return (
        <SafeAreaView className="flex-1 bg-[#0A0E1A]">
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                        {/* Tappable location row */}
                        <TouchableOpacity
                            className="flex-row items-center gap-1.5 mb-1 self-start"
                            onPress={() => setPickerVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={location.mode === 'gps' ? 'navigate' : 'location'}
                                size={14}
                                color={location.mode === 'gps' ? '#00D4AA' : '#9CA3AF'}
                            />
                            <Text className={`text-sm font-medium ${location.mode === 'gps' ? 'text-[#00D4AA]' : 'text-[#9CA3AF]'}`}>
                                {location.label}
                            </Text>
                            {location.loading && (
                                <ActivityIndicator size="small" color="#00D4AA" style={{ marginLeft: 4 }} />
                            )}
                            <Ionicons name="chevron-down" size={12} color="#4B5563" />
                        </TouchableOpacity>
                        <Text className="text-white text-2xl font-bold">
                            Projects <Text className="text-[#00D4AA]">Near You</Text>
                        </Text>
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            className="w-10 h-10 rounded-2xl bg-[#111827] items-center justify-center border border-[#1F2937]"
                            onPress={() => router.push('/analytics')}
                        >
                            <Ionicons name="bar-chart-outline" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="w-10 h-10 rounded-2xl bg-[#111827] items-center justify-center border border-[#1F2937]"
                            onPress={() => router.push('/updates')}
                        >
                            <Ionicons name="refresh-outline" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Nearest project proximity banner */}
                {nearestProject && nearestDist !== null && (
                    <TouchableOpacity
                        className="mx-4 mb-3 flex-row items-center bg-[#00D4AA10] rounded-2xl px-4 py-3 border border-[#00D4AA]/20 gap-3"
                        onPress={() => router.push(`/project/${nearestProject.id}`)}
                        activeOpacity={0.85}
                    >
                        <View className="w-8 h-8 rounded-xl bg-[#00D4AA20] items-center justify-center">
                            <Ionicons name="radio" size={16} color="#00D4AA" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[#00D4AA] text-xs font-bold">Nearest Active Project</Text>
                            <Text className="text-white text-sm font-semibold" numberOfLines={1}>{nearestProject.name}</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-[#00D4AA] font-bold text-base">{formatDistance(nearestDist)}</Text>
                            <Text className="text-[#6B7280] text-xs">away</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Stats row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
                    {STATS.map((stat) => (
                        <View key={stat.label}
                            className="bg-[#111827] rounded-2xl px-4 py-3 mr-3 items-center border border-[#1F2937]"
                            style={{ minWidth: 90 }}
                        >
                            <Ionicons name={stat.icon} size={22} color={stat.color} />
                            <Text style={{ color: stat.color }} className="text-lg font-bold mt-1">{stat.value}</Text>
                            <Text className="text-[#6B7280] text-xs">{stat.label}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* View toggle */}
                <View className="flex-row mx-4 mb-4 bg-[#111827] rounded-2xl p-1 border border-[#1F2937]">
                    <TouchableOpacity
                        className="flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5"
                        style={{ backgroundColor: viewMode === 'map' ? '#00D4AA' : 'transparent' }}
                        onPress={() => setViewMode('map')}
                    >
                        <Ionicons name="map" size={14} color={viewMode === 'map' ? '#000' : '#6B7280'} />
                        <Text className={`font-bold text-sm ${viewMode === 'map' ? 'text-black' : 'text-[#6B7280]'}`}>Map View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5"
                        style={{ backgroundColor: viewMode === 'list' ? '#00D4AA' : 'transparent' }}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={14} color={viewMode === 'list' ? '#000' : '#6B7280'} />
                        <Text className={`font-bold text-sm ${viewMode === 'list' ? 'text-black' : 'text-[#6B7280]'}`}>List View</Text>
                    </TouchableOpacity>
                </View>

                {/* Map */}
                {viewMode === 'map' && (
                    <MapPlaceholder
                        onToggle={() => setViewMode('list')}
                        location={location}
                        projects={allProjects}
                    />
                )}

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f}
                            className="mr-2 px-4 py-2 rounded-full"
                            style={{ backgroundColor: filter === f ? '#00D4AA' : '#111827', borderWidth: 1, borderColor: filter === f ? '#00D4AA' : '#1F2937' }}
                            onPress={() => setFilter(f)}
                        >
                            <Text className={`text-sm font-semibold ${filter === f ? 'text-black' : 'text-[#9CA3AF]'}`}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text className="text-white font-bold text-base px-4 mb-3">
                    {filtered.length} project{filtered.length !== 1 ? 's' : ''} · sorted by distance
                </Text>

                {filtered.map(p => (
                    <ProjectCard
                        key={p.id}
                        project={p}
                        userCoords={location.coords}
                        onPress={() => router.push(`/project/${p.id}`)}
                    />
                ))}
                <View className="h-6" />
            </ScrollView>

            {/* Location Picker Modal */}
            <LocationPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                location={location}
            />
        </SafeAreaView>
    );
}
