import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { CheckCircleIcon } from "phosphor-react-native";
import { interaccionesApi, chatApi, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../theme/ThemeContext";
import { Sheet } from "../ui/Sheet";

export type ReportTipo = "reel" | "producto" | "tienda" | "comentario" | "chat";

const MOTIVOS = [
  "Contenido inapropiado",
  "Información falsa o engañosa",
  "Spam o publicidad no deseada",
  "Producto prohibido o ilegal",
  "Suplantación de otra tienda",
  "Otro motivo",
];

const TITULOS: Record<ReportTipo, string> = {
  reel: "Reportar video",
  producto: "Reportar producto",
  tienda: "Reportar tienda",
  comentario: "Reportar comentario",
  chat: "Reportar conversación",
};

/** Sheet genérico de reportes (equivalente al de web) -- cubre reels, productos, tiendas,
 * comentarios de reels y conversaciones de chat (punto 6). */
export function ReportSheet({
  tipo,
  entidadId,
  entidadNombre,
  onClose,
}: {
  tipo: ReportTipo;
  entidadId: number;
  entidadNombre?: string;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const toast = useToast();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    if (!usuario) return onClose();
    if (!motivo) return;
    setEnviando(true);
    try {
      if (tipo === "reel" || tipo === "producto") {
        await interaccionesApi.reportarProducto(entidadId, motivo + (detalle.trim() ? ` — ${detalle.trim()}` : ""));
      } else if (tipo === "tienda") {
        await interaccionesApi.reportarTienda(entidadId, motivo, detalle.trim() || undefined);
      } else if (tipo === "comentario") {
        await interaccionesApi.reportarComentario(entidadId, motivo, detalle.trim() || undefined);
      } else {
        await chatApi.reportar(entidadId, motivo, detalle.trim() || undefined);
      }
      setEnviado(true);
      toast.show("Reporte enviado. Gracias por avisarnos.", "success");
      setTimeout(onClose, 1100);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el reporte.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const titulo = TITULOS[tipo];

  if (enviado) {
    return (
      <Sheet visible onClose={onClose} title={titulo}>
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 24 }}>
          <CheckCircleIcon size={40} weight="fill" color={tokens.ok} />
          <Text style={{ fontSize: 13.5, textAlign: "center", color: tokens.textPrimary }}>Recibimos tu reporte. Nuestro equipo lo va a revisar.</Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible onClose={onClose} title={titulo}>
      <Text style={{ fontSize: 12.5, color: tokens.textSecondary, marginBottom: 14 }}>
        {entidadNombre ? `¿Por qué reportas "${entidadNombre}"?` : "¿Por qué quieres reportar esto?"}
      </Text>
      <View style={{ gap: 8, marginBottom: 14 }}>
        {MOTIVOS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMotivo(m)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: motivo === m ? tokens.danger : tokens.border,
              backgroundColor: motivo === m ? tokens.dangerBg : tokens.surface2,
            }}
          >
            <View
              style={{
                width: 15,
                height: 15,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: motivo === m ? tokens.danger : tokens.borderStrong,
                backgroundColor: motivo === m ? tokens.danger : "transparent",
              }}
            />
            <Text style={{ fontSize: 13, color: motivo === m ? tokens.dangerInk : tokens.textPrimary }}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={detalle}
        onChangeText={setDetalle}
        placeholder="Cuéntanos más (opcional)"
        placeholderTextColor={tokens.textMuted}
        multiline
        numberOfLines={3}
        style={{
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.surface1,
          borderRadius: 12,
          padding: 10,
          fontSize: 13,
          color: tokens.textPrimary,
          marginBottom: 14,
          minHeight: 64,
          textAlignVertical: "top",
        }}
      />
      <Pressable
        onPress={enviar}
        disabled={!motivo || enviando}
        style={{
          height: 44,
          borderRadius: 12,
          backgroundColor: tokens.danger,
          alignItems: "center",
          justifyContent: "center",
          opacity: !motivo || enviando ? 0.55 : 1,
        }}
      >
        <Text style={{ color: tokens.dangerInk, fontWeight: "700", fontSize: 13.5 }}>{enviando ? "Enviando…" : "Enviar reporte"}</Text>
      </Pressable>
    </Sheet>
  );
}
