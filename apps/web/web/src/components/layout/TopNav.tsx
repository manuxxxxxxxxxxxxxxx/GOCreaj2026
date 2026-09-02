import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CaretDown,
  ChatCircleDots,
  ClockCounterClockwise,
  Gear,
  GearSix,
  Headset,
  House,
  MagnifyingGlass,
  MapPinLine,
  Megaphone,
  Moon,
  Moped,
  Package,
  ShieldCheck,
  ShoppingCart,
  SignOut,
  Storefront,
  Sun,
  UserCircle,
  VideoCamera,
  Wallet as WalletIcon,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/IconButton";
import { authApi, notificacionesApi, productosApi, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Notificacion, Producto, Tienda } from "../../lib/types";
import { relativeTime, money } from "../../lib/format";
import { registerCartTarget } from "../../lib/cartFly";
import { CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";

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

/** Igual que VENDEDOR_NAV_LINKS: un repartidor tampoco "explora" tiendas como comprador --
 * su loop diario es el panel de repartidor (Disponibles), así que va directo ahí en vez de
 * quedar escondido solo en el menú del avatar (antes era el único rol sin este atajo). */
const REPARTIDOR_NAV_LINKS: NavLink[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/repartidor", label: "Mi panel", icon: Moped },
  { to: "/reels", label: "Reels", icon: VideoCamera },
  { to: "/chat", label: "Chat", icon: ChatCircleDots },
];

const SEARCH_HISTORY_KEY = "svgo:search-history";
const MAX_SEARCH_HISTORY = 8;

function loadSearchHistory(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX_SEARCH_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(list: string[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

const MIN_SUGGEST_LEN = 2;
const SUGGEST_DEBOUNCE_MS = 320;

const DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizeText(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS_RE, "").toLowerCase().trim();
}

export function TopNav() {
  const { usuario, logout, cambiarRol } = useAuth();
  const { count } = useCart();
  const toast = useToast();
  const { resolvedTheme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [misRoles, setMisRoles] = useState<string[]>([]);
  const [cambiandoRol, setCambiandoRol] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory());
  const [suggestTiendas, setSuggestTiendas] = useState<Tienda[]>([]);
  const [suggestProductos, setSuggestProductos] = useState<Producto[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usuario) return;
    notificacionesApi
      .contador()
      .then((r) => setUnread(r.no_leidas))
      .catch(() => {});
  }, [usuario, location.pathname]);

  // Roles aprobados del usuario (comprador/vendedor/repartidor) -- si tiene más de uno,
  // el menú del avatar ofrece cambiar de rol activo sin tener que cerrar sesión. Esto ya
  // existía en la app móvil (Perfil > "Cambiar de rol"); en web faltaba por completo, así
  // que un repartidor u otro rol secundario no tenía ninguna forma de activarse.
  useEffect(() => {
    if (!usuario || usuario.rol === "admin") return;
    authApi
      .misRoles()
      .then((r) => setMisRoles(r.roles))
      .catch(() => {});
  }, [usuario?.id]);

  const cambiarRolActivo = async (rol: "comprador" | "vendedor" | "repartidor") => {
    setCambiandoRol(true);
    try {
      await cambiarRol(rol);
      setMenuOpen(false);
      navigate("/");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cambiar de rol.", "error");
    } finally {
      setCambiandoRol(false);
    }
  };

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Sugerencias en vivo: tiendas y productos que coinciden con lo tecleado,
  // con una pausa corta para no golpear la API en cada tecla.
  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN_SUGGEST_LEN) return;
    let cancelled = false;
    setSuggestLoading(true);
    const t = setTimeout(() => {
      Promise.all([
        productosApi.buscarTiendas({ q: term, limit: 4 }).catch(() => ({ tiendas: [] as Tienda[] })),
        productosApi.buscar({ q: term, limit: 5 }).catch(() => ({ productos: [] as Producto[] })),
      ]).then(([tRes, pRes]) => {
        if (cancelled) return;
        setSuggestTiendas(tRes.tiendas);
        setSuggestProductos(pRes.productos);
        setSuggestLoading(false);
      });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const suggestCategorias = useMemo(() => {
    const term = q.trim();
    if (term.length < MIN_SUGGEST_LEN) return [] as Categoria[];
    const norm = normalizeText(term);
    return (Object.keys(CATEGORIA_LABEL) as Categoria[]).filter((c) => normalizeText(CATEGORIA_LABEL[c]).includes(norm)).slice(0, 4);
  }, [q]);

  const addToHistory = (term: string) => {
    setHistory((prev) => {
      const next = [term, ...prev.filter((h) => h.toLowerCase() !== term.toLowerCase())].slice(0, MAX_SEARCH_HISTORY);
      saveSearchHistory(next);
      return next;
    });
  };

  const removeFromHistory = (term: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== term);
      saveSearchHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveSearchHistory([]);
  };

  const runSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    addToHistory(clean);
    setQ(clean);
    setSearchOpen(false);
    navigate(`/explorar?q=${encodeURIComponent(clean)}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(q);
  };

  const goToTienda = (t: Tienda) => {
    addToHistory(t.nombre);
    setSearchOpen(false);
    navigate(`/tienda/${t.id}`);
  };

  const goToProducto = (p: Producto) => {
    addToHistory(q.trim() || p.nombre);
    setSearchOpen(false);
    navigate(`/producto/${p.id}`);
  };

  const goToCategoria = (c: Categoria) => {
    addToHistory(q.trim());
    setSearchOpen(false);
    navigate(`/explorar?categoria=${encodeURIComponent(c)}`);
  };

  const term = q.trim();
  const hasSuggestions = suggestTiendas.length > 0 || suggestProductos.length > 0 || suggestCategorias.length > 0;
  const showSuggestions = term.length >= MIN_SUGGEST_LEN;
  const showHistory = term.length === 0 && history.length > 0;
  const dropdownVisible = searchOpen && (showHistory || showSuggestions);

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
        {(usuario?.rol === "vendedor" ? VENDEDOR_NAV_LINKS : usuario?.rol === "repartidor" ? REPARTIDOR_NAV_LINKS : NAV_LINKS).filter((l) => !l.requiereSesion || usuario).map((l) => {
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

      <div ref={searchRef} style={{ position: "relative", flex: 1, maxWidth: 420, marginLeft: 8 }}>
        <form onSubmit={submitSearch} role="search">
          <div style={{ position: "relative" }}>
            <MagnifyingGlass size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              type="search"
              placeholder="Busca comida, tiendas, productos…"
              aria-label="Buscar"
              autoComplete="off"
              style={{
                width: "100%",
                height: 38,
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                padding: q ? "0 34px" : "0 14px 0 34px",
                fontSize: 13.5,
                color: "var(--text-primary)",
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Borrar búsqueda"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </form>

        {dropdownVisible && (
          <div
            role="listbox"
            aria-label={showHistory ? "Búsquedas recientes" : "Sugerencias de búsqueda"}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% + 8px)",
              maxHeight: 420,
              overflowY: "auto",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              padding: 6,
              animation: "rise var(--dur-fast) var(--ease-out) both",
              zIndex: 5,
            }}
          >
            {showHistory && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 6px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                    Búsquedas recientes
                  </span>
                  <button
                    type="button"
                    onClick={clearHistory}
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Borrar todo
                  </button>
                </div>
                {history.map((h) => (
                  <div key={h} className="chat-menu-item" style={{ display: "flex", alignItems: "center", borderRadius: "var(--radius-sm)" }}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => runSearch(h)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        textAlign: "left",
                        padding: "8px 6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--text-primary)",
                      }}
                    >
                      <ClockCounterClockwise size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(h)}
                      aria-label={`Quitar "${h}" del historial`}
                      style={{
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        marginRight: 4,
                        borderRadius: "50%",
                        border: "none",
                        background: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {showSuggestions && (
              <>
                {suggestTiendas.length > 0 && (
                  <>
                    <SearchSectionLabel>Tiendas</SearchSectionLabel>
                    {suggestTiendas.map((t) => (
                      <TiendaSuggestRow key={`t-${t.id}`} tienda={t} onSelect={() => goToTienda(t)} />
                    ))}
                  </>
                )}
                {suggestProductos.length > 0 && (
                  <>
                    <SearchSectionLabel>Productos</SearchSectionLabel>
                    {suggestProductos.map((p) => (
                      <ProductoSuggestRow key={`p-${p.id}`} producto={p} onSelect={() => goToProducto(p)} />
                    ))}
                  </>
                )}
                {suggestCategorias.length > 0 && (
                  <>
                    <SearchSectionLabel>Categorías</SearchSectionLabel>
                    {suggestCategorias.map((c) => (
                      <CategoriaSuggestRow key={`c-${c}`} categoria={c} onSelect={() => goToCategoria(c)} />
                    ))}
                  </>
                )}

                {suggestLoading && !hasSuggestions && (
                  <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 12.5, color: "var(--text-muted)" }}>Buscando…</div>
                )}
                {!suggestLoading && !hasSuggestions && (
                  <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 12.5, color: "var(--text-muted)" }}>
                    Sin resultados para "{term}"
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => runSearch(term)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "10px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-2)",
                    border: "none",
                    color: "var(--cyan)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Ver todos los resultados para "{term}"
                </button>
              </>
            )}
          </div>
        )}
      </div>

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
                  minWidth: 250,
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  padding: 8,
                  animation: "rise var(--dur-fast) var(--ease-out) both",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", marginBottom: 6 }}>
                  <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre}</div>
                    {usuario.username ? (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{usuario.username}</div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.email}</div>
                    )}
                  </div>
                </div>

                <MenuLink to="/perfil" label="Mi cuenta" icon={<UserCircle size={16} />} onClick={() => setMenuOpen(false)} />
                {usuario.rol === "comprador" && <MenuLink to="/pedidos" label="Mis pedidos" icon={<Package size={16} />} onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "comprador" && <MenuLink to="/direcciones" label="Direcciones" icon={<MapPinLine size={16} />} onClick={() => setMenuOpen(false)} />}
                {usuario.rol !== "admin" && <MenuLink to="/wallet" label="Billetera" icon={<WalletIcon size={16} />} onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "repartidor" && <MenuLink to="/repartidor/entregas" label="Mis entregas" icon={<Package size={16} />} onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "vendedor" && <MenuLink to="/vendedor" label="Panel de vendedor" icon={<Storefront size={16} />} onClick={() => setMenuOpen(false)} />}
                {usuario.rol === "admin" && <MenuLink to="/admin" label="Panel de administración" icon={<Storefront size={16} />} onClick={() => setMenuOpen(false)} />}

                {misRoles.length > 1 && (
                  <>
                    <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
                    <div style={{ padding: "6px 10px 2px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Cambiar de rol</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["comprador", "vendedor", "repartidor"] as const)
                          .filter((r) => misRoles.includes(r))
                          .map((r) => {
                            const activo = usuario.rol === r;
                            const Icon = r === "vendedor" ? Storefront : r === "repartidor" ? Moped : UserCircle;
                            const label = r === "vendedor" ? "Vendedor" : r === "repartidor" ? "Repartidor" : "Comprador";
                            return (
                              <button
                                key={r}
                                onClick={() => cambiarRolActivo(r)}
                                disabled={activo || cambiandoRol}
                                style={{
                                  flex: 1,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "8px 4px",
                                  borderRadius: "var(--radius-sm)",
                                  border: `1px solid ${activo ? "var(--cyan)" : "var(--border)"}`,
                                  background: activo ? "var(--cyan-bg)" : "var(--surface-2)",
                                  color: activo ? "var(--cyan)" : "var(--text-secondary)",
                                  cursor: activo ? "default" : "pointer",
                                  opacity: cambiandoRol && !activo ? 0.6 : 1,
                                }}
                              >
                                <Icon size={15} />
                                <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}

                <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

                <MenuLink to="/perfil/configuracion" label="Configuración" icon={<GearSix size={16} />} onClick={() => setMenuOpen(false)} />
                <MenuLink to="/perfil/seguridad" label="Seguridad" icon={<ShieldCheck size={16} />} onClick={() => setMenuOpen(false)} />
                {usuario.rol !== "admin" && <MenuLink to="/soporte" label="Soporte" icon={<Headset size={16} />} onClick={() => setMenuOpen(false)} />}

                <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />

                <button
                  className="chat-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--danger)",
                  }}
                >
                  <SignOut size={16} /> Cerrar sesión
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

function SearchSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "8px 8px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
      {children}
    </div>
  );
}

function TiendaSuggestRow({ tienda, onSelect }: { tienda: Tienda; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected="false"
      onClick={onSelect}
      className="chat-menu-item"
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: 6, borderRadius: "var(--radius-sm)", border: "none", background: "none", cursor: "pointer" }}
    >
      <Avatar nombre={tienda.nombre} foto={tienda.logo} size={28} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tienda.nombre}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tienda.municipio}</div>
      </div>
      <Storefront size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
    </button>
  );
}

function ProductoSuggestRow({ producto, onSelect }: { producto: Producto; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected="false"
      onClick={onSelect}
      className="chat-menu-item"
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: 6, borderRadius: "var(--radius-sm)", border: "none", background: "none", cursor: "pointer" }}
    >
      <span style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {producto.imagen ? (
          <img src={producto.imagen} alt="" width={28} height={28} loading="lazy" style={{ objectFit: "cover", width: 28, height: 28 }} />
        ) : (
          <Package size={14} color="var(--text-muted)" />
        )}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{producto.nombre}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{producto.tienda_nombre}</div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0 }}>{money(producto.precio_oferta ?? producto.precio)}</span>
    </button>
  );
}

function CategoriaSuggestRow({ categoria, onSelect }: { categoria: Categoria; onSelect: () => void }) {
  const Icon = categoriaIcon(categoria);
  const color = categoriaColor(categoria);
  return (
    <button
      type="button"
      role="option"
      aria-selected="false"
      onClick={onSelect}
      className="chat-menu-item"
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: 6, borderRadius: "var(--radius-sm)", border: "none", background: "none", cursor: "pointer" }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={color} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{CATEGORIA_LABEL[categoria]}</span>
    </button>
  );
}

function MenuLink({ to, label, icon, onClick }: { to: string; label: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="chat-menu-item"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}
    >
      {icon && <span style={{ color: "var(--text-muted)", display: "flex" }}>{icon}</span>}
      {label}
    </Link>
  );
}
