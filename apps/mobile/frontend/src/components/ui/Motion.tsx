import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

/** Staggered entrance for list/grid items. Caps the stagger at 9 items so a
 * long list doesn't take forever to finish revealing. */
export function AnimatedListItem({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  // Sin .springify(): un fundido con deslizamiento simple, sin el rebote/sobregiro de un
  // resorte poco amortiguado (se veía como un salto exagerado al entrar cada tarjeta).
  return (
    <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 9) * 40)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Whole-screen mount reveal for non-list content (detail screens, forms). */
export function ScreenReveal({ children, style, delay = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Simple cross-fade for content that shouldn't slide (avatars, images). */
export function FadeReveal({ children, style, delay = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
