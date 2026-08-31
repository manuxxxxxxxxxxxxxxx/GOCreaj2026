import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { FilePdfIcon, PaperPlaneTiltIcon, TrashIcon } from "phosphor-react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { radius } from "../../../theme/tokens";
import { Sheet } from "../../ui/Sheet";

export interface PendienteAdjunto {
  uri: string;
  kind: "imagen" | "video" | "pdf";
  nombre?: string;
  tamano?: number;
}

interface Props {
  pendiente: PendienteAdjunto | null;
  enviando: boolean;
  onCancel: () => void;
  onConfirm: (caption: string) => void;
}

function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Confirmación previa a enviar un adjunto en el chat -- nada se manda sin que el usuario vea y apruebe la vista previa. */
export function AttachmentPreviewSheet({ pendiente, enviando, onCancel, onConfirm }: Props) {
  const { tokens } = useTheme();
  const [caption, setCaption] = useState("");

  const player = useVideoPlayer(pendiente?.kind === "video" ? pendiente.uri : "", (p) => {
    p.loop = true;
  });

  if (!pendiente) return null;

  const titulo = pendiente.kind === "imagen" ? "Enviar foto" : pendiente.kind === "video" ? "Enviar video" : "Enviar documento";

  const confirmar = () => {
    onConfirm(caption.trim());
    setCaption("");
  };

  return (
    <Sheet visible onClose={onCancel} title={titulo}>
      <View style={{ borderRadius: radius.md, overflow: "hidden", backgroundColor: tokens.surface2, marginBottom: 14, minHeight: pendiente.kind === "pdf" ? 90 : 240 }}>
        {pendiente.kind === "imagen" && <Image source={{ uri: pendiente.uri }} style={{ width: "100%", height: 260 }} resizeMode="contain" />}
        {pendiente.kind === "video" && <VideoView player={player} style={{ width: "100%", height: 260 }} nativeControls />}
        {pendiente.kind === "pdf" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 18 }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.sm, backgroundColor: tokens.dangerBg, alignItems: "center", justifyContent: "center" }}>
              <FilePdfIcon size={24} weight="fill" color={tokens.danger} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{pendiente.nombre ?? "Documento.pdf"}</Text>
              {pendiente.tamano ? <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>{tamanoLegible(pendiente.tamano)}</Text> : null}
            </View>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
        <Pressable onPress={onCancel} disabled={enviando} style={[styles.roundBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <TrashIcon size={18} color={tokens.danger} />
        </Pressable>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Agrega un mensaje (opcional)…"
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { borderColor: tokens.border, color: tokens.textPrimary }]}
        />
        <Pressable onPress={confirmar} disabled={enviando} style={[styles.roundBtn, { backgroundColor: tokens.cyan, opacity: enviando ? 0.6 : 1 }]}>
          <PaperPlaneTiltIcon size={18} weight="fill" color={tokens.cyanInk} />
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = {
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center" as const, justifyContent: "center" as const },
  input: { flex: 1, height: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, fontSize: 13.5 },
};
