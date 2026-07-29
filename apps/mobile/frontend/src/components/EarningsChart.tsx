import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Spacing, Radius, Fonts } from '@/theme/colors';

const SCREEN_W = Dimensions.get('window').width;

interface Props {
  labels: string[];
  values: number[];
  accent: string;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  yPrefix?: string;
  ySuffix?: string;
  emptyText: string;
}

/** Gráfica de línea reutilizable para series diarias (ganancias, minutos, etc). */
export default function EarningsChart({
  labels, values, accent, cardBg, textColor, mutedColor, yPrefix = '', ySuffix = '', emptyText,
}: Props): React.JSX.Element {
  if (values.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: cardBg }]}>
        <Text style={{ color: mutedColor, fontSize: Fonts.small + 1, textAlign: 'center' }}>{emptyText}</Text>
      </View>
    );
  }

  // chart-kit no acepta un solo punto de forma agradable — lo duplicamos para dibujar una línea plana visible.
  const chartLabels = labels.length === 1 ? ['', labels[0]] : labels;
  const chartValues = values.length === 1 ? [values[0], values[0]] : values;

  return (
    <View style={[styles.wrap, { backgroundColor: cardBg }]}>
      <LineChart
        data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
        width={SCREEN_W - Spacing.md * 2 - Spacing.md * 2}
        height={180}
        yAxisLabel={yPrefix}
        yAxisSuffix={ySuffix}
        fromZero
        withInnerLines={false}
        withOuterLines={false}
        bezier
        chartConfig={{
          backgroundColor: cardBg,
          backgroundGradientFrom: cardBg,
          backgroundGradientTo: cardBg,
          decimalPlaces: 0,
          color: (opacity = 1) => hexToRgba(accent, opacity),
          labelColor: (opacity = 1) => hexToRgba(mutedColor, opacity),
          propsForDots: { r: '3.5', strokeWidth: '2', stroke: accent },
          propsForLabels: { fontSize: 10 },
        }}
        style={{ borderRadius: Radius.md, marginLeft: -Spacing.md }}
      />
    </View>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', overflow: 'hidden' },
  empty: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
});
