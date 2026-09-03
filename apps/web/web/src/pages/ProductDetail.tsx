import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookmarkSimple,
  CaretLeft,
  ChatCircle,
  Check,
  Flag,
  Heart,
  Minus,
  Plus,
  ShareNetwork,
  ShoppingCartSimple,
  Star,
  Storefront,
  Timer,
} from "@phosphor-icons/react";
import { productosApi, carritoApi, interaccionesApi, chatApi, ApiError } from "../lib/api";
import { ReportSheet } from "../components/domain/ReportSheet";
import type { Producto } from "../lib/types";
import { money } from "../lib/format";
import { categoriaColor, categoriaIcon, CATEGORIA_LABEL, type Categoria } from "../lib/categoryIcons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { IconButton } from "../components/ui/IconButton";
import { BrandMosaic } from "../components/ui/BrandMosaic";
import { ProductCard } from "../components/domain/ProductCard";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { items: itemsCarrito, refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const [producto, setProducto] = useState<Producto | null | undefined>(undefined);
  const [relacionados, setRelacionados] = useState<Producto[] | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [reportando, setReportando] = useState(false);

  useEffect(() => {
    if (!id) return;
    setFotoActiva(0);
    setCantidad(1);
    productosApi
      .detalle(Number(id))
      .then((r) => {
        if (r.producto.es_reel) {
          navigate(`/reels?tienda=${r.producto.tienda_id}&producto=${r.producto.id}`, { replace: true });
          return;
        }
        setProducto(r.producto);
        productosApi
          .listar({ tienda_id: r.producto.tienda_id, limit: 8 })
          .then((r2) => setRelacionados(r2.productos.filter((p) => p.id !== r.producto.id)))
          .catch(() => setRelacionados([]));
      })
      .catch(() => setProducto(null));
    interaccionesApi.registrarVista(Number(id)).catch(() => {});
  }, [id, navigate]);

  const fotos = useMemo(() => {
    if (!producto) return [];
    if (producto.imagenes && producto.imagenes.length > 0) return producto.imagenes;
    return producto.imagen ? [producto.imagen] : [];
  }, [producto]);

  if (producto === undefined) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
        <Skeleton height={26} width={100} />
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 32 }}>
          <Skeleton height={420} radius="var(--radius-lg)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton height={16} width={140} />
            <Skeleton height={30} width="70%" />
            <Skeleton height={34} width={140} />
            <Skeleton height={80} />
            <Skeleton height={50} radius="var(--radius-md)" />
          </div>
        </div>
      </div>
    );
  }

  if (producto === null) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Storefront size={28} color="var(--text-muted)" />
        <h1 style={{ fontSize: 18 }}>Este producto ya no está disponible</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>Puede que la tienda lo haya quitado o que el enlace esté vencido.</p>
        <Button variant="secondary" onClick={() => navigate("/explorar")}>
          Explorar tiendas
        </Button>
      </div>
    );
  }

  // Stock ilimitado nunca se muestra como agotado -- ver misma nota en ProductCard.tsx.
  const agotado = !producto.stock_ilimitado && (producto.estado_stock === "agotado" || producto.stock <= 0);
  const enOferta = !!producto.precio_oferta && producto.precio_oferta > 0;
  const precio = enOferta ? producto.precio_oferta! : producto.precio;
  const catColor = categoriaColor(producto.categoria);
  const CatIcon = categoriaIcon(producto.categoria);
  const catLabel = CATEGORIA_LABEL[producto.categoria as Categoria] ?? producto.categoria;
  const hashtags = producto.hashtags?.split(/\s+/).filter(Boolean) ?? [];
  // Un vendedor no se contacta ni le da like a sus propios productos.
  const esPropio = !!usuario && usuario.rol === "vendedor" && producto.vendedor_id === usuario.id;

  // Cuántas unidades de ESTE producto ya están en el carrito -- el tope del stepper de abajo
  // debe descontarlas, si no el backend rechaza "agregar" al llegar al máximo mostrado (ej.
  // con 1 ya en el carrito y stock=5, el stepper dejaba subir hasta 5 pero el backend solo
  // aceptaba hasta 4 nuevas unidades: máximo → rechazado, máximo-1 → aceptado).
  const yaEnCarrito = itemsCarrito.find((it) => it.producto_id === producto.id)?.cantidad ?? 0;
  const disponibleParaAgregar = producto.stock_ilimitado ? 99 : Math.max(0, producto.stock - yaEnCarrito);

  const requireComprador = () => {
    if (!usuario) {
      navigate("/login");
      return false;
    }
    if (usuario.rol !== "comprador") {
      toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
      return false;
    }
    return true;
  };

  const agregarCarrito = async () => {
    if (!requireComprador()) return;
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

  const comprarAhora = async () => {
    if (!requireComprador()) return;
    setComprando(true);
    try {
      await carritoApi.agregar(producto.id, cantidad);
      await refrescar();
      navigate("/checkout");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo iniciar la compra.", "error");
      setComprando(false);
    }
  };

  const toggleLike = async () => {
    if (!usuario) return navigate("/login");
    const previo = producto;
    setProducto((p) => (p ? { ...p, yo_like: p.yo_like ? 0 : 1, likes_count: (p.likes_count ?? 0) + (p.yo_like ? -1 : 1) } : p));
    try {
      const r = await interaccionesApi.toggleLike(producto.id);
      setProducto((p) => (p ? { ...p, yo_like: r.accion === "like" ? 1 : 0, likes_count: r.contadores.likes } : p));
    } catch {
      setProducto(previo);
    }
  };

  const toggleGuardar = async () => {
    if (!usuario) return navigate("/login");
    const previo = producto;
    setProducto((p) => (p ? { ...p, yo_guardado: p.yo_guardado ? 0 : 1 } : p));
    try {
      const r = await interaccionesApi.toggleGuardar(producto.id);
      setProducto((p) => (p ? { ...p, yo_guardado: r.accion === "guardar" ? 1 : 0 } : p));
      toast.show(r.accion === "guardar" ? "Guardado en tu lista" : "Quitado de guardados", "info");
    } catch {
      setProducto(previo);
    }
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
        <CaretLeft size={14} /> Volver
      </button>

      <div className="product-detail-grid" style={{ display: "grid", gap: 36 }}>
        {/* ── Galería ── */}
        <div>
          <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface-2)", aspectRatio: "1 / 1", border: "1px solid var(--border)" }}>
            {fotos.length > 0 ? (
              <img
                key={fotos[fotoActiva]}
                src={fotos[fotoActiva]}
                alt={producto.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: agotado ? "grayscale(0.6)" : undefined, opacity: agotado ? 0.6 : 1 }}
              />
            ) : (
              <BrandMosaic seed={producto.id} />
            )}
            {agotado && (
              <span style={{ position: "absolute", top: 16, left: 16, background: "var(--danger)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "6px 12px", borderRadius: "var(--radius-pill)" }}>
                AGOTADO
              </span>
            )}
            <span
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 800,
                padding: "5px 10px",
                borderRadius: "var(--radius-pill)",
                background: `color-mix(in srgb, ${catColor} 78%, black 10%)`,
                color: "#fff",
                backdropFilter: "blur(6px)",
              }}
            >
              <CatIcon size={13} weight="fill" /> {catLabel}
            </span>
          </div>

          {fotos.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
              {fotos.map((f, i) => (
                <button
                  key={f + i}
                  onClick={() => setFotoActiva(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === fotoActiva}
                  style={{
                    width: 60,
                    height: 60,
                    flexShrink: 0,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    padding: 0,
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    border: `2px solid ${i === fotoActiva ? "var(--cyan)" : "var(--border)"}`,
                  }}
                >
                  <img src={f} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Link
            to={`/tienda/${producto.tienda_id}`}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: "1px solid var(--border)", width: "fit-content", maxWidth: "100%" }}
          >
            <span style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {producto.tienda_logo ? <img src={producto.tienda_logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Storefront size={15} color="var(--text-muted)" />}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{producto.tienda_nombre}</span>
            {!!producto.tienda_calificacion && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
                <Star size={12} weight="fill" color="var(--warn)" />
                <span className="tabular">{producto.tienda_calificacion.toFixed(1)}</span>
              </span>
            )}
          </Link>

          <h1 style={{ fontSize: 27, lineHeight: 1.25 }}>{producto.nombre}</h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="tabular" style={{ fontSize: 28, fontWeight: 800, color: enOferta ? "var(--danger)" : "var(--text-primary)" }}>
              {money(precio)}
            </span>
            {enOferta && (
              <>
                {/* Mismo tamaño que el precio activo -- solo se diferencia por el tachado y el color apagado. */}
                <span className="tabular" style={{ fontSize: 28, color: "var(--text-muted)", textDecoration: "line-through" }}>
                  {money(producto.precio)}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--danger-ink)", background: "var(--danger-bg)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>
                  -{Math.round((1 - producto.precio_oferta! / producto.precio) * 100)}%
                </span>
              </>
            )}
          </div>

          {producto.descripcion && <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{producto.descripcion}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {producto.tiempo_preparacion && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
                <Timer size={15} /> {producto.tiempo_preparacion}
              </div>
            )}
            {!agotado && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ok-ink)" }}>
                <Check size={15} weight="bold" />
                {producto.stock_ilimitado ? "Disponible" : `${producto.stock} disponibles`}
              </div>
            )}
          </div>

          {!!hashtags.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {hashtags.map((h) => (
                <span key={h} style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan)" }}>
                  #{h}
                </span>
              ))}
            </div>
          )}

          {!agotado ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)" }}>Cantidad</span>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <button onClick={() => setCantidad((c) => Math.max(1, c - 1))} style={{ width: 38, height: 38, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }} aria-label="Restar cantidad">
                    <Minus size={14} weight="bold" />
                  </button>
                  <span className="tabular" style={{ width: 34, textAlign: "center", fontWeight: 700 }}>
                    {cantidad}
                  </span>
                  <button
                    onClick={() => setCantidad((c) => Math.min(Math.max(1, disponibleParaAgregar), c + 1))}
                    disabled={disponibleParaAgregar <= 0 || cantidad >= disponibleParaAgregar}
                    style={{ width: 38, height: 38, background: "none", border: "none", cursor: disponibleParaAgregar <= 0 || cantidad >= disponibleParaAgregar ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", opacity: disponibleParaAgregar <= 0 || cantidad >= disponibleParaAgregar ? 0.4 : 1 }}
                    aria-label="Sumar cantidad"
                  >
                    <Plus size={14} weight="bold" />
                  </button>
                </div>
                {yaEnCarrito > 0 && (
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    Ya tienes {yaEnCarrito} en tu carrito
                  </span>
                )}
              </div>
              {disponibleParaAgregar <= 0 ? (
                <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--warn-bg)", color: "var(--warn-ink)", fontSize: 12.5, fontWeight: 700 }}>
                  Ya tienes todo el stock disponible de este producto en tu carrito.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button onClick={comprarAhora} loading={comprando} size="lg" hero style={{ flex: "1 1 200px" }}>
                    Comprar ahora · {money(precio * cantidad)}
                  </Button>
                  <Button onClick={agregarCarrito} loading={agregando} variant="secondary" size="lg" style={{ flex: "1 1 160px" }}>
                    <ShoppingCartSimple size={17} weight="bold" /> Agregar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-secondary)" }}>
              Este producto está agotado por ahora. Escríbele a la tienda para saber cuándo vuelve a estar disponible.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
            {!esPropio && (
              <IconButton icon={<Heart size={18} weight={producto.yo_like ? "fill" : "regular"} color={producto.yo_like ? "var(--coral)" : undefined} />} label="Me gusta" active={!!producto.yo_like} badge={producto.likes_count} onClick={toggleLike} />
            )}
            <IconButton icon={<BookmarkSimple size={18} weight={producto.yo_guardado ? "fill" : "regular"} color={producto.yo_guardado ? "var(--warn)" : undefined} />} label="Guardar" active={!!producto.yo_guardado} onClick={toggleGuardar} />
            {!esPropio && <IconButton icon={<ChatCircle size={18} />} label="Preguntar a la tienda" onClick={preguntar} />}
            <IconButton
              icon={<ShareNetwork size={18} />}
              label="Compartir"
              onClick={() => {
                interaccionesApi.compartir(producto.id).catch(() => {});
                navigator.clipboard?.writeText(window.location.href);
                toast.show("Enlace copiado", "success");
              }}
            />
            {!esPropio && <IconButton icon={<Flag size={18} />} label="Reportar" onClick={() => setReportando(true)} />}
          </div>
        </div>
      </div>

      {reportando && <ReportSheet tipo="producto" entidadId={producto.id} entidadNombre={producto.nombre} onClose={() => setReportando(false)} />}

      {!!relacionados?.length && (
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 17, marginBottom: 14 }}>Más de {producto.tienda_nombre}</h2>
          <div className="product-detail-related" style={{ display: "grid", gap: 14 }}>
            {relacionados.slice(0, 4).map((p) => (
              <ProductCard key={p.id} producto={p} variant="small" showWishlist />
            ))}
          </div>
        </div>
      )}

      <style>{`
        .product-detail-grid { grid-template-columns: 1fr; }
        .product-detail-related { grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 760px) {
          .product-detail-grid { grid-template-columns: 1.05fr 1fr; }
        }
        @media (min-width: 640px) {
          .product-detail-related { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </motion.div>
  );
}
