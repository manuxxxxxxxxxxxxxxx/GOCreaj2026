import { useEffect, useMemo, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { productosApi } from "../../lib/api";
import type { Municipio } from "../../lib/types";

interface Props {
  value?: string;
  onChange: (municipio: string) => void;
  compact?: boolean;
}

/** Selector de municipio utilizable sin sesión, para que un invitado vea "su zona" sin registrarse. */
export function ZonaSelector({ value, onChange, compact }: Props) {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);

  useEffect(() => {
    productosApi
      .municipiosCatalogo()
      .then((r) => setMunicipios(r.municipios))
      .catch(() => setMunicipios([]));
  }, []);

  const porDepartamento = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <MapPin size={14} weight="fill" color="var(--cyan)" style={{ flexShrink: 0 }} />
      <select
        value={value ?? ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        disabled={!municipios}
        aria-label="Elige tu zona"
        style={{
          height: compact ? 30 : 36,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          color: "var(--text-primary)",
          padding: "0 8px",
          fontSize: compact ? 12 : 12.5,
          fontWeight: 600,
          maxWidth: 220,
        }}
      >
        <option value="" disabled>
          {municipios ? "Elige tu zona…" : "Cargando…"}
        </option>
        {porDepartamento.map(([depto, ms]) => (
          <optgroup key={depto} label={depto}>
            {ms.map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
