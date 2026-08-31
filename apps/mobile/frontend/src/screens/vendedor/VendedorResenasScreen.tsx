import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, StarIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "VendedorResenas">;

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  respuesta_vendedor: string | null;
  created_at: string;
  comprador_nombre: string;
}

export function VendedorResenasScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [resenas, setResenas] = useState<Resena[] | null>(null);
  const [respondiendo, setRespondiendo] = useState<number | null>(null);
  const [texto, setTexto] = useState("");

  const cargar = () => {
    vendedorApi.misResenas().then((r) => setResenas(r.resenas)).catch(() => setResenas([]));
  };

  useEffect(cargar, []);

  const responder = async (id: number) => {
    if (!texto.trim()) return;
    try {
      await vendedorApi.responderResena(id, texto.trim());
      setRespondiendo(null);
      setTexto("");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo responder.", "error");
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Reseñas</Text>
      </View>

      {resenas === null ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={100} />
        </View>
      ) : resenas.length === 0 ? (
        <EmptyState icon={<StarIcon size={22} color={tokens.textMuted} />} title="Aún no tienes reseñas" />
      ) : (
        <FlatList
          data={resenas}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 60 }}
          renderItem={({ item: r }) => (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>{r.comprador_nombre}</Text>
                <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatDate(r.created_at)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} size={12} weight={i < r.estrellas ? "fill" : "regular"} color={tokens.warn} />
                ))}
              </View>
              <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{r.comentario}</Text>
              {r.respuesta_vendedor ? (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: tokens.surface2, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.cyan, marginBottom: 3 }}>Tu respuesta</Text>
                  <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{r.respuesta_vendedor}</Text>
                </View>
              ) : respondiendo === r.id ? (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TextInput value={texto} onChangeText={setTexto} placeholder="Tu respuesta" placeholderTextColor={tokens.textMuted} style={{ flex: 1, height: 36, borderWidth: 1, borderColor: tokens.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 12.5, color: tokens.textPrimary }} />
                  <Button size="sm" onPress={() => responder(r.id)}>
                    Enviar
                  </Button>
                </View>
              ) : (
                <Pressable onPress={() => setRespondiendo(r.id)}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan, marginTop: 8 }}>Responder</Text>
                </Pressable>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
