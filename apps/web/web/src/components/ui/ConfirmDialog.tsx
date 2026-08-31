import { WarningCircle } from "@phosphor-icons/react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger, loading, onConfirm, onCancel }: Props) {
  return (
    <Sheet open={open} onClose={onCancel} maxWidth={380}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, paddingTop: 8 }}>
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: danger ? "var(--danger-bg)" : "var(--cyan-bg)",
            color: danger ? "var(--danger)" : "var(--cyan)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WarningCircle size={26} weight="bold" />
        </div>
        <h3 style={{ fontSize: 17 }}>{title}</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{description}</p>
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
