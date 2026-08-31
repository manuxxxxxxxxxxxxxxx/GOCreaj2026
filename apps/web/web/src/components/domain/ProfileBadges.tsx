export interface ProfileBadge {
  icon: React.ReactNode;
  label: string;
  achieved: boolean;
}

/** Fila de insignias logradas del perfil. Solo se muestran las cumplidas para no saturar. */
export function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  const logradas = badges.filter((b) => b.achieved);
  if (logradas.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {logradas.map((b) => (
        <span
          key={b.label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: "var(--radius-pill)",
            background: "var(--warn-bg)",
            color: "var(--warn)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  );
}
