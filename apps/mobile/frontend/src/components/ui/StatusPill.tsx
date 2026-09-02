import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { CheckCircleIcon, ClockIcon, MagnifyingGlassIcon, PackageIcon, ProhibitIcon, TruckIcon, XCircleIcon, type IconProps } from "phosphor-react-native";
import type { EstadoPedido } from "../../lib/types";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";
import type { ComponentType } from "react";

const ESTADOS_ACTIVOS: EstadoPedido[] = ["preparacion", "en_camino"];

export function StatusPill({ estado, buscandoRepartidor }: { estado: EstadoPedido; buscandoRepartidor?: boolean }) {
  const { tokens } = useTheme();
  const pulse = useSharedValue(0.35);
  const activo = ESTADOS_ACTIVOS.includes(estado);

  useEffect(() => {
    if (activo) {
      pulse.value = withRepeat(withSequence(withTiming(0.55, { duration: 1100 }), withTiming(0.1, { duration: 1100 })), -1, true);
    }
  }, [activo]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const CONFIG: Record<EstadoPedido, { label: string; bg: string; ink: string; Icon: ComponentType<IconProps> }> = {
    pendiente_confirmacion: { label: "Pendiente", bg: tokens.warnBg, ink: tokens.warnInk, Icon: ClockIcon },
    preparacion: { label: "Preparando", bg: tokens.warnBg, ink: tokens.warnInk, Icon: PackageIcon },
    en_camino: { label: "En camino", bg: tokens.cyanBg, ink: tokens.cyan, Icon: TruckIcon },
    entregado: { label: "Entregado", bg: tokens.okBg, ink: tokens.okInk, Icon: CheckCircleIcon },
    cancelado: { label: "Cancelado", bg: tokens.dangerBg, ink: tokens.dangerInk, Icon: XCircleIcon },
    rechazado_repartidor: { label: "Rechazado", bg: tokens.dangerBg, ink: tokens.dangerInk, Icon: ProhibitIcon },
  };
  const base = CONFIG[estado] ?? CONFIG.pendiente_confirmacion;
  const c = buscandoRepartidor && estado === "preparacion" ? { ...base, label: "Buscando repartidor", Icon: MagnifyingGlassIcon } : base;
  const Icon = c.Icon;
  return (
    <View style={[styles.base, { backgroundColor: c.bg }]}>
      {activo && <Animated.View pointerEvents="none" style={[pulseStyle, styles.pulseRing, { borderColor: c.ink }]} />}
      <Icon size={12} weight="bold" color={c.ink} />
      <Text style={[styles.text, { color: c.ink }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  pulseRing: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: radius.pill + 2, borderWidth: 1.5 },
  text: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
