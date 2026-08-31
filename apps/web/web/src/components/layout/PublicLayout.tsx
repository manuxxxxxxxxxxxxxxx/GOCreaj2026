import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { CartFlyOverlay } from "../ui/CartFlyOverlay";

// Explorar/Reels/Chat use their own fixed, full-viewport layout below the
// TopNav (a map, a video feed, a message thread) -- a footer would either be
// invisible behind them or fight their internal scrolling, so it's skipped there.
const SIN_FOOTER = ["/explorar", "/reels", "/chat"];

export function PublicLayout() {
  const location = useLocation();
  const ocultarFooter = SIN_FOOTER.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  return (
    <div className="glow-mesh" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav />
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 24px 40px", width: "100%", flex: 1 }}>
        <Outlet />
      </div>
      {!ocultarFooter && <Footer />}
      <CartFlyOverlay />
    </div>
  );
}
