interface Props {
  label?: string;
  value: string;
  onChange: (digits: string) => void;
  error?: string;
  hint?: string;
}

/** Strips everything but digits and keeps at most the last 8 -- callers may
 * pass in a previously-saved value that still has a "+503 " prefix, dashes,
 * or spaces from before this component existed. */
function toLocalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 8 ? digits.slice(-8) : digits;
}

/** El Salvador only has one calling code and 8-digit local numbers, so the
 * prefix is fixed chrome, not editable text -- there's nothing else to select. */
export function PhoneInput({ label = "Teléfono", value, onChange, error, hint }: Props) {
  const digits = toLocalDigits(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 44,
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          background: "var(--surface-1)",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            padding: "0 12px",
            background: "var(--surface-2)",
            color: "var(--text-secondary)",
            fontSize: 15,
            fontWeight: 600,
            borderRight: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          +503
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={digits}
          onChange={(e) => onChange(toLocalDigits(e.target.value))}
          placeholder="7000 0000"
          maxLength={8}
          aria-invalid={!!error}
          style={{ flex: 1, height: "100%", border: "none", outline: "none", background: "transparent", color: "var(--text-primary)", padding: "0 14px", fontSize: 15, minWidth: 0 }}
        />
      </div>
      {error ? (
        <span role="alert" style={{ fontSize: 12.5, color: "var(--danger)" }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{hint}</span>
      ) : null}
    </div>
  );
}
