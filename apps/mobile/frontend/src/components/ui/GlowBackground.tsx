import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";

/**
 * Glow local con dos manchas radiales (cian) + una tercera (violeta, sutil,
 * para profundidad) + overlay de grid de puntos -- equivalente RN de
 * `.glow-mesh` en web (mismas proporciones/opacidades: los stops usan los
 * tonos ya premezclados `cyanGlow`/`violetGlow`, no el acento sólido).
 * Estático a propósito: una versión anterior animaba la capa entera con
 * translateX/Y y dejaba ver el fondo base en el borde por el que se alejaba
 * ("espacio en blanco" al moverse) -- se quitó esa animación en vez de
 * intentar parchearla, para que el fondo sea idéntico y confiable al de la web.
 */
export function GlowBackground() {
  const { tokens } = useTheme();
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.bg }]} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow1" cx="85%" cy="-8%" rx="46%" ry="32%">
            <Stop offset="0%" stopColor={tokens.cyanGlow} stopOpacity={1} />
            <Stop offset="100%" stopColor={tokens.cyanGlow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow2" cx="-4%" cy="38%" rx="40%" ry="28%">
            <Stop offset="0%" stopColor={tokens.cyanGlow} stopOpacity={1} />
            <Stop offset="100%" stopColor={tokens.cyanGlow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow3" cx="50%" cy="102%" rx="42%" ry="26%">
            <Stop offset="0%" stopColor={tokens.violetGlow} stopOpacity={1} />
            <Stop offset="100%" stopColor={tokens.violetGlow} stopOpacity={0} />
          </RadialGradient>
          <Pattern id="dotgrid" width={16} height={16} patternUnits="userSpaceOnUse">
            <Circle cx={0.8} cy={0.8} r={0.8} fill={tokens.borderStrong} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#glow1)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#glow2)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#glow3)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#dotgrid)" opacity={0.35} />
      </Svg>
    </View>
  );
}
