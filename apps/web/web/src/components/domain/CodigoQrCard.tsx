import { QRCodeSVG } from "qrcode.react";

/** Tarjeta de "generar" del flujo logístico (ver DESIGN.md "Flujo logístico"): un QR real
 * de un solo uso + su PIN de 6 dígitos como respaldo. Nunca se combina con la UI de
 * "escanear" (ver QrScanBox) en la misma pantalla para el mismo rol. */
export function CodigoQrCard({ token, pin, mensaje }: { token: string; pin: string; mensaje: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{mensaje}</p>
      <div style={{ background: "#fff", padding: 18, borderRadius: "var(--radius-lg)" }}>
        <QRCodeSVG value={token} size={180} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>o con el PIN</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div className="tabular" style={{ fontSize: 32, fontFamily: "var(--font-mono)", fontWeight: 800, letterSpacing: "0.3em", color: "var(--text-primary)" }}>{pin}</div>
    </div>
  );
}
