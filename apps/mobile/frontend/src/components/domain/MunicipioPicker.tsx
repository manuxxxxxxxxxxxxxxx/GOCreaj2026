import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon } from "phosphor-react-native";
import { productosApi } from "../../lib/api";
import type { Municipio } from "../../lib/types";
import { useTheme } from "../../theme/ThemeContext";
import { Input } from "../ui/Input";
import { Sheet } from "../ui/Sheet";

/** Selector de municipio (dropdown) respaldado por el catálogo de 39 municipios de El
 * Salvador -- antes era un campo de texto libre donde el vendedor podía escribir
 * cualquier cosa. Se abre en una hoja con buscador y lista agrupada por departamento,
 * el mismo patrón que ya usa CategoryPicker/MultiCategoryPicker. */
export function MunicipioPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  const porDepartamento = useMemo(() => {
    if (!municipios) return [];
    const normalizada = busqueda.trim().toLowerCase();
    const filtrados = normalizada ? municipios.filter((m) => m.nombre.toLowerCase().includes(normalizada)) : municipios;
    const grupos = new Map<string, Municipio[]>();
    for (const m of filtrados) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios, busqueda]);

  const elegir = (nombre: string) => {
    onChange(nombre);
    setOpen(false);
    setBusqueda("");
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>Municipio</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          height: 46,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.surface1,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: value ? tokens.textPrimary : tokens.textMuted }}>
          {value || (municipios ? "Elige un municipio…" : "Cargando…")}
        </Text>
        <CaretDownIcon size={15} color={tokens.textMuted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Elige tu municipio">
        <View style={{ gap: 12, paddingBottom: 20 }}>
          <Input label="Buscar municipio" value={busqueda} onChangeText={setBusqueda} placeholder="ej. Santa Ana" icon={<MagnifyingGlassIcon size={16} color={tokens.textMuted} />} />
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {porDepartamento.map(([depto, ms]) => (
              <View key={depto} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{depto}</Text>
                {ms.map((m) => {
                  const active = m.nombre === value;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => elegir(m.nombre)}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 4 }}
                    >
                      <Text style={{ fontSize: 14, color: active ? tokens.cyan : tokens.textPrimary, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" }}>{m.nombre}</Text>
                      {active && <CheckIcon size={15} weight="bold" color={tokens.cyan} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {porDepartamento.length === 0 && municipios && <Text style={{ fontSize: 12.5, color: tokens.textMuted, padding: 8 }}>Sin resultados para "{busqueda}"</Text>}
          </ScrollView>
        </View>
      </Sheet>
    </View>
  );
}
