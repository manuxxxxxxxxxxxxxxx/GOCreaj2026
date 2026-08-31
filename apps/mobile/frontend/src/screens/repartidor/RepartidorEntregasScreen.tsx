import { useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { CheckCircleIcon, NavigationArrowIcon, PackageIcon, PhoneIcon, QrCodeIcon } from "phosphor-react-native";
import { WebMapView } from "../../components/ui/WebMapView";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { repartidorApi, pedidosApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { QrScanBox } from "../../components/domain/QrScanBox";
import { AnimatedListItem } from "../../components/ui/Motion";

const PROGRESO_LABEL: Record<string, string> = { camino_tienda: "Yendo a la tienda", recolectado: "Pedido recolectado", camino_cliente: "En camino al cliente" };
const PROGRESO_SIGUIENTE: Record<string, string> = { camino_tienda: "Marcar recolectado", recolectado: "Marcar en camino" };

export function RepartidorEntregasScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [recogiendoDe, setRecogiendoDe] = useState<Pedido | null>(null);
  const [entregaQr, setEntregaQr] = useState<{ pedido: Pedido; token: string } | null>(null);

  const cargar = () => {
    repartidorApi.misEntregas().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  };

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 8000);
    return () => clearInterval(t);
  }, []);

  const activo = useMemo(() => pedidos?.find((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado)) ?? null, [pedidos]);

  const ubicacion = useLocationTracking({
    autoStart: !!activo,
    requestPermission: true,
    accuracy: "high",
    distanceInterval: 15,
    timeInterval: 8000,
    onUpdate: (pos) => {
      if (!activo) return;
      pedidosApi.actualizarUbicacionRepartidor({ pedido_id: activo.id, lat: pos.coordinate[1], lng: pos.coordinate[0] }).catch(() => {});
    },
  });

  useEffect(() => {
    if (!activo) ubicacion.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  const mapa = useMemo(() => {
    if (!activo) return null;
    const destino: [number, number] | null = activo.lat_entrega && activo.lng_entrega ? [activo.lng_entrega, activo.lat_entrega] : null;
    const tienda: [number, number] | null = activo.tienda_lat && activo.tienda_lng ? [activo.tienda_lng, activo.tienda_lat] : null;
    const yo: [number, number] | null = ubicacion.coordinate ?? null;
    if (!destino && !tienda && !yo) return null;
    const vaHaciaTienda = activo.estado === "preparacion" || (activo.estado === "en_camino" && activo.progreso_repartidor === "camino_tienda");
    const objetivo = vaHaciaTienda ? tienda : destino;
    const centro = yo ?? objetivo ?? tienda ?? destino;
    if (!centro) return null;
    const ruta = yo && objetivo ? [yo, objetivo] : null;
    return { destino, tienda, yo, ruta, centro };
  }, [activo, ubicacion.coordinate]);

  const avanzar = async (p: Pedido) => {
    try {
      await repartidorApi.avanzarEstado({ pedido_id: p.id });
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo avanzar.", "error");
    }
  };

  const generarQrEntrega = async (p: Pedido) => {
    try {
      const r = await repartidorApi.generarQrEntrega(p.id);
      setEntregaQr({ pedido: p, token: r.qr_token });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo generar.", "error");
    }
  };

  const completarManual = async (p: Pedido) => {
    try {
      const r = await repartidorApi.completar(p.id);
      toast.show(`Ganaste ${money(r.ganancia_repartidor)}`, "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar.", "error");
    }
  };

  if (pedidos === null) {
    return (
      <View style={{ padding: 20 }}>
        <Skeleton height={120} radius={14} />
      </View>
    );
  }
  if (pedidos.length === 0) return <EmptyState icon={<PackageIcon size={22} color={tokens.textMuted} />} title="Sin entregas todavía" />;

  const activos = pedidos.filter((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado));
  const historial = pedidos.filter((p) => ["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado));

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 140 }}>
      <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Mis entregas</Text>

      {mapa && (
        <View style={{ height: 200, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" }}>
          <WebMapView
            center={mapa.centro}
            zoom={14}
            interactive={false}
            route={mapa.ruta ? { coordinates: mapa.ruta, color: tokens.cyan, width: 4 } : null}
            markers={[
              ...(mapa.tienda ? [{ id: "tienda", coordinate: mapa.tienda, color: tokens.warn }] : []),
              ...(mapa.destino ? [{ id: "destino", coordinate: mapa.destino, color: tokens.ok }] : []),
              ...(mapa.yo ? [{ id: "yo", coordinate: mapa.yo, color: tokens.cyan }] : []),
            ]}
          />
        </View>
      )}

      {activos.map((p, idx) => (
        <AnimatedListItem key={p.id} index={idx}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <View>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>
                #SV-{p.id} · {p.tienda_nombre}
              </Text>
              <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 2 }}>
                {p.comprador_nombre} · {p.direccion_entrega}
              </Text>
            </View>
            <StatusPill estado={p.estado} />
          </View>
          {p.estado === "en_camino" && p.progreso_repartidor && (
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan, marginBottom: 10 }}>{PROGRESO_LABEL[p.progreso_repartidor] ?? p.progreso_repartidor}</Text>
          )}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {p.estado === "preparacion" && !p.confirmado_repartidor_recogida && (
              <Button size="sm" icon={<QrCodeIcon size={14} color={tokens.cyanInk} />} onPress={() => setRecogiendoDe(p)}>
                Escanear recogida
              </Button>
            )}
            {p.estado === "en_camino" && p.progreso_repartidor && p.progreso_repartidor !== "camino_cliente" && (
              <Button size="sm" icon={<NavigationArrowIcon size={14} color={tokens.cyanInk} />} onPress={() => avanzar(p)}>
                {PROGRESO_SIGUIENTE[p.progreso_repartidor]}
              </Button>
            )}
            {p.estado === "en_camino" && (p.progreso_repartidor === "camino_cliente" || !p.progreso_repartidor) && (
              <Button size="sm" icon={<QrCodeIcon size={14} color={tokens.cyanInk} />} onPress={() => generarQrEntrega(p)}>
                Mostrar código
              </Button>
            )}
            {p.estado === "en_camino" && (
              <Button size="sm" variant="secondary" icon={<CheckCircleIcon size={14} color={tokens.textPrimary} />} onPress={() => completarManual(p)}>
                Completar
              </Button>
            )}
            {p.comprador_telefono && (
              <Button size="sm" variant="secondary" icon={<PhoneIcon size={14} color={tokens.textPrimary} />} onPress={() => Linking.openURL(`tel:${p.comprador_telefono}`)}>
                Llamar
              </Button>
            )}
          </View>
        </Card>
        </AnimatedListItem>
      ))}

      {historial.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", marginBottom: 10 }}>Historial</Text>
          <View style={{ gap: 8 }}>
            {historial.map((p) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.surface1 }}>
                <Text style={{ fontSize: 13, color: tokens.textPrimary }}>
                  #SV-{p.id} · {p.tienda_nombre}
                </Text>
                <StatusPill estado={p.estado} />
              </View>
            ))}
          </View>
        </View>
      )}

      {recogiendoDe && (
        <RecogidaSheet
          pedido={recogiendoDe}
          onClose={() => setRecogiendoDe(null)}
          onDone={() => {
            setRecogiendoDe(null);
            cargar();
          }}
        />
      )}

      {entregaQr && (
        <Sheet visible onClose={() => setEntregaQr(null)} title="Código de entrega">
          <View style={{ alignItems: "center", gap: 12, paddingBottom: 20 }}>
            <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center" }}>Muéstrale este código al comprador para confirmar la entrega.</Text>
            <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 13, backgroundColor: tokens.surface2, padding: 14, borderRadius: 10 }}>{entregaQr.token}</Text>
          </View>
        </Sheet>
      )}
    </ScrollView>
  );
}

function RecogidaSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!valor.trim()) return;
    setEnviando(true);
    try {
      const r = await repartidorApi.confirmarRecogida(pedido.id, valor.trim());
      toast.show(r.en_camino ? "¡Vas en camino!" : "Recogida confirmada", "success");
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title="Confirmar recogida">
      <QrScanBox valor={valor} onChange={setValor} hint="Pídele a la tienda el código QR de recogida y escanéalo, o pégalo abajo." />
      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <Button onPress={confirmar} loading={enviando}>
          Confirmar
        </Button>
      </View>
    </Sheet>
  );
}
