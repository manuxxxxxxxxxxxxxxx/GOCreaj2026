import type { CSSProperties } from "react";

export function Skeleton({ width = "100%", height = 16, radius = "var(--radius-sm)", style }: { width?: number | string; height?: number | string; radius?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg, var(--surface-2) 0%, var(--surface-3) 50%, var(--surface-2) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
