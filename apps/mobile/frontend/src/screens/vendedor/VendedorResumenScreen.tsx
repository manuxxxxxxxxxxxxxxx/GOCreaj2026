import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PlusIcon, TrendUpIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { vendedorApi } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Avatar } from "../../components/ui/Avatar";
import { StatusPill } from "../../components/ui/StatusPill";

export function VendedorResumenScreen() {
  const { tokens } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ganancias, setGanancias] = useState<{ fecha: string; monto: number }[] | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    vendedorApi.ganancias().then((r) => setGanancias(r.ganancias_por_dia));
    vendedorApi.misVentas().then((r) => setPedidos(r.pedidos));
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = ganancias?.find((g) => g.fecha.startsWith(hoy))?.monto ?? 0;
  const pedidosHoy = pedidos?.filter((p) => p.created_at.startsWith(hoy)) ?? [];
  const maxMonto = Math.max(1, ...(ganancias?.map((g) => g.monto) ?? [1]));

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Resumen</Text>
        <Button size="sm" icon={<PlusIcon size={14} color={tokens.cyanInk} />} onPress={() => navigation.navigate("VendedorProductoForm", {})}>
          Producto
        </Button>
      </View>

      <View style={styles.kpiGrid}>
        <Kpi label="Ventas hoy" value={money(ventasHoy)} tone="cyan" />
        <Kpi label="Pedidos hoy" value={String(pedidosHoy.length)} tone="ok" />
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <TrendUpIcon size={16} color={tokens.cyan} />
          <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Ventas recientes</Text>
        </View>
        {ganancias === null ? (
          <Skeleton height={100} />
        ) : ganancias.length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Aún no tienes ventas completadas.</Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 110 }}>
            {ganancias.slice(-10).map((g) => (
              <View key={g.fecha} style={{ flex: 1, height: Math.max(4, (g.monto / maxMonto) * 100), backgroundColor: tokens.cyan, opacity: 0.85, borderRadius: 4 }} />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
        <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 12 }}>Pedidos recientes</Text>
        {pedidos === null ? (
          <Skeleton height={100} />
        ) : pedidos.length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Sin pedidos todavía.</Text>
        ) : (
          pedidos.slice(0, 5).map((p) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Avatar nombre={p.comprador_nombre ?? "?"} size={26} />
              <Text style={{ flex: 1, fontSize: 12.5, color: tokens.textPrimary }}>{p.comprador_nombre}</Text>
              <StatusPill estado={p.estado} />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "cyan" | "ok" }) {
  const { tokens } = useTheme();
  const bg = tone === "cyan" ? tokens.cyanBg : tokens.okBg;
  const ink = tone === "cyan" ? tokens.cyan : tokens.okInk;
  return (
    <View style={[styles.kpi, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: ink, textTransform: "uppercase", opacity: 0.85 }}>{label}</Text>
      <Text style={{ fontSize: 20, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: ink, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: "row", gap: 12 },
  kpi: { flex: 1, borderRadius: 14, padding: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
});
