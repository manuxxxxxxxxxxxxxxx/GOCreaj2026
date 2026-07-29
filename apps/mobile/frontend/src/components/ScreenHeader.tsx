import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Fonts } from '@/theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 'accent' = header de color sólido con texto blanco, usado en flujos destacados (ej. Soporte, Convertirse en socio). */
  tone?: 'default' | 'accent';
}

/** Header estándar de pantalla: botón atrás + título, con el safe-area y espaciado ya resueltos. */
export default function ScreenHeader({ title, subtitle, onBack, right, tone = 'default' }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const nav = useNavigation();

  const accent = tone === 'accent';
  const fg = accent ? '#FFF' : colors.text;
  const bg = accent ? colors.accent : colors.card;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: bg, borderBottomColor: accent ? 'transparent' : colors.border }]}>
      <TouchableOpacity
        onPress={onBack ?? (() => nav.goBack())}
        style={[styles.backBtn, { backgroundColor: accent ? 'rgba(255,255,255,0.18)' : colors.elevated }]}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color={fg} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: fg }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: accent ? 'rgba(255,255,255,0.8)' : colors.muted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ?? <View style={{ width: 36 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Fonts.title, fontWeight: '800' },
  subtitle: { fontSize: Fonts.small, fontWeight: '500', marginTop: 1 },
});
