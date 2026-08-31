import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CaretLeft, Moon, SignOut, Sun, type IconProps } from "@phosphor-icons/react";
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
  const { usuario, logout } = useAuth();
  const { resolvedTheme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const width = collapsed ? 76 : 240;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopNav />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside
        className="glow-mesh"
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
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", flexShrink: 0, transform: collapsed ? "rotate(180deg)" : undefined, transition: "transform var(--dur-base)" }}
          >
            <CaretLeft size={15} />
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
    </div>
  );
}
