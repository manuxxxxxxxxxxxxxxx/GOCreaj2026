import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: number;
  active?: boolean;
  badge?: number | string;
  pulse?: boolean;
  tone?: "default" | "cyan";
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, size = 38, active, badge, pulse, tone = "default", style, ...rest },
  ref,
) {
  const showBadge = badge !== undefined && badge !== null && badge !== 0 && badge !== "0";
  const [popping, setPopping] = useState(false);
  const prevBadge = useRef(badge);

  useEffect(() => {
    if (badge !== prevBadge.current && badge) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 380);
      prevBadge.current = badge;
      return () => clearTimeout(t);
    }
    prevBadge.current = badge;
  }, [badge]);

  return (
    <button
      ref={ref}
      aria-label={label}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--cyan-bg)" : "var(--surface-2)",
        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
        color: active || tone === "cyan" ? "var(--cyan)" : "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-base)",
        flexShrink: 0,
        ...style,
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
      onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      {...rest}
    >
      {icon}
      {pulse && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "inherit",
            border: "2px solid var(--cyan)",
            animation: "icon-pulse 2s ease-in-out infinite",
          }}
        />
      )}
      {showBadge && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 17,
            height: 17,
            padding: "0 4px",
            borderRadius: "var(--radius-pill)",
            background: "var(--cyan)",
            color: "var(--cyan-ink)",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--bg-page)",
            animation: popping ? "badge-pop 0.38s var(--ease-spring)" : undefined,
          }}
        >
          {typeof badge === "number" && badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
});
