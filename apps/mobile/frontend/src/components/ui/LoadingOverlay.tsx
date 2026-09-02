import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeContext";

/** Overlay de pantalla completa para operaciones que tardan (crear tienda, subir fotos).
 * Rota entre `messages` cada `interval`ms para que la espera se sienta como progreso
 * real y no como un spinner ciego. */
export function LoadingOverlay({ messages, interval = 1400 }: { messages: string[]; interval?: number }) {
  const { tokens } = useTheme();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), interval);
    return () => clearInterval(t);
  }, [messages.length, interval]);

  return (
    <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: tokens.bg + "F2" }]}>
      <ActivityIndicator size="large" color={tokens.cyan} />
      <Text style={[styles.text, { color: tokens.textSecondary }]}>{messages[i] ?? messages[0]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", gap: 16, zIndex: 50 },
  text: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 40 },
});
