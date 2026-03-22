import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

/**
 * Renders a massive icon-based action overlay 
 * zero-reading navigation 
 */
export default function ZeroReadOverlayUI({ currentStep, totalSteps, currentIndex }) {
    if (!currentStep) return null;

    const { instruction, roomType, roomName, floorNumber } = currentStep;

    // Determine the immediate primary action icon
    let actionIcon = 'arrow-up'; // Default: straight forward
    let actionColor = '#3B82F6';
    let secondaryContextIcon = null;

    if (instruction.includes('Arrive')) {
        actionIcon = 'flag';
        actionColor = '#10B981'; // Green for success
    } else if (instruction.includes('Start')) {
        actionIcon = 'walk';
        actionColor = '#F59E0B'; // Gold for start
    } else if (roomType === 'elevator') {
        actionIcon = 'arrow-up-circle';
        actionColor = '#8B5CF6'; // Purple for vertical movement
    } else if (roomType === 'stairs') {
        actionIcon = 'footsteps';
        actionColor = '#8B5CF6';
    } else if (roomType === 'entrance' || roomType === 'exit') {
        actionIcon = 'enter-outline';
        actionColor = '#F59E0B';
    } else if (instruction.includes('Proceed') || instruction.includes('Continue')) {
        // Just a massive straight arrow
        actionIcon = 'arrow-up-outline';
        actionColor = '#3B82F6';
    }

    // Determine context (e.g. going to a lab / restroom) if not an elevator/stairs
    if (roomType === 'restroom') secondaryContextIcon = 'man-outline';
    else if (roomType === 'lab') secondaryContextIcon = 'flask-outline';
    else if (roomType === 'emergency') secondaryContextIcon = 'medical-outline';
    else if (roomType === 'pharmacy' || roomType === 'shop') secondaryContextIcon = 'cart-outline';

    return (
        <Animated.View 
            entering={FadeInDown.duration(400)} 
            exiting={FadeOutUp.duration(300)}
            style={styles.card}
        >
            {/* The Massive Icon Frame */}
            <View style={[styles.iconFrame, { backgroundColor: `${actionColor}20`, borderColor: actionColor }]}>
                <Ionicons name={actionIcon} size={80} color={actionColor} />
            </View>

            {/* Context/Location (Full Instruction Display) */}
            <View style={styles.contextRow}>
                {secondaryContextIcon && (
                    <Ionicons name={secondaryContextIcon} size={28} color="#9CA3AF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.instructionText} numberOfLines={2}>{instruction}</Text>
            </View>
            
            {floorNumber !== undefined && (
                <View style={styles.floorBadge}>
                    <Text style={styles.floorText}>L{floorNumber}</Text>
                </View>
            )}

            {/* Zero-Text Progress Indicator */}
            <View style={styles.progressContainer}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <React.Fragment key={i}>
                        <View style={[
                            styles.dot, 
                            i < currentIndex ? styles.dotPast 
                            : i === currentIndex ? styles.dotCurrent 
                            : styles.dotFuture 
                        ]} />
                        {i < totalSteps - 1 && (
                            <View style={[
                                styles.line, 
                                i < currentIndex ? styles.linePast : styles.lineFuture
                            ]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1A2035',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2D3548',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
        marginBottom: 20,
    },
    iconFrame: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        marginBottom: 16,
    },
    contextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    instructionText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
    },
    floorBadge: {
        backgroundColor: '#374151',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 20,
    },
    floorText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dotPast: {
        backgroundColor: '#10B981', // Green
    },
    dotCurrent: {
        backgroundColor: '#3B82F6', // Blue
        transform: [{ scale: 1.5 }],
    },
    dotFuture: {
        backgroundColor: '#374151', // Gray
    },
    line: {
        flex: 1,
        height: 3,
        marginHorizontal: 4,
        borderRadius: 2,
    },
    linePast: {
        backgroundColor: '#10B981',
    },
    lineFuture: {
        backgroundColor: '#374151',
    }
});
