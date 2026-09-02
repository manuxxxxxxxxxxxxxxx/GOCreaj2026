import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { CheckCircleIcon, HandshakeIcon, XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import type { SolicitudRol } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

const TABS = ["pendiente", "aprobado", "rechazado"] as const;

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminSolicitudes.tsx. */
export function AdminSolicitudesScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pendiente");
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);

  const cargar = () => {
    adminApi.solicitudes(tab).then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  };

  useEffect(cargar, [tab]);

  const resolver = async (s: SolicitudRol, decision: "aprobado" | "rechazado") => {
    try {
      await adminApi.resolver(s.id, decision);
      toast.show(decision === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo resolver.", "error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12, gap: 12 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Solicitudes de rol</Text>
        <View style={{ flexDirection: "row", gap: 6, backgroundColor: tokens.surface2, padding: 4, borderRadius: 10, alignSelf: "flex-start" }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: tab === t ? tokens.surface1 : "transparent" }}>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", textTransform: "capitalize", color: tab === t ? tokens.textPrimary : tokens.textSecondary }}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {solicitudes === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={80} radius={14} />
        </View>
      ) : solicitudes.length === 0 ? (
        <EmptyState icon={<HandshakeIcon size={22} color={tokens.textMuted} />} title="Nada por aquí" />
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 24 }}
          renderItem={({ item: s }) => (
            <Card>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>
                {s.nombre_completo} <Text style={{ color: tokens.cyan, textTransform: "capitalize" }}>· {s.rol_solicitado}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>{s.usuario_nombre} · {s.email} · {formatDate(s.created_at)}</Text>
              {tab === "pendiente" && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Button size="sm" icon={<CheckCircleIcon size={14} color={tokens.cyanInk} />} onPress={() => resolver(s, "aprobado")}>
                    Aprobar
                  </Button>
                  <Button size="sm" variant="danger" icon={<XIcon size={14} color="#fff" />} onPress={() => resolver(s, "rechazado")}>
                    Rechazar
                  </Button>
                </View>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}
