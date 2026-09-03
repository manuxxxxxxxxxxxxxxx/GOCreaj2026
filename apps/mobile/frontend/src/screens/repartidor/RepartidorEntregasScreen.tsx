import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowsOutIcon, MoneyIcon, NavigationArrowIcon, PackageIcon, PhoneIcon, QrCodeIcon, XCircleIcon, XIcon } from "phosphor-react-native";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { WebMapView, type WebMapRoute } from "../../components/ui/WebMapView";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { useSmoothMarker } from "@/hooks/use-smooth-marker";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { repartidorApi, pedidosApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import type { Coordinate } from "../../lib/mapcn/types";
import { distanciaKm, obtenerRutaCalles, seMovioLoSuficiente } from "../../lib/routing";
import { money, numeroPedido } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { codigoDesdeValor, QrScanBox } from "../../components/domain/QrScanBox";
import { CodigoQrCard } from "../../components/domain/CodigoQrCard";
import { EntregaEtapaHud } from "../../components/domain/EntregaEtapaHud";
import { AnimatedListItem } from "../../components/ui/Motion";

const PROGRESO_LABEL: Record<string, string> = { camino_tienda: "Yendo a la tienda", recolectado: "Pedido recolectado", camino_cliente: "En camino al cliente" };
const PROGRESO_SIGUIENTE: Record<string, string> = { camino_tienda: "Marcar recolectado", recolectado: "Marcar en camino" };

export function RepartidorEntregasScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [recogiendoDe, setRecogiendoDe] = useState<Pedido | null>(null);
  const [entregaQr, setEntregaQr] = useState<{ pedido: Pedido; token: string; pin: string } | null>(null);
  const [graciaMap, setGraciaMap] = useState<Record<number, number>>({});
  const [soltandoDe, setSoltandoDe] = useState<Pedido | null>(null);
  const [rutaCalles, setRutaCalles] = useState<Coordinate[] | null>(null);
  const [mapaExpandido, setMapaExpandido] = useState(false);
  const ultimaConsultaRef = useRef<{ yo: Coordinate; objetivo: Coordinate } | null>(null);

  const cargar = () => {
    repartidorApi.misEntregas().then((r) => {
      setPedidos(r.pedidos);
      const mapa: Record<number, number> = {};
      for (const p of r.pedidos) {
        if (p.estado === "preparacion" && !p.confirmado_repartidor_recogida && (p.gracia_cancelar_seg ?? 0) > 0) mapa[p.id] = p.gracia_cancelar_seg!;
      }
      setGraciaMap(mapa);
    }).catch(() => setPedidos([]));
  };

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 8000);
    return () => clearInterval(t);
  }, []);

  // Cuenta regresiva local entre cada refetch -- el valor real de verdad siempre viene del
  // servidor (REPARTIDOR_GRACIA_CANCELAR_SEG, calculado con el reloj de MySQL).
  useEffect(() => {
    const t = setInterval(() => {
      setGraciaMap((prev) => {
        const next: Record<number, number> = {};
        for (const [id, seg] of Object.entries(prev)) {
          if (seg > 1) next[Number(id)] = seg - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const soltarPedido = async (p: Pedido) => {
    try {
      await repartidorApi.cancelarAsignacion(p.id);
      toast.show("Soltaste el pedido.", "info");
      setSoltandoDe(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo soltar el pedido.", "error");
    }
  };

  const activo = useMemo(() => pedidos?.find((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado)) ?? null, [pedidos]);

  const ubicacion = useLocationTracking({
    autoStart: !!activo,
    requestPermission: true,
    accuracy: "high",
    distanceInterval: 3,
    timeInterval: 3000,
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
    return { destino, tienda, yo, ruta, centro, objetivo, vaHaciaTienda };
  }, [activo, ubicacion.coordinate]);

  // Ruta real por calles (OSRM) para el objetivo actual -- se recalcula solo si el
  // objetivo cambió o el repartidor se movió lo suficiente, para no golpear el servicio
  // público en cada ping de ubicación (cada ~8s). Mientras no haya respuesta, se sigue
  // mostrando la línea recta de `mapa.ruta` como fallback inmediato.
  useEffect(() => {
    if (!mapa?.yo || !mapa.objetivo) {
      setRutaCalles(null);
      ultimaConsultaRef.current = null;
      return;
    }
    const previa = ultimaConsultaRef.current;
    const mismoObjetivo = previa && previa.objetivo[0] === mapa.objetivo[0] && previa.objetivo[1] === mapa.objetivo[1];
    if (mismoObjetivo && !seMovioLoSuficiente(previa!.yo, mapa.yo)) return;
    const consulta = { yo: mapa.yo, objetivo: mapa.objetivo };
    ultimaConsultaRef.current = consulta;
    obtenerRutaCalles(consulta.yo, consulta.objetivo).then((coords) => {
      // Ojo: NO se usa el cleanup automático del efecto para descartar respuestas viejas
      // -- ese se dispara en CADA cambio de mapa.yo (cada ~3s, un ping de GPS), incluso
      // cuando esa nueva corrida decidió no pedir nada (mismo objetivo, no se movió lo
      // suficiente). Con eso, casi cualquier respuesta de OSRM que tardara más que el
      // intervalo de GPS quedaba descartada en silencio y el mapa se quedaba pegado en la
      // línea recta de respaldo para siempre. Comparando contra la ÚLTIMA consulta
      // realmente iniciada (no contra "¿hubo algún re-render desde entonces?") el
      // resultado se acepta salvo que una consulta genuinamente más nueva ya la reemplazó.
      if (ultimaConsultaRef.current === consulta) setRutaCalles(coords);
    });
  }, [mapa?.yo, mapa?.objetivo]);

  // Desliza el ícono de la moto entre cada actualización de GPS en vez de saltar de golpe
  // -- mismo hook que ya usa OrderDetailScreen.tsx para el marcador del repartidor visto
  // por el comprador.
  const yoSuave = useSmoothMarker(mapa?.yo ?? null);

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
      setEntregaQr({ pedido: p, token: r.qr_token, pin: r.pin });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo generar.", "error");
    }
  };

  if (pedidos === null) {
    return (
      <View style={{ padding: 20 }}>
        <Skeleton height={120} radius={14} />
      </View>
    );
  }
  if (pedidos.length === 0) return <EmptyState icon={<PackageIcon size={22} color={tokens.textMuted} />} title="Sin entregas disponibles" />;

  const activos = pedidos.filter((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado));

  const rutaMapa: WebMapRoute | null = (rutaCalles ?? mapa?.ruta) ? { coordinates: (rutaCalles ?? mapa!.ruta)!, color: mapa?.vaHaciaTienda ? tokens.warn : tokens.ok, width: 5 } : null;
  const markersMapa = mapa
    ? [
        ...(mapa.tienda ? [{ id: "tienda", coordinate: mapa.tienda, color: tokens.warn, emoji: "🏬" }] : []),
        ...(mapa.destino ? [{ id: "destino", coordinate: mapa.destino, color: tokens.ok, emoji: "🧑" }] : []),
        ...(yoSuave ? [{ id: "yo", coordinate: yoSuave, color: tokens.cyan, emoji: "🛵" }] : []),
      ]
    : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 140 }}>
      <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Mis entregas</Text>

      {mapa && activo && (
        <View>
          <EntregaEtapaHud
            recogida={!!activo.confirmado_repartidor_recogida}
            vaHaciaTienda={mapa.vaHaciaTienda}
            distanciaKmTramoActual={mapa.yo && mapa.objetivo ? distanciaKm(mapa.yo[1], mapa.yo[0], mapa.objetivo[1], mapa.objetivo[0]) : null}
            tiempoEstimadoTramoActual={activo.tiempo_estimado}
            distanciaKmTiendaCliente={mapa.tienda && mapa.destino ? distanciaKm(mapa.tienda[1], mapa.tienda[0], mapa.destino[1], mapa.destino[0]) : null}
            trafico={activo.trafico}
          />
          <View style={{ height: 200, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" }}>
            <WebMapView center={mapa.centro} zoom={16} interactive layersControl recenterControl route={rutaMapa} markers={markersMapa} />
            <Pressable
              onPress={() => setMapaExpandido(true)}
              style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border }}
            >
              <ArrowsOutIcon size={16} weight="bold" color={tokens.textPrimary} />
            </Pressable>
          </View>
        </View>
      )}

      <Modal visible={mapaExpandido} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setMapaExpandido(false)}>
        <MapaExpandido
          mapa={mapa}
          ruta={rutaMapa}
          markers={markersMapa}
          activo={activo}
          onClose={() => setMapaExpandido(false)}
        />
      </Modal>

      {activos.map((p, idx) => (
        <AnimatedListItem key={p.id} index={idx}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <View>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>
                #{numeroPedido(p)} · {p.tienda_nombre}
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
          {p.metodo_pago === "efectivo" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tokens.warnBg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 }}>
              <MoneyIcon size={15} weight="bold" color={tokens.warnInk} />
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.warnInk }}>
                Cobrar en efectivo: {money(p.total)}
                {p.efectivo_paga_con ? ` · Paga con ${money(p.efectivo_paga_con)}` : ""}
              </Text>
            </View>
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
            {p.estado === "preparacion" && !p.confirmado_repartidor_recogida && !!graciaMap[p.id] && (
              <Button size="sm" variant="secondary" icon={<XCircleIcon size={14} color={tokens.textSecondary} />} onPress={() => setSoltandoDe(p)}>
                {`Soltar (${Math.floor(graciaMap[p.id] / 60)}:${String(graciaMap[p.id] % 60).padStart(2, "0")})`}
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
          <CodigoQrCard token={entregaQr.token} pin={entregaQr.pin} mensaje="Muéstrale este código al comprador para que lo escanee y confirme la entrega." />
        </Sheet>
      )}

      <ConfirmDialog
        visible={!!soltandoDe}
        title="¿Soltar este pedido?"
        description="Se buscará otro repartidor y no quedarás responsable de él."
        confirmLabel="Soltar"
        onCancel={() => setSoltandoDe(null)}
        onConfirm={() => soltandoDe && soltarPedido(soltandoDe)}
      />
    </ScrollView>
  );
}

/** Mismo mapa que el embebido en la pantalla, pero a pantalla completa e interactivo --
 * para cuando el repartidor necesita ver mejor la ruta antes de salir. */
function MapaExpandido({
  mapa,
  ruta,
  markers,
  activo,
  onClose,
}: {
  mapa: { centro: Coordinate; yo: Coordinate | null; objetivo: Coordinate | null; tienda: Coordinate | null; destino: Coordinate | null; vaHaciaTienda: boolean } | null;
  ruta: WebMapRoute | null;
  markers: { id: string; coordinate: Coordinate; color: string }[];
  activo: Pedido | null;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      {mapa && <WebMapView center={mapa.centro} zoom={16} interactive layersControl recenterControl route={ruta} markers={markers} style={{ flex: 1 }} height="100%" />}
      <Pressable
        onPress={onClose}
        style={{ position: "absolute", top: insets.top + 12, left: 16, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border }}
      >
        <XIcon size={16} weight="bold" color={tokens.textPrimary} />
      </Pressable>
      {activo && mapa && (
        <View style={{ position: "absolute", left: 16, right: 16, top: insets.top + 60 }}>
          <EntregaEtapaHud
            recogida={!!activo.confirmado_repartidor_recogida}
            vaHaciaTienda={mapa.vaHaciaTienda}
            distanciaKmTramoActual={mapa.yo && mapa.objetivo ? distanciaKm(mapa.yo[1], mapa.yo[0], mapa.objetivo[1], mapa.objetivo[0]) : null}
            tiempoEstimadoTramoActual={activo.tiempo_estimado}
            distanciaKmTiendaCliente={mapa.tienda && mapa.destino ? distanciaKm(mapa.tienda[1], mapa.tienda[0], mapa.destino[1], mapa.destino[0]) : null}
            trafico={activo.trafico}
          />
        </View>
      )}
    </View>
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
      const r = await repartidorApi.confirmarRecogida(pedido.id, codigoDesdeValor(valor));
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
      <QrScanBox valor={valor} onChange={setValor} hint="Escanea el código QR de la tienda, o teclea el PIN de 6 dígitos si no puedes escanear." />
      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <Button onPress={confirmar} loading={enviando}>
          Confirmar
        </Button>
      </View>
    </Sheet>
  );
}
