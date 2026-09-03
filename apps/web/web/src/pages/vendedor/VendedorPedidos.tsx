import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bicycle, CheckCircle, ChatCircleDots, MagnifyingGlass, Package, QrCode, X } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDateTime, numeroPedido } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Sheet } from "../../components/ui/Sheet";
import { CodigoQrCard } from "../../components/domain/CodigoQrCard";

type Columna = "nuevos" | "cocina" | "listos" | "camino";

const COLUMNAS: { key: Columna; label: string }[] = [
  { key: "nuevos", label: "Nuevos" },
  { key: "cocina", label: "En cocina" },
  { key: "listos", label: "Listos para entregar" },
  { key: "camino", label: "En camino" },
];

const RAZONES_RECHAZO = ["Producto agotado", "Tienda cerrada / fuera de horario", "No podemos cubrir la zona", "Pedido sospechoso o incompleto"];

function columnaDe(p: Pedido): Columna | null {
  if (p.estado === "pendiente_confirmacion") return "nuevos";
  if (p.estado === "preparacion" && p.tipo_entrega === "recogida") return p.qr_recogida_token ? "listos" : "cocina";
  if (p.estado === "preparacion" && !p.repartidor_id) return "cocina";
  if (p.estado === "preparacion" && p.repartidor_id) return "listos";
  if (p.estado === "en_camino") return "camino";
  return null;
}

export function VendedorPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [qrDe, setQrDe] = useState<{ pedido: Pedido; token: string; pin: string; recogida?: boolean } | null>(null);
  const [rechazando, setRechazando] = useState<Pedido | null>(null);
  const [colActiva, setColActiva] = useState<Columna>("nuevos");
  const toast = useToast();

  const cargar = () => {
    vendedorApi.misVentas().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  };

  useEffect(() => {
    cargar();
    const t = window.setInterval(cargar, 8000);
    return () => window.clearInterval(t);
  }, []);

  const confirmar = async (p: Pedido) => {
    try {
      await vendedorApi.prepararPedido(p.id, "preparacion");
      toast.show("Pedido confirmado — en preparación", "success");
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
      toast.show(err instanceof ApiError ? err.message : "No se pudo confirmar la recogida.", "error");
    }
  };

  const columnas = useMemo(() => {
    const map: Record<Columna, Pedido[]> = { nuevos: [], cocina: [], listos: [], camino: [] };
    for (const p of pedidos ?? []) {
      const c = columnaDe(p);
      if (c) map[c].push(p);
    }
    return map;
  }, [pedidos]);

  if (pedidos === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={100} radius="var(--radius-md)" />
        ))}
      </div>
    );
  }

  const totalActivos = COLUMNAS.reduce((n, c) => n + columnas[c.key].length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontSize: 20 }}>Gestión de pedidos</h1>

      {totalActivos === 0 ? (
        <EmptyState icon={<Package size={26} />} title="Sin pedidos activos" description="Los nuevos pedidos aparecerán aquí en tiempo real." />
      ) : (
        <>
          <div className="kanban-tabs" style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", width: "fit-content" }}>
            {COLUMNAS.map((c) => (
              <button
                key={c.key}
                onClick={() => setColActiva(c.key)}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: "transparent",
                  color: colActiva === c.key ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {colActiva === c.key && (
                  <motion.span layoutId="vendKanbanBg" transition={{ type: "spring", stiffness: 500, damping: 35 }} style={{ position: "absolute", inset: 0, background: "var(--surface-1)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sm)" }} />
                )}
                <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
                  {c.label}
                  {columnas[c.key].length > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, background: c.key === "nuevos" ? "var(--danger)" : "var(--cyan)", color: "#fff", borderRadius: "var(--radius-pill)", minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      {columnas[c.key].length}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="kanban-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(260px, 1fr))", gap: 14 }}>
            {COLUMNAS.map((c) => (
              <div key={c.key} className="kanban-col" data-active={colActiva === c.key} style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {c.label} · {columnas[c.key].length}
                </div>
                {columnas[c.key].length === 0 ? (
                  <div style={{ border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", padding: 20, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Vacío</div>
                ) : (
                  columnas[c.key].map((p, i) => (
                    <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2), ease: [0.16, 1, 0.3, 1] }}>
                      <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <Avatar nombre={p.comprador_nombre ?? "?"} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{numeroPedido(p)} · {p.comprador_nombre}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDateTime(p.created_at)}</div>
                            </div>
                          </div>
                          <StatusPill estado={p.estado} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
                          {p.items.map((it, idx) => (
                            <div key={it.id ?? idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)" }}>
                              <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>
                                {it.imagen && <img src={it.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                              </div>
                              <span style={{ flex: 1, minWidth: 0, overflowWrap: "break-word" }}>
                                <span className="tabular" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                  {it.cantidad}×
                                </span>{" "}
                                {it.nombre}
                              </span>
                            </div>
                          ))}
                          <span className="tabular" style={{ fontWeight: 700, fontSize: 12 }}>{money(p.total)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          {p.metodo_pago === "efectivo" ? "💵" : "💳"} {p.metodo_pago === "efectivo" ? "Efectivo" : p.metodo_pago === "paypal" ? "PayPal" : "Tarjeta"}
                          {p.tipo_entrega === "recogida" && (
                            <span style={{ fontWeight: 700, color: "var(--violet)", background: "var(--violet-bg)", borderRadius: "var(--radius-pill)", padding: "1px 8px" }}>Recoge en tienda</span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {p.estado === "pendiente_confirmacion" && (
                            <>
                              <Button size="sm" onClick={() => confirmar(p)}>
                                <CheckCircle size={14} /> Aceptar
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => setRechazando(p)}>
                                <X size={14} /> Rechazar
                              </Button>
                            </>
                          )}
                          {p.estado === "preparacion" && p.tipo_entrega === "recogida" && !p.qr_recogida_token && (
                            <Button size="sm" onClick={() => confirmarRecogida(p)}>
                              <QrCode size={14} /> Marcar listo para recoger
                            </Button>
                          )}
                          {p.estado === "preparacion" && p.tipo_entrega === "recogida" && p.qr_recogida_token && p.pin_recogida && (
                            <Button size="sm" variant="secondary" onClick={() => setQrDe({ pedido: p, token: p.qr_recogida_token!, pin: p.pin_recogida!, recogida: true })}>
                              <QrCode size={14} /> Ver código de recogida
                            </Button>
                          )}
                          {p.estado === "preparacion" && p.tipo_entrega !== "recogida" && !p.repartidor_id && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", padding: "6px 10px", width: "100%" }}>
                              {p.oferta_repartidor_id ? <MagnifyingGlass size={13} /> : <Bicycle size={13} />}
                              {p.oferta_repartidor_id ? "Ofreciendo a un repartidor cercano…" : "Buscando repartidor — el sistema lo asigna solo."}
                            </div>
                          )}
                          {p.estado === "preparacion" && p.tipo_entrega !== "recogida" && p.repartidor_id && !p.confirmado_vendedor_recogida && (
                            <Button size="sm" onClick={() => confirmarRecogida(p)}>
                              <QrCode size={14} /> Confirmar recogida
                            </Button>
                          )}
                          {p.estado === "preparacion" && p.tipo_entrega !== "recogida" && p.repartidor_id && !!p.confirmado_vendedor_recogida && p.qr_recogida_token && p.pin_recogida && (
                            <Button size="sm" variant="secondary" onClick={() => setQrDe({ pedido: p, token: p.qr_recogida_token!, pin: p.pin_recogida! })}>
                              <QrCode size={14} /> Ver código de recogida
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/chat/${p.comprador_id}`)}>
                            <ChatCircleDots size={14} />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {qrDe && (
        <Sheet open onClose={() => setQrDe(null)} title="Código de recogida">
          <CodigoQrCard
            token={qrDe.token}
            pin={qrDe.pin}
            mensaje={qrDe.recogida ? "El cliente debe mostrarte este código (o decirte el PIN) al recoger su pedido." : "Que el repartidor escanee este código (o teclee el PIN) al retirar el pedido."}
          />
        </Sheet>
      )}

      {rechazando && <RechazarSheet pedido={rechazando} onClose={() => setRechazando(null)} onDone={cargar} />}

      <style>{`
        @media (max-width: 980px) {
          .kanban-tabs { display: flex !important; overflow-x: auto; }
          .kanban-grid { display: block !important; }
          .kanban-col { display: none !important; }
          .kanban-col[data-active="true"] { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function RechazarSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: () => void }) {
  const [razon, setRazon] = useState("");
  const [personalizada, setPersonalizada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const razonFinal = razon === "otra" ? personalizada.trim() : razon;

  const confirmar = async () => {
    if (!razonFinal) return toast.show("Selecciona o escribe una razón.", "warning");
    setEnviando(true);
    try {
      const r = await vendedorApi.rechazarPedido(pedido.id, razonFinal);
      toast.show(`Pedido rechazado. Se reembolsó ${money(r.reembolso)}.`, "info");
      onClose();
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo rechazar.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={`Rechazar pedido #${numeroPedido(pedido)}`}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>Se reembolsará {money(pedido.total)} al comprador de inmediato. Indica el motivo — el cliente lo verá.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {RAZONES_RECHAZO.map((r) => (
          <label key={r} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: `1px solid ${razon === r ? "var(--cyan)" : "var(--border)"}`, background: razon === r ? "var(--cyan-bg)" : "var(--surface-1)", cursor: "pointer", fontSize: 13 }}>
            <input type="radio" name="razon" checked={razon === r} onChange={() => setRazon(r)} />
            {r}
          </label>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: `1px solid ${razon === "otra" ? "var(--cyan)" : "var(--border)"}`, background: razon === "otra" ? "var(--cyan-bg)" : "var(--surface-1)", cursor: "pointer", fontSize: 13 }}>
          <input type="radio" name="razon" checked={razon === "otra"} onChange={() => setRazon("otra")} />
          Otra razón
        </label>
        {razon === "otra" && (
          <textarea
            value={personalizada}
            onChange={(e) => setPersonalizada(e.target.value)}
            placeholder="Escribe el motivo"
            rows={2}
            style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
          />
        )}
      </div>
      <Button fullWidth variant="danger" onClick={confirmar} loading={enviando} disabled={!razonFinal}>
        Rechazar y reembolsar
      </Button>
    </Sheet>
  );
}
