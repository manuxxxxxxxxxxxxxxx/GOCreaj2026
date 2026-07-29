import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { RootStackParamList } from '@/types';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

/** Pantalla de bloqueo mostrada a invitados en secciones protegidas (Carrito, Chats, Pedidos, compras). */
export default function GuestGate({ icon, title, subtitle }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
        <Ionicons name={icon} size={38} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.accent }]}
        onPress={() => nav.navigate('Auth' as never)}
        activeOpacity={0.85}
      >
        <Ionicons name="log-in-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.btnTxt}>Iniciar sesión / Registrarme</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg },
  iconWrap: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  title: { fontSize: Fonts.title, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: Fonts.regular, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl, paddingHorizontal: Spacing.md },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 26, borderRadius: Radius.pill,
  },
  btnTxt: { color: '#FFF', fontWeight: '700', fontSize: Fonts.regular },
});
