import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Star } from "@phosphor-icons/react";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { carritoApi, ApiError } from "../../lib/api";
import { triggerFly } from "../../lib/cartFly";

interface Props {
  producto: Producto;
  variant?: "large" | "medium" | "small";
}

export function ProductCard({ producto, variant = "medium" }: Props) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const [pressed, setPressed] = useState(false);
  const [adding, setAdding] = useState(false);

  const agotado = producto.estado_stock === "agotado" || producto.stock <= 0;
  const enOferta = !!producto.precio_oferta && producto.precio_oferta > 0;
  const height = variant === "large" ? 220 : variant === "medium" ? 170 : 150;

  const abrir = () => navigate(producto.es_reel ? `/reels?tienda=${producto.tienda_id}&producto=${producto.id}` : `/producto/${producto.id}`);

  const agregar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!usuario) return navigate("/login");
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para agregar al carrito.", "info");
    setAdding(true);
    setTimeout(() => setAdding(false), 340);
    if (addBtnRef.current) triggerFly(addBtnRef.current);
    try {
      await carritoApi.agregar(producto.id, 1);
      await refrescar();
      celebrarAgregado();
      toast.show(`${producto.nombre} agregado al carrito`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar al carrito.", "error");
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir();
        }
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        transition: `transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base)`,
      }}
      className="product-card"
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ height, background: "var(--surface-2)", position: "relative", overflow: "hidden" }}>
        {producto.imagen ? (
          <img
            src={producto.imagen}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: agotado ? "grayscale(0.6)" : undefined, opacity: agotado ? 0.55 : 1 }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%" }} />
        )}
        {enOferta && !agotado && (
          <span
            style={{ position: "absolute", top: 8, left: 8, background: "var(--danger)", color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: "var(--radius-pill)" }}
          >
            OFERTA
          </span>
        )}
        {agotado && (
          <span
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,11,20,0.35)", color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}
          >
            AGOTADO
          </span>
        )}
        {!agotado && (
          <button
            ref={addBtnRef}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            onClick={agregar}
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--cyan)",
              color: "var(--cyan-ink)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "var(--glow-cyan-sm), var(--shadow-md)",
              transform: adding ? "scale(1.25)" : "scale(1)",
              transition: "transform 0.24s var(--ease-spring)",
            }}
          >
            <Plus size={16} weight="bold" />
          </button>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {producto.nombre}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{producto.tienda_nombre}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="tabular" style={{ fontSize: 13.5, fontWeight: 800, color: enOferta ? "var(--danger)" : "var(--text-primary)" }}>
            {money(enOferta ? producto.precio_oferta! : producto.precio)}
          </span>
          {enOferta && (
            <span className="tabular" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>
              {money(producto.precio)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductRating({ value, count }: { value?: number; count?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700 }}>
      <Star size={13} weight="fill" color="var(--warn)" />
      <span className="tabular">{value ? value.toFixed(1) : "Nuevo"}</span>
      {count ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({count})</span> : null}
    </span>
  );
}
