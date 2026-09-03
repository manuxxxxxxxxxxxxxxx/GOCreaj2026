import { useMemo, useState } from "react";
import { Check, MagnifyingGlass } from "@phosphor-icons/react";
import { CATEGORIAS, CATEGORIA_LABEL, categoriaColor, categoriaIcon } from "../../lib/categoryIcons";
import { Input } from "../ui/Input";

const PAGE_SIZE = 24;

/** Selector de categorías con selección múltiple y buscador -- son 129 categorías, así que
 * sin búsqueda se muestran las seleccionadas primero + una vista previa que crece de a poco
 * con "Ver más" en vez de saltar directo a las 129. Espejo de MultiCategoryPicker.tsx móvil. */
export function MultiCategoryPicker({ value, onChange }: { value: string[]; onChange: (c: string[]) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizada = busqueda.trim().toLowerCase();

  const ordenadas = useMemo(() => {
    const seleccionadas = CATEGORIAS.filter((c) => value.includes(c));
    const resto = CATEGORIAS.filter((c) => !value.includes(c));
    return [...seleccionadas, ...resto];
  }, [value]);

  const visibles = useMemo(() => {
    if (normalizada) return CATEGORIAS.filter((c) => CATEGORIA_LABEL[c].toLowerCase().includes(normalizada));
    return ordenadas.slice(0, visibleCount);
  }, [normalizada, ordenadas, visibleCount]);

  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);

  const restantes = CATEGORIAS.length - visibleCount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Input label="Buscar categoría" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="ej. panadería, ropa, mascotas..." icon={<MagnifyingGlass size={16} color="var(--text-muted)" />} />
      {value.length > 0 && (
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          {value.length} categoría{value.length !== 1 ? "s" : ""} seleccionada{value.length !== 1 ? "s" : ""}
        </span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {visibles.map((c) => {
          const active = value.includes(c);
          const color = categoriaColor(c);
          const Icon = categoriaIcon(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: "var(--radius-pill)",
                border: `1px solid ${active ? color : "var(--border)"}`,
                background: active ? `${color}29` : "var(--surface-2)",
                cursor: "pointer",
              }}
            >
              {active ? <Check size={13} weight="bold" color={color} /> : <Icon size={13} weight="regular" color="var(--text-secondary)" />}
              <span style={{ fontSize: 12, fontWeight: 600, color: active ? color : "var(--text-secondary)" }}>{CATEGORIA_LABEL[c]}</span>
            </button>
          );
        })}
        {visibles.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Sin resultados para "{busqueda}"</span>}
      </div>
      {!normalizada && restantes > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => Math.min(CATEGORIAS.length, n + PAGE_SIZE))}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, alignSelf: "flex-start" }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cyan)" }}>Ver más ({Math.min(restantes, PAGE_SIZE)} más)</span>
        </button>
      )}
    </div>
  );
}
