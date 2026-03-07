/**
 * app/admin/navigation.jsx
 * Admin Indoor Navigation Management - Manage buildings, rooms, and connections
 */
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getNavigationData, deleteRoom, deleteConnection, addRoom, addConnection } from '../../services/adminService';
import { getBuildings, fetchBuildingFloors } from '../../services/indoorNavigationService';
import Ionicons from '@expo/vector-icons/Ionicons';

function RoomCard({ room, onDelete }) {
    const { isDark } = useColorScheme();
    
    const handleDelete = () => {
        Alert.alert(
            'Delete Room',
            `Are you sure you want to delete "${room.name}"? All connections will be removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRoom(room.id);
                            Alert.alert('Success', 'Room deleted successfully');
                            onDelete();
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to delete room');
                        }
                    }
                }
            ]
        );
    };
    
    const getTypeIcon = (type) => {
        const icons = {
            'entrance': '🚪',
            'exit': '🚪',
            'reception': '💁',
            'emergency': '🚨',
            'pharmacy': '💊',
            'laboratory': '🔬',
            'ward': '🛏️',
            'icu': '🏥',
            'surgery': '⚕️',
            'radiology': '📷',
            'cafeteria': '🍽️',
            'restroom': '🚻',
            'elevator': '🛗',
            'stairs': '🪜',
            'corridor': '🚶',
            'room': '🚪'
        };
        return icons[type?.toLowerCase()] || '📍';
    };
    
    return (
        <View className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-3 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 flex-row items-start gap-3">
                    <Text className="text-2xl">{getTypeIcon(room.type)}</Text>
                    <View className="flex-1">
                        <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
                            {room.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mb-1">
                            <View className={`px-2 py-0.5 rounded ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                                <Text className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                    {room.type}
                                </Text>
                            </View>
                            {room.is_landmark && (
                                <View className={`px-2 py-0.5 rounded ${isDark ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
                                    <Text className={`text-xs font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                        ⭐ Landmark
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            📍 Floor {room.floor_number} • {room.building_name}
                        </Text>
                        {room.room_number && (
                            <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                                Room #{room.room_number}
                            </Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-600 py-2 px-3 rounded-lg"
                    style={{ elevation: 2 }}
                >
                    <Ionicons name="trash-outline" size={16} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function ConnectionCard({ connection, onDelete }) {
    const { isDark } = useColorScheme();
    
    const handleDelete = () => {
        Alert.alert(
            'Delete Connection',
            `Delete connection between "${connection.from_room_name}" and "${connection.to_room_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteConnection(connection.id);
                            Alert.alert('Success', 'Connection deleted successfully');
                            onDelete();
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to delete connection');
                        }
                    }
                }
            ]
        );
    };
    
    return (
        <View className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-3 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-3 py-2 rounded-lg`}>
                            <Text className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {connection.from_room_name}
                            </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <View className={`flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-3 py-2 rounded-lg`}>
                            <Text className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {connection.to_room_name}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="walk" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {connection.distance}m
                            </Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded ${connection.is_accessible ? (isDark ? 'bg-green-900' : 'bg-green-100') : (isDark ? 'bg-red-900' : 'bg-red-100')}`}>
                            <Text className={`text-xs font-medium ${connection.is_accessible ? (isDark ? 'text-green-300' : 'text-green-700') : (isDark ? 'text-red-300' : 'text-red-700')}`}>
                                {connection.is_accessible ? '♿ Accessible' : '🚫 Not accessible'}
                            </Text>
                        </View>
                        {connection.is_bidirectional && (
                            <View className={`px-2 py-0.5 rounded ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                                <Text className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                    ↔ Bidirectional
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-600 py-2 px-3 rounded-lg"
                    style={{ elevation: 2 }}
                >
                    <Ionicons name="trash-outline" size={16} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function AdminNavigationManagement() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    
    const [rooms, setRooms] = useState([]);
    const [connections, setConnections] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'connections'
    
    const loadData = useCallback(async () => {
        try {
            const [navData, buildingsData] = await Promise.all([
                getNavigationData(selectedBuilding),
                getBuildings()
            ]);
            
            console.log('Navigation data:', navData);
            console.log('Buildings data:', buildingsData);
            
            setRooms(navData.rooms || []);
            setConnections(navData.connections || []);
            setBuildings(Array.isArray(buildingsData) ? buildingsData : buildingsData.buildings || []);
        } catch (err) {
            console.error('Failed to load navigation data:', err);
            Alert.alert('Error', 'Failed to load navigation data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedBuilding]);
    
    useEffect(() => {
        if (user?.role !== 'admin') {
            router.replace('/');
            return;
        }
        
        loadData();
    }, [user, selectedBuilding]);
    
    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };
    
    if (loading) {
        return (
            <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} items-center justify-center`}>
                <Text className={isDark ? 'text-white' : 'text-gray-900'}>Loading...</Text>
            </View>
        );
    }
    
    return (
        <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <View className={`p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`} style={{ elevation: 2 }}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="mb-4 flex-row items-center gap-2"
                >
                    <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                    <Text className="text-blue-500 text-base font-medium">Back to Dashboard</Text>
                </TouchableOpacity>
                
                <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Indoor Navigation
                </Text>
                <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="location" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {rooms.length} Rooms
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="git-network" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {connections.length} Connections
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="business" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {buildings.length} Buildings
                        </Text>
                    </View>
                </View>
            </View>
            
            {/* Building Filter */}
            {buildings.length > 0 && (
                <View className="px-4 py-3">
                    <Text className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Filter by Building
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            onPress={() => setSelectedBuilding(null)}
                            className={`mr-2 py-2.5 px-4 rounded-xl ${
                                !selectedBuilding ? 'bg-blue-600' : isDark ? 'bg-gray-800' : 'bg-white'
                            }`}
                            style={{ elevation: !selectedBuilding ? 4 : 0 }}
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="apps" size={16} color={!selectedBuilding ? 'white' : (isDark ? '#9CA3AF' : '#6B7280')} />
                                <Text className={!selectedBuilding ? 'text-white font-semibold' : isDark ? 'text-gray-300' : 'text-gray-700'}>
                                    All Buildings
                                </Text>
                            </View>
                        </TouchableOpacity>
                        
                        {buildings.map(building => (
                            <TouchableOpacity
                                key={building.id}
                                onPress={() => setSelectedBuilding(building.id)}
                                className={`mr-2 py-2.5 px-4 rounded-xl ${
                                    selectedBuilding === building.id ? 'bg-blue-600' : isDark ? 'bg-gray-800' : 'bg-white'
                                }`}
                                style={{ elevation: selectedBuilding === building.id ? 4 : 0 }}
                            >
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="business" size={16} color={selectedBuilding === building.id ? 'white' : (isDark ? '#9CA3AF' : '#6B7280')} />
                                    <Text className={selectedBuilding === building.id ? 'text-white font-semibold' : isDark ? 'text-gray-300' : 'text-gray-700'}>
                                        {building.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
            
            {/* Tabs */}
            <View className="flex-row px-4 gap-2 mb-3">
                <TouchableOpacity
                    onPress={() => setActiveTab('rooms')}
                    className={`flex-1 py-3 rounded-xl ${
                        activeTab === 'rooms' ? 'bg-blue-600' : isDark ? 'bg-gray-800' : 'bg-white'
                    }`}
                >
                    <Text className={`text-center font-semibold ${
                        activeTab === 'rooms' ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        Rooms ({rooms.length})
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    onPress={() => setActiveTab('connections')}
                    className={`flex-1 py-3 rounded-xl ${
                        activeTab === 'connections' ? 'bg-blue-600' : isDark ? 'bg-gray-800' : 'bg-white'
                    }`}
                >
                    <Text className={`text-center font-semibold ${
                        activeTab === 'connections' ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        Connections ({connections.length})
                    </Text>
                </TouchableOpacity>
            </View>
            
            {/* Content */}
            <ScrollView
                className="flex-1 px-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {activeTab === 'rooms' ? (
                    rooms.length === 0 ? (
                        <View className="items-center justify-center py-16">
                            <Ionicons name="location-outline" size={64} color={isDark ? '#4B5563' : '#D1D5DB'} />
                            <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                No rooms found
                            </Text>
                            <Text className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'} text-center px-8`}>
                                {selectedBuilding ? 'Try selecting a different building' : 'No navigation data available'}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text className={`text-xs font-semibold uppercase mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {rooms.length} Room{rooms.length !== 1 ? 's' : ''} Found
                            </Text>
                            {rooms.map(room => (
                                <RoomCard key={room.id} room={room} onDelete={loadData} />
                            ))}
                        </View>
                    )
                ) : (
                    connections.length === 0 ? (
                        <View className="items-center justify-center py-16">
                            <Ionicons name="git-network-outline" size={64} color={isDark ? '#4B5563' : '#D1D5DB'} />
                            <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                No connections found
                            </Text>
                            <Text className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'} text-center px-8`}>
                                {selectedBuilding ? 'Try selecting a different building' : 'No connection data available'}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text className={`text-xs font-semibold uppercase mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {connections.length} Connection{connections.length !== 1 ? 's' : ''} Found
                            </Text>
                            {connections.map(connection => (
                                <ConnectionCard key={connection.id} connection={connection} onDelete={loadData} />
                            ))}
                        </View>
                    )
                )}
                
                <View className="h-20" />
            </ScrollView>
            
            {/* Info Box */}
            <View className={`mx-4 mb-4 p-4 rounded-xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} border border-blue-500/30`}>
                <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    💡 <Text className="font-semibold">Note:</Text> To add new rooms or connections, use the backend API or database scripts. This UI is for viewing and deletion only.
                </Text>
            </View>
        </View>
    );
}
