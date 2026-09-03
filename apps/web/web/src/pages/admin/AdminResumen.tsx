import { useEffect, useState } from "react";
import { Bicycle, ChatCircleDots, Headset, Package, ShieldCheck, ShoppingBag, Storefront, UsersThree } from "@phosphor-icons/react";
import { adminApi } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Reveal } from "../../components/ui/Reveal";

type Stats = Awaited<ReturnType<typeof adminApi.stats>>["stats"];

export function AdminResumen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [actividad, setActividad] = useState<{ tipo: string; descripcion: string; fecha: string }[] | null>(null);

  useEffect(() => {
    adminApi.stats().then((r) => setStats(r.stats));
    adminApi.actividadReciente().then((r) => setActividad(r.actividad));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 20 }}>Resumen de la plataforma</h1>

      {stats === null ? (
        <div className="kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={80} radius="var(--radius-md)" />
          ))}
        </div>
      ) : (
        <div className="kpi-grid">
          {[
            <Kpi icon={<UsersThree size={16} />} label="Usuarios" value={String(stats.usuarios)} />,
            <Kpi icon={<ShoppingBag size={16} />} label="Compradores" value={String(stats.compradores)} />,
            <Kpi icon={<Storefront size={16} />} label="Vendedores" value={String(stats.vendedores)} />,
            <Kpi icon={<Bicycle size={16} />} label="Repartidores" value={String(stats.repartidores)} />,
            <Kpi icon={<Package size={16} />} label="Pedidos hoy" value={String(stats.pedidos_hoy)} tone="cyan" />,
            <Kpi icon={<Package size={16} />} label="Pedidos totales" value={String(stats.pedidos)} />,
            <Kpi icon={<ShieldCheck size={16} />} label="Admins" value={String(stats.admins)} tone="ok" />,
            <Kpi icon={<Headset size={16} />} label="Soporte abierto" value={String(stats.soporte_abiertos)} tone={stats.soporte_abiertos > 0 ? "warn" : undefined} />,
          ].map((kpi, i) => (
            <Reveal key={i} index={i}>
              {kpi}
            </Reveal>
          ))}
        </div>
      )}

      <section>
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>Actividad reciente</h2>
        {actividad === null ? (
          <Skeleton height={200} />
        ) : actividad.length === 0 ? (
          <EmptyState icon={<ChatCircleDots size={22} />} title="Sin actividad reciente" />
        ) : (
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 4 }}>
            {actividad.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < actividad.length - 1 ? "1px solid var(--border)" : undefined }}>
                <span style={{ fontSize: 13 }}>{a.descripcion}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0, marginLeft: 12 }}>{relativeTime(a.fecha)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "cyan" | "ok" | "warn" }) {
  const bg = tone === "cyan" ? "var(--cyan-bg)" : tone === "ok" ? "var(--ok-bg)" : tone === "warn" ? "var(--warn-bg)" : "var(--surface-2)";
  const ink = tone === "cyan" ? "var(--cyan)" : tone === "ok" ? "var(--ok-ink)" : tone === "warn" ? "var(--warn-ink)" : "var(--text-primary)";
  return (
    <div style={{ background: bg, borderRadius: "var(--radius-md)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: tone ? ink : "var(--text-muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {icon}
        {label}
      </div>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: ink }}>
        {value}
      </div>
    </div>
  );
}
