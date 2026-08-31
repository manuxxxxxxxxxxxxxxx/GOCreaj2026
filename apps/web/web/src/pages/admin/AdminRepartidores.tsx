import { useEffect, useState } from "react";
import { Bicycle, Star } from "@phosphor-icons/react";
import { adminApi } from "../../lib/api";
import type { Pedido, Usuario } from "../../lib/types";
import { money } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

type RepartidorActivo = Usuario & { lat: number | null; lng: number | null; pedido_activo: Pedido | null };

export function AdminRepartidores() {
  const [repartidores, setRepartidores] = useState<RepartidorActivo[] | null>(null);

  useEffect(() => {
    const cargar = () => adminApi.repartidoresActivos().then((r) => setRepartidores(r.repartidores));
    cargar();
    const t = window.setInterval(cargar, 10000);
    return () => window.clearInterval(t);
  }, []);

  if (repartidores === null) return <Skeleton height={300} />;
  if (repartidores.length === 0) return <EmptyState icon={<Bicycle size={24} />} title="Ningún repartidor en línea ahora" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 20 }}>Repartidores en vivo</h1>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>{repartidores.length} en línea ahora mismo.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {repartidores.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
            <div style={{ position: "relative" }}>
              <Avatar nombre={r.nombre} foto={r.foto_perfil} size={40} online />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.nombre}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--text-muted)" }}>
                <Star size={11} weight="fill" color="var(--warn)" /> {r.repartidor_calificacion_promedio?.toFixed(1) ?? "—"}
              </div>
            </div>
            {r.pedido_activo ? (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}>En entrega #{r.pedido_activo.id}</div>
                <div className="tabular" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{money(r.pedido_activo.total)}</div>
              </div>
            ) : (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ok)" }}>Disponible</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
