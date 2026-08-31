import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme/ThemeContext";
import { radius, glowShadow } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props {
  children: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Marks this as the one hero CTA on screen -- adds a slow shine sweep.
   * Use on at most one button per screen. */
  hero?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 34, paddingHorizontal: 14, fontSize: 12.5 },
  md: { height: 44, paddingHorizontal: 20, fontSize: 14 },
  lg: { height: 52, paddingHorizontal: 24, fontSize: 15 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ children, icon, onPress, variant = "primary", size = "md", loading, disabled, fullWidth, hero, style }: Props) {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  const sweepX = useSharedValue(-1);
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const bg = variant === "primary" ? tokens.cyan : variant === "danger" ? tokens.danger : variant === "secondary" ? tokens.surface2 : "transparent";
  const fg = variant === "primary" ? tokens.cyanInk : variant === "danger" ? "#FFFFFF" : tokens.textPrimary;
  const borderColor = variant === "secondary" ? tokens.border : "transparent";

  useEffect(() => {
    if (hero && variant === "primary" && !isDisabled) {
      sweepX.value = withRepeat(withSequence(withTiming(-1, { duration: 0 }), withDelay(1400, withTiming(2, { duration: 900 }))), -1, false);
    }
  }, [hero, variant, isDisabled]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sweepX.value * 220 }, { rotate: "18deg" }] }));

  return (
    <AnimatedPressable
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 14, stiffness: 260 });
        if (!isDisabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 220 }))}
      style={[
        animStyle,
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: isDisabled ? 0.5 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        variant === "primary" && !isDisabled ? glowShadow(tokens.cyanGlow, "sm") : null,
        style,
      ]}
    >
      {hero && variant === "primary" && !isDisabled && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[sweepStyle, styles.sweep]}>
            <LinearGradient colors={["transparent", "rgba(255,255,255,0.35)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      )}
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg, fontFamily: "SpaceGrotesk_600SemiBold", fontSize: s.fontSize }}>{children}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.sm, overflow: "hidden" },
  sweep: { position: "absolute", top: -20, bottom: -20, width: 40 },
});
