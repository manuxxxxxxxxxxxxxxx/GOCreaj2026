import { useEffect } from "react";
import { StyleSheet, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";

interface Props {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}

export function Skeleton({ width = "100%", height = 16, radius: r = radius.sm }: Props) {
  const { tokens } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.base, style, { width, height, borderRadius: r, backgroundColor: tokens.surface2 }]} />;
}

const styles = StyleSheet.create({ base: {} });
