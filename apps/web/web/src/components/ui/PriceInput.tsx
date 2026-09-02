import { useState } from "react";

const MAX_CENTAVOS = 999999; // $9,999.99 -- mismo techo que MAX_PRECIO_PRODUCTO en el backend

function formatearCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Entrada de precio "estilo caja registradora": cada dígito entra por la derecha y
 * empuja los centavos hacia la izquierda (escribir "1" -> $0.01, "12" -> $0.12,
 * "123" -> $1.23), en vez de un campo numérico libre donde es fácil teclear un cero de
 * más y publicar un precio irreal. El valor real vive en centavos (entero) para no
 * arrastrar errores de redondeo de punto flotante mientras se escribe. */
export function PriceInput({ label, value, onChange, error }: { label: string; value: number; onChange: (dolares: number) => void; error?: string }) {
  const [focused, setFocused] = useState(false);
  const centavos = Math.round(value * 100);

  const onChangeText = (texto: string) => {
    const soloDigitos = texto.replace(/\D/g, "");
    const nuevosCentavos = Math.min(MAX_CENTAVOS, parseInt(soloDigitos || "0", 10));
    onChange(nuevosCentavos / 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
      <div
        style={{
          height: 54,
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${error ? "var(--danger)" : focused ? "var(--cyan)" : "var(--border)"}`,
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
        }}
      >
        <span style={{ fontSize: 20, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginRight: 2 }}>$</span>
        <input
          value={formatearCentavos(centavos)}
          onChange={(e) => onChangeText(e.target.value)}
          inputMode="numeric"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)", padding: 0 }}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
