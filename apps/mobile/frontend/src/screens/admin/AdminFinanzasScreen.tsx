import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { adminApi } from "../../lib/api";
import { money } from "../../lib/format";
import { Skeleton } from "../../components/ui/Skeleton";

type Metricas = Awaited<ReturnType<typeof adminApi.metricasFinancieras>>["metricas"];

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminFinanzas.tsx. */
export function AdminFinanzasScreen() {
  const { tokens } = useTheme();
  const [m, setM] = useState<Metricas | null>(null);

  useEffect(() => {
    adminApi.metricasFinancieras().then((r) => setM(r.metricas));
  }, []);

  if (!m) {
    return (
      <View style={{ padding: 20, gap: 10 }}>
        <Skeleton height={400} radius={14} />
      </View>
    );
  }

  const maxVenta = Math.max(1, ...m.ultimos_30_dias.map((d) => d.ventas));

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}>
      <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Finanzas</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Kpi label="Ventas totales" value={money(m.ventas_totales)} tone="cyan" />
        <Kpi label="Comisión de la plataforma" value={money(m.comision_plataforma)} tone="ok" />
        <Kpi label="Retiros pendientes" value={money(m.retiros_pendientes)} tone="warn" />
        <Kpi label="Pagado a vendedores" value={money(m.pagado_vendedores)} />
        <Kpi label="Pagado a repartidores" value={money(m.pagado_repartidores)} />
        <Kpi label="Saldo total en wallets" value={money(m.saldo_en_wallets)} />
      </View>

      <View style={{ backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 18 }}>
        <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 14 }}>Ventas de los últimos 30 días</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 120 }}>
          {m.ultimos_30_dias.map((d) => (
            <View key={d.fecha} style={{ flex: 1, height: Math.max(3, (d.ventas / maxVenta) * 110), backgroundColor: tokens.cyan, opacity: 0.85, borderRadius: 2 }} />
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 18 }}>
        <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Pedidos por estado</Text>
        {m.por_estado.map((e) => (
          <View key={e.estado} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
            <Text style={{ fontSize: 12.5, color: tokens.textSecondary, textTransform: "capitalize" }}>{e.estado}</Text>
            <Text style={{ fontSize: 12.5, fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{e.total} · {money(e.monto)}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: 18 }}>
        <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Top tiendas</Text>
        {m.top_tiendas.map((t, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
            <Text style={{ fontSize: 12.5, color: tokens.textSecondary }} numberOfLines={1}>{t.nombre}</Text>
            <Text style={{ fontSize: 12.5, fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{t.pedidos} · {money(t.ventas)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "cyan" | "ok" | "warn" }) {
  const { tokens } = useTheme();
  const bg = tone === "cyan" ? tokens.cyanBg : tone === "ok" ? tokens.okBg : tone === "warn" ? tokens.warnBg : tokens.surface2;
  const ink = tone === "cyan" ? tokens.cyan : tone === "ok" ? tokens.okInk : tone === "warn" ? tokens.warnInk : tokens.textPrimary;
  return (
    <View style={{ width: "47%", backgroundColor: bg, borderRadius: 14, padding: 14 }}>
      <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.3, color: ink, opacity: 0.85 }}>{label}</Text>
      <Text style={{ fontSize: 17, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: ink, marginTop: 6 }}>{value}</Text>
    </View>
  );
}
