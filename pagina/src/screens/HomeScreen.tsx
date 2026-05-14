import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../hooks/useAuth';
import { CATALOG } from '../data/catalog';
import ProductCard from '../components/ProductCard';
import { useCart } from '../hooks/useCart';
import Toast from '../components/Toast';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

const ROLES_INFO = [
  {
    title: 'Compradores',
    desc: 'Descubre productos locales frescos. Apoya a comerciantes de tu comunidad.',
    emoji: '🛒',
    color: Colors.green,
    gradient: Colors.gradients.green,
    route: 'Market',
  },
  {
    title: 'Vendedores',
    desc: 'Publica tus productos y llega a más clientes en tu barrio.',
    emoji: '🏪',
    color: Colors.cyan,
    gradient: Colors.gradients.blue,
    route: 'SellerDashboard',
  },
  {
    title: 'Repartidores',
    desc: 'Gana dinero entregando pedidos locales con tu horario.',
    emoji: '🛵',
    color: Colors.purple,
    gradient: Colors.gradients.purple,
    route: 'DriverDashboard',
  },
] as const;

const FEATURES = [
  { emoji: '🏪', title: 'Mercado Local',     desc: 'Productos frescos de vendedores verificados de tu comunidad.',           color: Colors.gradients.blue },
  { emoji: '💬', title: 'Chat en Vivo',      desc: 'Comunícate con vendedores y repartidores en tiempo real.',               color: Colors.gradients.green },
  { emoji: '🛵', title: 'Entregas Rápidas',  desc: 'Repartidores locales llevan tu pedido en minutos.',                      color: Colors.gradients.purple },
  { emoji: '📊', title: 'Panel Vendedor',    desc: 'Gestiona productos, pedidos y analíticas de tu tienda.',                 color: Colors.gradients.pink },
  { emoji: '▶️', title: 'Reels de Productos', desc: 'Descubre novedades mediante videos cortos de tus vendedores favoritos.', color: Colors.gradients.primary },
  { emoji: '💰', title: 'Gana Repartiendo',  desc: 'Únete como repartidor y genera ingresos adicionales.',                   color: Colors.gradients.green },
];

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { addItem, count }  = useCart();
  const [toast, setToast]   = React.useState({ visible: false, message: '' });

  function showToast(msg: string) {
    setToast({ visible: true, message: msg });
  }

  const featured = CATALOG.slice(0, 4);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header nav */}
        <View style={styles.nav}>
          <View style={styles.navLogo}>
            <View style={styles.navLogoIcon}><Text style={{ fontSize: 16 }}>🏪</Text></View>
            <Text style={styles.navLogoText}>LocalMarket</Text>
          </View>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Market' as any)}>
              <Text style={styles.navBtnText}>Mercado</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Chat' as any)}>
              <Text style={styles.navBtnText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => navigation.navigate('Cart' as any)}
            >
              <Text style={{ fontSize: 20 }}>🛒</Text>
              {count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
            {user ? (
              <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile' as any)}>
                <Text style={styles.navBtnText}>{user.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate('Login' as any)}
              >
                <Text style={styles.loginBtnText}>Entrar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hero */}
        <LinearGradient colors={Colors.gradients.hero} style={styles.hero}>
          <Text style={styles.heroTitle}>Tu mercado local,{'\n'}en tu bolsillo 🛍️</Text>
          <Text style={styles.heroDesc}>
            Compra productos frescos, apoya vendedores locales y recibe en minutos.
            Únete a la comunidad LocalMarket.
          </Text>
          <View style={styles.heroBtns}>
            <TouchableOpacity
              style={styles.heroBtnOutline}
              onPress={() => navigation.navigate('Market' as any)}
            >
              <Text style={styles.heroBtnOutlineText}>Explorar Mercado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroBtnSolid}
              onPress={() => navigation.navigate('Login' as any)}
            >
              <Text style={styles.heroBtnSolidText}>Únete Gratis</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { num: '12+',  label: 'Productos' },
            { num: '3',    label: 'Vendedores' },
            { num: '4',    label: 'Repartidores' },
            { num: '100%', label: 'Local' },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Roles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Cómo quieres participar?</Text>
          <Text style={styles.sectionSub}>Únete como comprador, vendedor o repartidor.</Text>
          {ROLES_INFO.map((r) => (
            <TouchableOpacity
              key={r.title}
              style={styles.roleCard}
              onPress={() => navigation.navigate(r.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconBox, { backgroundColor: r.color + '20' }]}>
                <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{r.title}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </View>
              <Text style={{ fontSize: 18, color: Colors.textMuted }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Productos Destacados</Text>
              <Text style={styles.sectionSub}>Lo más vendido esta semana</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Market' as any)}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {featured.map((product) => (
              <View key={product.id} style={{ width: (width - 52) / 2 }}>
                <ProductCard
                  product={product}
                  onAddToCart={(p) => {
                    addItem(p);
                    showToast(`${p.name} agregado al carrito`);
                  }}
                  onPress={() => navigation.navigate('Market' as any)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={[styles.section, { backgroundColor: Colors.white }]}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Todo lo que necesitas</Text>
          <Text style={[styles.sectionSub, { textAlign: 'center', marginBottom: 24 }]}>
            Una plataforma completa para tu comunidad
          </Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: f.color[0] + '22' }]}>
                <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureName}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Banner */}
        <LinearGradient colors={Colors.gradients.cta} style={styles.cta}>
          <Text style={styles.ctaTitle}>¿Listo para empezar?</Text>
          <Text style={styles.ctaDesc}>Únete a LocalMarket hoy y apoya a tu comunidad local.</Text>
          <View style={styles.ctaBtns}>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Login' as any)}>
              <Text style={styles.ctaBtnText}>Crear cuenta gratis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Market' as any)}>
              <Text style={styles.ctaBtnText}>Ver el mercado</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>🏪 LocalMarket</Text>
          <Text style={styles.footerDesc}>Tu mercado del barrio, siempre cerca.</Text>
          <Text style={styles.footerCopy}>© 2025 LocalMarket. Todos los derechos reservados.</Text>
        </View>

      </ScrollView>
      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: Colors.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navLogo:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogoIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  navLogoText: { fontSize: 15, fontWeight: '700', color: Colors.blue },
  navRight:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm },
  navBtnText:  { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  cartBtn:     { padding: 6, position: 'relative' },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  loginBtn:    { backgroundColor: Colors.blue, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm },
  loginBtnText:{ color: Colors.white, fontSize: 13, fontWeight: '600' },
  hero:        { padding: 36, paddingTop: 48, paddingBottom: 48 },
  heroTitle:   { fontSize: 28, fontWeight: '800', color: Colors.white, lineHeight: 36, marginBottom: 14 },
  heroDesc:    { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, marginBottom: 28 },
  heroBtns:    { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroBtnOutline: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.white,
  },
  heroBtnOutlineText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  heroBtnSolid: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: Colors.white,
  },
  heroBtnSolidText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stat:      { alignItems: 'center' },
  statNum:   { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  section:   { padding: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  sectionTitle:  { fontSize: 20, fontWeight: '800', color: Colors.text },
  sectionSub:    { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  seeAll:        { color: Colors.blue, fontSize: 13, fontWeight: '600' },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  roleIconBox: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  roleTitle:   { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  roleDesc:    { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  productsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  featureIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  featureName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  featureDesc: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  cta:         { padding: 36, alignItems: 'center' },
  ctaTitle:    { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 10, textAlign: 'center' },
  ctaDesc:     { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 28, textAlign: 'center', lineHeight: 21 },
  ctaBtns:     { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  ctaBtn: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ctaBtnText:  { color: Colors.white, fontWeight: '600', fontSize: 14 },
  footer:      { backgroundColor: Colors.dark, padding: 32, alignItems: 'center', gap: 8 },
  footerLogo:  { fontSize: 16, fontWeight: '700', color: Colors.white },
  footerDesc:  { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  footerCopy:  { fontSize: 11, color: '#475569', marginTop: 8 },
});
