import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";

/**
 * Fondo ambiental global de toda la app -- equivalente RN del `--bg-page-image`
 * de la web (tres manchas de degradado radial, solo en modo oscuro; en claro
 * la web no pinta nada ahí, así que aquí tampoco). Se monta una sola vez
 * detrás de todo el navegador; no confundir con <GlowBackground />, que es un
 * glow local dentro de tarjetas puntuales (hero de Home, tarjeta de login,
 * balance de Wallet) y sigue existiendo aparte.
 */
export function AmbientPageBackground() {
  const { tokens, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.bg }]} />
      {isDark && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="blob1" cx="18%" cy="-8%" rx="75%" ry="45%">
              <Stop offset="0%" stopColor="#16203a" stopOpacity={1} />
              <Stop offset="60%" stopColor="#16203a" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="blob2" cx="100%" cy="10%" rx="65%" ry="45%">
              <Stop offset="0%" stopColor="#12233a" stopOpacity={1} />
              <Stop offset="55%" stopColor="#12233a" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="blob3" cx="85%" cy="98%" rx="70%" ry="50%">
              <Stop offset="0%" stopColor="#101a2e" stopOpacity={1} />
              <Stop offset="55%" stopColor="#101a2e" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#blob1)" />
          <Rect x={0} y={0} width={width} height={height} fill="url(#blob2)" />
          <Rect x={0} y={0} width={width} height={height} fill="url(#blob3)" />
        </Svg>
      )}
    </View>
  );
}
