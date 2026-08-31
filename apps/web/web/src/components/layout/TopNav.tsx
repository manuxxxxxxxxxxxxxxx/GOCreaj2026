import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CaretDown,
  ChatCircleDots,
  Gear,
  House,
  MagnifyingGlass,
  Megaphone,
  Moon,
  Package,
  ShoppingCart,
  Storefront,
  Sun,
  VideoCamera,
} from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/IconButton";
import { notificacionesApi } from "../../lib/api";
import type { Notificacion } from "../../lib/types";
import { relativeTime } from "../../lib/format";
import { registerCartTarget } from "../../lib/cartFly";

interface NavLink {
  to: string;
  label: string;
  icon: typeof House;
  requiereSesion?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/explorar", label: "Explorar", icon: Storefront },
  { to: "/reels", label: "Reels", icon: VideoCamera },
  { to: "/chat", label: "Chat", icon: ChatCircleDots, requiereSesion: true },
];

/** Vendedores navigate their store day-to-day -- "Explorar" (browsing other
 * stores as a shopper) isn't their primary loop, so it's swapped for a
 * direct link to their own panel instead of being buried in the profile menu. */
const VENDEDOR_NAV_LINKS: NavLink[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/vendedor", label: "Mi tienda", icon: Storefront },
  { to: "/reels", label: "Reels", icon: VideoCamera },
  { to: "/chat", label: "Chat", icon: ChatCircleDots },
];

export function TopNav() {
  const { usuario, logout } = useAuth();
  const { count } = useCart();
  const { resolvedTheme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usuario) return;
    notificacionesApi
      .contador()
      .then((r) => setUnread(r.no_leidas))
      .catch(() => {});
  }, [usuario, location.pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/explorar?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: "var(--z-topbar)" as unknown as number,
        display: "flex",
        alignItems: "center",
        gap: 20,
        height: 68,
        padding: "0 24px",
        background: "color-mix(in srgb, var(--surface-1) 88%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <Link to="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <img
          src={resolvedTheme === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png"}
          alt="SV[Go]"
          style={{ height: 26, width: "auto", display: "block" }}
        />
      </Link>

      <nav aria-label="Navegación principal" style={{ display: "flex", gap: 3, padding: 4, borderRadius: "var(--radius-pill)", background: "var(--surface-2)" }}>
        {(usuario?.rol === "vendedor" ? VENDEDOR_NAV_LINKS : NAV_LINKS).filter((l) => !l.requiereSesion || usuario).map((l) => {
          const active = l.to === "/" ? location.pathname === "/" : location.pathname.startsWith(l.to);
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`topnav-link${active ? " active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: "var(--radius-pill)",
                fontSize: 13.5,
                fontWeight: 600,
                color: active ? "var(--cyan-ink)" : "var(--text-secondary)",
                background: active ? "var(--cyan)" : "transparent",
              }}
            >
              <Icon size={16} weight={active ? "bold" : "regular"} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <form onSubmit={submitSearch} role="search" style={{ flex: 1, maxWidth: 420, marginLeft: 8 }}>
        <div style={{ position: "relative" }}>
          <MagnifyingGlass size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Busca comida, tiendas, productos…"
            aria-label="Buscar"
            style={{
              width: "100%",
              height: 38,
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              padding: "0 14px 0 34px",
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          />
        </div>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
        <IconButton
          icon={resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onClick={toggle}
        />
        {usuario && <NotificationsPopover unread={unread} onUnreadChange={setUnread} />}
        {usuario?.rol === "comprador" && (
          <IconButton
            ref={(el) => registerCartTarget(el)}
            icon={<ShoppingCart size={18} />}
            label="Carrito"
            badge={count}
            tone="cyan"
            onClick={() => navigate("/carrito")}
          />
        )}

        {usuario ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer" }}
            >
              <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={32} />
              <CaretDown size={13} color="var(--text-muted)" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  minWidth: 200,
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  padding: 6,
                  animation: "rise var(--dur-fast) var(--ease-out) both",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                  <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.email}</div>
                  </div>
                </div>
                <MenuLink to="/perfil" label="Mi cuenta" onClick={() => setMenuOpen(false)} />
                {usuario.rol === "comprador" && <MenuLink to="/pedidos" label="Mis pedidos" onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "repartidor" && <MenuLink to="/repartidor/entregas" label="Mis entregas" onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "vendedor" && <MenuLink to="/vendedor" label="Panel de vendedor" onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "admin" && <MenuLink to="/admin" label="Panel de administración" onClick={() => setMenuOpen(false)} />}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13.5,
                    color: "var(--danger)",
                    marginTop: 2,
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            style={{ fontSize: 13.5, fontWeight: 600, color: "var(--cyan-ink)", background: "var(--cyan)", padding: "8px 16px", borderRadius: "var(--radius-sm)" }}
          >
            Ingresar
          </Link>
        )}
      </div>
    </header>
  );
}

const NOTIF_ICONS: Record<Notificacion["tipo"], typeof Package> = {
  pedido: Package,
  chat: ChatCircleDots,
  sistema: Gear,
  promocion: Megaphone,
};

function NotificationsPopover({ unread, onUnreadChange }: { unread: number; onUnreadChange: (n: number) => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const abrir = () => {
    setOpen((o) => !o);
    if (!items) notificacionesApi.listar(1, 6).then((r) => setItems(r.notificaciones)).catch(() => setItems([]));
  };

  const marcarLeida = async (n: Notificacion) => {
    if (!n.leida) {
      await notificacionesApi.marcarLeida(n.id);
      setItems((prev) => prev?.map((it) => (it.id === n.id ? { ...it, leida: 1 } : it)) ?? null);
      onUnreadChange(Math.max(0, unread - 1));
    }
    setOpen(false);
    if (n.tipo === "pedido" && n.referencia_id) navigate(`/pedidos/${n.referencia_id}`);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconButton icon={<Bell size={18} />} label="Notificaciones" badge={unread} onClick={abrir} />
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: 340,
            maxHeight: 420,
            display: "flex",
            flexDirection: "column",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            animation: "rise var(--dur-fast) var(--ease-out) both",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13.5 }}>Notificaciones</div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {items === null ? (
              <div style={{ padding: 20, textAlign: "center", fontSize: 12.5, color: "var(--text-muted)" }}>Cargando…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: "var(--text-muted)" }}>No tienes notificaciones</div>
            ) : (
              items.map((n) => {
                const Icon = NOTIF_ICONS[n.tipo] ?? Bell;
                return (
                  <button
                    key={n.id}
                    role="menuitem"
                    onClick={() => marcarLeida(n)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: n.leida ? "transparent" : "var(--cyan-bg)",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", flexShrink: 0 }}>
                      <Icon size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: n.leida ? 500 : 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.titulo}</div>
                      {n.cuerpo && (
                        <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.cuerpo}</div>
                      )}
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(n.created_at)}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/notificaciones");
            }}
            style={{
              padding: "10px 14px",
              background: "var(--surface-2)",
              border: "none",
              borderTop: "1px solid var(--border)",
              color: "var(--cyan)",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Ver todo
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      style={{ display: "block", padding: "9px 10px", borderRadius: "var(--radius-sm)", fontSize: 13.5, color: "var(--text-primary)" }}
    >
      {label}
    </Link>
  );
}
