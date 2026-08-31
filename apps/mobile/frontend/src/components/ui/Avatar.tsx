import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

interface Props {
  nombre: string;
  foto?: string | null;
  size?: number;
  online?: boolean;
}

export function Avatar({ nombre, foto, size = 40, online }: Props) {
  const { tokens } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      {foto ? (
        <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: tokens.border }} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: tokens.cyanBg }]}>
          <Text style={{ color: tokens.cyan, fontFamily: "SpaceGrotesk_700Bold", fontSize: size * 0.36 }}>{initials(nombre)}</Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: online ? tokens.ok : tokens.textMuted,
              borderColor: tokens.surface1,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", bottom: 0, right: 0, borderWidth: 2 },
});
