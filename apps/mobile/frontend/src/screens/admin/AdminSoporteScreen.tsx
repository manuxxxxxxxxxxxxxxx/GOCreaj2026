import { useEffect, useState } from "react";
import { FlatList, Image, Linking, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { HeadsetIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import type { ReporteSoporte } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

interface TicketAdmin extends ReporteSoporte {
  usuario_nombre: string;
  usuario_email: string;
}

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminSoporte.tsx. */
export function AdminSoporteScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const [tickets, setTickets] = useState<TicketAdmin[] | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});

  const cargar = () => {
    adminApi.soporte().then((r) => setTickets(r.reportes as TicketAdmin[])).catch(() => setTickets([]));
  };

  useEffect(cargar, []);

  const responder = async (t: TicketAdmin, estado: "resuelto" | "cerrado") => {
    const respuesta = respuestas[t.id]?.trim();
    if (!respuesta) return toast.show("Escribe una respuesta.", "warning");
    try {
      await adminApi.responderSoporte(t.id, respuesta, estado);
      toast.show("Respuesta enviada", "success");
      // Antes se quedaba atrapado en esta pantalla mostrando la lista recargada --
      // ahora vuelve al panel principal del admin como se espera.
      navigation.goBack();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo responder.", "error");
    }
  };

  if (tickets === null) {
    return (
      <View style={{ padding: 20, gap: 10 }}>
        <Skeleton height={140} radius={14} />
      </View>
    );
  }
  if (tickets.length === 0) return <EmptyState icon={<HeadsetIcon size={22} color={tokens.textMuted} />} title="Sin tickets de soporte" />;

  return (
    <FlatList
      data={tickets}
      keyExtractor={(t) => String(t.id)}
      ListHeaderComponent={<Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 4 }}>Tickets de soporte</Text>}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
      renderItem={({ item: t }) => (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>{t.asunto}</Text>
              <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>{t.usuario_nombre} · {t.usuario_email}</Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "capitalize", color: t.estado === "resuelto" ? tokens.okInk : t.estado === "cerrado" ? tokens.textMuted : tokens.warnInk }}>{t.estado}</Text>
          </View>
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{t.descripcion}</Text>
          {t.adjunto && (
            <Pressable onPress={() => t.adjunto && Linking.openURL(t.adjunto)} style={{ marginTop: 8, width: 90, height: 90 }}>
              <Image source={{ uri: t.adjunto }} style={{ width: "100%", height: "100%", borderRadius: 10, borderWidth: 1, borderColor: tokens.border }} />
            </Pressable>
          )}
          <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>{formatDateTime(t.created_at)}</Text>
          {t.respuesta_admin ? (
            <View style={{ marginTop: 10, padding: 12, backgroundColor: tokens.surface2, borderRadius: 10 }}>
              <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan, marginBottom: 3 }}>Respuesta enviada</Text>
              <Text style={{ fontSize: 13, color: tokens.textPrimary }}>{t.respuesta_admin}</Text>
            </View>
          ) : (
            <View style={{ gap: 8, marginTop: 10 }}>
              <TextInput
                value={respuestas[t.id] ?? ""}
                onChangeText={(v) => setRespuestas((r) => ({ ...r, [t.id]: v }))}
                placeholder="Escribe tu respuesta"
                placeholderTextColor={tokens.textMuted}
                style={{ height: 40, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, fontSize: 12.5, color: tokens.textPrimary }}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button size="sm" onPress={() => responder(t, "resuelto")}>
                  Resolver
                </Button>
                <Button size="sm" variant="secondary" onPress={() => responder(t, "cerrado")}>
                  Cerrar
                </Button>
              </View>
            </View>
          )}
        </Card>
      )}
    />
  );
}
