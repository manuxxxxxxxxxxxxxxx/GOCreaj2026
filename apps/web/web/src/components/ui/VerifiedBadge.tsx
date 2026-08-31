import { SealCheck } from "@phosphor-icons/react";

export function VerifiedBadge({ title = "Cuenta verificada" }: { title?: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{ display: "inline-flex", alignItems: "center", color: "var(--cyan)", flexShrink: 0 }}
    >
      <SealCheck size={16} weight="fill" />
    </span>
  );
}
