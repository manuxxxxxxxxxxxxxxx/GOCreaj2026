function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

interface Props {
  nombre: string;
  foto?: string | null;
  size?: number;
  online?: boolean;
}

export function Avatar({ nombre, foto, size = 40, online }: Props) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {foto ? (
        <img
          src={foto}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ borderRadius: "50%", objectFit: "cover", width: size, height: size, border: "1px solid var(--border)" }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--cyan-bg)",
            color: "var(--cyan)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: size * 0.38,
          }}
        >
          {initials(nombre)}
        </div>
      )}
      {online !== undefined && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: "50%",
            background: online ? "var(--ok)" : "var(--text-muted)",
            border: "2px solid var(--surface-1)",
          }}
        />
      )}
    </div>
  );
}
