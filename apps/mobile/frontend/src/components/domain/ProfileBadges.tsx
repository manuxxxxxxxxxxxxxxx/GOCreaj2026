import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export interface ProfileBadge {
  icon: React.ReactNode;
  label: string;
  achieved: boolean;
}

/** Fila de insignias logradas del perfil. Solo se muestran las cumplidas para no saturar. */
export function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  const { tokens } = useTheme();
  const logradas = badges.filter((b) => b.achieved);
  if (logradas.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {logradas.map((b) => (
        <View key={b.label} style={[styles.chip, { backgroundColor: tokens.warnBg }]}>
          {b.icon}
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.warn }}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
});
