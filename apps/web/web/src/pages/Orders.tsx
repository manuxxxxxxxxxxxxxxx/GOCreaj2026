import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowsClockwise, ChatCircleDots, MapTrifold, Package, Receipt } from "@phosphor-icons/react";
import { pedidosApi, carritoApi, ApiError } from "../lib/api";
import type { Pedido } from "../lib/types";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { money, formatDateTime, numeroPedido } from "../lib/format";
import { StatusPill } from "../components/ui/StatusPill";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Card } from "../components/ui/Card";
import { Sheet } from "../components/ui/Sheet";

export function Orders() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [tab, setTab] = useState<"curso" | "historial">("curso");
  const [reciboDe, setReciboDe] = useState<Pedido | null>(null);
  const navigate = useNavigate();
  const { refrescar } = useCart();
  const toast = useToast();

  useEffect(() => {
    pedidosApi.misPedidos().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  }, []);

  const activos = pedidos?.filter((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado)) ?? [];
  const historial = pedidos?.filter((p) => ["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado)) ?? [];

  const reordenar = async (p: Pedido) => {
    try {
      await Promise.all(p.items.map((it) => carritoApi.agregar(it.producto_id, it.cantidad)));
      await refrescar();
      toast.show("Productos agregados al carrito", "success");
      navigate("/carrito");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo repetir el pedido — algún producto ya no está disponible.", "error");
    }
  };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 22 }}>Mis pedidos</h1>

      {pedidos === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={92} radius="var(--radius-md)" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<Package size={26} />} title="Todavía no has pedido nada" actionLabel="Explorar tiendas" onAction={() => navigate("/explorar")} />
      ) : (
        <>
          <div style={{ position: "relative", display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", width: "fit-content" }}>
            {(["curso", "historial"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ position: "relative", padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {tab === t && (
                  <motion.span layoutId="ordersTabBg" transition={{ type: "spring", stiffness: 500, damping: 35 }} style={{ position: "absolute", inset: 0, background: "var(--surface-1)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sm)" }} />
                )}
                <span style={{ position: "relative" }}>
                  {t === "curso" ? "En curso" : "Historial"} {t === "curso" && activos.length > 0 ? `(${activos.length})` : ""}
                </span>
              </button>
            ))}
          </div>

          {tab === "curso" ? (
            activos.length === 0 ? (
              <EmptyState icon={<Package size={24} />} title="Sin pedidos en curso" actionLabel="Explorar tiendas" onAction={() => navigate("/explorar")} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activos.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}>
                    <Card interactive onClick={() => navigate(`/pedidos/${p.id}`)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Pedido #{numeroPedido(p)}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.vendedor_nombre} · {formatDateTime(p.created_at)}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{p.items.length} producto{p.items.length !== 1 ? "s" : ""}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <StatusPill estado={p.estado} buscandoRepartidor={p.tipo_entrega !== "recogida" && !p.repartidor_id} />
                          <div className="tabular" style={{ fontWeight: 700, marginTop: 8 }}>{money(p.total)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" onClick={() => navigate(`/pedidos/${p.id}`)}>
                          <MapTrifold size={14} /> Tracking en vivo
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/chat/${p.vendedor_id}`)}>
                          <ChatCircleDots size={14} /> Chat
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )
          ) : historial.length === 0 ? (
            <EmptyState icon={<Package size={24} />} title="Sin historial todavía" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historial.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Pedido #{numeroPedido(p)}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.vendedor_nombre} · {formatDateTime(p.created_at)}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{p.items.length} producto{p.items.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <StatusPill estado={p.estado} />
                        <div className="tabular" style={{ fontWeight: 700, marginTop: 8 }}>{money(p.total)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button size="sm" variant="secondary" onClick={() => setReciboDe(p)}>
                        <Receipt size={14} /> Recibo
                      </Button>
                      {p.estado === "entregado" && (
                        <Button size="sm" onClick={() => reordenar(p)}>
                          <ArrowsClockwise size={14} /> Volver a pedir
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {reciboDe && (
        <Sheet open onClose={() => setReciboDe(null)} title={`Recibo — Pedido #${numeroPedido(reciboDe)}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
            <span>{formatDateTime(reciboDe.created_at)}</span>
            <span>{reciboDe.vendedor_nombre}</span>
            <span style={{ textTransform: "capitalize" }}>Pago: {reciboDe.metodo_pago} · {reciboDe.pago_estado}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {reciboDe.items.map((it) => (
              <div key={it.producto_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{it.cantidad}× {it.nombre}</span>
                <span className="tabular">{money(it.precio_unitario * it.cantidad)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span>Total</span>
            <span className="tabular">{money(reciboDe.total)}</span>
          </div>
        </Sheet>
      )}
    </div>
  );
}
