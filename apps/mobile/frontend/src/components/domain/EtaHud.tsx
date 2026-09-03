import { Text, View } from "react-native";
import { GaugeIcon, NavigationArrowIcon, TimerIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";

const TRAFICO_COLOR: Record<string, (t: ReturnType<typeof useTheme>["tokens"]) => string> = {
  fluido: (t) => t.okInk,
  moderado: (t) => t.warnInk,
  pesado: (t) => t.danger,
};

const hudChipStyle = { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 };

/** Chips de distancia / tiempo estimado / tráfico -- mismo HUD que ya usaba
 * RepartidorEntregasScreen.tsx, ahora compartido con la pantalla de seguimiento del
 * comprador (OrderDetailScreen.tsx) para que ambos vean el mismo tiempo estimado real
 * (calculado en el backend vía OSRM, ver pedidos_tracking.php). */
export function EtaHud({ distanciaKm, tiempoEstimado, trafico }: { distanciaKm?: number | null; tiempoEstimado?: number | null; trafico?: string | null }) {
  const { tokens } = useTheme();
  if (distanciaKm == null && tiempoEstimado == null && !trafico) return null;
  const colorTrafico = (TRAFICO_COLOR[trafico ?? ""] ?? (() => tokens.textSecondary))(tokens);

  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
      {distanciaKm != null && (
        <View style={[hudChipStyle, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <NavigationArrowIcon size={13} color={tokens.textSecondary} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{distanciaKm.toFixed(1)} km</Text>
        </View>
      )}
      {tiempoEstimado != null && (
        <View style={[hudChipStyle, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <TimerIcon size={13} color={tokens.textSecondary} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{tiempoEstimado} min</Text>
        </View>
      )}
      {trafico && (
        <View style={[hudChipStyle, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <GaugeIcon size={13} color={colorTrafico} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colorTrafico, textTransform: "capitalize" }}>{trafico}</Text>
        </View>
      )}
    </View>
  );
}
