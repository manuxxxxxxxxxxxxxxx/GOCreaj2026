import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookmarkSimple,
  Camera,
  CaretRight,
  GearSix,
  Heart,
  MapPinLine,
  Moped,
  Package,
  Star,
  Storefront,
  Trophy,
  User,
} from "@phosphor-icons/react";
import { authApi, pedidosApi, vendedorApi, interaccionesApi, ApiError } from "../lib/api";
import type { Pedido, Producto, Tienda } from "../lib/types";
import { fileToBase64, calcularPerfilCompleto, money, formatDateTime, numeroPedido } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar } from "../components/ui/Avatar";
import { AvatarRing } from "../components/ui/AvatarRing";
import { Card } from "../components/ui/Card";
import { Reveal } from "../components/ui/Reveal";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusPill } from "../components/ui/StatusPill";
import { ProductGrid } from "../components/domain/ProductGrid";
import { ProfileBadges, type ProfileBadge } from "../components/domain/ProfileBadges";

/** Cuántos productos se muestran en el grid de vista previa antes de "Ver todo". */
const COLECCION_PREVIEW = 9;
const PEDIDOS_PREVIEW = 5;

const ROLE_META: Record<string, { label: string; accent: "cyan" | "violet" | "coral"; icon: React.ReactNode }> = {
  comprador: { label: "Comprador", accent: "cyan", icon: <User size={12} weight="bold" /> },
  vendedor: { label: "Vendedor", accent: "violet", icon: <Storefront size={12} weight="bold" /> },
  repartidor: { label: "Repartidor", accent: "coral", icon: <Moped size={12} weight="bold" /> },
};

type CompradorTab = "pedidos" | "likes" | "guardados";
type VendedorTab = "productos" | "reels" | "resenas";
type ResenaVendedor = { id: number; estrellas: number; comentario: string; created_at: string; comprador_nombre: string };

export function Profile() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // El repartidor y el admin tienen su propia pantalla de perfil — esta es la
  // vista estilo TikTok compartida por comprador y vendedor.
  useEffect(() => {
    if (usuario?.rol === "repartidor") navigate("/repartidor/perfil", { replace: true });
    else if (usuario?.rol === "admin") navigate("/admin", { replace: true });
  }, [usuario?.rol, navigate]);

  const [compradorTab, setCompradorTab] = useState<CompradorTab>("pedidos");
  const [vendedorTab, setVendedorTab] = useState<VendedorTab>("productos");

  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [likes, setLikes] = useState<Producto[] | null>(null);
  const [likesTotal, setLikesTotal] = useState(0);
  const [guardados, setGuardados] = useState<Producto[] | null>(null);
  const [guardadosTotal, setGuardadosTotal] = useState(0);

  const [tienda, setTienda] = useState<Tienda | null | undefined>(undefined);
  const [productosVendedor, setProductosVendedor] = useState<Producto[] | null>(null);
  const [ventasCount, setVentasCount] = useState<number | null>(null);
  const [resenasVendedor, setResenasVendedor] = useState<ResenaVendedor[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === "comprador") {
      pedidosApi
        .misPedidos()
        .then((r) => setPedidos(r.pedidos))
        .catch(() => setPedidos([]));
      interaccionesApi
        .misLikes(1, COLECCION_PREVIEW)
        .then((r) => {
          setLikes(r.productos);
          setLikesTotal(r.total);
        })
        .catch(() => setLikes([]));
      interaccionesApi
        .misGuardados(1, COLECCION_PREVIEW)
        .then((r) => {
          setGuardados(r.productos);
          setGuardadosTotal(r.total);
        })
        .catch(() => setGuardados([]));
    } else if (usuario.rol === "vendedor") {
      vendedorApi
        .misTiendas()
        .then((r) => setTienda(r.tiendas[0] ?? null))
        .catch(() => setTienda(null));
      vendedorApi
        .misProductos()
        .then((r) => setProductosVendedor(r.productos))
        .catch(() => setProductosVendedor([]));
      vendedorApi
        .misVentas()
        .then((r) => setVentasCount(r.pedidos.length))
        .catch(() => setVentasCount(null));
      vendedorApi
        .misResenas()
        .then((r) => setResenasVendedor(r.resenas))
        .catch(() => setResenasVendedor([]));
    }
  }, [usuario?.rol]);

  if (!usuario || usuario.rol === "repartidor" || usuario.rol === "admin") return null;

  const subirFoto = async (file: File) => {
    const b64 = await fileToBase64(file);
    try {
      const r = await authApi.actualizarPerfil({ foto_perfil: b64 });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Foto actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo subir la foto.", "error");
    }
  };

  const roleMeta = ROLE_META[usuario.rol] ?? ROLE_META.comprador;
  const esVendedor = usuario.rol === "vendedor";
  const reelsVendedor = productosVendedor?.filter((p) => p.es_reel) ?? [];
  const productosNoReel = productosVendedor?.filter((p) => !p.es_reel) ?? [];

  const heroStats: { label: string; value: string; onClick?: () => void }[] = esVendedor
    ? [
        { label: "Productos", value: productosVendedor ? String(productosNoReel.length) : "-", onClick: () => setVendedorTab("productos") },
        { label: "Reels", value: productosVendedor ? String(reelsVendedor.length) : "-", onClick: () => setVendedorTab("reels") },
        { label: "Ventas", value: ventasCount !== null ? String(ventasCount) : "-" },
        {
          label: "Calificación",
          value: tienda?.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo",
          onClick: () => setVendedorTab("resenas"),
        },
      ]
    : [
        { label: "Pedidos", value: pedidos !== null ? String(pedidos.length) : "-", onClick: () => setCompradorTab("pedidos") },
        { label: "Me gusta", value: likes !== null ? String(likesTotal) : "-", onClick: () => setCompradorTab("likes") },
        { label: "Guardados", value: guardados !== null ? String(guardadosTotal) : "-", onClick: () => setCompradorTab("guardados") },
      ];

  const pedidosCount = pedidos?.length ?? 0;
  const ahora = new Date();
  const pedidosEsteMes = pedidos?.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  }).length ?? 0;

  const compradorBadges: ProfileBadge[] = [
    { icon: <Trophy size={16} weight="fill" />, label: "Primera compra", current: pedidosCount, target: 1, accent: "cyan" },
    { icon: <Trophy size={16} weight="fill" />, label: "Comprador frecuente", current: pedidosEsteMes, target: 10, accent: "cyan", nota: "Se reinicia cada mes" },
  ];

  const vendedorBadges: ProfileBadge[] = [
    { icon: <Trophy size={16} weight="fill" />, label: "Primera venta", current: ventasCount ?? 0, target: 1, accent: "violet" },
    { icon: <Trophy size={16} weight="fill" />, label: "Catálogo activo", current: productosNoReel.length, target: 5, accent: "violet" },
    { icon: <Trophy size={16} weight="fill" />, label: "Vendedor establecido", current: ventasCount ?? 0, target: 25, accent: "violet" },
  ];

  const badgesListas = esVendedor ? !!productosVendedor : !!pedidos;
  const badgesActivas = esVendedor ? vendedorBadges : compradorBadges;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <section className="glow-mesh" style={{ position: "relative", borderRadius: "var(--radius-lg)", background: "var(--surface-1)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <button
          onClick={() => navigate("/perfil/configuracion")}
          aria-label="Configuración avanzada"
          title="Configuración avanzada"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <GearSix size={17} />
        </button>
        <Reveal style={{ display: "flex", flexDirection: "column", gap: 18, padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {usuario.rol === "comprador" ? (
                <AvatarRing nombre={usuario.nombre} foto={usuario.foto_perfil} size={84} progress={calcularPerfilCompleto(usuario)} color="cyan" />
              ) : (
                <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={84} />
              )}
              <input id="profile-photo-input" type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
              <label
                htmlFor="profile-photo-input"
                aria-label="Cambiar foto"
                style={{
                  position: "absolute",
                  bottom: usuario.rol === "comprador" ? 3 : -2,
                  right: usuario.rol === "comprador" ? 3 : -2,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  color: "var(--cyan-ink)",
                  border: "2px solid var(--surface-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Camera size={14} weight="bold" />
              </label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <h1 style={{ fontSize: 22, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{esVendedor && tienda ? tienda.nombre : usuario.nombre}</h1>
              {usuario.username && <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>@{usuario.username}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: `var(--${roleMeta.accent}-bg)`,
                    color: `var(--${roleMeta.accent})`,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {roleMeta.icon} {roleMeta.label}
                </span>
                <button
                  onClick={() => navigate("/direcciones")}
                  title="Configurar mi ubicación"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <MapPinLine size={12} /> {usuario.municipio ?? "Sin ubicación"}
                </button>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{esVendedor ? usuario.nombre : usuario.email}</p>
            </div>

            {badgesListas && badgesActivas.length > 0 && (
              <div style={{ marginLeft: "auto" }}>
                <ProfileBadges badges={badgesActivas} size={44} roleLabel={roleMeta.label} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            {heroStats.map((s, i) => (
              <button
                key={s.label}
                onClick={s.onClick}
                disabled={!s.onClick}
                style={{
                  flex: 1,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  background: "none",
                  border: "none",
                  borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                  cursor: s.onClick ? "pointer" : "default",
                  padding: "2px 0",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                  {s.label === "Calificación" && <Star size={14} weight="fill" color="var(--warn)" />}
                  {s.value}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.label}</span>
              </button>
            ))}
          </div>

        </Reveal>
      </section>

      {esVendedor && tienda !== undefined && (
        <button
          disabled={!tienda}
          onClick={() => tienda && navigate(`/tienda/${tienda.id}`)}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            textAlign: "left",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            cursor: tienda ? "pointer" : "default",
          }}
        >
          <div style={{ height: 72, background: "var(--surface-2)", position: "relative" }}>
            {tienda?.portada && (
              <img src={tienda.portada} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                border: "2px solid var(--surface-1)",
                background: "var(--surface-2)",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {tienda?.logo ? <img src={tienda.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Storefront size={18} color="var(--text-muted)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tienda?.nombre ?? "Todavía no tienes tienda"}
              </div>
              {tienda ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Star size={11} weight="fill" color="var(--warn)" />
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"} · Vista previa pública
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Configúrala en "Mi tienda" más abajo</span>
              )}
            </div>
            {tienda && <CaretRight size={16} color="var(--text-muted)" />}
          </div>
        </button>
      )}

      <div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {esVendedor ? (
            <>
              <TabButton active={vendedorTab === "productos"} icon={<Storefront size={16} weight={vendedorTab === "productos" ? "fill" : "regular"} />} label="Productos" onClick={() => setVendedorTab("productos")} />
              <TabButton active={vendedorTab === "reels"} icon={<Package size={16} weight={vendedorTab === "reels" ? "fill" : "regular"} />} label="Reels" onClick={() => setVendedorTab("reels")} />
              <TabButton active={vendedorTab === "resenas"} icon={<Star size={16} weight={vendedorTab === "resenas" ? "fill" : "regular"} />} label="Reseñas" onClick={() => setVendedorTab("resenas")} />
            </>
          ) : (
            <>
              <TabButton active={compradorTab === "pedidos"} icon={<Package size={16} weight={compradorTab === "pedidos" ? "fill" : "regular"} />} label="Pedidos" onClick={() => setCompradorTab("pedidos")} />
              <TabButton active={compradorTab === "likes"} icon={<Heart size={16} weight={compradorTab === "likes" ? "fill" : "regular"} />} label="Me gusta" onClick={() => setCompradorTab("likes")} />
              <TabButton active={compradorTab === "guardados"} icon={<BookmarkSimple size={16} weight={compradorTab === "guardados" ? "fill" : "regular"} />} label="Guardados" onClick={() => setCompradorTab("guardados")} />
            </>
          )}
        </div>

        <div style={{ paddingTop: 12 }}>
          {!esVendedor && compradorTab === "pedidos" && (
            <PedidosPreview pedidos={pedidos} onVerTodos={() => navigate("/pedidos")} navigate={navigate} />
          )}

          {!esVendedor && compradorTab === "likes" &&
            (likes === null ? (
              <Skeleton height={160} />
            ) : likes.length === 0 ? (
              <EmptyState icon={<Heart size={22} />} title="Sin likes todavía" description="Los productos y reels que te gusten aparecerán aquí." />
            ) : (
              <>
                <ProductGrid productos={likes} />
                {likesTotal > likes.length && <VerTodoButton onClick={() => navigate("/perfil/coleccion/likes")} total={likesTotal} />}
              </>
            ))}

          {!esVendedor && compradorTab === "guardados" &&
            (guardados === null ? (
              <Skeleton height={160} />
            ) : guardados.length === 0 ? (
              <EmptyState icon={<BookmarkSimple size={22} />} title="Sin guardados todavía" description="Guarda productos y reels desde el ícono de marcador para verlos aquí." />
            ) : (
              <>
                <ProductGrid productos={guardados} />
                {guardadosTotal > guardados.length && <VerTodoButton onClick={() => navigate("/perfil/coleccion/guardados")} total={guardadosTotal} />}
              </>
            ))}

          {esVendedor && vendedorTab === "productos" &&
            (productosVendedor === null ? (
              <Skeleton height={160} />
            ) : productosNoReel.length === 0 ? (
              <EmptyState icon={<Storefront size={22} />} title="Sin productos todavía" description="Agrega productos desde tu panel de vendedor." actionLabel="Ir al panel" onAction={() => navigate("/vendedor/productos")} />
            ) : (
              <ProductGrid productos={productosNoReel} />
            ))}

          {esVendedor && vendedorTab === "reels" &&
            (productosVendedor === null ? (
              <Skeleton height={160} />
            ) : reelsVendedor.length === 0 ? (
              <EmptyState icon={<Package size={22} />} title="Sin reels todavía" description="Publica un reel para mostrar tus productos en video." actionLabel="Ir al panel" onAction={() => navigate("/vendedor/productos")} />
            ) : (
              <ProductGrid productos={reelsVendedor} />
            ))}

          {esVendedor && vendedorTab === "resenas" &&
            (resenasVendedor === null ? (
              <Skeleton height={160} />
            ) : resenasVendedor.length === 0 ? (
              <EmptyState icon={<Star size={22} />} title="Sin reseñas todavía" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {resenasVendedor.map((r) => (
                  <Card key={r.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{r.comprador_nombre}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDateTime(r.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} weight={i < r.estrellas ? "fill" : "regular"} color="var(--warn)" />
                      ))}
                    </div>
                    {r.comentario && <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{r.comentario}</p>}
                  </Card>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function PedidosPreview({ pedidos, onVerTodos, navigate }: { pedidos: Pedido[] | null; onVerTodos: () => void; navigate: (path: string) => void }) {
  if (pedidos === null) return <Skeleton height={160} />;
  if (pedidos.length === 0) {
    return <EmptyState icon={<Package size={22} />} title="Todavía no has pedido nada" actionLabel="Explorar tiendas" onAction={() => navigate("/explorar")} />;
  }
  const preview = pedidos.slice(0, PEDIDOS_PREVIEW);
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {preview.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/pedidos/${p.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Pedido #{numeroPedido(p)}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.vendedor_nombre} · {formatDateTime(p.created_at)}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <StatusPill estado={p.estado} buscandoRepartidor={p.tipo_entrega !== "recogida" && !p.repartidor_id} />
              <div className="tabular" style={{ fontWeight: 700, fontSize: 12.5, marginTop: 6 }}>
                {money(p.total)}
              </div>
            </div>
          </button>
        ))}
      </div>
      {pedidos.length > preview.length ? <VerTodoButton onClick={onVerTodos} total={pedidos.length} /> : <VerTodoLink onClick={onVerTodos} />}
    </>
  );
}

function VerTodoButton({ onClick, total }: { onClick: () => void; total: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        marginTop: 10,
        padding: "10px 0",
        background: "none",
        border: "none",
        color: "var(--cyan)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Ver todo ({total})
    </button>
  );
}

function VerTodoLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        marginTop: 10,
        padding: "10px 0",
        background: "none",
        border: "none",
        color: "var(--cyan)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Ver historial completo
    </button>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "12px 4px",
        background: "none",
        border: "none",
        borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
        color: active ? "var(--cyan)" : "var(--text-muted)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}
