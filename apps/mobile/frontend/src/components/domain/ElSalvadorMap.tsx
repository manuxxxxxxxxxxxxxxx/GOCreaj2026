import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { CaretRightIcon, MapPinIcon, StorefrontIcon, XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";
import { EL_SALVADOR_DEPARTAMENTOS, EL_SALVADOR_OUTLINE_D, EL_SALVADOR_VIEWBOX } from "../../lib/elSalvadorGeo";
import { Skeleton } from "../ui/Skeleton";

const MAP_W = 1080;
const MAP_H = 600;
const ASPECT = MAP_H / MAP_W;

interface Props {
  counts: Record<string, number> | null;
  onSelectDepartamento: (departamento: string) => void;
}

/** Mezcla lineal entre dos colores hex ("#RRGGBB"), t en [0,1]. */
function lerpColor(a: string, b: string, t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** PRNG determinístico (mulberry32) sembrado por texto, para que los puntitos de tiendas no salten en cada render. */
function seededRandoms(seed: string, n: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  let s = h >>> 0 || 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return out;
}

export function ElSalvadorMap({ counts, onSelectDepartamento }: Props) {
  const { tokens, isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<string | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const scale = width ? width / MAP_W : 0;

  const maxCount = useMemo(() => {
    if (!counts) return 1;
    return Math.max(1, ...Object.values(counts));
  }, [counts]);

  const activeDept = active ? EL_SALVADOR_DEPARTAMENTOS.find((d) => d.nombre === active) ?? null : null;
  const activeCount = activeDept ? counts?.[activeDept.nombre] ?? 0 : 0;

  if (counts === null) {
    return <Skeleton height={220} radius={20} />;
  }

  return (
    <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Explora El Salvador</Text>
          <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 2, fontFamily: "Inter_400Regular" }}>
            Toca un departamento para ver sus negocios
          </Text>
        </View>
        <View style={[styles.legendDot, { backgroundColor: lerpColor(tokens.surface3, tokens.cyan, 0.15) }]} />
        <Text style={{ fontSize: 9.5, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>menos</Text>
        <View style={[styles.legendDot, { backgroundColor: tokens.cyan }]} />
        <Text style={{ fontSize: 9.5, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>más</Text>
      </View>

      <View onLayout={onLayout} style={{ width: "100%", aspectRatio: MAP_W / MAP_H }}>
        {width > 0 && (
          <>
            <Svg width={width} height={width * ASPECT} viewBox={EL_SALVADOR_VIEWBOX}>
              <Path d={EL_SALVADOR_OUTLINE_D} transform="translate(6,9)" fill={isDark ? "#000000" : "#0B1220"} opacity={isDark ? 0.35 : 0.08} />
              <Path d={EL_SALVADOR_OUTLINE_D} fill={tokens.surface2} stroke={tokens.border} strokeWidth={1} />

              {EL_SALVADOR_DEPARTAMENTOS.map((dep) => {
                const count = counts[dep.nombre] ?? 0;
                const isActive = active === dep.nombre;
                const intensity = count / maxCount;
                const fill = isActive ? tokens.cyan : lerpColor(tokens.surface3, tokens.cyan, 0.14 + intensity * 0.6);
                const hoverProps =
                  Platform.OS === "web"
                    ? ({
                        onMouseEnter: () => setActive(dep.nombre),
                        onMouseLeave: () => setActive((cur) => (cur === dep.nombre ? null : cur)),
                      } as unknown as object)
                    : {};
                return (
                  <Path
                    key={dep.nombre}
                    d={dep.d}
                    fill={fill}
                    stroke={tokens.surface1}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    onPress={() => setActive((cur) => (cur === dep.nombre ? null : dep.nombre))}
                    {...hoverProps}
                  />
                );
              })}

              {EL_SALVADOR_DEPARTAMENTOS.map((dep) => {
                const count = counts[dep.nombre] ?? 0;
                if (count === 0) return null;
                const n = Math.min(count, 6);
                const rx = seededRandoms(dep.nombre + "x", n);
                const ry = seededRandoms(dep.nombre + "y", n);
                const spread = Math.min(dep.bbox[2] - dep.bbox[0], dep.bbox[3] - dep.bbox[1]) * 0.16;
                return (
                  <G key={`dots-${dep.nombre}`}>
                    {rx.map((rv, i) => (
                      <Circle
                        key={i}
                        cx={dep.cx + (rv - 0.5) * 2 * spread}
                        cy={dep.cy + (ry[i] - 0.5) * 2 * spread}
                        r={3.2}
                        fill={tokens.coral}
                        stroke={tokens.surface1}
                        strokeWidth={1}
                        opacity={0.92}
                      />
                    ))}
                  </G>
                );
              })}
            </Svg>

            {EL_SALVADOR_DEPARTAMENTOS.map((dep) => {
              const count = counts[dep.nombre] ?? 0;
              if (count === 0) return null;
              return (
                <View
                  key={`badge-${dep.nombre}`}
                  pointerEvents="none"
                  style={[
                    styles.badge,
                    {
                      left: dep.cx * scale - 12,
                      top: dep.cy * scale - 12,
                      backgroundColor: tokens.surface1,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 9.5, fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{count}</Text>
                </View>
              );
            })}

            {activeDept && (
              <View
                pointerEvents="box-none"
                style={[
                  styles.tooltip,
                  {
                    left: Math.max(4, Math.min(width - 190, activeDept.cx * scale - 95)),
                    top: Math.max(4, activeDept.cy * scale - 84),
                    backgroundColor: tokens.surface1,
                    borderColor: tokens.cyan,
                  },
                ]}
              >
                <Pressable onPress={() => setActive(null)} hitSlop={8} style={styles.tooltipClose}>
                  <XIcon size={11} color={tokens.textMuted} />
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <MapPinIcon size={12} weight="fill" color={tokens.cyan} />
                  <Text style={{ fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{activeDept.nombre}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3, marginBottom: 8 }}>
                  <StorefrontIcon size={11} color={tokens.textMuted} />
                  <Text style={{ fontSize: 10.5, color: tokens.textSecondary, fontFamily: "Inter_500Medium" }}>
                    {activeCount === 0 ? "Sin negocios aún" : `${activeCount} negocio${activeCount === 1 ? "" : "s"}`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onSelectDepartamento(activeDept.nombre)}
                  style={[styles.tooltipBtn, { backgroundColor: tokens.cyan }]}
                >
                  <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyanInk }}>Explorar tiendas</Text>
                  <CaretRightIcon size={11} weight="bold" color={tokens.cyanInk} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 14 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  badge: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  tooltip: {
    position: "absolute",
    width: 190,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tooltipClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radius.sm,
    paddingVertical: 8,
  },
});
