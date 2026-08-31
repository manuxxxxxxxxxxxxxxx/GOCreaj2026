import { useNavigate } from "react-router-dom";
import { Star, Storefront } from "@phosphor-icons/react";
import type { Tienda } from "../../lib/types";
import { Card } from "../ui/Card";

export function StoreCard({ tienda }: { tienda: Tienda }) {
  const navigate = useNavigate();
  return (
    <Card interactive padding="0" onClick={() => navigate(`/tienda/${tienda.id}`)} style={{ overflow: "hidden" }}>
      <div style={{ height: 96, background: "var(--surface-2)", position: "relative" }}>
        {tienda.portada ? (
          <img src={tienda.portada} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            <Storefront size={28} />
          </div>
        )}
        {tienda.logo && (
          <img
            src={tienda.logo}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ position: "absolute", left: 12, bottom: -18, width: 40, height: 40, borderRadius: 12, objectFit: "cover", border: "2px solid var(--surface-1)", background: "var(--surface-1)" }}
          />
        )}
      </div>
      <div style={{ padding: "24px 14px 14px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5, marginBottom: 2 }}>{tienda.nombre}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{tienda.municipio}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700 }}>
          <Star size={13} weight="fill" color="var(--warn)" />
          <span className="tabular">{tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"}</span>
          {tienda.total_resenas ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({tienda.total_resenas})</span> : null}
        </div>
      </div>
    </Card>
  );
}
