import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { ClockCounterClockwiseIcon, MapPinIcon, MoneyIcon, PackageIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { repartidorApi } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDateTime, numeroPedido } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusPill } from "../../components/ui/StatusPill";
import { Sheet } from "../../components/ui/Sheet";
import { AnimatedListItem } from "../../components/ui/Motion";

const ESTADOS_CERRADOS = ["entregado", "cancelado", "rechazado_repartidor"];

/** Reemplaza la pestaña "Reels" del repartidor -- un historial detallado de entregas
 * pasadas (fecha, tienda, comprador, ganancia, estado), en vez del bloque resumido de 2
 * líneas que antes vivía metido al fondo de "Mis entregas" (RepartidorEntregasScreen). */
export function RepartidorHistorialScreen() {
  const { tokens } = useTheme();
  const [pedidos, setPedidos] = useState<(Pedido & { ganancia_repartidor: number })[] | null>(null);
  const [detalle, setDetalle] = useState<(Pedido & { ganancia_repartidor: number }) | null>(null);

  useEffect(() => {
    repartidorApi.misEntregas().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  }, []);

  const historial = useMemo(
    () => (pedidos ?? []).filter((p) => ESTADOS_CERRADOS.includes(p.estado)).sort((a, b) => (a.updated_at ?? a.created_at) < (b.updated_at ?? b.created_at) ? 1 : -1),
    [pedidos],
  );

  const gananciaTotal = useMemo(
    () => historial.filter((p) => p.estado === "entregado").reduce((acc, p) => acc + p.ganancia_repartidor, 0),
    [historial],
  );

  if (pedidos === null) {
    return (
      <View style={{ padding: 20, gap: 10 }}>
        <Skeleton height={80} radius={14} />
        <Skeleton height={100} radius={14} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Historial</Text>
        <Text style={{ fontSize: 12.5, color: tokens.textMuted, marginTop: 2 }}>{historial.length} entrega{historial.length !== 1 ? "s" : ""} en total</Text>
      </View>

      {historial.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwiseIcon size={22} color={tokens.textMuted} />} title="Todavía no tienes entregas completadas" />
      ) : (
        <FlatList
          data={historial}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 140 }}
          ListHeaderComponent={
            <Card style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: tokens.okBg }}>
                <MoneyIcon size={18} weight="bold" color={tokens.okInk} />
              </View>
              <View>
                <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>Ganado en las entregas de abajo</Text>
                <Text style={{ fontSize: 17, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary }}>{money(gananciaTotal)}</Text>
              </View>
            </Card>
          }
          renderItem={({ item: p, index }) => (
            <AnimatedListItem index={index}>
              <Pressable onPress={() => setDetalle(p)}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>
                    #{numeroPedido(p)} · {p.tienda_nombre}
                  </Text>
                  <StatusPill estado={p.estado} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <MapPinIcon size={12} color={tokens.textMuted} />
                  <Text style={{ fontSize: 11.5, color: tokens.textMuted, flex: 1 }} numberOfLines={1}>
                    {p.comprador_nombre} · {p.direccion_entrega}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: tokens.textMuted, marginBottom: 8 }}>{formatDateTime(p.updated_at ?? p.created_at)}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: tokens.textSecondary }}>
                    {p.items.length} producto{p.items.length !== 1 ? "s" : ""} · Total {money(p.total)}
                    {p.metodo_pago === "efectivo" ? " · Efectivo" : ""}
                  </Text>
                  {p.estado === "entregado" && (
                    <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", fontSize: 14, color: tokens.ok }}>+{money(p.ganancia_repartidor)}</Text>
                  )}
                </View>
              </Card>
              </Pressable>
            </AnimatedListItem>
          )}
        />
      )}

      <Sheet visible={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `Pedido #${numeroPedido(detalle)}` : undefined}>
        {detalle && <DetalleEntrega pedido={detalle} tokens={tokens} />}
      </Sheet>
    </View>
  );
}

function DetalleEntrega({ pedido: p, tokens }: { pedido: Pedido & { ganancia_repartidor: number }; tokens: ReturnType<typeof useTheme>["tokens"] }) {
  return (
    <View style={{ gap: 16, paddingBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: tokens.textPrimary }}>{p.tienda_nombre}</Text>
        <StatusPill estado={p.estado} />
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase" }}>Entregado a</Text>
        <Text style={{ fontSize: 13.5, color: tokens.textPrimary }}>{p.comprador_nombre}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <MapPinIcon size={13} color={tokens.textSecondary} />
          <Text style={{ fontSize: 12.5, color: tokens.textSecondary, flex: 1 }}>{p.direccion_entrega}</Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase" }}>Fecha</Text>
        <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>Pedido: {formatDateTime(p.created_at)}</Text>
        {p.updated_at && (
          <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>{p.estado === "entregado" ? "Entregado" : "Cerrado"}: {formatDateTime(p.updated_at)}</Text>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase" }}>Productos</Text>
        {p.items.map((it, idx) => (
          <View key={it.id ?? idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: tokens.surface2, alignItems: "center", justifyContent: "center" }}>
              <PackageIcon size={13} color={tokens.textMuted} />
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, color: tokens.textPrimary }}>
              {it.cantidad}x {it.nombre}
            </Text>
            <Text style={{ fontSize: 12.5, color: tokens.textSecondary, fontFamily: "IBMPlexMono_500Medium" }}>{money(it.precio_unitario * it.cantidad)}</Text>
          </View>
        ))}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 12, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Total del pedido</Text>
          <Text style={{ fontSize: 13, color: tokens.textPrimary, fontFamily: "IBMPlexMono_500Medium" }}>{money(p.total)}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Método de pago</Text>
          <Text style={{ fontSize: 13, color: tokens.textPrimary }}>{p.metodo_pago === "efectivo" ? "Efectivo" : p.metodo_pago === "tarjeta" ? "Tarjeta" : "PayPal"}</Text>
        </View>
        {p.estado === "entregado" && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>Ganaste</Text>
            <Text style={{ fontSize: 14, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.ok }}>{money(p.ganancia_repartidor)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
