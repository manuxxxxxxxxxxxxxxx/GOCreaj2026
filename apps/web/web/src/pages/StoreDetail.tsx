import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellSlash, Clock, MapPin, Play, Star, Storefront, UsersThree } from "@phosphor-icons/react";
import { productosApi, interaccionesApi } from "../lib/api";
import type { Producto, Tienda } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "../components/domain/ProductCard";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/format";

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  respuesta_vendedor: string | null;
  respuesta_at: string | null;
  created_at: string;
  comprador_nombre: string;
}

/** "HH:MM" or "HH:MM:SS" → minutes since midnight. */
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
    // Overnight schedule (e.g. 18:00–02:00)
    return nowMin >= open || nowMin < close;
  }, [tienda?.hora_apertura, tienda?.hora_cierre, now]);
}

function notifKey(tiendaId: number) {
  return `gocreaj_tienda_notif_${tiendaId}`;
}

export function StoreDetail() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [tab, setTab] = useState<"productos" | "reels" | "resenas">("productos");
  const [notifOn, setNotifOn] = useState(false);
  const abierto = useAbierto(tienda);

  useEffect(() => {
    if (!id) return;
    const tid = Number(id);
    productosApi.tiendaDetalle(tid).then((r) => setTienda(r.tienda)).catch(() => setTienda(null));
    productosApi.listar({ tienda_id: tid, limit: 40 }).then((r) => setProductos(r.productos)).catch(() => setProductos([]));
    productosApi.reels({ tienda_id: tid }).then((r) => setReels(r.reels)).catch(() => setReels([]));
    productosApi.tiendaResenas(tid).then((r) => setResenas(r.resenas)).catch(() => setResenas([]));
    setNotifOn(localStorage.getItem(notifKey(tid)) === "1");
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

  if (!tienda) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height={200} radius="var(--radius-lg)" />
        <Skeleton height={28} width={260} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
    >
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ height: 180, background: "var(--surface-2)", position: "relative" }}>
          {tienda.portada && <img src={tienda.portada} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <div style={{ background: "var(--surface-1)", padding: "0 24px 20px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -34 }}>
            <div style={{ width: 76, height: 76, borderRadius: 20, border: "3px solid var(--surface-1)", background: "var(--surface-2)", overflow: "hidden", flexShrink: 0, boxShadow: "var(--shadow-md)" }}>
              {tienda.logo ? <img src={tienda.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}><Storefront size={28} /></div>}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <h1 style={{ fontSize: 22 }}>{tienda.nombre}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 12.5, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Star size={14} weight="fill" color="var(--warn)" /> {tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"} ({tienda.total_resenas})
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={14} /> {tienda.municipio}
                </span>
                {tienda.hora_apertura && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={14} /> {tienda.hora_apertura.slice(0, 5)} – {tienda.hora_cierre?.slice(0, 5)}
                    {abierto !== null && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          color: abierto ? "var(--ok-ink)" : "var(--danger-ink)",
                          background: abierto ? "var(--ok-bg)" : "var(--danger-bg)",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: abierto ? "var(--ok)" : "var(--danger)", animation: abierto ? "icon-pulse 2s ease-in-out infinite" : undefined }} />
                        {abierto ? "Abierto ahora" : "Cerrado"}
                      </span>
                    )}
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <UsersThree size={14} /> {tienda.seguidores_count ?? 0} seguidores
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={toggleNotif}
                aria-label={notifOn ? "Desactivar notificaciones de esta tienda" : "Activar notificaciones de esta tienda"}
                aria-pressed={notifOn}
                title={notifOn ? "Notificaciones activadas" : "Notificaciones desactivadas"}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${notifOn ? "var(--cyan)" : "var(--border)"}`,
                  background: notifOn ? "var(--cyan-bg)" : "var(--surface-2)",
                  color: notifOn ? "var(--cyan)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "transform var(--dur-fast) var(--ease-spring), background var(--dur-base), border-color var(--dur-base)",
                }}
                onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
                onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {notifOn ? <Bell size={18} weight="fill" /> : <BellSlash size={18} />}
              </button>
              <Button variant={tienda.yo_sigo ? "secondary" : "primary"} onClick={toggleSeguir}>
                {tienda.yo_sigo ? "Siguiendo" : "Seguir"}
              </Button>
            </div>
          </div>
          {tienda.descripcion && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 14, maxWidth: 560 }}>{tienda.descripcion}</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", width: "fit-content" }}>
        {(["productos", "reels", "resenas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ position: "relative", padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            {tab === t && (
              <motion.span
                layoutId="storeTabBg"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{ position: "absolute", inset: 0, background: "var(--surface-1)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sm)" }}
              />
            )}
            <span style={{ position: "relative" }}>
              {t === "productos" ? "Productos" : t === "reels" ? `Reels${reels?.length ? ` (${reels.length})` : ""}` : `Reseñas${tienda.total_resenas ? ` (${tienda.total_resenas})` : ""}`}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
          {tab === "productos" ? (
            productos === null ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={200} radius="var(--radius-md)" />
                ))}
              </div>
            ) : productos.length === 0 ? (
              <EmptyState icon={<Storefront size={24} />} title="Sin productos todavía" />
            ) : (
              <div style={{ display: productos.length <= 4 ? "flex" : "grid", flexWrap: "wrap", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, overflow: "hidden" }}>
                {productos.map((p) => (
                  <div key={p.id} style={productos.length <= 4 ? { width: 200 } : undefined}>
                    <ProductCard producto={p} variant="small" />
                  </div>
                ))}
              </div>
            )
          ) : tab === "reels" ? (
            reels === null ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={240} radius="var(--radius-md)" />
                ))}
              </div>
            ) : reels.length === 0 ? (
              <EmptyState icon={<Play size={24} />} title="Sin reels todavía" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {reels.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/reels?tienda=${tienda.id}&producto=${r.id}`)}
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
            )
          ) : resenas.length === 0 ? (
            <EmptyState icon={<Star size={24} />} title="Aún no hay reseñas" description="Las reseñas aparecen aquí cuando los clientes califican un pedido entregado." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
              {resenas.map((r, i) => (
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
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
