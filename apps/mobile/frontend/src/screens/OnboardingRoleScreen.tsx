import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { RootStackParamList } from '@/types';

type Rol = 'comprador' | 'vendedor' | 'repartidor';

interface RoleCard {
  key: Rol;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  benefits: string[];
}

const ROLE_CARDS: RoleCard[] = [
  {
    key: 'comprador',
    icon: 'bag-handle-outline',
    color: '#5B8ED6',
    benefits: ['Compra sin salir de casa', 'Seguimiento en tiempo real', 'Chat con vendedores'],
  },
  {
    key: 'vendedor',
    icon: 'storefront-outline',
    color: '#27AE8F',
    benefits: ['Gestión de inventario', 'Panel de pedidos', 'Ganancias directas'],
  },
  {
    key: 'repartidor',
    icon: 'bicycle-outline',
    color: '#E07B54',
    benefits: ['Pedidos disponibles al instante', 'Rutas optimizadas', 'Ingresos por entrega'],
  },
];

export default function OnboardingRoleScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Rol | null>(null);
  const scaleAnims = useRef(ROLE_CARDS.map(() => new Animated.Value(1))).current;

  const handleSelect = (index: number, key: Rol) => {
    setSelected(key);
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.95, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  const continuar = async () => {
    if (!selected) return;
    await AsyncStorage.setItem('svgo_rol_intent', selected);
    nav.navigate('Location');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.logoBox, { backgroundColor: colors.accent }]}>
          <Text style={styles.logoTxt}>SV</Text>
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>{t.onboarding.roleTitle}</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>{t.onboarding.roleSub}</Text>

        <View style={styles.cards}>
          {ROLE_CARDS.map((card, i) => {
            const isSelected = selected === card.key;
            return (
              <Animated.View key={card.key} style={{ transform: [{ scale: scaleAnims[i] }] }}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? card.color : colors.border,
                      borderWidth: isSelected ? 2.5 : 1.5,
                    },
                  ]}
                  onPress={() => handleSelect(i, card.key)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.cardIconBg, { backgroundColor: `${card.color}18` }]}>
                    <Ionicons name={card.icon} size={32} color={card.color} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {t.onboarding.roles[card.key]}
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.muted }]}>
                      {t.onboarding.roleDesc[card.key]}
                    </Text>
                    <View style={styles.benefits}>
                      {card.benefits.map(b => (
                        <View key={b} style={styles.benefitRow}>
                          <View style={[styles.benefitDot, { backgroundColor: card.color }]} />
                          <Text style={[styles.benefitTxt, { color: colors.muted }]}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: card.color }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: selected ? colors.accent : colors.border },
          ]}
          onPress={continuar}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnTxt, { color: selected ? '#FFF' : colors.muted }]}>
            {t.onboarding.continuar}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={selected ? '#FFF' : colors.muted} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, alignItems: 'center' },
  logoBox: {
    width: 72, height: 72, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#1D5FD1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoTxt: { color: '#FFF', fontWeight: '900', fontSize: 26, letterSpacing: 2 },
  titulo: {
    fontSize: Fonts.heading - 4,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: Fonts.regular,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  cards: { width: '100%', gap: Spacing.md, marginBottom: Spacing.xl },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconBg: {
    width: 60, height: 60, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: Fonts.regular + 1, fontWeight: '800', letterSpacing: -0.2, marginBottom: 4 },
  cardDesc: { fontSize: Fonts.small + 1, fontWeight: '500', lineHeight: 18, marginBottom: Spacing.sm },
  benefits: { gap: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center' },
  benefitDot: { width: 5, height: 5, borderRadius: 3, marginRight: 7 },
  benefitTxt: { fontSize: Fonts.small, fontWeight: '500' },
  checkBadge: {
    position: 'absolute', top: 12, right: 12,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  btn: {
    width: '100%',
    height: 56,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D5FD1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  btnTxt: { fontSize: Fonts.regular + 1, fontWeight: '800', letterSpacing: 0.2 },
});
