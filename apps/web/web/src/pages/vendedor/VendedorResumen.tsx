import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendUp } from "@phosphor-icons/react";
import { vendedorApi } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDate } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Avatar } from "../../components/ui/Avatar";

export function VendedorResumen() {
  const navigate = useNavigate();
  const [ganancias, setGanancias] = useState<{ fecha: string; monto: number }[] | null>(null);
  const [productoTop, setProductoTop] = useState<{ nombre: string; total_vendido: number } | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    vendedorApi.ganancias().then((r) => {
      setGanancias(r.ganancias_por_dia);
      setProductoTop(r.producto_top);
    });
    vendedorApi.misVentas().then((r) => setPedidos(r.pedidos));
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = ganancias?.find((g) => g.fecha.startsWith(hoy))?.monto ?? 0;
  const pedidosHoy = pedidos?.filter((p) => p.created_at.startsWith(hoy)) ?? [];
  const activos = pedidos?.filter((p) => !["entregado", "cancelado", "rechazado_repartidor"].includes(p.estado)) ?? [];
  const maxMonto = Math.max(1, ...(ganancias?.map((g) => g.monto) ?? [1]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20 }}>Resumen de la tienda</h1>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{formatDate(new Date().toISOString())}</p>
        </div>
        <Button onClick={() => navigate("/vendedor/productos")}>
          <Plus size={16} /> Nuevo producto
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Kpi label="Ventas hoy" value={money(ventasHoy)} tone="cyan" />
        <Kpi label="Pedidos hoy" value={String(pedidosHoy.length)} tone="ok" />
        <Kpi label="En curso" value={String(activos.length)} tone="warn" />
        <Kpi label="Producto top" value={productoTop?.nombre ?? "—"} small />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <TrendUp size={16} color="var(--cyan)" />
            <h2 style={{ fontSize: 13.5 }}>Ventas de los últimos días</h2>
          </div>
          {ganancias === null ? (
            <Skeleton height={140} />
          ) : ganancias.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aún no tienes ventas completadas.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
              {ganancias.slice(-14).map((g) => (
                <div key={g.fecha} title={`${formatDate(g.fecha)}: ${money(g.monto)}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: Math.max(4, (g.monto / maxMonto) * 120), background: "var(--cyan)", opacity: 0.85, borderRadius: "5px 5px 2px 2px" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <h2 style={{ fontSize: 13.5, marginBottom: 14 }}>Pedidos recientes</h2>
          {pedidos === null ? (
            <Skeleton height={140} />
          ) : pedidos.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sin pedidos todavía.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pedidos.slice(0, 5).map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar nombre={p.comprador_nombre ?? "?"} size={26} />
                  <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.comprador_nombre}</span>
                  <StatusPill estado={p.estado} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, small }: { label: string; value: string; tone?: "cyan" | "ok" | "warn"; small?: boolean }) {
  const bg = tone === "cyan" ? "var(--cyan-bg)" : tone === "ok" ? "var(--ok-bg)" : tone === "warn" ? "var(--warn-bg)" : "var(--surface-2)";
  const ink = tone === "cyan" ? "var(--cyan)" : tone === "ok" ? "var(--ok-ink)" : tone === "warn" ? "var(--warn-ink)" : "var(--text-primary)";
  return (
    <div style={{ background: bg, borderRadius: "var(--radius-md)", padding: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: tone ? ink : "var(--text-muted)", opacity: tone ? 0.85 : 1 }}>{label}</div>
      <div className="tabular" style={{ fontSize: small ? 15 : 22, fontWeight: 700, marginTop: 6, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}
