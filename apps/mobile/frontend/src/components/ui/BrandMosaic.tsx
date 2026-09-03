import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";

// Mismos degradés cyan/navy que la web (BrandMosaic.tsx) -- nada de morado ni
// naranja, para que el placeholder se sienta parte de SV[Go] y no un degradé genérico.
const GRADIENTS: [string, string][] = [
  ["#04141c", "#0891B2"],
  ["#0891B2", "#04141c"],
  ["#0b2530", "#04141c"],
];

/** Placeholder de marca para una portada de tienda o foto de producto faltante:
 * degradé cyan/navy con el logo de SV[Go] mosaicado tenue encima, igual que su
 * equivalente en web. Llena a su contenedor -- el padre necesita una altura definida. */
export function BrandMosaic({ seed = 0 }: { seed?: number }) {
  const { isDark } = useTheme();
  const logo = isDark ? require("../../../assets/branding/logo-dark.png") : require("../../../assets/branding/logo-light.png");
  const [from, to] = GRADIENTS[((seed % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length];

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image
        source={logo}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, styles.tile]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    opacity: 0.14,
    transform: [{ rotate: "-8deg" }, { scale: 1.3 }],
  },
});
