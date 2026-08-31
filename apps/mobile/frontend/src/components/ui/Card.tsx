import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeContext";
import { radius, spacing } from "../../theme/tokens";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, onPress, style }: Props) {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const base = [styles.base, { backgroundColor: tokens.surface1, borderColor: tokens.border }, style];
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.98, { duration: 90 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 160 }))}
        style={[animStyle, base]}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
});
