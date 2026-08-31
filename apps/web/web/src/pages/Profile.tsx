import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BookmarkSimple,
  Camera,
  CaretRight,
  GearSix,
  Handshake,
  Heart,
  Headset,
  MapPinLine,
  MapTrifold,
  Moped,
  PencilSimple,
  SignOut,
  Star,
  Storefront,
  Trophy,
  User,
  Wallet as WalletIcon,
  X,
} from "@phosphor-icons/react";
import { authApi, productosApi, pedidosApi, vendedorApi, interaccionesApi, ApiError } from "../lib/api";
import type { Municipio, Producto } from "../lib/types";
import { fileToBase64, calcularPerfilCompleto } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar } from "../components/ui/Avatar";
import { AvatarRing } from "../components/ui/AvatarRing";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { Input } from "../components/ui/Input";
import { PhoneInput } from "../components/ui/PhoneInput";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Reveal } from "../components/ui/Reveal";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ProductGrid } from "../components/domain/ProductGrid";
import { ProfileBadges, type ProfileBadge } from "../components/domain/ProfileBadges";

/** Cuántos productos se muestran en el grid de vista previa (Me gusta / Guardados) antes de "Ver todo". */
const COLECCION_PREVIEW = 9;

const ROLE_META: Record<string, { label: string; accent: "cyan" | "violet" | "coral"; icon: React.ReactNode }> = {
  comprador: { label: "Comprador", accent: "cyan", icon: <User size={12} weight="bold" /> },
  vendedor: { label: "Vendedor", accent: "violet", icon: <Storefront size={12} weight="bold" /> },
  repartidor: { label: "Repartidor", accent: "coral", icon: <Moped size={12} weight="bold" /> },
};

export function Profile() {
  const { usuario, actualizarUsuarioLocal, cambiarRol, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [municipio, setMunicipio] = useState(usuario?.municipio ?? "");
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);
  const [stats, setStats] = useState<{ label: string; value: number }[] | null>(null);
  const [tab, setTab] = useState<"likes" | "guardados">("likes");
  const [likes, setLikes] = useState<Producto[] | null>(null);
  const [likesTotal, setLikesTotal] = useState(0);
  const [guardados, setGuardados] = useState<Producto[] | null>(null);
  const [guardadosTotal, setGuardadosTotal] = useState(0);

  useEffect(() => {
    authApi.misRoles().then((r) => setRoles(r.roles)).catch(() => {});
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  useEffect(() => {
    // Se cargan ambas de una vez (no solo la pestaña activa): el hero del comprador
    // ya necesita los conteos de Favoritos/Guardados apenas entra al perfil. Solo se
    // trae una vista previa (COLECCION_PREVIEW) — "Ver todo" lleva a la lista completa paginada.
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
  }, []);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === "comprador") {
      pedidosApi.misPedidos().then((r) => setStats([{ label: "Pedidos", value: r.pedidos.length }])).catch(() => setStats(null));
    } else if (usuario.rol === "vendedor") {
      Promise.all([vendedorApi.misProductos(), vendedorApi.misVentas()])
        .then(([p, v]) =>
          setStats([
            { label: "Productos", value: p.productos.length },
            { label: "Reels", value: p.productos.filter((x) => x.es_reel).length },
            { label: "Ventas", value: v.pedidos.length },
          ]),
        )
        .catch(() => setStats(null));
    } else {
      setStats(null);
    }
  }, [usuario?.rol]);

  const municipiosPorDepto = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  const guardarUbicacion = async (valor: string) => {
    setMunicipio(valor);
    setGuardandoUbicacion(true);
    try {
      const r = await authApi.actualizarUbicacion({ municipio: valor });
      actualizarUsuarioLocal(r.usuario);
      toast.show(valor ? "Ubicación actualizada" : "Ubicación quitada — verás resultados de todo el país", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar tu ubicación.", "error");
    } finally {
      setGuardandoUbicacion(false);
    }
  };

  if (!usuario) return null;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await authApi.actualizarPerfil({ nombre, email, telefono });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Perfil actualizado", "success");
      setEditando(false);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const cancelarEdicion = () => {
    setNombre(usuario.nombre);
    setEmail(usuario.email);
    setTelefono(usuario.telefono ?? "");
    setEditando(false);
  };

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
  const pedidosCount = stats?.find((s) => s.label === "Pedidos")?.value;
  const heroStats: { label: string; value: string }[] | null =
    usuario.rol === "repartidor"
      ? [
          { label: "Calificación", value: usuario.repartidor_calificacion_promedio ? usuario.repartidor_calificacion_promedio.toFixed(1) : "Nuevo" },
          { label: "Reseñas", value: String(usuario.repartidor_total_resenas ?? 0) },
        ]
      : usuario.rol === "comprador"
        ? [
            { label: "Pedidos", value: pedidosCount !== undefined ? String(pedidosCount) : "-" },
            { label: "Favoritos", value: likes !== null ? String(likesTotal) : "-" },
            { label: "Guardados", value: guardados !== null ? String(guardadosTotal) : "-" },
          ]
        : stats
          ? stats.map((s) => ({ label: s.label, value: String(s.value) }))
          : null;

  const compradorBadges: ProfileBadge[] = [
    { icon: <Trophy size={13} weight="fill" />, label: "Primera compra", achieved: (pedidosCount ?? 0) >= 1 },
    { icon: <Trophy size={13} weight="fill" />, label: "Comprador frecuente", achieved: (pedidosCount ?? 0) >= 10 },
  ];

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>
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
        <Reveal style={{ display: "flex", flexDirection: "column", gap: 20, padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {usuario.rol === "comprador" ? (
              <AvatarRing nombre={usuario.nombre} foto={usuario.foto_perfil} size={84} progress={calcularPerfilCompleto(usuario)} color="cyan" />
            ) : (
              <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={84} />
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
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
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre}</span>
              {usuario.rol === "comprador" && !!usuario.telefono_verificado && <VerifiedBadge />}
            </h1>
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
              <span
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
                }}
              >
                <MapPinLine size={12} /> {usuario.municipio ?? "Sin ubicación"}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{usuario.email}</p>
          </div>
        </div>

        {heroStats && (
          <div style={{ display: "flex", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            {heroStats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                  {s.label === "Calificación" && <Star size={14} weight="fill" color="var(--warn)" />}
                  {s.value}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {usuario.rol === "comprador" && stats && <ProfileBadges badges={compradorBadges} />}
        </Reveal>
      </section>

      <div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          <TabButton active={tab === "likes"} icon={<Heart size={16} weight={tab === "likes" ? "fill" : "regular"} />} label="Me gusta" onClick={() => setTab("likes")} />
          <TabButton active={tab === "guardados"} icon={<BookmarkSimple size={16} weight={tab === "guardados" ? "fill" : "regular"} />} label="Guardados" onClick={() => setTab("guardados")} />
        </div>
        <div style={{ paddingTop: 12 }}>
          {tab === "likes" &&
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
          {tab === "guardados" &&
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
        </div>
      </div>

      {roles.length > 1 && (
        <Card>
          <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Cambiar de rol</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {roles.map((r) => {
              const meta = ROLE_META[r] ?? ROLE_META.comprador;
              const active = usuario.rol === r;
              return (
                <button
                  key={r}
                  onClick={() => cambiarRol(r as "comprador" | "vendedor" | "repartidor")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${active ? `var(--${meta.accent})` : "var(--border)"}`,
                    background: active ? `var(--${meta.accent}-bg)` : "var(--surface-1)",
                    color: active ? `var(--${meta.accent})` : "var(--text-secondary)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <h2 style={{ fontSize: 13.5, marginBottom: 4 }}>Ubicación</h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          Filtra lo que ves en Inicio y Reels por tu municipio. Déjalo en blanco para ver resultados de todo el país.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MapPinLine size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <select
            value={municipio}
            onChange={(e) => guardarUbicacion(e.target.value)}
            disabled={guardandoUbicacion}
            style={{ flex: 1, height: 40, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", padding: "0 10px", fontSize: 13 }}
          >
            <option value="">Todo el país (sin filtrar)</option>
            {municipiosPorDepto.map(([depto, ms]) => (
              <optgroup key={depto} label={depto}>
                {ms.map((m) => (
                  <option key={m.id} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editando ? 14 : 4 }}>
          <h2 style={{ fontSize: 13.5 }}>Información personal</h2>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--cyan)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "4px 2px" }}
            >
              <PencilSimple size={13} weight="bold" /> Editar
            </button>
          )}
        </div>

        {editando ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PhoneInput value={telefono} onChange={setTelefono} />
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={guardar} loading={guardando}>
                Guardar cambios
              </Button>
              <Button variant="ghost" onClick={cancelarEdicion} disabled={guardando}>
                <X size={15} /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Nombre" value={usuario.nombre} />
            <InfoRow label="Correo" value={usuario.email} />
            <InfoRow label="Teléfono" value={usuario.telefono || "Sin registrar"} last />
          </div>
        )}
      </Card>

      <NavSection
        title="Cuenta"
        items={[
          { icon: <MapPinLine size={17} />, label: "Direcciones", onClick: () => navigate("/direcciones") },
          { icon: <WalletIcon size={17} />, label: "Billetera", onClick: () => navigate("/wallet") },
          { icon: <Bell size={17} />, label: "Notificaciones", onClick: () => navigate("/notificaciones") },
        ]}
      />

      <NavSection
        title="Actividad"
        items={[
          { icon: <MapTrifold size={17} />, label: "Mis pedidos", onClick: () => navigate("/pedidos") },
          ...(usuario.rol === "comprador" ? [{ icon: <Handshake size={17} />, label: "Convertirse en socio", onClick: () => navigate("/convertirse") }] : []),
          ...(usuario.rol === "vendedor" ? [{ icon: <Storefront size={17} />, label: "Panel de vendedor", onClick: () => navigate("/vendedor") }] : []),
          ...(usuario.rol === "repartidor" ? [{ icon: <Moped size={17} />, label: "Mi perfil de repartidor", onClick: () => navigate("/repartidor/perfil") }] : []),
        ]}
      />

      <NavSection
        title="Más"
        items={[
          { icon: <GearSix size={17} />, label: "Configuración avanzada", onClick: () => navigate("/perfil/configuracion") },
          { icon: <Headset size={17} />, label: "Soporte", onClick: () => navigate("/soporte") },
        ]}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <SignOut size={16} /> Cerrar sesión
        </Button>
        <button
          onClick={() => setConfirmandoEliminar(true)}
          style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "4px" }}
        >
          Eliminar cuenta
        </button>
      </div>

      <ConfirmDialog
        open={confirmandoEliminar}
        title="¿Eliminar tu cuenta?"
        description="Esta acción desactiva tu cuenta de inmediato. Contacta a soporte si cambias de opinión."
        confirmLabel="Eliminar cuenta"
        danger
        onCancel={() => setConfirmandoEliminar(false)}
        onConfirm={async () => {
          try {
            await authApi.eliminarCuenta();
            logout();
            navigate("/login");
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar la cuenta.", "error");
          }
        }}
      />
    </div>
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

function NavSection({ title, items }: { title: string; items: { icon: React.ReactNode; label: string; onClick: () => void }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)", padding: "0 2px" }}>{title}</h2>
      <Card padding="4px 14px">
        {items.map((item, i) => (
          <NavRow key={item.label} icon={item.icon} label={item.label} onClick={item.onClick} last={i === items.length - 1} />
        ))}
      </Card>
    </div>
  );
}

function NavRow({ icon, label, onClick, last }: { icon: React.ReactNode; label: string; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "10px 2px",
        background: "none",
        border: "none",
        borderBottom: last ? "none" : "1px solid var(--border)",
        cursor: "pointer",
        textAlign: "left",
        color: "var(--text-primary)",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--cyan-bg)",
          color: "var(--cyan)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      <CaretRight size={14} color="var(--text-muted)" />
    </button>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 2px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{value}</span>
    </div>
  );
}
