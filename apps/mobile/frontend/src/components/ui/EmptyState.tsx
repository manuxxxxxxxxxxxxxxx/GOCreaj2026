import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "./Button";

interface Props {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const { tokens } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: tokens.surface2 }]}>{icon}</View>
      <Text style={[styles.title, { color: tokens.textPrimary }]}>{title}</Text>
      {description && <Text style={[styles.desc, { color: tokens.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button size="sm" onPress={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 40, gap: 10 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", textAlign: "center" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 280 },
});
