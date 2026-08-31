import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { StarIcon, StorefrontIcon } from "phosphor-react-native";
import type { Tienda } from "../../lib/types";
import { useTheme } from "../../theme/ThemeContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StoreCard({ tienda, onPress }: { tienda: Tienda; onPress: () => void }) {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.97, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 160 }))}
      style={[animStyle, styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
    >
      <View style={[styles.cover, { backgroundColor: tokens.surface2 }]}>
        {tienda.portada ? <Image source={{ uri: tienda.portada }} style={StyleSheet.absoluteFill} /> : <StorefrontIcon size={22} color={tokens.textMuted} style={styles.centerIcon} />}
      </View>
      <View style={{ padding: 12 }}>
        <Text numberOfLines={1} style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13.5, color: tokens.textPrimary }}>
          {tienda.nombre}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2, marginBottom: 6 }}>
          {tienda.municipio}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <StarIcon size={12} weight="fill" color={tokens.warn} />
          <Text style={{ fontSize: 11.5, fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cover: { height: 90 },
  centerIcon: { position: "absolute", top: "50%", left: "50%", marginLeft: -11, marginTop: -11 },
});
