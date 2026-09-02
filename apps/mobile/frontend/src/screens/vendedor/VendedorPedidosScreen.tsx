import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BicycleIcon, CheckCircleIcon, MagnifyingGlassIcon, PackageIcon, QrCodeIcon, XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDateTime, numeroPedido } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AnimatedListItem } from "../../components/ui/Motion";
import { CodigoQrCard } from "../../components/domain/CodigoQrCard";

const ESTADOS_CERRADOS = ["entregado", "cancelado", "rechazado_repartidor"];

export function VendedorPedidosScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [tab, setTab] = useState<"activos" | "historial">("activos");
  const [qrDe, setQrDe] = useState<{ pedido: Pedido; token: string; pin: string; recogida?: boolean } | null>(null);
  const [rechazando, setRechazando] = useState<Pedido | null>(null);

  const cargar = () => {
    vendedorApi.misVentas().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  };

  useEffect(() => {
    cargar();
    // El despacho automático puede resolverse solo en cualquier momento (ver DESIGN.md
    // "Flujo logístico") -- sin esto, el vendedor tendría que salir y volver a la pantalla
    // para enterarse de que ya le asignaron repartidor.
    const t = setInterval(cargar, 6000);
    return () => clearInterval(t);
  }, []);

  const confirmar = async (p: Pedido) => {
    try {
      await vendedorApi.prepararPedido(p.id, "preparacion");
      toast.show("Pedido confirmado", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo confirmar.", "error");
    }
  };

  const confirmarRecogida = async (p: Pedido) => {
    const esRecogida = p.tipo_entrega === "recogida";
    try {
      const r = await vendedorApi.confirmarRecogida(p.id);
      if (r.en_camino) toast.show("Pedido en camino con el repartidor", "success");
      else setQrDe({ pedido: p, token: r.qr_token, pin: r.pin, recogida: esRecogida });
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo confirmar.", "error");
    }
  };

  if (pedidos === null) {
    return (
      <View style={{ padding: 20, gap: 10 }}>
        <Skeleton height={100} radius={14} />
      </View>
    );
  }
  if (pedidos.length === 0) return <EmptyState icon={<PackageIcon size={22} color={tokens.textMuted} />} title="Aún no tienes pedidos" />;

  const activos = pedidos.filter((p) => !ESTADOS_CERRADOS.includes(p.estado));
  const historial = pedidos.filter((p) => ESTADOS_CERRADOS.includes(p.estado));
  const lista = tab === "activos" ? activos : historial;

  // Cada pedido tiene una única acción relevante según su estado -- antes se apilaban
  // hasta 6 bloques condicionales por tarjeta (uno por cada combinación posible), lo que
  // hacía que la lista se sintiera saturada. Esto centraliza esa lógica en un solo lugar
  // así cada tarjeta muestra como mucho una acción (o el par confirmar/rechazar inicial).
  const renderAccion = (p: Pedido) => {
    if (p.estado === "pendiente_confirmacion") {
      return (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button size="sm" icon={<CheckCircleIcon size={14} color={tokens.cyanInk} />} onPress={() => confirmar(p)} style={{ flex: 1 }}>
            Confirmar
          </Button>
          <Button size="sm" variant="danger" icon={<XIcon size={14} color="#fff" />} onPress={() => setRechazando(p)} style={{ flex: 1 }}>
            Rechazar
          </Button>
        </View>
      );
    }
    if (p.estado !== "preparacion") return null;

    if (p.tipo_entrega === "recogida") {
      if (!p.qr_recogida_token) {
        return (
          <Button size="sm" fullWidth icon={<QrCodeIcon size={14} color={tokens.cyanInk} />} onPress={() => confirmarRecogida(p)}>
            Marcar listo para recoger
          </Button>
        );
      }
      if (p.pin_recogida) {
        return (
          <Button size="sm" variant="secondary" fullWidth icon={<QrCodeIcon size={14} color={tokens.textPrimary} />} onPress={() => setQrDe({ pedido: p, token: p.qr_recogida_token!, pin: p.pin_recogida!, recogida: true })}>
            Ver código de recogida
          </Button>
        );
      }
      return null;
    }

    if (!p.repartidor_id) {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tokens.surface2, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 }}>
          {p.oferta_repartidor_id ? <MagnifyingGlassIcon size={14} color={tokens.textSecondary} /> : <BicycleIcon size={14} color={tokens.textSecondary} />}
          <Text style={{ fontSize: 12, color: tokens.textSecondary, flex: 1 }}>
            {p.oferta_repartidor_id ? "Ofreciendo el pedido a un repartidor cercano…" : "Buscando repartidor disponible."}
          </Text>
        </View>
      );
    }
    if (!p.confirmado_vendedor_recogida) {
      return (
        <Button size="sm" fullWidth icon={<QrCodeIcon size={14} color={tokens.cyanInk} />} onPress={() => confirmarRecogida(p)}>
          Confirmar recogida
        </Button>
      );
    }
    if (p.qr_recogida_token && p.pin_recogida) {
      return (
        <Button size="sm" variant="secondary" fullWidth icon={<QrCodeIcon size={14} color={tokens.textPrimary} />} onPress={() => setQrDe({ pedido: p, token: p.qr_recogida_token!, pin: p.pin_recogida! })}>
          Ver código de recogida
        </Button>
      );
    }
    return null;
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 12 }}>Pedidos</Text>
        <View style={[styles.tabs, { backgroundColor: tokens.surface2 }]}>
          {(["activos", "historial"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { backgroundColor: tokens.surface1 }]}>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tab === t ? tokens.textPrimary : tokens.textSecondary }}>
                {t === "activos" ? "Activos" : "Historial"}{t === "activos" && activos.length > 0 ? ` (${activos.length})` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {lista.length === 0 ? (
        <EmptyState icon={<PackageIcon size={22} color={tokens.textMuted} />} title={tab === "activos" ? "Sin pedidos activos" : "Sin historial todavía"} />
      ) : tab === "activos" ? (
        <FlatList
          data={lista}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 140 }}
          renderItem={({ item: p, index }) => (
            <AnimatedListItem index={index}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar nombre={p.comprador_nombre ?? "?"} size={34} />
                    <View>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>
                        #{numeroPedido(p)} · {p.comprador_nombre}
                      </Text>
                      <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatDateTime(p.created_at)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <StatusPill estado={p.estado} />
                    <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", marginTop: 6, color: tokens.textPrimary }}>{money(p.total)}</Text>
                  </View>
                </View>
                {p.tipo_entrega === "recogida" && (
                  <View style={{ alignSelf: "flex-start", backgroundColor: tokens.violetBg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.violet }}>Recoge en tienda</Text>
                  </View>
                )}
                {renderAccion(p)}
              </Card>
            </AnimatedListItem>
          )}
        />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 140 }}
          renderItem={({ item: p, index }) => (
            <AnimatedListItem index={index}>
              <View style={[styles.historialRow, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>
                    #{numeroPedido(p)} · {p.comprador_nombre}
                  </Text>
                  <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>{formatDateTime(p.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <StatusPill estado={p.estado} />
                  <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", fontSize: 12.5, color: tokens.textPrimary }}>{money(p.total)}</Text>
                </View>
              </View>
            </AnimatedListItem>
          )}
        />
      )}

      {qrDe && (
        <Sheet visible onClose={() => setQrDe(null)} title="Código de recogida">
          <CodigoQrCard
            token={qrDe.token}
            pin={qrDe.pin}
            mensaje={qrDe.recogida ? "El cliente debe mostrarte este código (o decirte el PIN) al recoger su pedido." : "Que el repartidor escanee este código (o teclee el PIN) al retirar el pedido."}
          />
        </Sheet>
      )}

      <ConfirmDialog
        visible={!!rechazando}
        title="¿Rechazar este pedido?"
        description="Se reembolsará el total al comprador de inmediato."
        danger
        confirmLabel="Rechazar"
        onCancel={() => setRechazando(null)}
        onConfirm={async () => {
          if (!rechazando) return;
          try {
            const r = await vendedorApi.rechazarPedido(rechazando.id);
            toast.show(`Reembolsado ${money(r.reembolso)}`, "info");
            setRechazando(null);
            cargar();
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo rechazar.", "error");
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 10, alignSelf: "flex-start" },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  historialRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
});
