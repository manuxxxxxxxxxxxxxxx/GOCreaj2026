import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CaretLeft, List, Moon, SignOut, Sun, X, type IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar } from "../ui/Avatar";
import { TopNav } from "./TopNav";

const TOPNAV_HEIGHT = 68;

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  end?: boolean;
}

export interface SidebarSection {
  label: string;
  items: SidebarNavItem[];
}

interface Props {
  brand: string;
  sections: SidebarSection[];
  children: ReactNode;
}

export function SidebarLayout({ sections, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usuario, logout } = useAuth();
  const { resolvedTheme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const width = collapsed ? 76 : 240;

  // Al navegar (tocar un link del drawer en móvil/tablet) se cierra solo -- si
  // se quedara abierto, taparía la página nueva hasta que el usuario lo cerrara
  // a mano, y en desktop este mismo estado nunca se activa (no hay botón que lo
  // ponga en true ahí).
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // El drawer siempre se abre expandido (con etiquetas) -- "collapsed" es un
  // atajo de escritorio para ganar espacio horizontal, algo que no aplica
  // dentro de un overlay. Sin esto, si alguien colapsó la sidebar en escritorio
  // y luego encoge la ventana sin recargar, el drawer abriría solo con íconos.
  useEffect(() => {
    if (mobileOpen) setCollapsed(false);
  }, [mobileOpen]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopNav />
      {/* Bajo 1024px la sidebar fija no cabe junto al contenido -- este botón
          la abre como un drawer superpuesto en su lugar. */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        style={{
          display: "none",
          alignItems: "center",
          gap: 8,
          margin: "12px 16px 0",
          padding: "8px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        <List size={16} weight="bold" /> Menú
      </button>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
        <aside
        className={`glow-mesh sidebar-aside${mobileOpen ? " open" : ""}`}
        style={{
          width,
          flexShrink: 0,
          background: "var(--surface-1)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "18px 12px",
          transition: "width var(--dur-base) var(--ease-out)",
          position: "sticky",
          top: TOPNAV_HEIGHT,
          height: `calc(100vh - ${TOPNAV_HEIGHT}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", marginBottom: 22 }}>
          <button
            onClick={() => navigate("/")}
            aria-label="Volver"
            className="sidebar-back-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 700,
              padding: "6px 4px",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
            }}
          >
            <ArrowLeft size={16} weight="bold" style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Volver</span>}
          </button>
          <button
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            onClick={() => setCollapsed((c) => !c)}
            className="sidebar-collapse-btn"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", flexShrink: 0, transform: collapsed ? "rotate(180deg)" : undefined, transition: "transform var(--dur-base)" }}
          >
            <CaretLeft size={15} />
          </button>
          <button
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="sidebar-close-btn"
            style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 }}
          >
            <X size={17} weight="bold" />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map((section) => (
            <div key={section.label} style={{ marginBottom: 12 }}>
              {!collapsed && (
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, color: "var(--text-muted)", padding: "10px 10px 6px" }}>
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: active ? "var(--cyan)" : "var(--text-secondary)",
                      background: active ? "var(--cyan-bg)" : "transparent",
                      justifyContent: collapsed ? "center" : "flex-start",
                    }}
                  >
                    <Icon size={17} weight={active ? "bold" : "regular"} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={toggle}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", justifyContent: collapsed ? "center" : "flex-start" }}
          >
            {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            {!collapsed && <span>{resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px" }}>
            <Avatar nombre={usuario?.nombre ?? ""} foto={usuario?.foto_perfil} size={30} />
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario?.nombre}</div>
              </div>
            )}
            <button
              aria-label="Cerrar sesión"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </main>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          /* La sidebar fija (240px expandida / 76px colapsada) no cabe junto al
             contenido en tablet/móvil -- se convierte en un drawer que entra
             deslizando desde la izquierda sobre un fondo oscuro, en vez de
             empujar o recortar la página. */
          .sidebar-mobile-toggle {
            display: flex !important;
          }
          .sidebar-aside {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            width: 280px !important;
            max-width: 82vw;
            z-index: var(--z-sheet);
            transform: translateX(-100%);
            transition: transform var(--dur-base) var(--ease-out);
            box-shadow: var(--shadow-lg);
          }
          .sidebar-aside.open {
            transform: translateX(0);
          }
          .sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(8, 11, 20, 0.55);
            z-index: calc(var(--z-sheet) - 1);
            animation: fade-in var(--dur-fast) var(--ease-out) both;
          }
          /* El botón de colapsar es un atajo de escritorio (icon-only para ganar
             espacio horizontal) -- en el drawer siempre se ve expandido, y en su
             lugar hay una X para cerrarlo. */
          .sidebar-collapse-btn {
            display: none !important;
          }
          .sidebar-close-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
