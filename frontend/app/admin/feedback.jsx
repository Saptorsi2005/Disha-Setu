/**
 * app/admin/feedback.jsx
 * Admin Feedback Management - View and manage all feedback
 */
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getAllFeedback, updateFeedbackStatus, deleteFeedback } from '../../services/adminService';

function FeedbackCard({ feedback, onStatusChange, onDelete }) {
    const { isDark } = useColorScheme();
    const [showActions, setShowActions] = useState(false);
    
    const statusColors = {
        'Pending': 'text-yellow-500',
        'Under Review': 'text-blue-500',
        'Resolved': 'text-green-500',
        'Rejected': 'text-red-500',
    };
    
    const handleStatusChange = async (newStatus) => {
        try {
            await updateFeedbackStatus(feedback.id, newStatus);
            onStatusChange();
            setShowActions(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to update status');
        }
    };
    
    const handleDelete = () => {
        Alert.alert(
            'Delete Feedback',
            `Are you sure you want to delete ticket ${feedback.ticket_id}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteFeedback(feedback.id);
                            onDelete();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete feedback');
                        }
                    }
                }
            ]
        );
    };
    
    return (
        <View className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-3`}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-2">
                <Text className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {feedback.ticket_id}
                </Text>
                <Text className={`text-sm font-semibold ${statusColors[feedback.status]}`}>
                    {feedback.status}
                </Text>
            </View>
            
            {/* Category & Project */}
            <View className="flex-row items-center mb-2">
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mr-4`}>
                    📁 {feedback.category}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} flex-1`} numberOfLines={1}>
                    📍 {feedback.project_area || 'No area'}
                </Text>
            </View>
            
            {/* Description */}
            <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`} numberOfLines={2}>
                {feedback.description}
            </Text>
            
            {/* User Info */}
            {feedback.user_name && (
                <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
                    By: {feedback.user_name} {feedback.user_phone && `(${feedback.user_phone})`}
                </Text>
            )}
            
            {/* Actions */}
            {!showActions ? (
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => setShowActions(true)}
                        className="flex-1 bg-blue-600 py-2 px-4 rounded-xl"
                    >
                        <Text className="text-white text-center font-semibold">Change Status</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleDelete}
                        className="bg-red-600 py-2 px-4 rounded-xl"
                    >
                        <Text className="text-white text-center font-semibold">Delete</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                        Select new status:
                    </Text>
                    <View className="flex-row gap-2 flex-wrap">
                        {['Pending', 'Under Review', 'Resolved', 'Rejected'].map(status => (
                            <TouchableOpacity
                                key={status}
                                onPress={() => handleStatusChange(status)}
                                className={`py-2 px-3 rounded-lg ${
                                    feedback.status === status
                                        ? 'bg-blue-600'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                            >
                                <Text className={
                                    feedback.status === status
                                        ? 'text-white text-xs font-semibold'
                                        : `text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`
                                }>
                                    {status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowActions(false)}
                        className="mt-2"
                    >
                        <Text className="text-blue-500 text-center text-sm">Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

export default function AdminFeedbackManagement() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState({ status: '', category: '' });
    
    const loadFeedback = useCallback(async () => {
        try {
            const data = await getAllFeedback(filter);
            setFeedback(data.feedback || []);
        } catch (err) {
            console.error('Failed to load feedback:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);
    
    useEffect(() => {
        if (user?.role !== 'admin') {
            router.replace('/');
            return;
        }
        
        loadFeedback();
    }, [user, filter]);
    
    const onRefresh = () => {
        setRefreshing(true);
        loadFeedback();
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
            <View className={`p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Text className="text-blue-500 text-base">← Back to Dashboard</Text>
                </TouchableOpacity>
                
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Feedback Management
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    {feedback.length} feedback reports
                </Text>
            </View>
            
            {/* Filters */}
            <View className="p-4">
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => setFilter({ ...filter, status: '' })}
                        className={`py-2 px-4 rounded-full ${
                            filter.status === '' ? 'bg-blue-600' : isDark ? 'bg-gray-800' : 'bg-white'
                        }`}
                    >
                        <Text className={filter.status === '' ? 'text-white font-semibold' : isDark ? 'text-gray-300' : 'text-gray-700'}>
                            All
                        </Text>
                    </TouchableOpacity>
                    
                    {['Pending', 'Under Review', 'Resolved'].map(status => (
                        <TouchableOpacity
                            key={status}
                            onPress={() => setFilter({ ...filter, status })}
                            className={`py-2 px-4 rounded-full ${
                                filter.status === status ? 'bg-blue-600' : isDark ? 'bg-gray-800' : 'bg-white'
                            }`}
                        >
                            <Text className={filter.status === status ? 'text-white font-semibold' : isDark ? 'text-gray-300' : 'text-gray-700'}>
                                {status}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            
            {/* Feedback List */}
            <ScrollView
                className="flex-1 px-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {feedback.length === 0 ? (
                    <View className="items-center justify-center py-12">
                        <Text className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            No feedback found
                        </Text>
                    </View>
                ) : (
                    feedback.map((item) => (
                        <FeedbackCard
                            key={item.id}
                            feedback={item}
                            onStatusChange={loadFeedback}
                            onDelete={loadFeedback}
                        />
                    ))
                )}
            </ScrollView>
        </View>
    );
}
