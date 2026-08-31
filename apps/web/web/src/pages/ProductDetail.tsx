import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { BookmarkSimple, CaretLeft, ChatCircle, Heart, ShareNetwork, Storefront, Timer } from "@phosphor-icons/react";
import { productosApi, carritoApi, interaccionesApi, chatApi, ApiError } from "../lib/api";
import type { Producto } from "../lib/types";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { IconButton } from "../components/ui/IconButton";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    if (!id) return;
    productosApi
      .detalle(Number(id))
      .then((r) => {
        if (r.producto.es_reel) {
          navigate(`/reels?tienda=${r.producto.tienda_id}&producto=${r.producto.id}`, { replace: true });
          return;
        }
        setProducto(r.producto);
      })
      .catch(() => setProducto(null));
    interaccionesApi.registrarVista(Number(id)).catch(() => {});
  }, [id]);

  if (!producto) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
        <Skeleton height={320} radius="var(--radius-lg)" />
        <Skeleton height={24} width={220} />
        <Skeleton height={60} />
      </div>
    );
  }

  const agotado = producto.estado_stock === "agotado" || producto.stock <= 0;
  const enOferta = !!producto.precio_oferta && producto.precio_oferta > 0;
  const precio = enOferta ? producto.precio_oferta! : producto.precio;

  const agregarCarrito = async () => {
    if (!usuario) return navigate("/login");
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
    setAgregando(true);
    try {
      await carritoApi.agregar(producto.id, cantidad);
      await refrescar();
      celebrarAgregado();
      toast.show(`${producto.nombre} agregado al carrito`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar al carrito.", "error");
    } finally {
      setAgregando(false);
    }
  };

  const toggleLike = async () => {
    if (!usuario) return navigate("/login");
    const r = await interaccionesApi.toggleLike(producto.id);
    setProducto((p) => (p ? { ...p, yo_like: r.accion === "like" ? 1 : 0, likes_count: r.contadores.likes } : p));
  };

  const toggleGuardar = async () => {
    if (!usuario) return navigate("/login");
    const r = await interaccionesApi.toggleGuardar(producto.id);
    setProducto((p) => (p ? { ...p, yo_guardado: r.accion === "guardar" ? 1 : 0 } : p));
    toast.show(r.accion === "guardar" ? "Guardado" : "Quitado de guardados", "info");
  };

  const preguntar = async () => {
    if (!usuario) return navigate("/login");
    try {
      const r = await chatApi.desdeProducto(producto.id);
      navigate(`/chat/${r.otro_id}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo abrir el chat.", "error");
    }
  };

  return (
    <div style={{ position: "fixed", top: 68, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      <div style={{ maxWidth: 1160, height: "100%", margin: "0 auto", padding: "24px 24px 0", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 32, alignItems: "start" }}>
      <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, marginBottom: 14, flexShrink: 0 }}>
          <CaretLeft size={14} /> Volver
        </button>
        <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface-2)", aspectRatio: "1 / 1", position: "relative", maxHeight: "100%" }}>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} style={{ width: "100%", height: "100%", objectFit: "cover", filter: agotado ? "grayscale(0.6)" : undefined, opacity: agotado ? 0.6 : 1 }} />
          ) : null}
          {agotado && (
            <span style={{ position: "absolute", top: 16, left: 16, background: "var(--danger)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "6px 12px", borderRadius: "var(--radius-pill)" }}>
              AGOTADO
            </span>
          )}
        </div>
      </div>

      <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32, paddingRight: 4 }}>
        <div>
          <Link to={`/tienda/${producto.tienda_id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--cyan)", marginBottom: 8 }}>
            <Storefront size={14} /> {producto.tienda_nombre}
          </Link>
          <h1 style={{ fontSize: 26 }}>{producto.nombre}</h1>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="tabular" style={{ fontSize: 26, fontWeight: 800, color: enOferta ? "var(--danger)" : "var(--text-primary)" }}>
            {money(precio)}
          </span>
          {enOferta && (
            <span className="tabular" style={{ fontSize: 15, color: "var(--text-muted)", textDecoration: "line-through" }}>
              {money(producto.precio)}
            </span>
          )}
        </div>

        {producto.descripcion && <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{producto.descripcion}</p>}

        {producto.tiempo_preparacion && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
            <Timer size={15} /> {producto.tiempo_preparacion}
          </div>
        )}

        {!agotado && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <button onClick={() => setCantidad((c) => Math.max(1, c - 1))} style={{ width: 38, height: 38, background: "none", border: "none", cursor: "pointer", fontSize: 18 }} aria-label="Restar cantidad">
                −
              </button>
              <span className="tabular" style={{ width: 32, textAlign: "center", fontWeight: 700 }}>
                {cantidad}
              </span>
              <button onClick={() => setCantidad((c) => Math.min(producto.stock, c + 1))} style={{ width: 38, height: 38, background: "none", border: "none", cursor: "pointer", fontSize: 18 }} aria-label="Sumar cantidad">
                +
              </button>
            </div>
            <Button onClick={agregarCarrito} loading={agregando} size="lg" fullWidth>
              Agregar · {money(precio * cantidad)}
            </Button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <IconButton icon={<Heart size={18} weight={producto.yo_like ? "fill" : "regular"} />} label="Me gusta" active={!!producto.yo_like} badge={producto.likes_count} onClick={toggleLike} />
          <IconButton icon={<BookmarkSimple size={18} weight={producto.yo_guardado ? "fill" : "regular"} />} label="Guardar" active={!!producto.yo_guardado} onClick={toggleGuardar} />
          <IconButton icon={<ChatCircle size={18} />} label="Preguntar a la tienda" onClick={preguntar} />
          <IconButton
            icon={<ShareNetwork size={18} />}
            label="Compartir"
            onClick={() => {
              interaccionesApi.compartir(producto.id).catch(() => {});
              navigator.clipboard?.writeText(window.location.href);
              toast.show("Enlace copiado", "success");
            }}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
