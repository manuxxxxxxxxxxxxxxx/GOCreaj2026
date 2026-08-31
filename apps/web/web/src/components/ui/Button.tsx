import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /** Marks this as the one hero CTA on screen -- adds a slow shine sweep.
   * Use on at most one button per screen. */
  hero?: boolean;
}

const SIZE_STYLES: Record<Size, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: "0 12px", fontSize: 13, height: 34 },
  md: { padding: "0 18px", fontSize: 14, height: 42 },
  lg: { padding: "0 24px", fontSize: 15, height: 50 },
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, hero, disabled, children, style, className, ...rest },
  ref,
) {
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--cyan)", color: "var(--cyan-ink)", border: "1px solid transparent", boxShadow: isDisabled ? undefined : "var(--glow-cyan-sm)" }
      : variant === "danger"
        ? { background: "var(--danger)", color: "#fff", border: "1px solid transparent" }
        : variant === "secondary"
          ? { background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }
          : { background: "transparent", color: "var(--text-primary)", border: "1px solid transparent" };

  const showSweep = hero && variant === "primary" && !isDisabled;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        borderRadius: "var(--radius-sm)",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        overflow: "hidden",
        transition: `transform var(--dur-fast) var(--ease-out), background var(--dur-base) var(--ease-out), opacity var(--dur-base), box-shadow var(--dur-base)`,
        width: fullWidth ? "100%" : undefined,
        ...s,
        ...variantStyle,
        ...style,
      }}
      onPointerDown={(e) => {
        if (!isDisabled) e.currentTarget.style.transform = "scale(0.97)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      {...rest}
    >
      {showSweep && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -20,
            bottom: -20,
            width: 60,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            transform: "translateX(-140%) skewX(-14deg)",
            animation: "shine-sweep 2.6s ease-in-out 1.2s infinite",
            pointerEvents: "none",
          }}
        />
      )}
      {loading ? <span className="spinner" aria-hidden="true" /> : children}
      {loading && <span className="sr-only">Cargando</span>}
    </button>
  );
});
