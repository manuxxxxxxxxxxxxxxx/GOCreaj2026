import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import { CartFlyOverlay } from "../ui/CartFlyOverlay";

// Explorar/Reels/Chat use their own fixed, full-viewport layout below the
// TopNav (a map, a video feed, a message thread) -- a footer would either be
// invisible behind them or fight their internal scrolling, so it's skipped there.
const SIN_FOOTER = ["/explorar", "/reels", "/chat"];

export function PublicLayout() {
  const location = useLocation();
  const ocultarFooter = SIN_FOOTER.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  return (
    <div className="glow-mesh public-layout-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav />
      <div className="public-layout-content" style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 24px 40px", width: "100%", flex: 1 }}>
        <Outlet />
      </div>
      {!ocultarFooter && <Footer />}
      <MobileTabBar />
      <CartFlyOverlay />

      <style>{`
        /* Explorar/Reels/Chat manage their own full-viewport scroll region (map,
           video feed, thread) -- padding them here would just add dead space
           below their own internal fixed layout, so only the bottom tab bar's
           clearance is added, not the page-content padding used elsewhere. */
        @media (max-width: 767px) {
          .public-layout-shell {
            padding-bottom: calc(58px + env(safe-area-inset-bottom));
          }
          .public-layout-content {
            padding: 16px 16px 24px;
          }
        }
      `}</style>
    </div>
  );
}
