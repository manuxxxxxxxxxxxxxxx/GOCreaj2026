import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { Button } from "../../ui/Button";

interface Props {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "cyan" | "violet" | "coral";
  compact?: boolean;
}

/** Illustrated empty state for store-profile modules (products, reels, live, stories). */
export function StoreEmptyState({ icon, title, description, actionLabel, onAction, tone = "cyan", compact }: Props) {
  const { tokens } = useTheme();
  const bg = tone === "violet" ? tokens.violetBg : tone === "coral" ? tokens.coralBg : tokens.cyanBg;
  const glow = tone === "violet" ? tokens.violetGlow : tone === "coral" ? tokens.cyanGlow : tokens.cyanGlow;
  const fg = tone === "violet" ? tokens.violet : tone === "coral" ? tokens.coral : tokens.cyan;

  return (
    <View style={[styles.container, { paddingVertical: compact ? 22 : 36 }]}>
      <View style={[styles.blob, { backgroundColor: glow }]} />
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <View style={[styles.iconInner, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>{icon}</View>
      </View>
      <Text style={[styles.title, { color: tokens.textPrimary, fontSize: compact ? 13.5 : 15 }]}>{title}</Text>
      {description && <Text style={[styles.desc, { color: tokens.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onPress={onAction} style={{ marginTop: 4 }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 20, gap: 10 },
  blob: { position: "absolute", top: 10, width: 90, height: 90, borderRadius: 45, opacity: 0.6 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  iconInner: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "SpaceGrotesk_600SemiBold", textAlign: "center" },
  desc: { fontSize: 12.5, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
});
