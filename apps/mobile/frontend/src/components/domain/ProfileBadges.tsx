import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { TrophyIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemeTokens } from "../../theme/tokens";
import { Sheet } from "../ui/Sheet";

export interface ProfileBadge {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  accent?: "cyan" | "violet" | "coral";
  /** Texto extra para el tooltip (ej. "Se reinicia cada mes"). */
  nota?: string;
}

function accentColor(tokens: ThemeTokens, accent: "cyan" | "violet" | "coral" = "cyan") {
  return accent === "violet" ? tokens.violet : accent === "coral" ? tokens.coral : tokens.cyan;
}

/** Insignia individual dentro de la lista del sheet -- ya no como anillo suelto (antes se
 * mostraba una por logro, todas juntas en la cabecera del perfil, y se veía como un
 * amontonamiento de trofeos repetidos). */
function BadgeRow({ icon, label, current, target, accent = "cyan", nota }: ProfileBadge) {
  const { tokens } = useTheme();
  const color = accentColor(tokens, accent);
  const lograda = current >= target;
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  const estado = lograda ? "¡Lograda!" : `Faltan ${target - current}`;

  return (
    <View style={[styles.row, { borderColor: tokens.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: lograda ? `${color}22` : tokens.surface2 }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: lograda ? tokens.ok : tokens.textMuted, marginTop: 1 }}>{estado}</Text>
        {!!nota && <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 1 }}>{nota}</Text>}
        {!lograda && (
          <View style={[styles.barTrack, { backgroundColor: tokens.border }]}>
            <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
          </View>
        )}
      </View>
    </View>
  );
}

/** Un único indicador compacto (no un trofeo por logro) que resume el progreso de rol --
 * al tocarlo abre el detalle completo en un sheet. `size` sigue existiendo por
 * compatibilidad con quien ya lo pasaba, pero ahora solo afecta el anillo, nunca multiplica
 * cuántos se muestran. */
export function ProfileBadges({ badges, size = 44, roleLabel }: { badges: ProfileBadge[]; size?: number; roleLabel?: string }) {
  const { tokens } = useTheme();
  const [abierto, setAbierto] = useState(false);
  if (badges.length === 0) return null;

  const logradas = badges.filter((b) => b.current >= b.target).length;
  // El anillo refleja el avance hacia el próximo logro pendiente (o completo si ya se
  // lograron todos) -- un solo número, no uno por insignia.
  const siguiente = badges.find((b) => b.current < b.target) ?? badges[badges.length - 1];
  const pct = logradas === badges.length ? 1 : siguiente.target > 0 ? Math.min(1, siguiente.current / siguiente.target) : 0;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = accentColor(tokens, siguiente.accent);

  return (
    <>
      <Pressable onPress={() => setAbierto(true)} accessibilityLabel={`Logros: ${logradas} de ${badges.length}`} style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tokens.border} strokeWidth={stroke} />
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${c}, ${c}`} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <TrophyIcon size={size * 0.4} weight="fill" color={color} />
        </View>
        <View style={[styles.countBadge, { backgroundColor: tokens.surface1, borderColor: tokens.surface2 }]}>
          <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{logradas}/{badges.length}</Text>
        </View>
      </Pressable>

      <Sheet visible={abierto} onClose={() => setAbierto(false)} title={roleLabel ? `Logros de ${roleLabel.toLowerCase()}` : "Logros"}>
        <View style={{ gap: 10, paddingBottom: 12 }}>
          {badges.map((b) => (
            <BadgeRow key={b.label} {...b} />
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  countBadge: { position: "absolute", bottom: -4, alignSelf: "center", borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 5, paddingVertical: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 10, borderBottomWidth: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  barTrack: { height: 4, borderRadius: 2, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
});
