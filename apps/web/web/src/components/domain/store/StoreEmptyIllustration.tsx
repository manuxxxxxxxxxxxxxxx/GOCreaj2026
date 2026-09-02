import type { ReactNode } from "react";

/**
 * Decorative backdrop for store-profile empty states (products/reels/live/stories).
 * Layered soft blobs behind the icon so "no content yet" reads as inviting
 * rather than a blank box -- per the redesign's "illustrated empty state" requirement.
 */
export function StoreEmptyIllustration({ icon, tone = "cyan" }: { icon: ReactNode; tone?: "cyan" | "violet" | "coral" }) {
  const glow = `var(--${tone}-glow)`;
  const bg = `var(--${tone}-bg)`;
  const fg = `var(--${tone})`;
  return (
    <div style={{ position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: bg, filter: "blur(0.5px)" }} />
      <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", background: glow, filter: "blur(6px)" }} />
      <div
        style={{
          position: "relative",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--surface-1)",
          border: `1px solid var(--border)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: fg,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {icon}
      </div>
    </div>
  );
}
