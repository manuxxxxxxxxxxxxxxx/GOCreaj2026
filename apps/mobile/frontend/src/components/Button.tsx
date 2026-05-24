import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}

export default function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, icon, style, full = true
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  const bg = isPrimary ? Colors.accent
            : isDanger ? Colors.danger
            : isSecondary ? Colors.contrast
            : 'transparent';
  const color = isPrimary || isDanger ? Colors.contrast
              : isSecondary ? Colors.text
              : Colors.accent;
  const borderColor = isSecondary ? Colors.border : isGhost ? Colors.accent : bg;

  const hasShadow = (variant === 'primary' || variant === 'danger') && !disabled && !loading;

  const onPressIn = (): void => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  const onPressOut = (): void => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.btn,
          { backgroundColor: bg, borderColor },
          full && { width: '100%' },
          (disabled || loading) && { opacity: 0.6 },
          hasShadow && styles.shadow,
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator color={color} size="small" />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={18} color={color} style={{ marginRight: Spacing.sm }} /> : null}
            <Text style={[styles.label, { color }]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  label: {
    fontSize: Fonts.regular,
    fontWeight: '600',
    letterSpacing: 0.3
  }
});
