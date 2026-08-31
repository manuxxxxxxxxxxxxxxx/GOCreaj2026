import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, CheckCircleIcon, ClockIcon, HeadsetIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { soporteApi, ApiError } from "../../lib/api";
import type { ReporteSoporte } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "Soporte">;

export function SoporteScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tickets, setTickets] = useState<ReporteSoporte[] | null>(null);
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = () => {
    soporteApi.misTickets().then((r) => setTickets(r.reportes)).catch(() => setTickets([]));
  };

  useEffect(cargar, []);

  const enviar = async () => {
    if (!asunto.trim() || !descripcion.trim()) return toast.show("Completa el asunto y la descripción.", "warning");
    setEnviando(true);
    try {
      await soporteApi.crear(asunto.trim(), descripcion.trim());
      setAsunto("");
      setDescripcion("");
      toast.show("Ticket enviado", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Soporte</Text>
      </View>

      <FlatList
        data={tickets ?? []}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 60 }}
        ListHeaderComponent={
          <Card style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 12 }}>Crear un ticket</Text>
            <View style={{ gap: 12 }}>
              <Input label="Asunto" value={asunto} onChangeText={setAsunto} placeholder="¿En qué te ayudamos?" />
              <View>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 6 }}>Descripción</Text>
                <TextInput
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  numberOfLines={4}
                  placeholder="Cuéntanos con detalle qué sucedió."
                  placeholderTextColor={tokens.textMuted}
                  style={{ borderWidth: 1, borderColor: tokens.border, borderRadius: 10, padding: 12, fontSize: 13.5, color: tokens.textPrimary, height: 90, textAlignVertical: "top" }}
                />
              </View>
              <Button size="sm" onPress={enviar} loading={enviando} style={{ alignSelf: "flex-start" }}>
                Enviar ticket
              </Button>
            </View>
          </Card>
        }
        ListEmptyComponent={tickets === null ? <Skeleton height={80} /> : <EmptyState icon={<HeadsetIcon size={22} color={tokens.textMuted} />} title="No has creado tickets" />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>{item.asunto}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                {item.estado === "resuelto" ? <CheckCircleIcon size={13} weight="fill" color={tokens.ok} /> : <ClockIcon size={13} color={tokens.warn} />}
                <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "capitalize", color: item.estado === "resuelto" ? tokens.ok : tokens.warn }}>{item.estado}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{item.descripcion}</Text>
            {item.respuesta_admin && (
              <View style={{ marginTop: 10, padding: 12, backgroundColor: tokens.surface2, borderRadius: 10 }}>
                <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan, marginBottom: 3 }}>Respuesta del equipo</Text>
                <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{item.respuesta_admin}</Text>
              </View>
            )}
            <Text style={{ fontSize: 10.5, color: tokens.textMuted, marginTop: 8 }}>{formatDateTime(item.created_at)}</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
