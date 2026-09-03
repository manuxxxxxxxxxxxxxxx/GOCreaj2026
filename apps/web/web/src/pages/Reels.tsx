import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookmarkSimple,
  CaretDown,
  CaretUp,
  ChatCircle,
  Flag,
  Heart,
  Play,
  Plus,
  Question,
  ShareNetwork,
  ShoppingCart,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
  Storefront,
  Trash,
} from "@phosphor-icons/react";
import { productosApi, interaccionesApi, carritoApi, vendedorApi, ApiError } from "../lib/api";
import type { Producto } from "../lib/types";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { CommentsSheet } from "../components/domain/CommentsSheet";
import { QuestionsSheet } from "../components/domain/QuestionsSheet";
import { ReportSheet } from "../components/domain/ReportSheet";
import { SubirReelSheet } from "../components/domain/SubirReelSheet";

export function Reels() {
  const { usuario } = useAuth();
  const [params] = useSearchParams();
  const tiendaFiltro = params.get("tienda") ? Number(params.get("tienda")) : null;
  const productoInicial = params.get("producto") ? Number(params.get("producto")) : null;
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [muted, setMuted] = useState(false);
  const [comentariosDe, setComentariosDe] = useState<Producto | null>(null);
  const [preguntarA, setPreguntarA] = useState<Producto | null>(null);
  const [reportarA, setReportarA] = useState<Producto | null>(null);
  const [subiendoReel, setSubiendoReel] = useState(false);
  const [indice, setIndice] = useState(0);
  const indiceRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bloqueado = useRef(false);

  const cargarReels = useCallback(() => {
    if (tiendaFiltro) {
      // Vista de reels de una sola tienda (desde la pestaña "Reels" de StoreDetail) --
      // no aplica el fallback por municipio, se muestran todos los de esa tienda.
      productosApi.reels({ tienda_id: tiendaFiltro }).then((r) => setReels(r.reels)).catch(() => setReels([]));
      return;
    }
    const municipio = usuario?.municipio ?? undefined;
    productosApi
      .reels({ municipio })
      .then((r) => (r.reels.length === 0 && municipio ? productosApi.reels({}).then((r2) => r2.reels) : r.reels))
      .then(setReels)
      .catch(() => setReels([]));
  }, [usuario?.municipio, tiendaFiltro]);

  useEffect(() => {
    cargarReels();
  }, [cargarReels]);

  // Actualiza el contador de comentarios en el momento (sin esto se queda con el valor
  // que trajo el fetch inicial hasta que se recarga toda la lista de reels).
  const bumpComentarios = useCallback((productoId: number) => {
    setReels((prev) => prev && prev.map((r) => (r.id === productoId ? { ...r, comentarios_count: (r.comentarios_count ?? 0) + 1 } : r)));
  }, []);

  // Única fuente de verdad para navegar: clampa, hace scroll Y actualiza el
  // índice de una vez -- así los botones laterales, la rueda y el teclado se
  // sienten instantáneos sin esperar a que el IntersectionObserver confirme
  // que la tarjeta ya quedó visible (ese observer solo sincroniza el índice
  // cuando el cambio viene de un swipe táctil, que no pasa por acá).
  const irA = useCallback((i: number) => {
    const el = containerRef.current;
    if (!el) return;
    const total = el.children.length;
    const clamped = Math.max(0, Math.min(total - 1, i));
    el.scrollTo({ top: clamped * el.clientHeight, behavior: "smooth" });
    indiceRef.current = clamped;
    setIndice(clamped);
  }, []);

  // Si venimos de un thumbnail puntual (pestaña Reels de una tienda, o un mensaje de
  // chat), saltamos directo a ese reel en cuanto carga la lista, en vez de arrancar
  // siempre desde el primero.
  useEffect(() => {
    if (!reels || !productoInicial) return;
    const i = reels.findIndex((r) => r.id === productoInicial);
    if (i > 0) requestAnimationFrame(() => irA(i));
  }, [reels, productoInicial, irA]);

  // Rueda del mouse / trackpad: cada gesto avanza exactamente un reel, no un
  // scroll parcial. React marca los listeners de wheel como pasivos por
  // defecto, así que preventDefault solo funciona si el listener se agrega
  // "a mano" con passive:false.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (bloqueado.current) return;
      bloqueado.current = true;
      irA(indiceRef.current + (e.deltaY > 0 ? 1 : -1));
      setTimeout(() => {
        bloqueado.current = false;
      }, 520);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [irA]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      irA(indiceRef.current + (e.key === "ArrowDown" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [irA]);

  if (reels === null) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <Skeleton height={640} radius="var(--radius-lg)" />
      </div>
    );
  }

  if (reels.length === 0) {
    return <EmptyState icon={<Play size={26} />} title="No hay reels en tu zona todavía" description="Las tiendas están subiendo contenido — vuelve pronto." />;
  }

  return (
    <div className="fixed-below-topnav" style={{ overflow: "hidden", background: "#000" }}>
      <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", height: "100%" }}>
        <div
          ref={containerRef}
          className="reels-scroll"
          style={{
            height: "100%",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {reels.map((r, i) => (
            <ReelCard
              key={r.id}
              producto={r}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onComentarios={() => setComentariosDe(r)}
              onPreguntar={() => setPreguntarA(r)}
              onReportar={() => setReportarA(r)}
              onEliminado={() => setReels((rs) => (rs ?? []).filter((x) => x.id !== r.id))}
              onVisible={() => {
                indiceRef.current = i;
                setIndice(i);
              }}
            />
          ))}

        </div>

        <div style={{ position: "absolute", right: -54, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 12, zIndex: 3 }}>
          <button
            onClick={() => irA(indice - 1)}
            disabled={indice === 0}
            aria-label="Reel anterior"
            style={navBtnStyle(indice === 0)}
          >
            <CaretUp size={16} weight="bold" />
          </button>
          <button
            onClick={() => irA(indice + 1)}
            disabled={indice === reels.length - 1}
            aria-label="Siguiente reel"
            style={navBtnStyle(indice === reels.length - 1)}
          >
            <CaretDown size={16} weight="bold" />
          </button>
        </div>

        {usuario?.rol === "vendedor" && (
          <button
            onClick={() => setSubiendoReel(true)}
            aria-label="Subir reel"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "none",
              background: "var(--cyan)",
              color: "var(--cyan-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "var(--shadow-lg)",
              zIndex: 3,
            }}
          >
            <Plus size={22} weight="bold" />
          </button>
        )}

        {comentariosDe && (
          <CommentsSheet producto={comentariosDe} onClose={() => setComentariosDe(null)} onComentarioNuevo={() => bumpComentarios(comentariosDe.id)} />
        )}
        {preguntarA && <QuestionsSheet producto={preguntarA} onClose={() => setPreguntarA(null)} />}
        {reportarA && <ReportSheet tipo="reel" entidadId={reportarA.id} entidadNombre={reportarA.nombre} onClose={() => setReportarA(null)} />}
        {subiendoReel && (
          <SubirReelSheet
            onClose={() => setSubiendoReel(false)}
            onPublicado={() => {
              setSubiendoReel(false);
              cargarReels();
            }}
          />
        )}
      </div>
    </div>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
    boxShadow: "var(--shadow-md)",
  };
}

function ReelCard({
  producto,
  muted,
  onToggleMute,
  onComentarios,
  onPreguntar,
  onReportar,
  onEliminado,
  onVisible,
}: {
  producto: Producto;
  muted: boolean;
  onToggleMute: () => void;
  onComentarios: () => void;
  onPreguntar: () => void;
  onReportar: () => void;
  onEliminado: () => void;
  onVisible: () => void;
}) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const seekingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const esDueno = usuario?.id === producto.vendedor_id;

  const eliminar = async () => {
    if (!window.confirm("¿Eliminar este reel? Se quitará de Reels y de tu catálogo. Esta acción no se puede deshacer.")) return;
    setEliminando(true);
    try {
      await vendedorApi.eliminarProducto(producto.id);
      toast.show("Reel eliminado", "success");
      onEliminado();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
    } finally {
      setEliminando(false);
    }
  };
  const [estado, setEstado] = useState({
    like: !!producto.yo_like,
    likes: producto.likes_count ?? 0,
    guardado: !!producto.yo_guardado,
    sigo: !!producto.yo_sigo,
  });
  const vistaRegistrada = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    const video = videoRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          onVisible();
          if (video && !reduced) {
            video.play().then(() => setPlaying(true)).catch(() => {});
          }
          if (!vistaRegistrada.current) {
            vistaRegistrada.current = true;
            interaccionesApi.registrarVista(producto.id).catch(() => {});
          }
        } else {
          video?.pause();
          setPlaying(false);
          // Reinicia al inicio: así cada vez que se vuelve a este reel (scroll de ida y
          // vuelta) arranca de nuevo en vez de seguir donde quedó pausado.
          if (video) {
            video.currentTime = 0;
            setProgreso(0);
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto.id]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  // Algunos navegadores (sobre todo Safari/iOS) no siempre respetan el atributo `loop`
  // nativo cuando el video se pausó/retomó por JS -- se reinicia a mano para que el
  // reel siempre repita en vez de quedarse congelado en el último frame.
  const onEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().then(() => setPlaying(true)).catch(() => {});
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || seekingRef.current || !video.duration) return;
    setProgreso(video.currentTime / video.duration);
  };

  const seekTo = (clientX: number) => {
    const video = videoRef.current;
    const bar = barRef.current;
    if (!video || !bar || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setProgreso(ratio);
  };

  const toggleLike = async () => {
    if (!usuario) return navigate("/login");
    if (esDueno) return;
    const r = await interaccionesApi.toggleLike(producto.id);
    setEstado((s) => ({ ...s, like: r.accion === "like", likes: r.contadores.likes }));
  };

  const toggleGuardar = async () => {
    if (!usuario) return navigate("/login");
    const r = await interaccionesApi.toggleGuardar(producto.id);
    setEstado((s) => ({ ...s, guardado: r.accion === "guardar" }));
  };

  const toggleSeguir = async () => {
    if (!usuario) return navigate("/login");
    if (!producto.tienda_id || esDueno) return;
    const r = await interaccionesApi.seguirTienda(producto.tienda_id);
    setEstado((s) => ({ ...s, sigo: r.accion === "follow" }));
  };

  const agregarCarrito = async () => {
    if (!usuario) return navigate("/login");
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
    try {
      await carritoApi.agregar(producto.id, 1);
      await refrescar();
      celebrarAgregado();
      toast.show(`${producto.nombre} agregado al carrito`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar.", "error");
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", height: "100%", width: "100%", flexShrink: 0, overflow: "hidden", background: "#000", scrollSnapAlign: "start", scrollSnapStop: "always" }}
    >
      {producto.video_url ? (
        <video
          ref={videoRef}
          src={producto.video_url}
          loop
          muted={muted}
          playsInline
          onClick={togglePlay}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
        />
      ) : (
        producto.imagen && <img src={producto.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}

      {producto.video_url && (
        <div
          ref={barRef}
          onPointerDown={(e) => {
            seekingRef.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            seekTo(e.clientX);
          }}
          onPointerMove={(e) => {
            if (seekingRef.current) seekTo(e.clientX);
          }}
          onPointerUp={() => {
            seekingRef.current = false;
          }}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, display: "flex", alignItems: "flex-end", cursor: "pointer", zIndex: 2, touchAction: "none" }}
        >
          <div style={{ height: 3, width: "100%", background: "rgba(255,255,255,0.25)" }}>
            <div style={{ height: "100%", width: `${progreso * 100}%`, background: "var(--cyan)" }} />
          </div>
        </div>
      )}

      {!playing && (
        <button onClick={togglePlay} aria-label="Reproducir" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)", border: "none", cursor: "pointer" }}>
          <Play size={44} weight="fill" color="#fff" />
        </button>
      )}

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />

      <button
        onClick={onToggleMute}
        aria-label={muted ? "Activar sonido" : "Silenciar"}
        style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        {muted ? <SpeakerSimpleSlash size={16} /> : <SpeakerSimpleHigh size={16} />}
      </button>

      <div style={{ position: "absolute", left: 14, bottom: 16, right: 78, color: "#fff" }}>
        <button onClick={() => navigate(`/tienda/${producto.tienda_id}`)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#fff", cursor: "pointer", marginBottom: 6 }}>
          <Storefront size={15} />
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{producto.tienda_nombre}</span>
        </button>
        <div style={{ fontSize: 13.5, marginBottom: producto.hashtags ? 3 : 8, lineHeight: 1.4 }}>{producto.nombre}</div>
        {producto.hashtags && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7FE6FF", marginBottom: 8 }}>
            {/* replace() por si son datos viejos guardados sin "#" -- evita mostrar "##doble". */}
            {producto.hashtags.split(/\s+/).filter(Boolean).map((t) => `#${t.replace(/^#+/, "")}`).join(" ")}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="tabular" style={{ fontWeight: 800, fontSize: 15 }}>
            {money(producto.precio_oferta || producto.precio)}
          </span>
          <button onClick={agregarCarrito} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--cyan)", color: "var(--cyan-ink)", border: "none", borderRadius: "var(--radius-pill)", padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
            <ShoppingCart size={13} weight="bold" /> Agregar
          </button>
          <button
            onClick={onPreguntar}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "var(--radius-pill)", padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Question size={13} weight="bold" /> Preguntar
          </button>
        </div>
      </div>

      <div style={{ position: "absolute", right: 12, bottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
        {/* Un vendedor no se da like ni se sigue a sí mismo -- mismo criterio que StoreHero. */}
        {!esDueno && <ReelAction icon={<Heart size={24} weight="fill" color={estado.like ? "var(--danger)" : "#fff"} />} label={estado.likes} onClick={toggleLike} />}
        <ReelAction icon={<ChatCircle size={24} weight="fill" color="#fff" />} label={producto.comentarios_count} onClick={onComentarios} />
        <ReelAction
          icon={<ShareNetwork size={24} weight="fill" color="#fff" />}
          label={producto.compartidos_count}
          onClick={() => {
            interaccionesApi.compartir(producto.id).catch(() => {});
            navigator.clipboard?.writeText(`${window.location.origin}/reels?tienda=${producto.tienda_id}&producto=${producto.id}`);
            toast.show("Enlace copiado", "success");
          }}
        />
        <ReelAction icon={<BookmarkSimple size={24} weight="fill" color="#fff" />} onClick={toggleGuardar} />
        {!esDueno && (
          <button
            onClick={toggleSeguir}
            style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: estado.sigo ? "var(--cyan)" : "#fff", color: estado.sigo ? "var(--cyan-ink)" : "#000", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
            aria-label={estado.sigo ? "Dejar de seguir" : "Seguir"}
          >
            {estado.sigo ? "✓" : "+"}
          </button>
        )}

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuAbierto((m) => !m)}
            aria-label="Más opciones"
            style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
          >
            ⋯
          </button>
          {menuAbierto && (
            <>
              <div onClick={() => setMenuAbierto(false)} style={{ position: "fixed", inset: 0, zIndex: 3 }} />
              <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, display: "flex", flexDirection: "column", gap: 6, zIndex: 4 }}>
                {esDueno && (
                  <button
                    onClick={() => {
                      setMenuAbierto(false);
                      eliminar();
                    }}
                    disabled={eliminando}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      background: "var(--surface-1)",
                      color: "var(--danger)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <Trash size={13} weight="fill" /> Eliminar reel
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    onReportar();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    background: "var(--surface-1)",
                    color: "var(--danger)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <Flag size={13} weight="fill" /> Reportar video
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const REEL_ICON_SHADOW = "drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 2px 6px rgba(0,0,0,0.35))";

function ReelAction({ icon, label, onClick }: { icon: React.ReactNode; label?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", filter: REEL_ICON_SHADOW }}>
      {icon}
      {label !== undefined && (
        <span className="tabular" style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
          {label}
        </span>
      )}
    </button>
  );
}
