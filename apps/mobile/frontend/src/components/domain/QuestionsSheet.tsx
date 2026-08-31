import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PaperPlaneTiltIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import type { Producto } from "../../lib/types";
import { chatApi, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../theme/ThemeContext";
import { Sheet } from "../ui/Sheet";

const PREGUNTAS_RAPIDAS = [
  "¿Está disponible ahora mismo?",
  "¿Hacen envíos a mi zona?",
  "¿Aceptan pago con tarjeta?",
  "¿Cuánto tarda la entrega?",
  "¿Tienen otros colores o tamaños?",
  "¿Hacen descuento por cantidad?",
];

export function QuestionsSheet({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const [enviando, setEnviando] = useState<string | null>(null);

  const preguntar = async (pregunta: string) => {
    if (!usuario) return onClose();
    setEnviando(pregunta);
    try {
      const r = await chatApi.desdeProducto(producto.id, pregunta);
      toast.show("Pregunta enviada a la tienda", "success");
      onClose();
      navigation.navigate("ChatThread", { otroId: r.otro_id });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la pregunta.", "error");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={`Preguntar a ${producto.tienda_nombre ?? "la tienda"}`}>
      <Text style={{ fontSize: 12.5, color: tokens.textSecondary, marginBottom: 14 }}>
        Elige una pregunta rápida — se envía directo al chat de la tienda con este producto adjunto.
      </Text>
      <View style={{ gap: 8, paddingBottom: 8 }}>
        {PREGUNTAS_RAPIDAS.map((p) => (
          <Pressable
            key={p}
            onPress={() => preguntar(p)}
            disabled={enviando !== null}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: tokens.border,
              backgroundColor: tokens.surface2,
              opacity: enviando && enviando !== p ? 0.5 : 1,
            }}
          >
            <Text style={{ flex: 1, fontSize: 13, color: tokens.textPrimary }}>{p}</Text>
            {enviando === p ? <ActivityIndicator size="small" color={tokens.cyan} /> : <PaperPlaneTiltIcon size={14} color={tokens.cyan} />}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
