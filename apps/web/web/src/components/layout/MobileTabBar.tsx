import { Link, useLocation } from "react-router-dom";
import { ChatCircleDots, ClockCounterClockwise, House, Moped, Storefront, UserCircle, VideoCamera, type IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { useAuth } from "../../context/AuthContext";

interface TabDef {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  requiereSesion?: boolean;
}

const COMPRADOR_TABS: TabDef[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/explorar", label: "Explorar", icon: Storefront },
  { to: "/reels", label: "Reels", icon: VideoCamera },
  { to: "/chat", label: "Chat", icon: ChatCircleDots, requiereSesion: true },
];

const VENDEDOR_TABS: TabDef[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/vendedor", label: "Mi tienda", icon: Storefront },
  { to: "/reels", label: "Reels", icon: VideoCamera },
  { to: "/chat", label: "Chat", icon: ChatCircleDots },
];

const REPARTIDOR_TABS: TabDef[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/repartidor", label: "Mi panel", icon: Moped },
  { to: "/repartidor/historial", label: "Historial", icon: ClockCounterClockwise },
  { to: "/chat", label: "Chat", icon: ChatCircleDots },
];

/**
 * Fixed bottom tab bar shown only below --bp-mobile (768px) -- this is what
 * makes the site read as "the app" on a phone instead of a shrunk desktop
 * page. Mirrors the same 4 tabs TopNav swaps in for each role, plus a 5th
 * "Perfil"/"Ingresar" tab since the avatar dropdown is fiddlier to reach
 * with a thumb than a dedicated tab.
 */
export function MobileTabBar() {
  const { usuario } = useAuth();
  const location = useLocation();

  const tabs = usuario?.rol === "vendedor" ? VENDEDOR_TABS : usuario?.rol === "repartidor" ? REPARTIDOR_TABS : COMPRADOR_TABS;
  const visibleTabs = tabs.filter((t) => !t.requiereSesion || usuario);

  const perfilTab: TabDef = usuario
    ? { to: "/perfil", label: "Perfil", icon: UserCircle }
    : { to: "/login", label: "Ingresar", icon: UserCircle };

  const allTabs = [...visibleTabs, perfilTab];

  // El más específico gana (p. ej. "/repartidor/historial" sobre "/repartidor") -- si cada
  // tab se marcara activo de forma independiente con startsWith, un sub-ruta como
  // "/repartidor/historial" encendería a la vez su propio tab y el de "/repartidor".
  const activeTo = [...allTabs]
    .sort((a, b) => b.to.length - a.to.length)
    .find((t) => (t.to === "/" ? location.pathname === "/" : location.pathname === t.to || location.pathname.startsWith(`${t.to}/`)))?.to;

  return (
    <nav aria-label="Navegación principal (móvil)" className="mobile-tab-bar">
      {allTabs.map((t) => {
        const active = t.to === activeTo;
        const Icon = t.icon;
        return (
          <Link key={t.to} to={t.to} className={`mobile-tab-bar-item${active ? " active" : ""}`}>
            <Icon size={22} weight={active ? "fill" : "regular"} />
            <span>{t.label}</span>
          </Link>
        );
      })}

      <style>{`
        .mobile-tab-bar {
          display: none;
        }
        @media (max-width: 767px) {
          .mobile-tab-bar {
            display: flex;
            align-items: stretch;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: var(--z-bottombar);
            height: calc(58px + env(safe-area-inset-bottom));
            padding-bottom: env(safe-area-inset-bottom);
            background: color-mix(in srgb, var(--surface-1) 92%, transparent);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-top: 1px solid var(--border);
          }
        }
        .mobile-tab-bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: var(--text-muted);
          font-size: 10.5px;
          font-weight: 700;
        }
        .mobile-tab-bar-item.active {
          color: var(--cyan);
        }
      `}</style>
    </nav>
  );
}
