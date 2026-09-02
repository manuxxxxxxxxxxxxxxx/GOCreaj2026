import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { adminApi } from "../../lib/api";
import { Skeleton } from "../../components/ui/Skeleton";

interface MunicipioCobertura {
  id: number;
  nombre: string;
  departamento: string;
  cobertura_activa: number;
}

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminCobertura.tsx. */
export function AdminCoberturaScreen() {
  const { tokens } = useTheme();
  const [municipios, setMunicipios] = useState<MunicipioCobertura[] | null>(null);

  useEffect(() => {
    adminApi.municipiosCobertura().then((r) => setMunicipios(r.municipios));
  }, []);

  const toggle = async (m: MunicipioCobertura) => {
    setMunicipios((prev) => prev?.map((x) => (x.id === m.id ? { ...x, cobertura_activa: x.cobertura_activa ? 0 : 1 } : x)) ?? null);
    await adminApi.toggleCobertura(m.id);
  };

  if (municipios === null) {
    return (
      <View style={{ padding: 20, gap: 10 }}>
        <Skeleton height={400} radius={14} />
      </View>
    );
  }

  const porDepto = municipios.reduce<Record<string, MunicipioCobertura[]>>((acc, m) => {
    (acc[m.departamento] ??= []).push(m);
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}>
      <View>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Zonas de cobertura</Text>
        <Text style={{ fontSize: 12.5, color: tokens.textSecondary, marginTop: 4 }}>Activa o desactiva la entrega en cada municipio.</Text>
      </View>
      {Object.entries(porDepto).map(([depto, ms]) => (
        <View key={depto} style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.textMuted }}>{depto}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ms.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => toggle(m)}
                style={[styles.chip, { borderColor: m.cobertura_activa ? tokens.okInk : tokens.border, backgroundColor: m.cobertura_activa ? tokens.okBg : tokens.surface2 }]}
              >
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: m.cobertura_activa ? tokens.okInk : tokens.textMuted }}>{m.nombre}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
