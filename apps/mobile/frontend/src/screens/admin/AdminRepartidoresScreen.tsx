import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { BicycleIcon, StarIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { adminApi } from "../../lib/api";
import type { Pedido, Usuario } from "../../lib/types";
import { money } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

type RepartidorActivo = Usuario & { lat: number | null; lng: number | null; pedido_activo: Pedido | null };

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminRepartidores.tsx (se refresca
 * cada 10s, igual que la web). */
export function AdminRepartidoresScreen() {
  const { tokens } = useTheme();
  const [repartidores, setRepartidores] = useState<RepartidorActivo[] | null>(null);

  useEffect(() => {
    const cargar = () => adminApi.repartidoresActivos().then((r) => setRepartidores(r.repartidores)).catch(() => {});
    cargar();
    const t = setInterval(cargar, 10000);
    return () => clearInterval(t);
  }, []);

  if (repartidores === null) {
    return (
      <View style={{ padding: 20, gap: 10 }}>
        <Skeleton height={100} radius={14} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Repartidores en vivo</Text>
        <Text style={{ fontSize: 12.5, color: tokens.textSecondary, marginTop: 4 }}>{repartidores.length} en línea ahora mismo.</Text>
      </View>
      {repartidores.length === 0 ? (
        <EmptyState icon={<BicycleIcon size={22} color={tokens.textMuted} />} title="Ningún repartidor en línea ahora" />
      ) : (
        <FlatList
          data={repartidores}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 24 }}
          renderItem={({ item: r }) => (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar nombre={r.nombre} foto={r.foto_perfil} size={40} online />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{r.nombre}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <StarIcon size={11} weight="fill" color={tokens.warn} />
                    <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>{r.repartidor_calificacion_promedio?.toFixed(1) ?? "—"}</Text>
                  </View>
                </View>
                {r.pedido_activo ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan }}>En entrega #{r.pedido_activo.id}</Text>
                    <Text style={{ fontSize: 11.5, fontFamily: "IBMPlexMono_500Medium", color: tokens.textMuted }}>{money(r.pedido_activo.total)}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.okInk }}>Disponible</Text>
                )}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
