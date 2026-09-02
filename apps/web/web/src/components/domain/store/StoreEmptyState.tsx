import type { ReactNode } from "react";
import { Button } from "../../ui/Button";
import { StoreEmptyIllustration } from "./StoreEmptyIllustration";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "cyan" | "violet" | "coral";
  compact?: boolean;
}

/** Illustrated empty state for store-profile modules (products, reels, live, stories). */
export function StoreEmptyState({ icon, title, description, actionLabel, onAction, tone = "cyan", compact }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: compact ? "22px 16px" : "40px 20px", gap: 10 }}>
      <StoreEmptyIllustration icon={icon} tone={tone} />
      <h3 style={{ fontSize: compact ? 13.5 : 15 }}>{title}</h3>
      {description && <p style={{ fontSize: 12.5, color: "var(--text-secondary)", maxWidth: 300 }}>{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction} style={{ marginTop: 4 }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
