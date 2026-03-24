import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/use-color-scheme';

const SERVICE_THEMES = {
    tracking: { icon: 'analytics-outline', color: '#00D4AA', bg: 'bg-[#00D4AA]/10', border: 'border-[#00D4AA]/20' },
    navigation: { icon: 'map-outline', color: '#6366F1', bg: 'bg-[#6366F1]/10', border: 'border-[#6366F1]/20' },
    feedback: { icon: 'chatbubble-ellipses-outline', color: '#F59E0B', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/20' },
    impact: { icon: 'trophy-outline', color: '#10B981', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/20' },
};

export default function LearnMorePage() {
    const { serviceId } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { isDark } = useColorScheme();
    const { width } = useWindowDimensions();
    
    const theme = SERVICE_THEMES[serviceId] || SERVICE_THEMES.tracking;
    const baseKey = `home.hero.services.${serviceId}`;

    const steps = t(`${baseKey}.details.steps`, { returnObjects: true }) || [];
    const benefits = t(`${baseKey}.details.benefits`, { returnObjects: true }) || [];

    return (
        <SafeAreaView className="flex-1 bg-main">
            <View className="flex-row items-center justify-between px-4 py-2 border-b border-cardBorder">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-surface"
                >
                    <Ionicons name="chevron-back" size={20} color={isDark ? '#FFF' : '#000'} />
                </TouchableOpacity>
                <Text className="text-txt font-bold text-lg">{t(`${baseKey}.title`)}</Text>
                <View className="w-10" />
            </View>

            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Hero Header */}
                <View className="px-6 py-8 items-center bg-card mb-6">
                    <View className={`w-20 h-20 rounded-3xl items-center justify-center mb-6 ${theme.bg} border ${theme.border}`}>
                        <Ionicons name={theme.icon} size={44} color={theme.color} />
                    </View>
                    <Text className="text-txt text-3xl font-black text-center mb-4 leading-tight">
                        {t(`${baseKey}.title`)}
                    </Text>
                    <Text className="text-txtMuted text-base text-center leading-6">
                        {t(`${baseKey}.details.about`)}
                    </Text>
                </View>

                {/* How it Works Section */}
                <View className="px-6 mb-8">
                    <View className="flex-row items-center gap-2 mb-6">
                        <View className="w-1.5 h-6 rounded-full bg-[#00D4AA]" />
                        <Text className="text-txt text-xl font-bold">How it Works</Text>
                    </View>

                    {steps.map((step, index) => (
                        <View key={index} className="flex-row gap-4 mb-8">
                            <View className="items-center">
                                <View className={`w-10 h-10 rounded-full items-center justify-center ${theme.bg} border ${theme.border}`}>
                                    <Text className="font-bold text-sm" style={{ color: theme.color }}>{index + 1}</Text>
                                </View>
                                {index !== steps.length - 1 && (
                                    <View className="w-0.5 flex-1 bg-cardBorder my-2" />
                                )}
                            </View>
                            <View className="flex-1 pt-1">
                                <Text className="text-txt font-bold text-lg mb-1">{step.title}</Text>
                                <Text className="text-txtMuted text-sm leading-5">{step.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Key Benefits Section */}
                <View className="px-6">
                    <View className="flex-row items-center gap-2 mb-6">
                        <View className="w-1.5 h-6 rounded-full bg-[#6366F1]" />
                        <Text className="text-txt text-xl font-bold">Key Benefits</Text>
                    </View>

                    <View className="flex-row flex-wrap justify-between gap-y-4">
                        {benefits.map((benefit, index) => (
                            <View 
                                key={index} 
                                style={{ width: (width - 60) / 2 }}
                                className="bg-card p-5 rounded-3xl border border-cardBorder"
                            >
                                <View className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${theme.bg}`}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.color} />
                                </View>

                                <Text className="text-txt font-bold text-base mb-2">{benefit.title}</Text>
                                <Text className="text-txtMuted text-xs leading-4">{benefit.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Call to Action */}
                <View className="px-6 mt-12">
                    <TouchableOpacity 
                        className="w-full py-4 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: theme.color }}
                        onPress={() => router.back()}
                    >
                        <Text className="text-black font-bold text-lg">Got it!</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
