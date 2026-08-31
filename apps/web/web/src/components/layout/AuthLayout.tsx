import type { ReactNode } from "react";

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h1 style={{ fontSize: 23, marginBottom: 7, letterSpacing: "-0.01em" }}>{title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.45, color: "var(--text-secondary)", marginBottom: 24 }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
