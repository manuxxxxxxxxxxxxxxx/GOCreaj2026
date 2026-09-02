import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { CATEGORIAS, CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";
import { Input } from "../ui/Input";

const PREVIEW_COUNT = 12;

/** Selector de categoría con buscador — son 129 categorías, muy largo para un <select> plano.
 * Sin búsqueda muestra una vista previa (con la seleccionada siempre visible) + "Mostrar todas". */
export function CategoryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const normalizada = busqueda.trim().toLowerCase();

  const visibles = useMemo(() => {
    if (normalizada) return CATEGORIAS.filter((c) => CATEGORIA_LABEL[c].toLowerCase().includes(normalizada));
    if (mostrarTodas) return CATEGORIAS;
    const resto = CATEGORIAS.filter((c) => c !== value);
    return (CATEGORIAS.includes(value as Categoria) ? [value as Categoria, ...resto] : resto).slice(0, PREVIEW_COUNT);
  }, [normalizada, mostrarTodas, value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Input label="Buscar categoría" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="ej. panadería, ropa, mascotas..." icon={<MagnifyingGlass size={16} color="var(--text-muted)" />} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {visibles.map((c) => {
          const active = value === c;
          const color = categoriaColor(c);
          const Icon = categoriaIcon(c);
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
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
              <Icon size={13} weight={active ? "fill" : "regular"} color={active ? color : "var(--text-secondary)"} />
              <span style={{ fontSize: 12, fontWeight: 600, color: active ? color : "var(--text-secondary)" }}>{CATEGORIA_LABEL[c]}</span>
            </button>
          );
        })}
        {visibles.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Sin resultados para "{busqueda}"</span>}
      </div>
      {!normalizada && !mostrarTodas && (
        <button onClick={() => setMostrarTodas(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, alignSelf: "flex-start" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cyan)" }}>Mostrar todas ({CATEGORIAS.length})</span>
        </button>
      )}
    </div>
  );
}
