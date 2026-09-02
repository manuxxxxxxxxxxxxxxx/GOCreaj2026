import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, CreditCard, MapPin, Phone, Play, Star, Storefront } from "@phosphor-icons/react";
import { productosApi, interaccionesApi } from "../lib/api";
import type { Producto, Tienda } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "../components/domain/ProductCard";
import { Skeleton } from "../components/ui/Skeleton";
import { MapView, type MapMarker } from "../components/ui/MapView";
import { formatDate } from "../lib/format";
import { StoreHero } from "../components/domain/store/StoreHero";
import { StoreEmptyState } from "../components/domain/store/StoreEmptyState";
import { CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../lib/categoryIcons";

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  respuesta_vendedor: string | null;
  respuesta_at: string | null;
  created_at: string;
  comprador_nombre: string;
}

type Tab = "productos" | "reels" | "resenas";
const TABS: { key: Tab; label: string }[] = [
  { key: "productos", label: "Productos" },
  { key: "reels", label: "Reels" },
  { key: "resenas", label: "Reseñas" },
];

/** "HH:MM" or "HH:MM:SS" -> minutes since midnight. */
function parseHora(h: string): number | null {
  const m = h.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function useAbierto(tienda: Tienda | null): boolean | null {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!tienda?.hora_apertura || !tienda?.hora_cierre) return null;
    const open = parseHora(tienda.hora_apertura);
    const close = parseHora(tienda.hora_cierre);
    if (open === null || close === null) return null;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (close > open) return nowMin >= open && nowMin < close;
    return nowMin >= open || nowMin < close;
  }, [tienda?.hora_apertura, tienda?.hora_cierre, now]);
}

function notifKey(tiendaId: number) {
  return `gocreaj_tienda_notif_${tiendaId}`;
}

/** Perfil de tienda: banner + pestañas (Productos/Reels/Reseñas, cada una con sus propios
 * filtros) del lado izquierdo, y la ficha "Sobre nosotros" fija del lado derecho -- no se
 * mueve ni un pixel mientras se cambia de pestaña, solo se suelta justo antes del footer. */
export function StoreDetail() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [notifOn, setNotifOn] = useState(false);
  const [tab, setTab] = useState<Tab>("productos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [estrellaFiltro, setEstrellaFiltro] = useState<number | null>(null);
  const abierto = useAbierto(tienda);
  const isOwner = !!usuario && usuario.rol === "vendedor" && tienda?.vendedor_id === usuario.id;

  useEffect(() => {
    if (!id) return;
    const tid = Number(id);
    productosApi.tiendaDetalle(tid).then((r) => setTienda(r.tienda)).catch(() => setTienda(null));
    productosApi.listar({ tienda_id: tid, limit: 60 }).then((r) => setProductos(r.productos)).catch(() => setProductos([]));
    productosApi.reels({ tienda_id: tid }).then((r) => setReels(r.reels)).catch(() => setReels([]));
    productosApi.tiendaResenas(tid).then((r) => setResenas(r.resenas)).catch(() => setResenas([]));
    setNotifOn(localStorage.getItem(notifKey(tid)) === "1");
    setTab("productos");
    setCategoriaFiltro(null);
    setEstrellaFiltro(null);
  }, [id]);

  const toggleSeguir = async () => {
    if (!usuario) return navigate("/login");
    if (!tienda) return;
    const r = await interaccionesApi.seguirTienda(tienda.id);
    setTienda({ ...tienda, yo_sigo: r.accion === "follow" ? 1 : 0, seguidores_count: r.total_seguidores });
  };

  const toggleNotif = () => {
    if (!usuario) return navigate("/login");
    if (!tienda) return;
    const next = !notifOn;
    setNotifOn(next);
    localStorage.setItem(notifKey(tienda.id), next ? "1" : "0");
  };

  const contactar = () => {
    if (!usuario) return navigate("/login");
    if (!tienda) return;
    navigate(`/chat/${tienda.vendedor_id}`);
  };

  const mapMarker: MapMarker | null = useMemo(() => {
    if (!tienda || tienda.lat === null || tienda.lng === null) return null;
    return {
      id: tienda.id,
      lat: tienda.lat,
      lng: tienda.lng,
      icon: Storefront,
      label: tienda.nombre,
      subtitle: [tienda.direccion, tienda.municipio].filter(Boolean).join(", "),
      rating: tienda.calificacion_promedio,
      ratingCount: tienda.total_resenas,
      estado: abierto === null ? null : abierto ? "abierto" : "cerrado",
    };
  }, [tienda, abierto]);

  // Categorías que la tienda realmente vende (pupusas, hamburguesas, etc.) -- solo las
  // que aparecen entre sus propios productos, no las 129 categorías de la plataforma.
  const categoriasDeLaTienda = useMemo(() => {
    const vistas = new Set<string>();
    const lista: string[] = [];
    (productos ?? []).forEach((p) => {
      if (p.categoria && !vistas.has(p.categoria)) {
        vistas.add(p.categoria);
        lista.push(p.categoria);
      }
    });
    return lista;
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    if (!productos || !categoriaFiltro) return productos;
    return productos.filter((p) => p.categoria === categoriaFiltro);
  }, [productos, categoriaFiltro]);

  const conteoPorEstrella = useMemo(() => {
    const conteo: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    resenas.forEach((r) => {
      if (conteo[r.estrellas] !== undefined) conteo[r.estrellas]++;
    });
    return conteo;
  }, [resenas]);

  const resenasFiltradas = useMemo(() => {
    if (!estrellaFiltro) return resenas;
    return resenas.filter((r) => r.estrellas === estrellaFiltro);
  }, [resenas, estrellaFiltro]);

  if (!tienda) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height={220} radius="var(--radius-lg)" />
        <Skeleton height={28} width={260} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <div className="store-page-grid">
        <div className="store-page-main">
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
            <StoreHero
              tienda={tienda}
              isOwner={isOwner}
              notifOn={notifOn}
              onEditBanner={() => navigate("/vendedor/tienda")}
              onToggleSeguir={toggleSeguir}
              onToggleNotif={toggleNotif}
              onContactar={contactar}
            />
          </div>

          <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", width: "fit-content", overflowX: "auto", maxWidth: "100%" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ position: "relative", padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "transparent", color: tab === t.key ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap" }}
              >
                {tab === t.key && (
                  <motion.span
                    layoutId="storeTabBg"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{ position: "absolute", inset: 0, background: "var(--surface-1)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sm)" }}
                  />
                )}
                <span style={{ position: "relative" }}>
                  {t.label}
                  {t.key === "productos" && !!productos?.length ? ` (${productos.length})` : ""}
                  {t.key === "reels" && !!reels?.length ? ` (${reels.length})` : ""}
                  {t.key === "resenas" && !!tienda.total_resenas ? ` (${tienda.total_resenas})` : ""}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
              {tab === "productos" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!!categoriasDeLaTienda.length && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <FiltroChip label="Todas" active={!categoriaFiltro} onClick={() => setCategoriaFiltro(null)} />
                      {categoriasDeLaTienda.map((c) => {
                        const color = categoriaColor(c);
                        const CatIcon = categoriaIcon(c);
                        const activo = categoriaFiltro === c;
                        return (
                          <FiltroChip
                            key={c}
                            label={CATEGORIA_LABEL[c as Categoria] ?? c}
                            icon={<CatIcon size={12} weight={activo ? "fill" : "regular"} />}
                            active={activo}
                            accent={color}
                            onClick={() => setCategoriaFiltro(c)}
                          />
                        );
                      })}
                    </div>
                  )}
                  <ProductosGrid
                    productos={productosFiltrados}
                    empty={
                      categoriaFiltro ? (
                        <StoreEmptyState icon={<Storefront size={22} />} title="Sin productos en esta categoría" description="Prueba con otra categoría o mira el catálogo completo." actionLabel="Ver todas" onAction={() => setCategoriaFiltro(null)} />
                      ) : (
                        <StoreEmptyState
                          icon={<Storefront size={22} />}
                          title={isOwner ? "Todavía no has publicado productos" : "Sin productos todavía"}
                          description={isOwner ? "Agrega tu primer producto para que los compradores puedan encontrarte." : "Vuelve pronto, esta tienda está preparando su catálogo."}
                          actionLabel={isOwner ? "Agregar producto" : undefined}
                          onAction={isOwner ? () => navigate("/vendedor/productos") : undefined}
                        />
                      )
                    }
                  />
                </div>
              )}

              {tab === "reels" &&
                (reels === null ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} height={240} radius="var(--radius-md)" />
                    ))}
                  </div>
                ) : reels.length === 0 ? (
                  <StoreEmptyState
                    icon={<Play size={22} />}
                    title={isOwner ? "Sube tu primer reel" : "Sin reels todavía"}
                    description={isOwner ? "Muestra tus productos en video corto, estilo TikTok." : undefined}
                    actionLabel={isOwner ? "Subir reel" : undefined}
                    onAction={isOwner ? () => navigate("/vendedor/tienda") : undefined}
                    tone="violet"
                  />
                ) : (
                  <ReelsGrid reels={reels} tiendaId={tienda.id} navigate={navigate} />
                ))}

              {tab === "resenas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {resenas.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <FiltroChip label="Todas" active={!estrellaFiltro} onClick={() => setEstrellaFiltro(null)} />
                      {[5, 4, 3, 2, 1].map((n) => (
                        <FiltroChip
                          key={n}
                          label={`${n} · ${conteoPorEstrella[n]}`}
                          icon={<Star size={12} weight="fill" color="var(--warn)" />}
                          active={estrellaFiltro === n}
                          disabled={conteoPorEstrella[n] === 0}
                          onClick={() => setEstrellaFiltro(n)}
                        />
                      ))}
                    </div>
                  )}
                  {resenas.length === 0 ? (
                    <StoreEmptyState icon={<Star size={22} />} title="Aún no hay reseñas" description="Las reseñas aparecen aquí cuando los clientes califican un pedido entregado." />
                  ) : resenasFiltradas.length === 0 ? (
                    <StoreEmptyState icon={<Star size={22} />} title={`Sin reseñas de ${estrellaFiltro} estrella${estrellaFiltro === 1 ? "" : "s"}`} compact />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {resenasFiltradas.map((r, i) => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
                          style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{r.comprador_nombre}</span>
                            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{formatDate(r.created_at)}</span>
                          </div>
                          <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star key={si} size={13} weight={si < r.estrellas ? "fill" : "regular"} color="var(--warn)" />
                            ))}
                          </div>
                          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{r.comentario}</p>
                          {r.respuesta_vendedor && (
                            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", marginBottom: 3 }}>Respuesta de la tienda</div>
                              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.respuesta_vendedor}</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="store-page-sidebar">
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 14 }}>Sobre nosotros</h2>

            {abierto !== null && tienda.hora_apertura && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: abierto ? "var(--ok-bg)" : "var(--danger-bg)",
                  color: abierto ? "var(--ok-ink)" : "var(--danger-ink)",
                  width: "fit-content",
                }}
              >
                <Clock size={16} weight="fill" />
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>{abierto ? "Abierto ahora" : "Cerrado ahora"}</span>
                <span style={{ fontSize: 12.5, opacity: 0.85 }} className="tabular">
                  · {tienda.hora_apertura.slice(0, 5)} – {tienda.hora_cierre?.slice(0, 5)}
                </span>
              </div>
            )}

            {tienda.descripcion && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{tienda.descripcion}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <InfoRow icon={<MapPin size={15} />} label="Ubicación" text={tienda.municipio} />
              {tienda.direccion && <InfoRow icon={<MapPin size={15} weight="fill" />} label="Calle" text={tienda.direccion} />}
              {tienda.telefono && <InfoRow icon={<Phone size={15} />} label="Teléfono" text={tienda.telefono} />}
              {tienda.metodos_pago && <InfoRow icon={<CreditCard size={15} />} label="Métodos de pago" text={tienda.metodos_pago} />}
            </div>
          </div>

          <div className="store-about-map">
            {mapMarker ? (
              <MapView markers={[mapMarker]} center={[mapMarker.lng, mapMarker.lat]} zoom={15} height={260} fitToMarkers={false} />
            ) : (
              <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", height: 260, display: "flex", alignItems: "center" }}>
                <StoreEmptyState icon={<MapPin size={22} />} title="Ubicación no disponible" description="Esta tienda todavía no ha registrado su dirección exacta." />
              </div>
            )}
          </div>
        </aside>
      </div>

      <style>{`
        .store-product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) {
          .store-product-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
        }
        .store-page-grid { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: start; }
        .store-page-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .store-page-sidebar { display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 960px) {
          .store-page-grid { grid-template-columns: 1fr 320px; }
          .store-product-grid { grid-template-columns: repeat(3, 1fr); }
          /* self-start + sticky -- se queda clavada mientras el bloque de la izquierda
             (más alto) sigue desplazándose, y solo se suelta cuando el propio grid termina
             (justo antes del footer, que vive fuera de este grid). No se mueve ni un pixel
             mientras tanto porque no depende de la altura del contenido de la izquierda. */
          .store-page-sidebar { position: sticky; top: 88px; align-self: start; }
        }
        @media (min-width: 1180px) {
          .store-page-grid { grid-template-columns: 1fr 360px; }
          .store-product-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </motion.div>
  );
}

function FiltroChip({ label, icon, active, accent, disabled, onClick }: { label: string; icon?: React.ReactNode; active: boolean; accent?: string; disabled?: boolean; onClick: () => void }) {
  const color = accent ?? "var(--cyan)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 700,
        padding: "6px 12px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${active ? color : "var(--border)"}`,
        background: active ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--surface-1)",
        color: active ? color : "var(--text-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textTransform: "capitalize",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ProductosGrid({ productos, empty }: { productos: Producto[] | null; empty: React.ReactNode }) {
  if (productos === null) {
    return (
      <div className="store-product-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={200} radius="var(--radius-md)" />
        ))}
      </div>
    );
  }
  if (productos.length === 0) return <>{empty}</>;
  return (
    <div className="store-product-grid">
      {productos.map((p) => (
        <ProductCard key={p.id} producto={p} variant="small" showWishlist />
      ))}
    </div>
  );
}

function ReelsGrid({ reels, tiendaId, navigate }: { reels: Producto[]; tiendaId: number; navigate: (path: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
      {reels.map((r) => (
        <button
          key={r.id}
          onClick={() => navigate(`/reels?tienda=${tiendaId}&producto=${r.id}`)}
          style={{ position: "relative", aspectRatio: "9 / 16", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)", background: "#000", cursor: "pointer", padding: 0 }}
        >
          {r.imagen && <img src={r.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)" }} />
          <div style={{ position: "absolute", top: 8, left: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={11} weight="fill" color="#fff" />
          </div>
          <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, color: "#fff", fontSize: 11.5, fontWeight: 700, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre}</div>
        </button>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, text }: { icon: React.ReactNode; label: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "var(--text-secondary)" }}>
      <span style={{ color: "var(--text-muted)", display: "flex", marginTop: 1 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div>{text}</div>
      </div>
    </div>
  );
}
