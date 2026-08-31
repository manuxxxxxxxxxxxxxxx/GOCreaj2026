import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";

interface Props {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  size?: number;
  active?: boolean;
  badge?: number | string;
  pulse?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

export function IconButton({ icon, label, onPress, size = 40, active, badge, pulse }: Props) {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.9);
  const badgeScale = useSharedValue(1);
  const prevBadge = useRef(badge);

  useEffect(() => {
    if (pulse) {
      pulseOpacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 900 }), withTiming(0.9, { duration: 900 })), -1, true);
    }
  }, [pulse]);

  useEffect(() => {
    if (badge !== prevBadge.current && badge) {
      badgeScale.value = withSequence(withTiming(1.4, { duration: 140 }), withTiming(0.9, { duration: 110 }), withTiming(1, { duration: 100 }));
    }
    prevBadge.current = badge;
  }, [badge]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));
  const badgeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));

  const showBadge = badge !== undefined && badge !== null && badge !== 0 && badge !== "0";

  return (
    <AnimatedPressable
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.85, { duration: 80 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => (scale.value = withTiming(1, { duration: 160 }))}
      style={[
        animStyle,
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: active ? tokens.cyanBg : tokens.surface2,
          borderColor: active ? tokens.cyan : tokens.border,
        },
      ]}
    >
      {icon}
      {pulse && <AnimatedView pointerEvents="none" style={[pulseStyle, styles.pulseRing, { borderColor: tokens.cyan }]} />}
      {showBadge && (
        <AnimatedView style={[badgeAnimStyle, styles.badge, { backgroundColor: tokens.cyan, borderColor: tokens.bg }]}>
          <Text style={[styles.badgeText, { color: tokens.cyanInk }]}>{typeof badge === "number" && badge > 99 ? "99+" : badge}</Text>
        </AnimatedView>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", top: -3, left: -3, right: -3, bottom: -3, borderRadius: radius.sm + 3, borderWidth: 2 },
  badge: { position: "absolute", top: -6, right: -6, minWidth: 17, height: 17, borderRadius: radius.pill, borderWidth: 2, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { fontSize: 9.5, fontFamily: "IBMPlexMono_500Medium" },
});
