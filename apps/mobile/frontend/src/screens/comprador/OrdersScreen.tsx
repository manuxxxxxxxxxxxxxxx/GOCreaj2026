import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowsClockwiseIcon, CaretLeftIcon, ChatCircleDotsIcon, MapTrifoldIcon, PackageIcon, ReceiptIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { pedidosApi, carritoApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDateTime, numeroPedido } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { AnimatedListItem } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "Orders">;

const ESTADOS_CERRADOS = ["entregado", "cancelado", "rechazado_repartidor"];

/** Portado 1:1 desde apps/web/web/src/pages/Orders.tsx: tabs En curso/Historial,
 * acciones rápidas de tracking/chat sobre pedidos activos, y recibo + "volver a
 * pedir" sobre el historial. */
export function OrdersScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { refrescar } = useCart();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [tab, setTab] = useState<"curso" | "historial">("curso");
  const [reciboDe, setReciboDe] = useState<Pedido | null>(null);

  useEffect(() => {
    pedidosApi.misPedidos().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  }, []);

  const activos = pedidos?.filter((p) => !ESTADOS_CERRADOS.includes(p.estado)) ?? [];
  const historial = pedidos?.filter((p) => ESTADOS_CERRADOS.includes(p.estado)) ?? [];
  const lista = tab === "curso" ? activos : historial;

  const reordenar = async (p: Pedido) => {
    try {
      await Promise.all(p.items.map((it) => carritoApi.agregar(it.producto_id, it.cantidad)));
      await refrescar();
      toast.show("Productos agregados al carrito", "success");
      navigation.navigate("Cart");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo repetir el pedido — algún producto ya no está disponible.", "error");
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Mis pedidos</Text>
      </View>

      {pedidos === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={90} radius={14} />
          <Skeleton height={90} radius={14} />
        </View>
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<PackageIcon size={24} color={tokens.textMuted} />} title="Todavía no has pedido nada" />
      ) : (
        <>
          <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
            <View style={[styles.tabs, { backgroundColor: tokens.surface2 }]}>
              {(["curso", "historial"] as const).map((t) => (
                <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { backgroundColor: tokens.surface1 }]}>
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tab === t ? tokens.textPrimary : tokens.textSecondary }}>
                    {t === "curso" ? "En curso" : "Historial"}{t === "curso" && activos.length > 0 ? ` (${activos.length})` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {lista.length === 0 ? (
            <EmptyState icon={<PackageIcon size={24} color={tokens.textMuted} />} title={tab === "curso" ? "Sin pedidos en curso" : "Sin historial todavía"} />
          ) : (
            <FlatList
              data={lista}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 60 }}
              renderItem={({ item: p, index }) => (
                <AnimatedListItem index={index}>
                  <Pressable onPress={() => navigation.navigate("OrderDetail", { id: p.id })} style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13.5, color: tokens.textPrimary }}>Pedido #{numeroPedido(p)}</Text>
                        <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 2 }}>{p.vendedor_nombre} · {formatDateTime(p.created_at)}</Text>
                        <Text style={{ fontSize: 11.5, color: tokens.textSecondary, marginTop: 4 }}>{p.items.length} producto{p.items.length !== 1 ? "s" : ""}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <StatusPill estado={p.estado} buscandoRepartidor={tab === "curso" && p.tipo_entrega !== "recogida" && !p.repartidor_id} />
                        <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", marginTop: 8, color: tokens.textPrimary }}>{money(p.total)}</Text>
                      </View>
                    </View>
                    {tab === "curso" ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        <Button size="sm" icon={<MapTrifoldIcon size={14} color={tokens.cyanInk} />} onPress={() => navigation.navigate("OrderDetail", { id: p.id })}>
                          Tracking en vivo
                        </Button>
                        <Button size="sm" variant="secondary" icon={<ChatCircleDotsIcon size={14} color={tokens.textPrimary} />} onPress={() => navigation.navigate("ChatThread", { otroId: p.vendedor_id })}>
                          Chat
                        </Button>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        <Button size="sm" variant="secondary" icon={<ReceiptIcon size={14} color={tokens.textPrimary} />} onPress={() => setReciboDe(p)}>
                          Recibo
                        </Button>
                        {p.estado === "entregado" && (
                          <Button size="sm" icon={<ArrowsClockwiseIcon size={14} color={tokens.cyanInk} />} onPress={() => reordenar(p)}>
                            Volver a pedir
                          </Button>
                        )}
                      </View>
                    )}
                  </Pressable>
                </AnimatedListItem>
              )}
            />
          )}
        </>
      )}

      <Sheet visible={!!reciboDe} onClose={() => setReciboDe(null)} title={reciboDe ? `Recibo — Pedido #${numeroPedido(reciboDe)}` : undefined}>
        {reciboDe && (
          <View style={{ paddingBottom: 20 }}>
            <View style={{ gap: 3, marginBottom: 14 }}>
              <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>{formatDateTime(reciboDe.created_at)}</Text>
              <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>{reciboDe.vendedor_nombre}</Text>
              <Text style={{ fontSize: 12.5, color: tokens.textMuted, textTransform: "capitalize" }}>Pago: {reciboDe.metodo_pago} · {reciboDe.pago_estado}</Text>
            </View>
            <View style={{ gap: 8, marginBottom: 12 }}>
              {reciboDe.items.map((it) => (
                <View key={it.producto_id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: tokens.textPrimary }}>{it.cantidad}× {it.nombre}</Text>
                  <Text style={{ fontSize: 13, fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{money(it.precio_unitario * it.cantidad)}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: tokens.border }}>
              <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, color: tokens.textPrimary }}>Total</Text>
              <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", fontSize: 15, color: tokens.textPrimary }}>{money(reciboDe.total)}</Text>
            </View>
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  tabs: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 10, alignSelf: "flex-start" },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});
