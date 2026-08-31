import { useNavigate } from "react-router-dom";
import { Play } from "@phosphor-icons/react";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";

export function ProductGrid({ productos }: { productos: Producto[] }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
      {productos.map((p) => (
        <button
          key={p.id}
          onClick={() => navigate(p.es_reel ? `/reels?tienda=${p.tienda_id}&producto=${p.id}` : `/producto/${p.id}`)}
          style={{
            position: "relative",
            aspectRatio: "1",
            background: "var(--surface-2)",
            border: "none",
            padding: 0,
            cursor: "pointer",
            overflow: "hidden",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {p.imagen && <img src={p.imagen} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          {!!p.es_reel && (
            <span
              aria-hidden="true"
              style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "rgba(8,11,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Play size={10} weight="fill" color="#fff" />
            </span>
          )}
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "12px 6px 5px",
              background: "linear-gradient(to top, rgba(8,11,20,0.75), transparent)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              textAlign: "left",
            }}
          >
            {money(p.precio_oferta || p.precio)}
          </span>
        </button>
      ))}
    </div>
  );
}
