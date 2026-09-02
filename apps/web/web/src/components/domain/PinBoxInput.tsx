import { useRef } from "react";

const LARGO = 6;

/** Entrada de PIN estilo "casillas" (una por dígito) en vez de un campo de texto plano --
 * un <input> real e invisible recibe el foco/teclado y dibuja el valor sobre las casillas
 * visibles debajo, así el borrado/pegado/flechas siguen funcionando como en cualquier
 * input nativo sin tener que manejar el foco entre 6 inputs por separado. */
export function PinBoxInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const digitos = value.replace(/\D/g, "").slice(0, LARGO);

  return (
    <div onClick={() => inputRef.current?.focus()} style={{ display: "flex", gap: 8, justifyContent: "center", cursor: "text", position: "relative" }}>
      {Array.from({ length: LARGO }).map((_, i) => {
        const lleno = i < digitos.length;
        const activo = i === digitos.length;
        return (
          <div
            key={i}
            style={{
              width: 42,
              height: 50,
              borderRadius: "var(--radius-sm)",
              border: `1.5px solid ${activo ? "var(--cyan)" : lleno ? "var(--border-strong)" : "var(--border)"}`,
              background: "var(--surface-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {digitos[i] ?? ""}
          </div>
        );
      })}
      <input
        ref={inputRef}
        value={digitos}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, LARGO))}
        inputMode="numeric"
        maxLength={LARGO}
        autoFocus
        aria-label="PIN de 6 dígitos"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
      />
    </div>
  );
}
