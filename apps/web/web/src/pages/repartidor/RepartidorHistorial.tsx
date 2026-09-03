import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClockCounterClockwise, MapPin, Money, Package } from "@phosphor-icons/react";
import { repartidorApi } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, numeroPedido, formatDateTime } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusPill } from "../../components/ui/StatusPill";
import { Sheet } from "../../components/ui/Sheet";

const ESTADOS_CERRADOS = ["entregado", "cancelado", "rechazado_repartidor"];

/** Reemplaza la pestaña "Reels" del repartidor en la web -- mismo historial detallado de
 * entregas pasadas que ya existe en la app móvil (RepartidorHistorialScreen.tsx), en vez
 * del bloque resumido de 2 líneas que antes vivía al fondo de RepartidorEntregas.tsx. */
export function RepartidorHistorial() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [detalle, setDetalle] = useState<Pedido | null>(null);

  useEffect(() => {
    repartidorApi.misEntregas().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  }, []);

  const historial = useMemo(
    () => (pedidos ?? []).filter((p) => ESTADOS_CERRADOS.includes(p.estado)).sort((a, b) => ((a.updated_at ?? a.created_at) < (b.updated_at ?? b.created_at) ? 1 : -1)),
    [pedidos],
  );

  const gananciaTotal = useMemo(
    () => historial.filter((p) => p.estado === "entregado").reduce((acc, p) => acc + (p.ganancia_repartidor ?? 0), 0),
    [historial],
  );

  if (pedidos === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton height={80} radius="var(--radius-lg)" />
        <Skeleton height={340} radius="var(--radius-lg)" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 20 }}>Historial</h1>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{historial.length} entrega{historial.length !== 1 ? "s" : ""} en total</p>
      </div>

      {historial.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwise size={26} />} title="Todavía no tienes entregas completadas" />
      ) : (
        <>
          <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ok-bg)" }}>
              <Money size={18} weight="bold" color="var(--ok-ink)" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Ganado en las entregas de abajo</div>
              <div className="tabular" style={{ fontSize: 17, fontWeight: 700 }}>{money(gananciaTotal)}</div>
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {historial.map((p) => (
              <Card key={p.id} interactive onClick={() => setDetalle(p)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>#{numeroPedido(p)} · {p.tienda_nombre}</span>
                  <StatusPill estado={p.estado} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, color: "var(--text-muted)", fontSize: 11.5 }}>
                  <MapPin size={12} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.comprador_nombre} · {p.direccion_entrega}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{formatDateTime(p.updated_at ?? p.created_at)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {p.items.length} producto{p.items.length !== 1 ? "s" : ""} · Total {money(p.total)}
                    {p.metodo_pago === "efectivo" ? " · Efectivo" : ""}
                  </span>
                  {p.estado === "entregado" && (
                    <span className="tabular" style={{ fontWeight: 700, fontSize: 14, color: "var(--ok)" }}>+{money(p.ganancia_repartidor ?? 0)}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `Pedido #${numeroPedido(detalle)}` : undefined}>
        {detalle && <DetalleEntrega pedido={detalle} />}
      </Sheet>
    </motion.div>
  );
}

function DetalleEntrega({ pedido: p }: { pedido: Pedido }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700 }}>{p.tienda_nombre}</span>
        <StatusPill estado={p.estado} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Entregado a</div>
        <div style={{ fontSize: 13.5 }}>{p.comprador_nombre}</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4, color: "var(--text-secondary)", fontSize: 12.5 }}>
          <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
          {p.direccion_entrega}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Fecha</div>
        <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Pedido: {formatDateTime(p.created_at)}</div>
        {p.updated_at && <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{p.estado === "entregado" ? "Entregado" : "Cerrado"}: {formatDateTime(p.updated_at)}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Productos</div>
        {p.items.map((it, idx) => (
          <div key={it.id ?? idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Package size={14} color="var(--text-muted)" />
            </div>
            <div style={{ flex: 1, fontSize: 12.5 }}>
              {it.cantidad}x {it.nombre}
            </div>
            <span className="tabular" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{money(it.precio_unitario * it.cantidad)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>Total del pedido</span>
          <span className="tabular">{money(p.total)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>Método de pago</span>
          <span>{p.metodo_pago === "efectivo" ? "Efectivo" : p.metodo_pago === "tarjeta" ? "Tarjeta" : "PayPal"}</span>
        </div>
        {p.estado === "entregado" && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
            <span>Ganaste</span>
            <span className="tabular" style={{ color: "var(--ok)" }}>{money(p.ganancia_repartidor ?? 0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
