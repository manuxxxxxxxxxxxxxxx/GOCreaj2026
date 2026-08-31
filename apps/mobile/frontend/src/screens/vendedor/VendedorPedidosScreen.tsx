import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { BicycleIcon, CheckCircleIcon, PackageIcon, QrCodeIcon, XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Pedido, Usuario } from "../../lib/types";
import { money, formatDateTime } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AnimatedListItem } from "../../components/ui/Motion";

export function VendedorPedidosScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [asignandoA, setAsignandoA] = useState<Pedido | null>(null);
  const [qrDe, setQrDe] = useState<{ pedido: Pedido; token: string } | null>(null);
  const [rechazando, setRechazando] = useState<Pedido | null>(null);

  const cargar = () => {
    vendedorApi.misVentas().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  };

  useEffect(cargar, []);

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
    try {
      const r = await vendedorApi.confirmarRecogida(p.id);
      if (r.en_camino) toast.show("Pedido en camino con el repartidor", "success");
      else setQrDe({ pedido: p, token: r.qr_token });
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

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={pedidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 140 }}
        ListHeaderComponent={<Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 4 }}>Pedidos</Text>}
        renderItem={({ item: p, index }) => (
          <AnimatedListItem index={index}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar nombre={p.comprador_nombre ?? "?"} size={34} />
                <View>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>
                    #SV-{p.id} · {p.comprador_nombre}
                  </Text>
                  <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatDateTime(p.created_at)}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <StatusPill estado={p.estado} />
                <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", marginTop: 6, color: tokens.textPrimary }}>{money(p.total)}</Text>
              </View>
            </View>
            {p.estado === "pendiente_confirmacion" && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button size="sm" icon={<CheckCircleIcon size={14} color={tokens.cyanInk} />} onPress={() => confirmar(p)}>
                  Confirmar
                </Button>
                <Button size="sm" variant="danger" icon={<XIcon size={14} color="#fff" />} onPress={() => setRechazando(p)}>
                  Rechazar
                </Button>
              </View>
            )}
            {p.estado === "preparacion" && !p.repartidor_id && (
              <Button size="sm" icon={<BicycleIcon size={14} color={tokens.cyanInk} />} onPress={() => setAsignandoA(p)}>
                Asignar repartidor
              </Button>
            )}
            {p.estado === "preparacion" && p.repartidor_id && !p.confirmado_vendedor_recogida && (
              <Button size="sm" icon={<QrCodeIcon size={14} color={tokens.cyanInk} />} onPress={() => confirmarRecogida(p)}>
                Confirmar recogida
              </Button>
            )}
            {p.estado === "preparacion" && p.repartidor_id && !!p.confirmado_vendedor_recogida && p.qr_recogida_token && (
              <View>
                <Text style={{ fontSize: 11, color: tokens.textMuted, marginBottom: 6 }}>
                  Dale este código a {p.repartidor_nombre ?? "el repartidor"} al recoger:
                </Text>
                <View style={{ backgroundColor: tokens.cyanBg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 15, fontWeight: "700", letterSpacing: 1, color: tokens.cyan, textAlign: "center" }}>
                    {p.qr_recogida_token}
                  </Text>
                </View>
              </View>
            )}
          </Card>
          </AnimatedListItem>
        )}
      />

      {asignandoA && <AsignarRepartidorSheet pedido={asignandoA} onClose={() => setAsignandoA(null)} onDone={cargar} />}

      {qrDe && (
        <Sheet visible onClose={() => setQrDe(null)} title="Código de recogida">
          <View style={{ alignItems: "center", gap: 12, paddingBottom: 20 }}>
            <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center" }}>Muéstrale este código al repartidor.</Text>
            <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 13, backgroundColor: tokens.surface2, padding: 14, borderRadius: 10 }}>{qrDe.token}</Text>
          </View>
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

function AsignarRepartidorSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: () => void }) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [repartidores, setRepartidores] = useState<(Usuario & { distancia_km?: number })[] | null>(null);

  useEffect(() => {
    vendedorApi.repartidoresCercanos(pedido.id).then((r) => setRepartidores(r.repartidores)).catch(() => setRepartidores([]));
  }, [pedido.id]);

  return (
    <Sheet visible onClose={onClose} title="Repartidores cercanos">
      {repartidores === null ? (
        <Skeleton height={80} />
      ) : repartidores.length === 0 ? (
        <Text style={{ fontSize: 13, color: tokens.textSecondary, paddingBottom: 12 }}>No hay repartidores en línea cerca.</Text>
      ) : (
        <View style={{ gap: 8, paddingBottom: 12 }}>
          {repartidores.map((r) => (
            <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderWidth: 1, borderColor: tokens.border, borderRadius: 10 }}>
              <Avatar nombre={r.nombre} foto={r.foto_perfil} size={34} />
              <Text style={{ flex: 1, fontSize: 13, color: tokens.textPrimary }}>{r.nombre}</Text>
              <Button
                size="sm"
                onPress={async () => {
                  try {
                    await vendedorApi.asignarRepartidor(pedido.id, r.id);
                    toast.show(`${r.nombre} fue notificado`, "success");
                    onClose();
                    onDone();
                  } catch (err) {
                    toast.show(err instanceof ApiError ? err.message : "No se pudo asignar.", "error");
                  }
                }}
              >
                Asignar
              </Button>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}
