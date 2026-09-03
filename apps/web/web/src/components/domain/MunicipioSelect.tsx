import { useEffect, useMemo, useState } from "react";
import { productosApi } from "../../lib/api";
import type { Municipio } from "../../lib/types";

interface Props {
  value: string;
  onChange: (municipio: string) => void;
}

/** Selector de municipio (dropdown) respaldado por el catálogo de 39 municipios de El
 * Salvador -- antes era un campo de texto libre donde cualquiera podía escribir lo que
 * fuera. Mismo catálogo/agrupación por departamento que `MunicipioPicker` en móvil. */
export function MunicipioSelect({ value, onChange }: Props) {
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);

  useEffect(() => {
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
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
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Municipio</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!municipios}
        style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 12px", fontSize: 14, background: "var(--surface-1)", color: "var(--text-primary)" }}
      >
        <option value="" disabled>
          {municipios ? "Elige un municipio…" : "Cargando…"}
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
