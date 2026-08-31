import type { EstadoPedido } from "../../lib/types";
import { CheckCircle, Clock, MagnifyingGlass, Package, Prohibit, Truck, XCircle } from "@phosphor-icons/react";

const CONFIG: Record<EstadoPedido, { label: string; bg: string; ink: string; Icon: typeof Clock; pulse?: boolean }> = {
  pendiente_confirmacion: { label: "Pendiente", bg: "var(--warn-bg)", ink: "var(--warn-ink)", Icon: Clock, pulse: true },
  preparacion: { label: "Preparando", bg: "var(--warn-bg)", ink: "var(--warn-ink)", Icon: Package, pulse: true },
  en_camino: { label: "En camino", bg: "var(--cyan-bg)", ink: "var(--cyan)", Icon: Truck, pulse: true },
  entregado: { label: "Entregado", bg: "var(--ok-bg)", ink: "var(--ok-ink)", Icon: CheckCircle },
  cancelado: { label: "Cancelado", bg: "var(--danger-bg)", ink: "var(--danger-ink)", Icon: XCircle },
  rechazado_repartidor: { label: "Rechazado", bg: "var(--danger-bg)", ink: "var(--danger-ink)", Icon: Prohibit },
};

interface Props {
  estado: EstadoPedido;
  /** preparacion && sin repartidor asignado todavía */
  buscandoRepartidor?: boolean;
}

export function StatusPill({ estado, buscandoRepartidor }: Props) {
  const base = CONFIG[estado] ?? CONFIG.pendiente_confirmacion;
  const c = buscandoRepartidor && estado === "preparacion" ? { ...base, label: "Buscando repartidor", Icon: MagnifyingGlass } : base;
  const Icon = c.Icon;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: c.bg,
        color: c.ink,
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      {c.pulse && (
        <span
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, borderRadius: "inherit", ["--pulse-color" as string]: c.ink, animation: "status-pulse 1.8s ease-out infinite" }}
        />
      )}
      <Icon size={13} weight="bold" />
      {c.label}
    </span>
  );
}
