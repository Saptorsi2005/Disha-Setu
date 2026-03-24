import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/use-color-scheme';


const SERVICES = [
    { id: 'tracking', icon: 'analytics-outline', color: '#00D4AA', bg: 'bg-[#00D4AA]/10' },
    { id: 'navigation', icon: 'map-outline', color: '#6366F1', bg: 'bg-[#6366F1]/10' },
    { id: 'feedback', icon: 'chatbubble-ellipses-outline', color: '#F59E0B', bg: 'bg-[#F59E0B]/10' },
    { id: 'impact', icon: 'trophy-outline', color: '#10B981', bg: 'bg-[#10B981]/10' },
];

export default function HeroSection() {
    const { t } = useTranslation();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const { isDark } = useColorScheme();
    const flatListRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const cardWidth = width - 32; // Standard padding of 16 on each side

    useEffect(() => {
        const interval = setInterval(() => {
            let nextIndex = activeIndex + 1;
            if (nextIndex >= SERVICES.length) {
                nextIndex = 0;
            }
            setActiveIndex(nextIndex);
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
        }, 4000); // Scroll every 4 seconds

        return () => clearInterval(interval);
    }, [activeIndex]);

    const renderItem = ({ item }) => (
        <View 
            style={{ width: cardWidth }} 
            className="px-2"
        >
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push(`/learn/${item.id}`)}
                className={`p-8 rounded-[40px] border-2 h-64 flex-row justify-between bg-card`}
                style={{
                    borderColor: item.color + '33', // ~20% opacity
                    shadowColor: item.color,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.1,
                    shadowRadius: 24,
                    elevation: 10
                }}
            >
                <View className="flex-1 justify-between">
                    <View>
                        <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-5 ${item.bg}`}>
                            <Ionicons name={item.icon} size={24} color={item.color} />
                        </View>
                        <Text className="text-txt font-black text-2xl mb-2 tracking-tight">
                            {t(`home.hero.services.${item.id}.title`)}
                        </Text>
                        <Text className="text-txtMuted text-sm leading-5" numberOfLines={2}>
                            {t(`home.hero.services.${item.id}.desc`)}
                        </Text>
                    </View>
                    
                    <View className="flex-row items-center">
                        <View className="bg-surface px-4 py-2 rounded-full border border-cardBorder flex-row items-center gap-2 shadow-sm">
                            <Text className={`text-[11px] font-bold uppercase tracking-wider`} style={{ color: item.color }}>Explore Service</Text>
                            <Ionicons name="arrow-forward" size={12} color={item.color} />
                        </View>
                    </View>
                </View>
                <View className="items-end justify-center">
                    <View className="opacity-5 absolute -right-6 -bottom-6">
                        <Ionicons name={item.icon} size={160} color={item.color} />
                    </View>
                </View>
            </TouchableOpacity>
        </View>

    );

    return (
        <View className="mb-8 pt-8 pb-2">
            <View className="px-8 mb-6">
                <Text className="text-[#00D4AA] text-[9px] font-black uppercase tracking-[3px] mb-2 text-center opacity-80">
                    {t('home.hero.subtitle')}
                </Text>
                <Text className="text-txt text-2xl font-black text-center leading-[32px]">
                    {t('home.hero.title')}
                </Text>
            </View>


            <FlatList
                ref={flatListRef}
                data={SERVICES}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                    setActiveIndex(index);
                }}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                snapToInterval={cardWidth}
                snapToAlignment="center"
                decelerationRate="fast"
            />
            
            {/* Improved Pagination Dots */}
            <View className="flex-row justify-center mt-6 gap-2">
                {SERVICES.map((_, i) => (
                    <View 
                        key={i} 
                        className={`h-1.5 rounded-full ${activeIndex === i ? 'w-8 bg-[#00D4AA]' : 'w-2 bg-cardBorder'}`}
                    />
                ))}
            </View>

        </View>
    );
}

