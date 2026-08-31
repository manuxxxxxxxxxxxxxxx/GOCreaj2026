import { StyleSheet, Text, View } from "react-native";
import { WarningCircleIcon } from "phosphor-react-native";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ visible, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger, loading, onConfirm, onCancel }: Props) {
  const { tokens } = useTheme();
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: danger ? tokens.dangerBg : tokens.cyanBg }]}>
          <WarningCircleIcon size={26} weight="bold" color={danger ? tokens.danger : tokens.cyan} />
        </View>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>{title}</Text>
        <Text style={[styles.desc, { color: tokens.textSecondary }]}>{description}</Text>
        <View style={styles.actions}>
          <Button variant="secondary" onPress={onCancel} disabled={loading} style={{ flex: 1 }}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onPress={onConfirm} loading={loading} style={{ flex: 1 }}>
            {confirmLabel}
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12, paddingTop: 4, paddingBottom: 20 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", textAlign: "center" },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
});
