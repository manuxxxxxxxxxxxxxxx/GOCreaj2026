import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, ChatCircleDotsIcon, CheckCircleIcon, CircleIcon, ConfettiIcon, PhoneIcon, QrCodeIcon, ShareNetworkIcon, StarIcon, XIcon } from "phosphor-react-native";
import { WebMapView } from "../../components/ui/WebMapView";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { pedidosApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDateTime, numeroPedido } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { QrScanBox } from "../../components/domain/QrScanBox";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

const PASOS = [
  { key: "pendiente_confirmacion", label: "Pedido recibido" },
  { key: "preparacion", label: "Preparando en la tienda" },
  { key: "camino_tienda", label: "Repartidor va a la tienda" },
  { key: "recolectado", label: "Repartidor recogió tu pedido" },
  { key: "entregado", label: "Entregado" },
] as const;

function pasoActivoIndex(pedido: Pedido): number {
  if (pedido.estado === "entregado") return 4;
  if (pedido.estado === "en_camino") return pedido.progreso_repartidor === "recolectado" || pedido.progreso_repartidor === "camino_cliente" ? 3 : 2;
  if (pedido.estado === "preparacion") return pedido.repartidor_id ? 2 : 1;
  return 0;
}

export function OrderDetailScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValor, setQrValor] = useState("");
  const [confirmandoQr, setConfirmandoQr] = useState(false);
  const [calificarOpen, setCalificarOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(() => {
    pedidosApi.estado(route.params.id).then((r) => setPedido(r.pedido)).catch(() => setPedido(null));
  }, [route.params.id]);

  useEffect(cargar, [cargar]);

  useEffect(() => {
    if (!pedido || ["entregado", "cancelado", "rechazado_repartidor"].includes(pedido.estado)) return;
    pollRef.current = setInterval(cargar, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pedido, cargar]);

  const cancelar = async () => {
    setCancelando(true);
    try {
      await pedidosApi.cancelar(route.params.id);
      toast.show("Pedido cancelado y reembolsado a tu billetera", "success");
      setConfirmandoCancelar(false);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cancelar.", "error");
    } finally {
      setCancelando(false);
    }
  };

  const confirmarEntrega = async () => {
    if (!qrValor.trim()) return;
    setConfirmandoQr(true);
    try {
      await pedidosApi.confirmarEntrega(route.params.id, qrValor.trim());
      toast.show("¡Entrega confirmada! Gracias por tu compra.", "success");
      setQrOpen(false);
      setQrValor("");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setConfirmandoQr(false);
    }
  };

  const mapa = useMemo(() => {
    if (!pedido) return null;
    const destino: [number, number] | null = pedido.lat_entrega && pedido.lng_entrega ? [pedido.lng_entrega, pedido.lat_entrega] : null;
    const tienda: [number, number] | null = pedido.tienda_lat && pedido.tienda_lng ? [pedido.tienda_lng, pedido.tienda_lat] : null;
    const repartidor: [number, number] | null = pedido.repartidor_lat && pedido.repartidor_lng ? [pedido.repartidor_lng, pedido.repartidor_lat] : null;
    if (!destino && !tienda && !repartidor) return null;
    const puntos = [destino, tienda, repartidor].filter((p): p is [number, number] => p !== null);
    const centro = repartidor ?? destino ?? tienda ?? puntos[0];
    const ruta = repartidor && destino ? [repartidor, destino] : tienda && destino ? [tienda, destino] : null;
    return { destino, tienda, repartidor, centro, ruta };
  }, [pedido]);

  if (!pedido) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20, gap: 12 }}>
        <Skeleton height={200} radius={20} />
        <Skeleton height={100} radius={16} />
      </View>
    );
  }

  const activo = pasoActivoIndex(pedido);
  const puedeCancel = pedido.estado === "pendiente_confirmacion" || (pedido.estado === "preparacion" && !pedido.repartidor_id);
  const puedeCalificar = pedido.estado === "entregado" && !pedido.mi_calificacion;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Pedido #{numeroPedido(pedido)}</Text>
        </View>
        <StatusPill estado={pedido.estado} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}>
        {route.params.recienCreado && (
          <View style={[styles.successCard, { backgroundColor: tokens.surface1, borderColor: tokens.cyan }]}>
            <View style={[styles.successIcon, { backgroundColor: tokens.cyanBg }]}>
              <ConfettiIcon size={24} weight="fill" color={tokens.cyan} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>¡Pedido confirmado!</Text>
            <Text style={{ fontSize: 12, color: tokens.textSecondary, textAlign: "center" }}>
              {(route.params.totalPedidos ?? 1) > 1 ? `Se crearon ${route.params.totalPedidos} pedidos, uno por cada tienda. Este es el primero.` : "Tu número de pedido es"}
            </Text>
            <Pressable
              onPress={() => Share.share({ message: `Mi número de pedido en SV[Go] es #${numeroPedido(pedido)}` })}
              style={[styles.numeroChip, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}
            >
              <Text style={{ fontSize: 17, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary, letterSpacing: 0.5 }}>#{numeroPedido(pedido)}</Text>
              <ShareNetworkIcon size={15} color={tokens.textMuted} />
            </Pressable>
            <Text style={{ fontSize: 12, color: tokens.textMuted, textAlign: "center" }}>
              Esperando que {pedido.vendedor_nombre ?? "la tienda"} confirme tu pedido — sigue el progreso abajo.
            </Text>
          </View>
        )}

        {!["cancelado", "rechazado_repartidor"].includes(pedido.estado) && (
          <View style={[styles.timelineCard, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            {PASOS.map((paso, i) => {
              const done = i <= activo;
              const isLast = i === PASOS.length - 1;
              return (
                <View key={paso.key} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center" }}>
                    {done ? <CheckCircleIcon size={20} weight="fill" color={tokens.cyan} /> : <CircleIcon size={20} color={tokens.borderStrong} />}
                    {!isLast && <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: i < activo ? tokens.cyan : tokens.border }} />}
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: done ? "Inter_700Bold" : "Inter_500Medium", color: done ? tokens.textPrimary : tokens.textMuted, paddingBottom: isLast ? 0 : 18 }}>{paso.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {mapa && !["cancelado", "rechazado_repartidor"].includes(pedido.estado) && (
          <View style={[styles.mapCard, { borderColor: tokens.border }]}>
            <WebMapView
              center={mapa.centro}
              zoom={14}
              interactive={false}
              route={mapa.ruta ? { coordinates: mapa.ruta, color: tokens.cyan, width: 4 } : null}
              markers={[
                ...(mapa.tienda ? [{ id: "tienda", coordinate: mapa.tienda, color: tokens.warn }] : []),
                ...(mapa.repartidor ? [{ id: "repartidor", coordinate: mapa.repartidor, color: tokens.cyan }] : []),
                ...(mapa.destino ? [{ id: "destino", coordinate: mapa.destino, color: tokens.ok }] : []),
              ]}
            />
          </View>
        )}

        {pedido.repartidor_id && pedido.repartidor_nombre && (
          <View style={[styles.repRow, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            <Avatar nombre={pedido.repartidor_nombre} foto={pedido.repartidor_foto} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>{pedido.repartidor_nombre}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <StarIcon size={11} weight="fill" color={tokens.warn} />
                <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>{pedido.repartidor_calificacion_promedio?.toFixed(1) ?? "Nuevo"} · Tu repartidor</Text>
              </View>
            </View>
            <Pressable onPress={() => navigation.navigate("ChatThread", { otroId: pedido.repartidor_id! })} style={[styles.iconBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
              <ChatCircleDotsIcon size={16} color={tokens.textPrimary} />
            </Pressable>
            {pedido.repartidor_telefono && (
              <Pressable onPress={() => Linking.openURL(`tel:${pedido.repartidor_telefono}`)} style={[styles.iconBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
                <PhoneIcon size={16} color={tokens.textPrimary} />
              </Pressable>
            )}
          </View>
        )}

        {pedido.estado === "en_camino" && (
          <Button size="lg" hero icon={<QrCodeIcon size={18} color={tokens.cyanInk} />} onPress={() => setQrOpen(true)}>
            Confirmar entrega con código
          </Button>
        )}
        {puedeCalificar && (
          <Button size="lg" variant="secondary" icon={<StarIcon size={18} color={tokens.textPrimary} />} onPress={() => setCalificarOpen(true)}>
            Calificar pedido
          </Button>
        )}

        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13.5, color: tokens.textPrimary, marginBottom: 10 }}>Productos</Text>
          {pedido.items.map((it) => (
            <View key={it.producto_id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
              <Text style={{ fontSize: 13, color: tokens.textSecondary, flex: 1 }}>
                {it.cantidad}× {it.nombre}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "IBMPlexMono_500Medium", color: tokens.textSecondary }}>{money(it.precio_unitario * it.cantidad)}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: tokens.border }]}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>Total</Text>
            <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 13, fontWeight: "700", color: tokens.textPrimary }}>{money(pedido.total)}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{pedido.direccion_entrega}</Text>
          <Text style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 4, textTransform: "capitalize" }}>Pago: {pedido.metodo_pago}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" icon={<ChatCircleDotsIcon size={16} color={tokens.textPrimary} />} onPress={() => navigation.navigate("ChatThread", { otroId: pedido.vendedor_id })}>
              Escribir a la tienda
            </Button>
          </View>
          {puedeCancel && (
            <View style={{ flex: 1 }}>
              <Button variant="danger" icon={<XIcon size={16} color="#fff" />} onPress={() => setConfirmandoCancelar(true)}>
                Cancelar
              </Button>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 11.5, color: tokens.textMuted, textAlign: "center" }}>{formatDateTime(pedido.created_at)}</Text>
      </ScrollView>

      <ConfirmDialog visible={confirmandoCancelar} title="¿Cancelar este pedido?" description="Se reembolsará el total a tu billetera de inmediato." confirmLabel="Sí, cancelar" danger loading={cancelando} onConfirm={cancelar} onCancel={() => setConfirmandoCancelar(false)} />

      <Sheet visible={qrOpen} onClose={() => setQrOpen(false)} title="Confirmar entrega">
        <QrScanBox valor={qrValor} onChange={setQrValor} hint="Pídele al repartidor el código QR de entrega y escanéalo, o pégalo abajo." />
        <View style={{ marginTop: 16, marginBottom: 8 }}>
          <Button onPress={confirmarEntrega} loading={confirmandoQr}>
            Confirmar
          </Button>
        </View>
      </Sheet>

      {puedeCalificar && <CalificarSheet visible={calificarOpen} onClose={() => setCalificarOpen(false)} pedido={pedido} onDone={cargar} />}
    </View>
  );
}

function CalificarSheet({ visible, onClose, pedido, onDone }: { visible: boolean; onClose: () => void; pedido: Pedido; onDone: () => void }) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [estrellas, setEstrellas] = useState(5);
  const [estrellasRep, setEstrellasRep] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    try {
      await pedidosApi.calificar({ pedido_id: pedido.id, estrellas, comentario, estrellas_repartidor: pedido.repartidor_id ? estrellasRep : undefined });
      toast.show("¡Gracias por tu calificación!", "success");
      onClose();
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Califica tu pedido">
      <View style={{ gap: 16, paddingBottom: 8 }}>
        <StarPicker label={`Calidad de ${pedido.vendedor_nombre}`} value={estrellas} onChange={setEstrellas} />
        {pedido.repartidor_id && <StarPicker label="Tu repartidor" value={estrellasRep} onChange={setEstrellasRep} />}
        <Button onPress={enviar} loading={enviando}>
          Enviar calificación
        </Button>
      </View>
    </Sheet>
  );
}

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { tokens } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Pressable key={i} onPress={() => onChange(i + 1)}>
            <StarIcon size={28} weight={i < value ? "fill" : "regular"} color={tokens.warn} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  successCard: { alignItems: "center", gap: 8, borderRadius: 18, borderWidth: 1, padding: 22 },
  successIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  numeroChip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  timelineCard: { borderRadius: 18, borderWidth: 1, padding: 18 },
  repRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  mapCard: { height: 200, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  pin: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
});
