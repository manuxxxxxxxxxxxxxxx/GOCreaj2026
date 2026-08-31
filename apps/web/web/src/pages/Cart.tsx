import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Tag, Trash } from "@phosphor-icons/react";
import { carritoApi, cuponesApi, ApiError } from "../lib/api";
import { money } from "../lib/format";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Reveal } from "../components/ui/Reveal";
import type { Cupon } from "../lib/types";

export function Cart() {
  const { items, total, cargando, refrescar } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<{ cupon: Cupon; descuento: number } | null>(null);
  const [validando, setValidando] = useState(false);

  const cambiarCantidad = async (carrito_id: number, delta: number, actual: number) => {
    const nueva = actual + delta;
    try {
      await carritoApi.actualizar(carrito_id, nueva);
      await refrescar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la cantidad.", "error");
    }
  };

  const eliminar = async (carrito_id: number) => {
    await carritoApi.eliminar(carrito_id);
    await refrescar();
  };

  const validarCupon = async () => {
    if (!codigo.trim()) return;
    setValidando(true);
    try {
      const r = await cuponesApi.validar(codigo.trim(), total);
      setCupon(r);
      toast.show("Cupón aplicado", "success");
    } catch (err) {
      setCupon(null);
      toast.show(err instanceof ApiError ? err.message : "Cupón inválido.", "error");
    } finally {
      setValidando(false);
    }
  };

  const irCheckout = () => {
    if (cupon) sessionStorage.setItem("gocreaj_cupon", JSON.stringify(cupon));
    else sessionStorage.removeItem("gocreaj_cupon");
    navigate("/checkout");
  };

  if (cargando && items.length === 0) {
    return (
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={88} radius="var(--radius-md)" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={26} />}
        title="Tu carrito está vacío"
        description="Explora tiendas y agrega productos para verlos aquí."
        actionLabel="Explorar tiendas"
        onAction={() => navigate("/explorar")}
      />
    );
  }

  const porTienda = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.tienda_nombre] ??= []).push(it);
    return acc;
  }, {});

  const totalFinal = Math.max(0, total - (cupon?.descuento ?? 0));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, alignItems: "start", maxWidth: 900 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={{ fontSize: 22 }}>Tu carrito</h1>
        {Object.entries(porTienda).map(([tiendaNombre, tiendaItems]) => (
          <div key={tiendaNombre}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>{tiendaNombre}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tiendaItems.map((it, idx) => (
                <Reveal key={it.id} index={idx} style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>
                    {it.imagen && <img src={it.imagen} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nombre}</div>
                    <div className="tabular" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                      {money(it.precio_efectivo)} c/u
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                    <button onClick={() => cambiarCantidad(it.id, -1, it.cantidad)} style={{ width: 30, height: 30, background: "none", border: "none", cursor: "pointer" }} aria-label="Restar">
                      −
                    </button>
                    <span className="tabular" style={{ width: 24, textAlign: "center", fontSize: 13 }}>
                      {it.cantidad}
                    </span>
                    <button
                      onClick={() => cambiarCantidad(it.id, 1, it.cantidad)}
                      disabled={it.cantidad >= it.stock}
                      style={{ width: 30, height: 30, background: "none", border: "none", cursor: it.cantidad >= it.stock ? "not-allowed" : "pointer", opacity: it.cantidad >= it.stock ? 0.4 : 1 }}
                      aria-label="Sumar"
                    >
                      +
                    </button>
                  </div>
                  <span className="tabular" style={{ fontWeight: 700, fontSize: 13.5, width: 64, textAlign: "right" }}>
                    {money(it.precio_efectivo * it.cantidad)}
                  </span>
                  <button onClick={() => eliminar(it.id)} aria-label={`Eliminar ${it.nombre}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex" }}>
                    <Trash size={17} />
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "sticky", top: 80, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 15 }}>Resumen</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Tag size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Código de cupón"
              style={{ width: "100%", height: 38, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 10px 0 32px", fontSize: 13 }}
            />
          </div>
          <Button size="sm" variant="secondary" onClick={validarCupon} loading={validando}>
            Aplicar
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
          <Row label="Subtotal" value={money(total)} />
          {cupon && <Row label={`Cupón ${cupon.cupon.codigo}`} value={`− ${money(cupon.descuento)}`} tone="var(--ok)" />}
          <Row label="Envío" value="Se calcula en el checkout" muted />
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span className="tabular" style={{ fontSize: 20, fontWeight: 800 }}>
            {money(totalFinal)}
          </span>
        </div>
        <Button size="lg" fullWidth hero onClick={irCheckout}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, tone, muted }: { label: string; value: string; tone?: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: muted ? "var(--text-muted)" : "var(--text-secondary)" }}>
      <span>{label}</span>
      <span className="tabular" style={{ color: tone, fontWeight: tone ? 700 : undefined }}>
        {value}
      </span>
    </div>
  );
}
