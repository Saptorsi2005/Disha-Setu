import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import Animated, { 
    useSharedValue, 
    useAnimatedProps, 
    withRepeat, 
    withTiming, 
    Easing,
    withSequence,
    interpolateColor,
    useAnimatedStyle
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width } = Dimensions.get('window');

/**
 * Renders a "Subway Line" style visual path 
 * for the Zero-Reading Navigation System
 */
export default function ZeroReadPathUI({ directions, currentStepIndex }) {
    // Flowing animation for active edges
    const dashOffset = useSharedValue(100);
    
    // Pulsing animation for the current node/destination
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0.7);

    useEffect(() => {
        // Continuous flowing animation for the dashed line
        dashOffset.value = withRepeat(
            withTiming(0, { duration: 1200, easing: Easing.linear }),
            -1, // infinite
            false
        );

        // Continuous pulse for the active marker
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.6, { duration: 800, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 400, easing: Easing.in(Easing.ease) })
            ),
            -1,
            false
        );

        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
                withTiming(0.7, { duration: 400, easing: Easing.in(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const animatedLineProps = useAnimatedProps(() => ({
        strokeDashoffset: dashOffset.value,
    }));

    const animatedPulseProps = useAnimatedProps(() => ({
        r: 12 * pulseScale.value,
        opacity: pulseOpacity.value,
    }));

    if (!directions || directions.length === 0) return null;

    // Layout configuration
    const svgHeight = Math.max(directions.length * 100 + 40, 300);
    const centerX = 80;

    return (
        <View style={styles.container}>
            <Svg width="100%" height={svgHeight}>
                <Defs>
                    <LinearGradient id="activeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#00D4AA" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
                    </LinearGradient>
                </Defs>

                {/* Draw Edges */}
                {directions.map((step, i) => {
                    if (i === directions.length - 1) return null; // No line after last node
                    const startY = 40 + (i * 100);
                    const endY = 40 + ((i + 1) * 100);

                    const isPast = i < currentStepIndex;
                    const isActive = i === currentStepIndex || (currentStepIndex === -1 && i === 0);
                    const isFuture = i > currentStepIndex;

                    if (isActive) {
                        return (
                            <G key={`edge-${i}`}>
                                {/* Background faint line */}
                                <Line x1={centerX} y1={startY} x2={centerX} y2={endY} stroke="#1A2035" strokeWidth="8" />
                                {/* Animated flowing dash */}
                                <AnimatedLine
                                    x1={centerX} y1={startY} x2={centerX} y2={endY}
                                    stroke="url(#activeGrad)"
                                    strokeWidth="8"
                                    strokeDasharray="15, 10"
                                    animatedProps={animatedLineProps}
                                />
                            </G>
                        );
                    }

                    return (
                        <Line
                            key={`edge-${i}`}
                            x1={centerX} y1={startY} x2={centerX} y2={endY}
                            stroke={isPast ? '#2D3548' : '#3B82F6'}
                            strokeWidth="8"
                            strokeOpacity={isPast ? 1 : 0.4}
                        />
                    );
                })}

                {/* Draw Nodes */}
                {directions.map((step, i) => {
                    const y = 40 + (i * 100);
                    const isPast = i < currentStepIndex;
                    const isCurrent = i === currentStepIndex || (currentStepIndex === -1 && i === 0);
                    const isDestination = i === directions.length - 1;

                    let nodeColor = '#3B82F6';
                    if (isPast) nodeColor = '#2D3548';
                    if (isCurrent) nodeColor = '#00D4AA';
                    if (isDestination && !isPast) nodeColor = '#F59E0B'; // Gold for destination

                    return (
                        <G key={`node-${i}`}>
                            {/* Pulse effect for current node or destination */}
                            {(isCurrent || (isDestination && isFutureNode(i, currentStepIndex))) && (
                                <AnimatedCircle
                                    cx={centerX}
                                    cy={y}
                                    fill={nodeColor}
                                    animatedProps={animatedPulseProps}
                                />
                            )}
                            
                            {/* Solid center dot */}
                            <Circle
                                cx={centerX}
                                cy={y}
                                r="12"
                                fill={isPast ? '#1A2035' : '#0A0F1E'}
                                stroke={nodeColor}
                                strokeWidth="6"
                            />
                        </G>
                    );
                })}
            </Svg>
        </View>
    );

    function isFutureNode(idx, currentIdx) {
        if (currentIdx === -1) return true;
        return idx >= currentIdx;
    }
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#0A0F1E',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1A2035'
    }
});
