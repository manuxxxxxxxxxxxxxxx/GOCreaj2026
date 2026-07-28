import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 12,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/* Helpers compuestos listos para usar */
export function SkeletonCard({ height = 180 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
      marginBottom: 12,
    }}>
      <Skeleton height={height} radius={16} />
      <View style={{ height: 12 }} />
      <Skeleton width="70%" height={14} radius={8} />
      <View style={{ height: 8 }} />
      <Skeleton width="40%" height={12} radius={6} />
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <Skeleton width={48} height={48} radius={24} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="65%" height={14} radius={7} />
        <View style={{ height: 6 }} />
        <Skeleton width="40%" height={11} radius={6} />
      </View>
    </View>
  );
}
