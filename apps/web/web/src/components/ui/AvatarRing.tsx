import { Avatar } from "./Avatar";

interface Props {
  nombre: string;
  foto?: string | null;
  size?: number;
  /** 0–1. Si se omite, el anillo se dibuja sólido (fijo) en vez de como progreso. */
  progress?: number;
  color?: "cyan" | "violet" | "coral";
}

export function AvatarRing({ nombre, foto, size = 84, progress, color = "cyan" }: Props) {
  const ringSize = size + 10;
  const strokeWidth = 3;
  const radius = ringSize / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const dash = progress === undefined ? circumference : circumference * Math.min(Math.max(progress, 0), 1);

  return (
    <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
      <svg width={ringSize} height={ringSize} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke={`var(--${color})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray var(--dur-base, 200ms) var(--ease-out, ease)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: (ringSize - size) / 2 }}>
        <Avatar nombre={nombre} foto={foto} size={size} />
      </div>
    </div>
  );
}
