import { Hourglass } from "@phosphor-icons/react";

export function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12, textAlign: "center" }}>
      <Hourglass size={32} color="var(--text-muted)" />
      <h2 style={{ fontSize: 17 }}>{label}</h2>
      <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>Esta pantalla está en construcción.</p>
    </div>
  );
}
