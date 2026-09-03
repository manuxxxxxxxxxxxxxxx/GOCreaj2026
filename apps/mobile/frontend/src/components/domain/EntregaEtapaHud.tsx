import { Text, View } from "react-native";
import { CheckCircleIcon, GaugeIcon, MapPinIcon, NavigationArrowIcon, StorefrontIcon, TimerIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { minutosCoherentes } from "../../lib/routing";

const TRAFICO_COLOR: Record<string, (t: ReturnType<typeof useTheme>["tokens"]) => string> = {
  fluido: (t) => t.okInk,
  moderado: (t) => t.warnInk,
  pesado: (t) => t.danger,
};

/** Estima el tramo tienda -> cliente cuando el repartidor todavía va camino a la tienda --
 * mismo criterio simple (distancia en línea recta / 30km/h + factor hora pico) que
 * calcular_trafico() en pedidos_tracking.php, para no depender de una segunda consulta a
 * OSRM solo para un tramo que ni siquiera empezó. En cuanto recoge, el tiempo real de ese
 * tramo ya viene del backend (tiempoEstimado, recalculado en vivo por OSRM). */
function estimarMinutosTramo(distanciaKm: number): number {
  const hora = new Date().getHours();
  let factor = 1;
  if ((hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 19)) factor = 1.8;
  else if (hora >= 12 && hora <= 14) factor = 1.4;
  return Math.ceil((distanciaKm / 30) * 60 * factor);
}

const chipStyle = { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 };

/** Barra de estado que va arriba del mapa en "Mis entregas" del repartidor: en qué etapa
 * va (tienda -> cliente, con check en cuanto escanea el QR/PIN de recogida) y el tiempo
 * total aproximado para terminar el pedido completo -- no solo el tramo actual. Reemplaza
 * el uso de EtaHud (que se queda igual para el comprador en OrderDetailScreen.tsx). */
export function EntregaEtapaHud({
  recogida,
  vaHaciaTienda,
  distanciaKmTramoActual,
  tiempoEstimadoTramoActual,
  distanciaKmTiendaCliente,
  trafico,
}: {
  recogida: boolean;
  vaHaciaTienda: boolean;
  distanciaKmTramoActual?: number | null;
  tiempoEstimadoTramoActual?: number | null;
  distanciaKmTiendaCliente?: number | null;
  trafico?: string | null;
}) {
  const { tokens } = useTheme();
  const colorTrafico = (TRAFICO_COLOR[trafico ?? ""] ?? (() => tokens.textSecondary))(tokens);

  // El tiempo del tramo actual viene del backend (OSRM o su fallback, ver
  // pedidos_tracking.php) -- minutosCoherentes() le pone un piso creíble (a lo mucho
  // 35km/h de promedio urbano) para que un dato viejo o un corte de OSRM a mitad de
  // camino nunca muestre algo como "1 min" para una distancia de varios km.
  const minutosTramoActual = minutosCoherentes(distanciaKmTramoActual, tiempoEstimadoTramoActual);
  const etaTotal =
    minutosTramoActual == null
      ? null
      : vaHaciaTienda
        ? minutosTramoActual + (distanciaKmTiendaCliente != null ? estimarMinutosTramo(distanciaKmTiendaCliente) : 0)
        : minutosTramoActual;

  return (
    <View style={{ backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Etapa
          icon={<StorefrontIcon size={13} weight="bold" color={recogida ? tokens.okInk : vaHaciaTienda ? tokens.cyan : tokens.textMuted} />}
          label={recogida ? "Recogido" : "Tienda"}
          done={recogida}
          active={vaHaciaTienda && !recogida}
          tokens={tokens}
        />
        <View style={{ flex: 1, height: 2, backgroundColor: recogida ? tokens.ok : tokens.border, marginHorizontal: 4 }} />
        <Etapa
          icon={<MapPinIcon size={13} weight="bold" color={!vaHaciaTienda ? tokens.cyan : tokens.textMuted} />}
          label="Cliente"
          done={false}
          active={!vaHaciaTienda}
          tokens={tokens}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {distanciaKmTramoActual != null && (
          <View style={[chipStyle, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
            <NavigationArrowIcon size={13} color={tokens.textSecondary} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{distanciaKmTramoActual.toFixed(1)} km</Text>
          </View>
        )}
        {etaTotal != null && (
          <View style={[chipStyle, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
            <TimerIcon size={13} color={tokens.textSecondary} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>~{etaTotal} min para completar</Text>
          </View>
        )}
        {trafico && (
          <View style={[chipStyle, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
            <GaugeIcon size={13} color={colorTrafico} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colorTrafico, textTransform: "capitalize" }}>{trafico}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Etapa({
  icon,
  label,
  done,
  active,
  tokens,
}: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  active: boolean;
  tokens: ReturnType<typeof useTheme>["tokens"];
}) {
  const bg = done ? tokens.okBg : active ? tokens.cyanBg : tokens.surface2;
  const border = done ? tokens.ok : active ? tokens.cyan : tokens.border;
  const textColor = done ? tokens.okInk : active ? tokens.cyan : tokens.textMuted;
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: bg, borderWidth: 1.5, borderColor: border }}>
        {done ? <CheckCircleIcon size={15} weight="fill" color={tokens.ok} /> : icon}
      </View>
      <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: textColor }}>{label}</Text>
    </View>
  );
}
