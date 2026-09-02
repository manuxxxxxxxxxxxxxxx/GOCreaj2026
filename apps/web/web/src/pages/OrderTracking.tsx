import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bag, Bicycle, CheckCircle, ChatCircleDots, Circle, Confetti, Copy, MapPin, Note, Phone, QrCode, Star, Storefront, X } from "@phosphor-icons/react";
import { pedidosApi, ApiError } from "../lib/api";
import type { Pedido } from "../lib/types";
import { money, formatDateTime, numeroPedido } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { StatusPill } from "../components/ui/StatusPill";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Sheet } from "../components/ui/Sheet";
import { codigoDesdeValor, QrScanBox } from "../components/domain/QrScanBox";
import { CodigoQrCard } from "../components/domain/CodigoQrCard";
import { MapView, type MapMarker } from "../components/ui/MapView";

const PASOS_DOMICILIO = [
  { key: "pendiente_confirmacion", label: "Pedido recibido" },
  { key: "preparacion", label: "Preparando en la tienda" },
  { key: "camino_tienda", label: "Repartidor va a la tienda" },
  { key: "recolectado", label: "Repartidor recogió tu pedido" },
  { key: "entregado", label: "Entregado" },
] as const;

const PASOS_RECOGIDA = [
  { key: "pendiente_confirmacion", label: "Pedido recibido" },
  { key: "preparacion", label: "Preparando en la tienda" },
  { key: "listo", label: "Listo para recoger" },
  { key: "entregado", label: "Recogido" },
] as const;

function pasosDe(pedido: Pedido) {
  return pedido.tipo_entrega === "recogida" ? PASOS_RECOGIDA : PASOS_DOMICILIO;
}

function pasoActivoIndex(pedido: Pedido): number {
  if (pedido.tipo_entrega === "recogida") {
    if (pedido.estado === "entregado") return 3;
    if (pedido.estado === "preparacion") return pedido.qr_recogida_token ? 2 : 1;
    return 0;
  }
  if (pedido.estado === "entregado") return 4;
  if (pedido.estado === "en_camino") {
    if (pedido.progreso_repartidor === "recolectado" || pedido.progreso_repartidor === "camino_cliente") return 3;
    return 2;
  }
  if (pedido.estado === "preparacion") return pedido.repartidor_id ? 2 : 1;
  return 0;
}

export function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const recienCreado = !!(location.state as { recienCreado?: boolean } | null)?.recienCreado;
  const totalPedidos = (location.state as { totalPedidos?: number } | null)?.totalPedidos ?? 1;
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValor, setQrValor] = useState("");
  const [confirmandoQr, setConfirmandoQr] = useState(false);
  const [calificarOpen, setCalificarOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  const cargar = useCallback(() => {
    if (!id) return;
    pedidosApi
      .estado(Number(id))
      .then((r) => setPedido(r.pedido))
      .catch(() => setPedido(null));
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!pedido || ["entregado", "cancelado", "rechazado_repartidor"].includes(pedido.estado)) return;
    pollRef.current = window.setInterval(cargar, 6000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [pedido, cargar]);

  const cancelar = async () => {
    if (!id) return;
    setCancelando(true);
    try {
      await pedidosApi.cancelar(Number(id));
      toast.show("Pedido cancelado y reembolsado a tu billetera", "success");
      setConfirmandoCancelar(false);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cancelar.", "error");
    } finally {
      setCancelando(false);
    }
  };

  const confirmarEntregaConQr = async () => {
    if (!id || !qrValor.trim()) return;
    setConfirmandoQr(true);
    try {
      await pedidosApi.confirmarEntrega(Number(id), codigoDesdeValor(qrValor));
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

  const [confirmandoRecogida, setConfirmandoRecogida] = useState(false);
  const confirmarRecogidaPropia = async () => {
    if (!id || !pedido?.qr_recogida_token) return;
    setConfirmandoRecogida(true);
    try {
      await pedidosApi.confirmarEntrega(Number(id), { qr_token: pedido.qr_recogida_token });
      toast.show("¡Recogida confirmada! Gracias por tu compra.", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo confirmar.", "error");
    } finally {
      setConfirmandoRecogida(false);
    }
  };

  if (!pedido) {
    return (
      <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height={200} radius="var(--radius-lg)" />
        <Skeleton height={120} radius="var(--radius-lg)" />
      </div>
    );
  }

  const activo = pasoActivoIndex(pedido);
  const esRecogida = pedido.tipo_entrega === "recogida";
  const puedeCancel = pedido.estado === "pendiente_confirmacion" || (pedido.estado === "preparacion" && (esRecogida || !pedido.repartidor_id));
  const puedeCalificar = pedido.estado === "entregado" && !pedido.mi_calificacion;

  const enSeguimiento = !esRecogida && (pedido.estado === "preparacion" || pedido.estado === "en_camino");
  const markers: MapMarker[] = [];
  if (enSeguimiento && pedido.tienda_lat && pedido.tienda_lng) {
    markers.push({ id: "tienda", lat: pedido.tienda_lat, lng: pedido.tienda_lng, color: "var(--warn)", label: pedido.tienda_nombre ?? "Tienda" });
  }
  if (enSeguimiento && pedido.lat_entrega && pedido.lng_entrega) {
    markers.push({ id: "entrega", lat: pedido.lat_entrega, lng: pedido.lng_entrega, color: "var(--ok)", label: "Punto de entrega" });
  }
  if (enSeguimiento && pedido.repartidor_lat && pedido.repartidor_lng) {
    markers.push({ id: "repartidor", lat: pedido.repartidor_lat, lng: pedido.repartidor_lng, color: "var(--cyan)", label: pedido.repartidor_nombre ?? "Repartidor" });
  }
  // Straight line from the courier's current position to their next stop
  // (destination once en route, store while still preparing).
  const destino = pedido.lat_entrega && pedido.lng_entrega ? { lat: pedido.lat_entrega, lng: pedido.lng_entrega } : null;
  const tienda = pedido.tienda_lat && pedido.tienda_lng ? { lat: pedido.tienda_lat, lng: pedido.tienda_lng } : null;
  const repartidor = pedido.repartidor_lat && pedido.repartidor_lng ? { lat: pedido.repartidor_lat, lng: pedido.repartidor_lng } : null;
  const objetivo = pedido.estado === "en_camino" ? destino : tienda;
  const route = enSeguimiento && repartidor && objetivo ? { coordinates: [repartidor, objetivo] } : null;

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      {recienCreado && (
        <div
          className="glow-mesh"
          style={{
            position: "relative",
            background: "var(--surface-1)",
            border: "1px solid var(--cyan)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--cyan-bg)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Confetti size={26} weight="fill" />
          </div>
          <h2 style={{ fontSize: 17 }}>¡Pedido confirmado!</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            {totalPedidos > 1 ? `Se crearon ${totalPedidos} pedidos, uno por cada tienda. Este es el primero.` : "Tu número de pedido es"}
          </p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`#${numeroPedido(pedido)}`);
              toast.show("Número de pedido copiado", "success");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              padding: "8px 16px",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <span className="tabular" style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>
              #{numeroPedido(pedido)}
            </span>
            <Copy size={15} color="var(--text-muted)" />
          </button>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
            Esperando que {pedido.vendedor_nombre ?? "la tienda"} confirme tu pedido — sigue el progreso abajo.
          </p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 20 }}>Pedido #{numeroPedido(pedido)}</h1>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{formatDateTime(pedido.created_at)} · {pedido.vendedor_nombre}</div>
        </div>
        <StatusPill estado={pedido.estado} buscandoRepartidor={!esRecogida && !pedido.repartidor_id} />
      </div>

      {pedido.estado !== "cancelado" && pedido.estado !== "rechazado_repartidor" && (
        <div className="glow-mesh" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {pasosDe(pedido).map((paso, i, arr) => {
              const done = i <= activo;
              const isLast = i === arr.length - 1;
              return (
                <div key={paso.key} style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {done ? <CheckCircle size={22} weight="fill" color="var(--cyan)" /> : <Circle size={22} color="var(--border-strong)" />}
                    {!isLast && <div style={{ width: 2, flex: 1, minHeight: 28, background: i < activo ? "var(--cyan)" : "var(--border)" }} />}
                  </div>
                  <div style={{ paddingBottom: isLast ? 0 : 22 }}>
                    <div style={{ fontSize: 13.5, fontWeight: done ? 700 : 500, color: done ? "var(--text-primary)" : "var(--text-muted)" }}>{paso.label}</div>
                    {i === activo && pedido.tiempo_estimado && paso.key !== "entregado" && (
                      <div className="tabular" style={{ fontSize: 12, color: "var(--cyan)", marginTop: 2 }}>
                        ~{pedido.tiempo_estimado} min · tráfico {pedido.trafico}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div>
          <MapView markers={markers} route={route} height={260} zoom={14} style={{ border: "1px solid var(--border)" }} />
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5, color: "var(--text-muted)" }}>
            {markers.some((m) => m.id === "tienda") && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Storefront size={13} color="var(--warn)" weight="fill" /> Tienda
              </span>
            )}
            {markers.some((m) => m.id === "repartidor") && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)" }} /> Repartidor
              </span>
            )}
            {markers.some((m) => m.id === "entrega") && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} color="var(--ok)" weight="fill" /> Entrega
              </span>
            )}
          </div>
        </div>
      )}

      {esRecogida && pedido.estado === "preparacion" && (
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          {pedido.qr_recogida_token && pedido.pin_recogida ? (
            <>
              <CodigoQrCard token={pedido.qr_recogida_token} pin={pedido.pin_recogida} mensaje="Muestra este código en la tienda al recoger tu pedido." />
              <Button fullWidth style={{ marginTop: 16 }} onClick={confirmarRecogidaPropia} loading={confirmandoRecogida}>
                Ya recogí mi pedido
              </Button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>La tienda está preparando tu pedido. Te avisaremos cuando esté listo para recoger.</p>
          )}
        </div>
      )}

      {pedido.repartidor_id && pedido.repartidor_nombre && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14 }}>
          <Avatar nombre={pedido.repartidor_nombre} foto={pedido.repartidor_foto} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{pedido.repartidor_nombre}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <Star size={12} weight="fill" color="var(--warn)" /> {pedido.repartidor_calificacion_promedio?.toFixed(1) ?? "Nuevo"}
              {pedido.repartidor_vehiculo && (
                <>
                  {" "}· <Bicycle size={12} /> {pedido.repartidor_vehiculo}
                </>
              )}
              {pedido.estado === "en_camino" && pedido.tiempo_estimado && (
                <span className="tabular" style={{ color: "var(--cyan)", fontWeight: 700 }}> · ETA ~{pedido.tiempo_estimado} min</span>
              )}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/chat/${pedido.repartidor_id}`)}>
            <ChatCircleDots size={16} />
          </Button>
          {pedido.repartidor_telefono && (
            <a href={`tel:${pedido.repartidor_telefono}`} style={{ display: "flex" }}>
              <Button size="sm" variant="secondary">
                <Phone size={16} />
              </Button>
            </a>
          )}
        </div>
      )}

      {pedido.estado === "en_camino" && (
        <Button size="lg" fullWidth onClick={() => setQrOpen(true)}>
          <QrCode size={18} /> Confirmar entrega con código
        </Button>
      )}

      {puedeCalificar && (
        <Button size="lg" variant="secondary" fullWidth onClick={() => setCalificarOpen(true)}>
          <Star size={18} /> Calificar pedido
        </Button>
      )}

      <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
        <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Productos</h2>
        {pedido.items.map((it) => (
          <div key={it.producto_id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "6px 0", color: "var(--text-secondary)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {it.imagen ? <img src={it.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Bag size={15} color="var(--text-muted)" />}
            </div>
            <span style={{ flex: 1 }}>
              {it.cantidad}× {it.nombre}
            </span>
            <span className="tabular">{money(it.precio_unitario * it.cantidad)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <span>Total</span>
          <span className="tabular">{money(pedido.total)}</span>
        </div>
      </div>

      <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 8 }}>
        {!esRecogida && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <MapPin size={15} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{pedido.direccion_entrega}</span>
          </div>
        )}
        <div style={{ textTransform: "capitalize" }}>
          Pago: {pedido.metodo_pago}
          {pedido.metodo_pago === "efectivo" && pedido.efectivo_paga_con ? ` (pagas con ${money(pedido.efectivo_paga_con)})` : ""}
        </div>
        {pedido.notas && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Note size={15} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{pedido.notas}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="secondary" fullWidth onClick={() => navigate(`/chat/${pedido.vendedor_id}`)}>
          <ChatCircleDots size={16} /> Escribir a la tienda
        </Button>
        {puedeCancel && (
          <Button variant="danger" fullWidth onClick={() => setConfirmandoCancelar(true)}>
            <X size={16} /> Cancelar pedido
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmandoCancelar}
        title="¿Cancelar este pedido?"
        description="Se reembolsará el total a tu billetera de inmediato."
        confirmLabel="Sí, cancelar"
        danger
        loading={cancelando}
        onConfirm={cancelar}
        onCancel={() => setConfirmandoCancelar(false)}
      />

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title="Confirmar entrega">
        <QrScanBox valor={qrValor} onChange={setQrValor} hint="Escanea el código QR que te muestra el repartidor, o teclea el PIN de 6 dígitos." />
        <Button fullWidth style={{ marginTop: 16 }} onClick={confirmarEntregaConQr} loading={confirmandoQr}>
          Confirmar
        </Button>
      </Sheet>

      {puedeCalificar && <CalificarSheet open={calificarOpen} onClose={() => setCalificarOpen(false)} pedido={pedido} onDone={cargar} />}
    </div>
  );
}

function CalificarSheet({ open, onClose, pedido, onDone }: { open: boolean; onClose: () => void; pedido: Pedido; onDone: () => void }) {
  const [estrellas, setEstrellas] = useState(5);
  const [estrellasRep, setEstrellasRep] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const enviar = async () => {
    setEnviando(true);
    try {
      await pedidosApi.calificar({
        pedido_id: pedido.id,
        estrellas,
        comentario,
        estrellas_repartidor: pedido.repartidor_id ? estrellasRep : undefined,
      });
      toast.show("¡Gracias por tu calificación!", "success");
      onClose();
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la calificación.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Califica tu pedido">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <StarPicker label={`Calidad de ${pedido.vendedor_nombre}`} value={estrellas} onChange={setEstrellas} />
        {pedido.repartidor_id && <StarPicker label="Tu repartidor" value={estrellasRep} onChange={setEstrellasRep} />}
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Cuéntanos cómo estuvo (opcional)"
          rows={3}
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
        />
        <Button fullWidth onClick={enviar} loading={enviando}>
          Enviar calificación
        </Button>
      </div>
    </Sheet>
  );
}

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} onClick={() => onChange(i + 1)} aria-label={`${i + 1} estrellas`} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <Star size={26} weight={i < value ? "fill" : "regular"} color="var(--warn)" />
          </button>
        ))}
      </div>
    </div>
  );
}
