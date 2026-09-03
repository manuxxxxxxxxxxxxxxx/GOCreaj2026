import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bicycle, CheckCircle, MapPin, Money, NavigationArrow, Phone, QrCode, Storefront, XCircle } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { repartidorApi, pedidosApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { codigoDesdeValor, QrScanBox } from "../../components/domain/QrScanBox";
import { CodigoQrCard } from "../../components/domain/CodigoQrCard";
import { MapView, type MapMarker } from "../../components/ui/MapView";

const PROGRESO_LABEL: Record<string, string> = {
  camino_tienda: "Yendo a la tienda",
  recolectado: "Pedido recolectado",
  camino_cliente: "En camino al cliente",
};
const PROGRESO_SIGUIENTE: Record<string, string> = {
  camino_tienda: "Marcar como recolectado",
  recolectado: "Marcar en camino al cliente",
};

export function RepartidorEntregas() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [recogiendoDe, setRecogiendoDe] = useState<Pedido | null>(null);
  const [entregaQr, setEntregaQr] = useState<{ pedido: Pedido; token: string; pin: string } | null>(null);
  const [graciaSeg, setGraciaSeg] = useState<number | null>(null);
  const [soltando, setSoltando] = useState(false);
  const toast = useToast();
  const watchIdRef = useRef<number | null>(null);

  const cargar = () => {
    repartidorApi.misEntregas().then((r) => {
      setPedidos(r.pedidos);
      const activoAhora = r.pedidos.find((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado));
      setGraciaSeg(activoAhora && !activoAhora.confirmado_repartidor_recogida ? (activoAhora.gracia_cancelar_seg ?? 0) : null);
    }).catch(() => setPedidos([]));
  };

  // Cuenta regresiva local entre cada refetch (cada 6s) -- así el número baja cada
  // segundo en vez de saltar de 6 en 6, aunque el valor real de verdad siempre viene del
  // servidor (ver REPARTIDOR_GRACIA_CANCELAR_SEG, calculado con el reloj de MySQL).
  useEffect(() => {
    if (graciaSeg === null || graciaSeg <= 0) return;
    const t = window.setInterval(() => setGraciaSeg((s) => (s === null ? null : Math.max(0, s - 1))), 1000);
    return () => window.clearInterval(t);
  }, [graciaSeg === null]);

  useEffect(() => {
    cargar();
    const t = window.setInterval(cargar, 6000);
    return () => window.clearInterval(t);
  }, []);

  const activo = pedidos?.find((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado)) ?? null;

  // GPS en vivo mientras hay una entrega activa (Single Order Lock ⇒ máx. 1).
  useEffect(() => {
    if (!activo || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        pedidosApi.actualizarUbicacionRepartidor({ pedido_id: activo.id, lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [activo?.id]);

  const avanzar = async (p: Pedido) => {
    try {
      await repartidorApi.avanzarEstado({ pedido_id: p.id });
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo avanzar el estado.", "error");
    }
  };

  const generarQrEntrega = async (p: Pedido) => {
    try {
      const r = await repartidorApi.generarQrEntrega(p.id);
      setEntregaQr({ pedido: p, token: r.qr_token, pin: r.pin });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo generar el código.", "error");
    }
  };

  const soltarPedido = async (p: Pedido) => {
    if (!window.confirm("¿Soltar este pedido? Se buscará otro repartidor y no quedarás responsable de él.")) return;
    setSoltando(true);
    try {
      await repartidorApi.cancelarAsignacion(p.id);
      toast.show("Soltaste el pedido.", "info");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo soltar el pedido.", "error");
    } finally {
      setSoltando(false);
    }
  };

  const completarManual = async (p: Pedido) => {
    try {
      const r = await repartidorApi.completar(p.id);
      toast.show(`Entrega completada. Ganaste ${money(r.ganancia_repartidor)}.`, "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar.", "error");
    }
  };

  if (pedidos === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton height={340} radius="var(--radius-lg)" />
      </div>
    );
  }

  if (!activo) {
    return (
      <EmptyState icon={<Bicycle size={26} />} title="Sin entrega activa" description="Acepta un pedido disponible para empezar." actionLabel="Ver pedidos disponibles" onAction={() => navigate("/repartidor")} />
    );
  }

  const yendoATienda = activo.estado === "preparacion" || !activo.progreso_repartidor || activo.progreso_repartidor === "camino_tienda";
  const markers: MapMarker[] = [];
  if (activo.tienda_lat && activo.tienda_lng) markers.push({ id: "tienda", lat: activo.tienda_lat, lng: activo.tienda_lng, color: "var(--warn)", label: activo.tienda_nombre ?? "Tienda" });
  if (activo.lat_entrega && activo.lng_entrega) markers.push({ id: "cliente", lat: activo.lat_entrega, lng: activo.lng_entrega, color: "var(--ok)", label: "Cliente" });
  if (activo.repartidor_lat && activo.repartidor_lng) markers.push({ id: "yo", lat: activo.repartidor_lat, lng: activo.repartidor_lng, color: "var(--cyan)", label: "Tú" });
  const yo = activo.repartidor_lat && activo.repartidor_lng ? { lat: activo.repartidor_lat, lng: activo.repartidor_lng } : null;
  const objetivo = yendoATienda
    ? activo.tienda_lat && activo.tienda_lng
      ? { lat: activo.tienda_lat, lng: activo.tienda_lng }
      : null
    : activo.lat_entrega && activo.lng_entrega
      ? { lat: activo.lat_entrega, lng: activo.lng_entrega }
      : null;
  const route = yo && objetivo ? { coordinates: [yo, objetivo] } : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20 }}>Mi pedido actual</h1>
        <StatusPill estado={activo.estado} />
      </div>

      {markers.length > 0 && <MapView markers={markers} route={route} height={220} zoom={14} fitToMarkers />}

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: yendoATienda ? "var(--warn-bg)" : "var(--ok-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {yendoATienda ? <Storefront size={18} color="var(--warn)" /> : <MapPin size={18} color="var(--ok)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{yendoATienda ? "Recoger en" : "Entregar en"}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{yendoATienda ? activo.tienda_nombre : `Cliente: ${activo.comprador_nombre}`}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{yendoATienda ? activo.tienda_direccion : activo.direccion_entrega}</div>
          </div>
          {activo.comprador_telefono && !yendoATienda && (
            <a href={`tel:${activo.comprador_telefono}`}>
              <Button size="sm" variant="secondary">
                <Phone size={15} />
              </Button>
            </a>
          )}
        </div>

        {activo.estado === "en_camino" && activo.progreso_repartidor && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--cyan)", marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cyan)", animation: "icon-pulse 1.6s ease-in-out infinite" }} />
            {PROGRESO_LABEL[activo.progreso_repartidor] ?? activo.progreso_repartidor}
          </div>
        )}

        {activo.estado === "preparacion" && !activo.confirmado_repartidor_recogida && graciaSeg === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            Ya pasaron los 3 minutos: ahora eres responsable de este pedido.
          </div>
        )}

        {activo.metodo_pago === "efectivo" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--warn-bg)", color: "var(--warn-ink)", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            <Money size={16} weight="bold" />
            Cobrar en efectivo: <span className="tabular">{money(activo.total)}</span>
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          {activo.items.length} producto{activo.items.length !== 1 ? "s" : ""} · Ganas <span className="tabular" style={{ color: "var(--ok)", fontWeight: 700 }}>{money(activo.ganancia_repartidor ?? 0)}</span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {activo.estado === "preparacion" && !activo.confirmado_repartidor_recogida && (
            <Button fullWidth onClick={() => setRecogiendoDe(activo)}>
              <QrCode size={16} /> Escanear código de recogida
            </Button>
          )}
          {activo.estado === "preparacion" && activo.confirmado_repartidor_recogida && (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Esperando que la tienda confirme la recogida…</div>
          )}
          {activo.estado === "en_camino" && activo.progreso_repartidor && activo.progreso_repartidor !== "camino_cliente" && (
            <Button fullWidth onClick={() => avanzar(activo)}>
              <NavigationArrow size={16} /> {PROGRESO_SIGUIENTE[activo.progreso_repartidor]}
            </Button>
          )}
          {activo.estado === "en_camino" && (activo.progreso_repartidor === "camino_cliente" || !activo.progreso_repartidor) && (
            <Button fullWidth onClick={() => generarQrEntrega(activo)}>
              <QrCode size={16} /> Marcar como entregado
            </Button>
          )}
          {activo.estado === "en_camino" && (
            <Button size="sm" variant="secondary" onClick={() => completarManual(activo)}>
              <CheckCircle size={15} /> Completar manualmente
            </Button>
          )}
        </div>

        {/* Ventana de gracia: soltar sin quedar responsable solo dentro de los primeros
            3 minutos y antes de confirmar la recogida (ver REPARTIDOR_GRACIA_CANCELAR_SEG). */}
        {!activo.confirmado_repartidor_recogida && !!graciaSeg && graciaSeg > 0 && (
          <button
            onClick={() => soltarPedido(activo)}
            disabled={soltando}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 10, padding: "9px 0", background: "none", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 700, cursor: soltando ? "default" : "pointer" }}
          >
            <XCircle size={14} /> Soltar pedido <span className="tabular">({Math.floor(graciaSeg / 60)}:{String(graciaSeg % 60).padStart(2, "0")})</span>
          </button>
        )}
      </Card>

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
        <Sheet open onClose={() => setEntregaQr(null)} title="Código de entrega">
          <CodigoQrCard token={entregaQr.token} pin={entregaQr.pin} mensaje="Muéstrale este código al comprador para que lo escanee (o dale el PIN) y así confirmar la entrega." />
        </Sheet>
      )}

    </motion.div>
  );
}

function RecogidaSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: () => void }) {
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const confirmar = async () => {
    if (!valor.trim()) return;
    setEnviando(true);
    try {
      const r = await repartidorApi.confirmarRecogida(pedido.id, codigoDesdeValor(valor));
      toast.show(r.en_camino ? "¡Vas en camino al cliente!" : "Recogida confirmada. Esperando confirmación de la tienda.", "success");
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Confirmar recogida">
      <QrScanBox valor={valor} onChange={setValor} hint="Escanea el código QR de la tienda, o teclea el PIN de 6 dígitos." />
      <Button fullWidth style={{ marginTop: 16 }} onClick={confirmar} loading={enviando}>
        Confirmar
      </Button>
    </Sheet>
  );
}
