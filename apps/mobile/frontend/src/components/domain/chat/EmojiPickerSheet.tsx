import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { Sheet } from "../../ui/Sheet";
import { EMOJI_GROUPS } from "./emojiGroups";

interface GridProps {
  onSelect: (emoji: string) => void;
}

/** Grilla de emojis reutilizable (sin dependencias externas), para el compositor y las reacciones. */
export function EmojiGrid({ onSelect }: GridProps) {
  const { tokens } = useTheme();
  return (
    <View>
      {EMOJI_GROUPS.map((g) => (
        <View key={g.titulo} style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {g.titulo}
          </Text>
          <View style={styles.grid}>
            {g.emojis.map((e) => (
              <Pressable key={e} onPress={() => onSelect(e)} style={[styles.cell, { backgroundColor: tokens.surface2 }]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

/** Selector de emoji para insertar texto en el compositor del chat. */
export function EmojiPickerSheet({ visible, onClose, onSelect }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Emojis">
      <EmojiGrid
        onSelect={(e) => {
          onSelect(e);
          onClose();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
