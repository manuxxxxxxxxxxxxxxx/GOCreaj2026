import type { ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "48px 20px", gap: 12 }}>
      <div
        aria-hidden="true"
        style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface-2)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 16 }}>{title}</h3>
      {description && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", maxWidth: 320 }}>{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
