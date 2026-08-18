import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

const LIGHT_STOPS = ['#F5F8FD', '#EEF3FA', '#E6EDF8', '#DCE5F4', '#D2DDF0', '#C8D5ED', '#BFCEEA'] as const;
const DARK_STOPS = ['#06090F', '#081826', '#0B2440', '#0F3158', '#163E6E', '#204E82', '#2C5F94'] as const;
const LOCATIONS = [0, 0.18, 0.34, 0.5, 0.64, 0.78, 1] as const;

/**
 * Fondo ambiental de Bandera Institucional (ver DESIGN.md, sección "Fondo
 * ambiental"). Mismos stops de color que la versión web, adaptados a
 * LinearGradient de expo.
 *
 * Estático a propósito (sin deriva animada como en web): la audiencia real
 * de [SV]Go usa mayormente Android de gama media/baja, y repintar un
 * degradado grande cada frame es un costo que no se justifica en ese
 * hardware. Si más adelante se decide animarlo, hacerlo con
 * `react-native-reanimated` interpolando `locations`, nunca con `setState`
 * en un loop.
 *
 * Uso: envolver el contenido de una screen. El screen que lo use debe
 * quitar cualquier `backgroundColor` sólido de su View raíz — si no, el
 * degradado queda tapado (mismo problema que en web, ver PROGRESO.md).
 *
 *   <AmbientBackground>
 *     <ScrollView style={{ flex: 1 }}>...</ScrollView>
 *   </AmbientBackground>
 */
export default function AmbientBackground({ children }: { children?: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={isDark ? DARK_STOPS : LIGHT_STOPS}
        locations={LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
