import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CheckIcon, MagnifyingGlassIcon } from "phosphor-react-native";
import { CATEGORIAS, CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";
import { Input } from "../ui/Input";
import { useTheme } from "../../theme/ThemeContext";

const PAGE_SIZE = 24;

/** Selector de categorías con selección múltiple y buscador — son 129 categorías, así
 * que sin búsqueda se muestran las seleccionadas primero + una vista previa que crece
 * de a poco con "Ver más" en vez de saltar directo a las 129. */
export function MultiCategoryPicker({ value, onChange }: { value: string[]; onChange: (c: string[]) => void }) {
  const { tokens } = useTheme();
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
    <View style={{ gap: 10 }}>
      <Input label="Buscar categoría" value={busqueda} onChangeText={setBusqueda} placeholder="ej. panadería, ropa, mascotas..." icon={<MagnifyingGlassIcon size={16} color={tokens.textMuted} />} />
      {value.length > 0 && (
        <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>
          {value.length} categoría{value.length !== 1 ? "s" : ""} seleccionada{value.length !== 1 ? "s" : ""}
        </Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {visibles.map((c) => {
          const active = value.includes(c);
          const color = categoriaColor(c);
          const Icon = categoriaIcon(c);
          return (
            <Pressable
              key={c}
              onPress={() => toggle(c)}
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
              {active ? <CheckIcon size={13} weight="bold" color={color} /> : <Icon size={13} weight="regular" color={tokens.textSecondary} />}
              <Text style={{ fontSize: 12, color: active ? color : tokens.textSecondary, fontFamily: "Inter_600SemiBold" }}>{CATEGORIA_LABEL[c]}</Text>
            </Pressable>
          );
        })}
        {visibles.length === 0 && <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>Sin resultados para "{busqueda}"</Text>}
      </View>
      {!normalizada && restantes > 0 && (
        <Pressable onPress={() => setVisibleCount((n) => Math.min(CATEGORIAS.length, n + PAGE_SIZE))}>
          <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Ver más ({Math.min(restantes, PAGE_SIZE)} más)</Text>
        </Pressable>
      )}
    </View>
  );
}
