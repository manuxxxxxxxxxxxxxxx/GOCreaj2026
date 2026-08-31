import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../theme/ThemeContext";
import { glowShadow } from "../theme/tokens";
import type { TabDef } from "./tabConfig";

export function BottomTabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabDef[] }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>
      <View style={[styles.bar, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = tabs[index];
          if (!tab) return null;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return <TabBarItem key={route.key} tab={tab} focused={focused} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

function TabBarItem({ tab, focused, onPress }: { tab: TabDef; focused: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  const Icon = tab.icon;
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (focused) iconScale.value = withSequence(withTiming(1.25, { duration: 130 }), withSpring(1, { damping: 9, stiffness: 260 }));
  }, [focused]);

  // Computed in plain JS (not inside the worklet below) -- glowShadow() is a
  // regular function, and calling non-worklet functions from inside
  // useAnimatedStyle crashes on a real device (Reanimated runs that callback
  // on the UI thread there). The result is just a plain object, which a
  // worklet can safely capture by reference.
  const glow = glowShadow(tokens.cyanGlow, "sm");
  const pillStyle = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0, { damping: 20, stiffness: 260 }),
    transform: [{ scale: withSpring(focused ? 1 : 0.7, { damping: 20, stiffness: 260 }) }],
    ...(focused ? glow : null),
  }));
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(focused ? -2 : 0, { damping: 16, stiffness: 220 }) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={focused ? { selected: true } : {}} style={styles.item}>
      <Animated.View style={liftStyle}>
        <View style={styles.pillSlot}>
          <Animated.View style={[styles.pill, pillStyle, { backgroundColor: tokens.cyanBg }]} />
          <Animated.View style={iconStyle}>
            <Icon size={19} weight={focused ? "fill" : "regular"} color={focused ? tokens.cyan : tokens.textMuted} />
          </Animated.View>
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: focused ? tokens.cyan : tokens.textMuted, fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium", opacity: focused ? 1 : 0.85 },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, bottom: 0 },
  bar: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: "center" },
  pillSlot: { width: 44, height: 32, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", width: 44, height: 32, borderRadius: 16 },
  label: { fontSize: 9.5, marginTop: 2 },
});
