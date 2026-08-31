import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowBendUpLeftIcon } from "phosphor-react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { radius } from "../../../theme/tokens";
import { Sheet } from "../../ui/Sheet";
import { EmojiGrid } from "./EmojiPickerSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
}

/** Acciones sobre un mensaje del chat, abiertas con long-press: responder o reaccionar. */
export function MessageActionsSheet({ visible, onClose, onReply, onReact }: Props) {
  const { tokens } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="Mensaje">
      <Pressable
        onPress={() => {
          onReply();
          onClose();
        }}
        style={[styles.replyRow, { borderColor: tokens.border, backgroundColor: tokens.surface2 }]}
      >
        <ArrowBendUpLeftIcon size={16} color={tokens.cyan} />
        <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Responder</Text>
      </Pressable>

      <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Reaccionar
      </Text>
      <View style={{ marginBottom: 6 }}>
        <EmojiGrid
          onSelect={(e) => {
            onReact(e);
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  replyRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, marginBottom: 18 },
});
