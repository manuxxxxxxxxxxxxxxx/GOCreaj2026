import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { CaretLeft, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "../../context/ThemeContext";
import { IconButton } from "../ui/IconButton";
import { EL_SALVADOR_OUTLINE_D, EL_SALVADOR_VIEWBOX } from "../../lib/elSalvadorGeo";

/** San Salvador dentro del viewBox 1080x600 de EL_SALVADOR_OUTLINE_D. */
const SAN_SALVADOR_PCT = { left: (418.3 / 1080) * 100, top: (309.7 / 600) * 100 };

/** Marca de agua temática (silueta de El Salvador + pulso en San Salvador) --
 * refuerza "hyperlocal delivery en El Salvador" sin competir con el formulario. */
function AuthMapWatermark() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(900px, 130vw)",
          aspectRatio: "1080 / 600",
        }}
      >
        <svg viewBox={EL_SALVADOR_VIEWBOX} width="100%" height="100%" style={{ opacity: 0.07 }}>
          <path d={EL_SALVADOR_OUTLINE_D} fill="var(--text-primary)" />
        </svg>
        <span
          style={{
            position: "absolute",
            left: `${SAN_SALVADOR_PCT.left}%`,
            top: `${SAN_SALVADOR_PCT.top}%`,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--cyan)",
            transform: "translate(-50%, -50%)",
            animation: "status-pulse 2.2s ease-out infinite",
            ["--pulse-color" as string]: "var(--cyan)",
          }}
        />
      </div>
    </div>
  );
}

export function AuthShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, toggle } = useTheme();

  return (
    <div className="glow-mesh" style={{ minHeight: "100vh", position: "relative" }}>
      <AuthMapWatermark />
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => navigate("/")}
        aria-label="Volver al inicio"
        className="auth-back-btn"
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: "var(--z-topbar)" as unknown as number,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "color-mix(in srgb, var(--surface-1) 88%, transparent)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-pill)",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 13,
          fontWeight: 600,
          padding: "9px 16px 9px 12px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <CaretLeft size={16} weight="bold" className="auth-back-caret" />
        Volver
      </motion.button>

      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "fixed", top: 20, right: 20, zIndex: "var(--z-topbar)" as unknown as number }}
      >
        <IconButton
          icon={resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onClick={toggle}
          style={{ background: "color-mix(in srgb, var(--surface-1) 88%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-sm)" }}
        />
      </motion.div>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", position: "relative", zIndex: 1 }}>
        <motion.img
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          src={resolvedTheme === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png"}
          alt="SV[Go]"
          style={{ height: 34, width: "auto", marginBottom: 28 }}
        />
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 36, scale: 0.9, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: -18, scale: 0.96, rotate: 1 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", display: "flex", justifyContent: "center" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </MotionConfig>
      </div>
    </div>
  );
}
