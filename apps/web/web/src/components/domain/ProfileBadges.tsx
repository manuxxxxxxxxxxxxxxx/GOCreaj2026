import { useState } from "react";
import { Trophy } from "@phosphor-icons/react";
import { Sheet } from "../ui/Sheet";

export interface ProfileBadge {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  accent?: "cyan" | "violet" | "coral";
  /** Texto extra para el tooltip (ej. "Se reinicia cada mes"). */
  nota?: string;
}

/** Insignia individual dentro de la lista del sheet -- ya no como anillo suelto (antes se
 * mostraba una por logro, todas juntas en la cabecera del perfil, y se veía como un
 * amontonamiento de trofeos repetidos). */
function BadgeRow({ icon, label, current, target, accent = "cyan", nota }: ProfileBadge) {
  const lograda = current >= target;
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  const estado = lograda ? "¡Lograda!" : `Faltan ${target - current}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: lograda ? `var(--${accent}-bg)` : "var(--surface-2)", color: `var(--${accent})` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: lograda ? "var(--ok)" : "var(--text-muted)", marginTop: 1 }}>{estado}</div>
        {nota && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{nota}</div>}
        {!lograda && (
          <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct * 100}%`, borderRadius: 2, background: `var(--${accent})`, transition: "width var(--dur-slow) var(--ease-out)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Un único indicador compacto (no un trofeo por logro) que resume el progreso de rol --
 * al hacer clic abre el detalle completo en un sheet. */
export function ProfileBadges({ badges, size = 44, roleLabel }: { badges: ProfileBadge[]; size?: number; roleLabel?: string }) {
  const [abierto, setAbierto] = useState(false);
  if (badges.length === 0) return null;

  const logradas = badges.filter((b) => b.current >= b.target).length;
  const siguiente = badges.find((b) => b.current < b.target) ?? badges[badges.length - 1];
  const pct = logradas === badges.length ? 1 : siguiente.target > 0 ? Math.min(1, siguiente.current / siguiente.target) : 0;
  const accent = siguiente.accent ?? "cyan";
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label={`Logros: ${logradas} de ${badges.length}`}
        style={{ position: "relative", width: size, height: size, flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(--${accent})`} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset var(--dur-slow) var(--ease-out)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: `var(--${accent})` }}>
          <Trophy size={size * 0.4} weight="fill" />
        </div>
        <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", background: "var(--surface-1)", border: "1.5px solid var(--surface-2)", borderRadius: "var(--radius-pill)", padding: "1px 5px", fontSize: 9, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
          {logradas}/{badges.length}
        </div>
      </button>

      <Sheet open={abierto} onClose={() => setAbierto(false)} title={roleLabel ? `Logros de ${roleLabel.toLowerCase()}` : "Logros"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 4 }}>
          {badges.map((b) => (
            <BadgeRow key={b.label} {...b} />
          ))}
        </div>
      </Sheet>
    </>
  );
}
