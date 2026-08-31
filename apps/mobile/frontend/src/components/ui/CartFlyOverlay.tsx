import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { ShoppingCartIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { onFly } from "../../lib/cartFly";

const DURATION = 520;

/** Renders the little icon that "flies" from a product's add button to the
 * cart icon in TopBar. Mount once near the root (TabsShell) -- it's an
 * invisible overlay until a fly is triggered. */
export function CartFlyOverlay() {
  const { tokens } = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    return onFly((origin, target) => {
      x.value = origin.x;
      y.value = origin.y;
      opacity.value = 1;
      scale.value = 1;
      x.value = withTiming(target.x, { duration: DURATION, easing: Easing.bezier(0.4, 0, 0.2, 1) });
      y.value = withTiming(target.y, { duration: DURATION, easing: Easing.bezier(0.4, 0, 0.2, 1) });
      opacity.value = withDelay(DURATION - 140, withTiming(0, { duration: 140 }));
      scale.value = withDelay(DURATION - 180, withTiming(0.3, { duration: 180 }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - 14 }, { translateY: y.value - 14 }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.dot, style, { backgroundColor: tokens.cyan, shadowColor: tokens.cyan }]}>
      <ShoppingCartIcon size={15} weight="fill" color={tokens.cyanInk} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
