import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { money } from "../../lib/format";
import { Skeleton } from "../../components/ui/Skeleton";

type Metricas = Awaited<ReturnType<typeof adminApi.metricasFinancieras>>["metricas"];

export function AdminFinanzas() {
  const [m, setM] = useState<Metricas | null>(null);

  useEffect(() => {
    adminApi.metricasFinancieras().then((r) => setM(r.metricas));
  }, []);

  if (!m) return <Skeleton height={400} />;

  const maxVenta = Math.max(1, ...m.ultimos_30_dias.map((d) => d.ventas));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 20 }}>Finanzas</h1>

      <div className="kpi-grid-3">
        <Kpi label="Ventas totales" value={money(m.ventas_totales)} tone="cyan" />
        <Kpi label="Comisión de la plataforma" value={money(m.comision_plataforma)} tone="ok" />
        <Kpi label="Retiros pendientes" value={money(m.retiros_pendientes)} tone="warn" />
        <Kpi label="Pagado a vendedores" value={money(m.pagado_vendedores)} />
        <Kpi label="Pagado a repartidores" value={money(m.pagado_repartidores)} />
        <Kpi label="Saldo total en wallets" value={money(m.saldo_en_wallets)} />
      </div>

      <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
        <h2 style={{ fontSize: 13.5, marginBottom: 16 }}>Ventas de los últimos 30 días</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140 }}>
          {m.ultimos_30_dias.map((d) => (
            <div key={d.fecha} title={`${d.fecha}: ${money(d.ventas)}`} style={{ flex: 1, height: Math.max(3, (d.ventas / maxVenta) * 130), background: "var(--cyan)", opacity: 0.85, borderRadius: "3px 3px 1px 1px" }} />
          ))}
        </div>
      </div>

      <div className="dashboard-two-col-even">
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <h2 style={{ fontSize: 13.5, marginBottom: 12 }}>Pedidos por estado</h2>
          {m.por_estado.map((e) => (
            <div key={e.estado} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 12.5, borderBottom: "1px solid var(--border)" }}>
              <span style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{e.estado}</span>
              <span className="tabular">
                {e.total} · {money(e.monto)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <h2 style={{ fontSize: 13.5, marginBottom: 12 }}>Top tiendas</h2>
          {m.top_tiendas.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 12.5, borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t.nombre}</span>
              <span className="tabular">
                {t.pedidos} · {money(t.ventas)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "cyan" | "ok" | "warn" }) {
  const bg = tone === "cyan" ? "var(--cyan-bg)" : tone === "ok" ? "var(--ok-bg)" : tone === "warn" ? "var(--warn-bg)" : "var(--surface-2)";
  const ink = tone === "cyan" ? "var(--cyan)" : tone === "ok" ? "var(--ok-ink)" : tone === "warn" ? "var(--warn-ink)" : "var(--text-primary)";
  return (
    <div style={{ background: bg, borderRadius: "var(--radius-md)", padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: tone ? ink : "var(--text-muted)", opacity: tone ? 0.85 : 1 }}>{label}</div>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: ink }}>
        {value}
      </div>
    </div>
  );
}
