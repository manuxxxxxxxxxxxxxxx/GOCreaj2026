import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MagnifyingGlassIcon } from "phosphor-react-native";
import { CATEGORIAS, CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";
import { Input } from "../ui/Input";
import { useTheme } from "../../theme/ThemeContext";

const PREVIEW_COUNT = 12;

/** Selector de categoría con buscador — son 129 categorías, muy largo para mostrarlas todas de una.
 * Sin búsqueda muestra una vista previa (con la seleccionada siempre visible) + "Mostrar todas". */
export function CategoryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { tokens } = useTheme();
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
    <View style={{ gap: 10 }}>
      <Input label="Buscar categoría" value={busqueda} onChangeText={setBusqueda} placeholder="ej. panadería, ropa, mascotas..." icon={<MagnifyingGlassIcon size={16} color={tokens.textMuted} />} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {visibles.map((c) => {
          const active = value === c;
          const color = categoriaColor(c);
          const Icon = categoriaIcon(c);
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? color : tokens.border,
                backgroundColor: active ? `${color}29` : tokens.surface2,
              }}
            >
              <Icon size={13} weight={active ? "fill" : "regular"} color={active ? color : tokens.textSecondary} />
              <Text style={{ fontSize: 12, color: active ? color : tokens.textSecondary, fontFamily: "Inter_600SemiBold" }}>{CATEGORIA_LABEL[c]}</Text>
            </Pressable>
          );
        })}
        {visibles.length === 0 && <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>Sin resultados para "{busqueda}"</Text>}
      </View>
      {!normalizada && !mostrarTodas && (
        <Pressable onPress={() => setMostrarTodas(true)}>
          <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Mostrar todas ({CATEGORIAS.length})</Text>
        </Pressable>
      )}
    </View>
  );
}
