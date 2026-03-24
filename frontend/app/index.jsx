import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function SplashScreen() {
    const router = useRouter();
    const logoScale = useRef(new Animated.Value(0.85)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => router.replace('/onboarding'), 2500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-black items-center justify-center">
            <Animated.View
                style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}
                className="items-center"
            >
                <View
                    className="w-64 h-64 items-center justify-center"
                >
                    <ExpoImage
                        source={require('../assets/images/loading_logo.svg')}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                    />
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}
