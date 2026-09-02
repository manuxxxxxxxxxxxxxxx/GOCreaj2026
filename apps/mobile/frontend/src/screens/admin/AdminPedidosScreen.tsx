import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PackageIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import type { EstadoPedido, Pedido } from "../../lib/types";
import { money, formatDateTime, numeroPedido } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Sheet } from "../../components/ui/Sheet";

const ESTADOS: (EstadoPedido | "")[] = ["", "pendiente_confirmacion", "preparacion", "en_camino", "entregado", "cancelado", "rechazado_repartidor"];
const ESTADO_LABEL: Record<EstadoPedido | "", string> = {
  "": "Todos",
  pendiente_confirmacion: "Pendiente",
  preparacion: "Preparando",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
  rechazado_repartidor: "Rechazado",
};

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminPedidos.tsx. */
export function AdminPedidosScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPedido | "">("");
  const [cambiandoEstadoDe, setCambiandoEstadoDe] = useState<Pedido | null>(null);

  const cargar = () => {
    adminApi.pedidos(estadoFiltro || undefined).then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  };

  useEffect(cargar, [estadoFiltro]);

  const actualizar = async (p: Pedido, nuevo: EstadoPedido) => {
    setCambiandoEstadoDe(null);
    try {
      await adminApi.actualizarPedido(p.id, nuevo);
      toast.show("Pedido actualizado", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12, gap: 10 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Pedidos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {ESTADOS.map((e) => {
            const active = estadoFiltro === e;
            return (
              <Pressable
                key={e || "todos"}
                onPress={() => setEstadoFiltro(e)}
                style={[styles.chip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? tokens.cyan : tokens.textSecondary }}>{ESTADO_LABEL[e]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {pedidos === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={100} radius={14} />
        </View>
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<PackageIcon size={22} color={tokens.textMuted} />} title="Sin pedidos" />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 24 }}
          renderItem={({ item: p }) => (
            <Card onPress={() => setCambiandoEstadoDe(p)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>#{numeroPedido(p)}</Text>
                  <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {p.comprador_nombre} → {p.vendedor_nombre} {p.repartidor_nombre ? `· ${p.repartidor_nombre}` : ""}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: tokens.textMuted, marginTop: 2 }}>{formatDateTime(p.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <StatusPill estado={p.estado} />
                  <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary }}>{money(p.total)}</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <Sheet visible={!!cambiandoEstadoDe} onClose={() => setCambiandoEstadoDe(null)} title="Cambiar estado">
        <View style={{ gap: 8, paddingBottom: 16 }}>
          {ESTADOS.filter((e): e is EstadoPedido => !!e).map((e) => (
            <Pressable
              key={e}
              onPress={() => cambiandoEstadoDe && actualizar(cambiandoEstadoDe, e)}
              style={[styles.estadoRow, { borderColor: cambiandoEstadoDe?.estado === e ? tokens.cyan : tokens.border, backgroundColor: cambiandoEstadoDe?.estado === e ? tokens.cyanBg : "transparent" }]}
            >
              <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: cambiandoEstadoDe?.estado === e ? tokens.cyan : tokens.textPrimary }}>{ESTADO_LABEL[e]}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  estadoRow: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
