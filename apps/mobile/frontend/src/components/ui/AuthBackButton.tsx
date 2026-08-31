import { Pressable, StyleSheet, Text } from "react-native";
import { CaretLeftIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";

export function AuthBackButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel="Volver atrás" hitSlop={8} style={styles.row}>
      <CaretLeftIcon size={15} weight="bold" color={tokens.textSecondary} />
      <Text style={[styles.text, { color: tokens.textSecondary }]}>Volver</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  text: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
