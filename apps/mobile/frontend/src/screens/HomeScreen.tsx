import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, Alert, Animated, Easing, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { api, Endpoints } from '@/services/api';
import { Producto, RootStackParamList } from '@/types';
import LoadingScreen from '@/components/LoadingScreen';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

const CARD_BG = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#A29BFE', '#FF9FF3', '#54A0FF'];

const BANNER_COLORS = ['#4A6D8C', '#27AE8F', '#8E44AD', '#C0392B', '#1A73E8'];

const MOCK: Producto[] = [
  { id: 1, tienda_id: 1, nombre: 'Pupusas de Queso', precio: 0.75, stock: 50, es_reel: 0, activo: 1, tienda_nombre: 'Comedor Doña Rosa', descripcion: 'Ricas pupusas artesanales con queso', categoria: 'comida', municipio: 'San Salvador', likes_count: 145, vendedor_id: 1 },
  { id: 2, tienda_id: 2, nombre: 'Horchata Fría', precio: 1.25, stock: 100, es_reel: 0, activo: 1, tienda_nombre: 'Bebidas El Chele', descripcion: 'Horchata natural de arroz con morro', categoria: 'bebidas', municipio: 'San Salvador', likes_count: 82, vendedor_id: 2 },
  { id: 3, tienda_id: 3, nombre: 'Pan de Yema', precio: 0.50, stock: 80, es_reel: 0, activo: 1, tienda_nombre: 'Panadería La Hermosa', descripcion: 'Pan tradicional salvadoreño recién horneado', categoria: 'panaderia', municipio: 'Santa Ana', likes_count: 67, vendedor_id: 3 },
  { id: 4, tienda_id: 1, nombre: 'Tamales de Elote', precio: 1.00, stock: 30, es_reel: 0, activo: 1, tienda_nombre: 'Comedor Doña Rosa', descripcion: 'Tamales artesanales de elote dulce', categoria: 'comida', municipio: 'San Salvador', likes_count: 189, vendedor_id: 1 },
  { id: 5, tienda_id: 4, nombre: 'Café Molido Premium', precio: 3.50, stock: 200, es_reel: 0, activo: 1, tienda_nombre: 'Finca El Cafetal', descripcion: 'Café de altura 100% salvadoreño', categoria: 'bebidas', municipio: 'Ahuachapán', likes_count: 223, vendedor_id: 4 },
  { id: 6, tienda_id: 5, nombre: 'Quesillo con Curtido', precio: 2.00, stock: 40, es_reel: 0, activo: 1, tienda_nombre: 'Antojitos El Salvador', descripcion: 'Quesillo fresco con loroco y curtido', categoria: 'comida', municipio: 'Santa Ana', likes_count: 178, vendedor_id: 5 },
  { id: 7, tienda_id: 6, nombre: 'Arroz con Leche', precio: 1.50, stock: 60, es_reel: 0, activo: 1, tienda_nombre: 'Dulces Tradicionales', descripcion: 'Postre artesanal con canela y raisins', categoria: 'general', municipio: 'San Miguel', likes_count: 55, vendedor_id: 6 },
  { id: 8, tienda_id: 7, nombre: 'Chicha de Maíz', precio: 0.75, stock: 150, es_reel: 0, activo: 1, tienda_nombre: 'Bebidas Típicas', descripcion: 'Bebida fermentada tradicional salvadoreña', categoria: 'bebidas', municipio: 'Sonsonate', likes_count: 41, vendedor_id: 7 },
];

const MOCK_TIENDAS = [
  { id: 1, nombre: 'Comedor Doña Rosa', municipio: 'San Salvador', color: '#FF6B6B', rating: 4.8, icon: 'restaurant-outline' as const },
  { id: 2, nombre: 'Finca El Cafetal', municipio: 'Ahuachapán', color: '#45B7D1', rating: 4.9, icon: 'cafe-outline' as const },
  { id: 3, nombre: 'Panadería La Hermosa', municipio: 'Santa Ana', color: '#FECA57', rating: 4.7, icon: 'nutrition-outline' as const },
  { id: 4, nombre: 'Antojitos El Salvador', municipio: 'Santa Ana', color: '#A29BFE', rating: 4.6, icon: 'fast-food-outline' as const },
  { id: 5, nombre: 'Bebidas El Chele', municipio: 'San Salvador', color: '#4ECDC4', rating: 4.5, icon: 'beer-outline' as const },
];

const CATS = [
  { k: 'todas',    icon: 'grid-outline'        as const, label: 'Todas' },
  { k: 'comida',   icon: 'restaurant-outline'  as const, label: 'Comida' },
  { k: 'bebidas',  icon: 'cafe-outline'         as const, label: 'Bebidas' },
  { k: 'panaderia',icon: 'nutrition-outline'    as const, label: 'Panadería' },
  { k: 'general',  icon: 'storefront-outline'   as const, label: 'General' },
];

function ShimmerBox({ width, height, radius = 12 }: { width: number | string; height: number; radius?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  return (
    <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: '#C8C0D8', opacity, marginBottom: 10 }} />
  );
}

function ProductCard({ item, index, onPress, onAdd, onSave }: {
  item: Producto; index: number;
  onPress: () => void; onAdd: () => void; onSave: () => void;
}) {
  const { colors } = useTheme();
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, delay: index * 55, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 380, delay: index * 55, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, slide, index]);

  const isHot = (item.likes_count ?? 0) > 100;

  return (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.92}
        onPress={onPress}
      >
        <View style={[styles.imgBox, { backgroundColor: CARD_BG[index % CARD_BG.length] }]}>
          {item.imagen
            ? <Image source={{ uri: item.imagen }} style={styles.img} resizeMode="cover" />
            : <Ionicons name="fast-food-outline" size={34} color="rgba(255,255,255,0.85)" />}
          <TouchableOpacity onPress={onSave} style={styles.bookmarkBtn} activeOpacity={0.8}>
            <Ionicons name="bookmark-outline" size={14} color="#FFF" />
          </TouchableOpacity>
          {isHot && (
            <View style={[styles.hotBadge, { backgroundColor: '#FF3B30' }]}>
              <Ionicons name="flame" size={10} color="#FFF" />
              <Text style={styles.hotTxt}>HOT</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={[styles.nombre, { color: colors.text }]}>{item.nombre}</Text>
          <Text numberOfLines={1} style={[styles.tienda, { color: colors.muted }]}>{item.tienda_nombre}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.precio, { color: colors.accent }]}>${Number(item.precio).toFixed(2)}</Text>
            <TouchableOpacity onPress={onAdd} style={[styles.addBtn, { backgroundColor: colors.accent }]} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();

  const [productos, setProductos] = useState<Producto[]>(MOCK);
  const [cargando, setCargando]   = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [municipio, setMunicipio] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);

  const bannerIndex = useRef(0);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const bannerRef  = useRef<FlatList<any>>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      bannerIndex.current = (bannerIndex.current + 1) % t.home.banners.length;
      bannerRef.current?.scrollToIndex({ index: bannerIndex.current, animated: true });
    }, 4000);
    return () => clearInterval(iv);
  }, [t.home.banners.length]);

  const cargar = useCallback(async () => {
    const muni = (await AsyncStorage.getItem('svgo_municipio')) ?? '';
    setMunicipio(muni);
    const url = `${Endpoints.productosListar}${muni ? `&municipio=${encodeURIComponent(muni)}` : ''}${categoria ? `&categoria=${categoria}` : ''}`;
    try {
      const r = await api<{ ok: boolean; productos?: Producto[] }>(url);
      if (r.ok && r.productos && r.productos.length > 0) setProductos(r.productos);
      else setProductos(MOCK);
    } catch { setProductos(MOCK); }
    setCargando(false);
    setRefrescando(false);
  }, [categoria]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const agregarCarrito = async (p: Producto) => {
    try {
      const r = await api<{ ok: boolean; error?: string }>(Endpoints.carritoAgregar, { body: { producto_id: p.id } });
      if (r.ok) Alert.alert(t.cart.miCarrito, `${p.nombre} — ${t.product.agregado}`);
      else Alert.alert(t.common.error, r.error ?? t.common.falloRed);
    } catch { Alert.alert(t.common.error, t.common.falloRed); }
  };

  const toggleGuardar = async (p: Producto) => {
    try {
      await api<{ ok: boolean; accion?: string }>(Endpoints.interToggleGuardar, { body: { producto_id: p.id } });
    } catch { /**/ }
  };

  const filtered = categoria ? productos.filter(p => p.categoria === categoria) : productos;

  if (cargando) return <LoadingScreen mensaje={t.common.cargando} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.locRow} onPress={() => nav.navigate('Location')} activeOpacity={0.7}>
          <View style={[styles.locIconBg, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="location" size={16} color={colors.accent} />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.entregarEn, { color: colors.muted }]}>{t.home.entregarEn}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.muniTxt, { color: colors.text }]}>{municipio || 'El Salvador'}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.accent} style={{ marginLeft: 3 }} />
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => nav.navigate('Cart')}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={20} color={colors.text} />
          <View style={[styles.cartDot, { backgroundColor: colors.danger }]} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); void cargar(); }} tintColor={colors.accent} />}
      >
        {/* SEARCH */}
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}
          activeOpacity={0.9}
          onPress={() => Alert.alert('Buscar', 'Búsqueda avanzada — próximamente')}
        >
          <View style={[styles.searchIconBg, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="search" size={16} color={colors.accent} />
          </View>
          <Text style={[styles.searchTxt, { color: colors.muted }]}>{t.home.buscarPlaceholder}</Text>
          <View style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="options-outline" size={16} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* BANNER CAROUSEL */}
        <FlatList
          ref={bannerRef}
          data={t.home.banners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
          style={{ marginBottom: Spacing.md }}
          renderItem={({ item, index }) => (
            <View style={[styles.banner, { backgroundColor: BANNER_COLORS[index % BANNER_COLORS.length], width: W - 64 }]}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitulo}>{item.titulo}</Text>
                <Text style={styles.bannerSub}>{item.sub}</Text>
                <View style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnTxt}>Ver ahora</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFF" />
                </View>
              </View>
              <View style={styles.bannerOrb} />
            </View>
          )}
        />

        {/* CATEGORY CHIPS */}
        <FlatList
          horizontal
          data={CATS}
          keyExtractor={c => c.k}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8, marginBottom: Spacing.md }}
          renderItem={({ item }) => {
            const act = item.k === 'todas' ? !categoria : categoria === item.k;
            return (
              <TouchableOpacity
                onPress={() => setCategoria(item.k === 'todas' ? null : item.k)}
                style={[styles.chip, { backgroundColor: act ? colors.accent : colors.card, borderColor: act ? colors.accent : colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon} size={13} color={act ? '#FFF' : colors.muted} style={{ marginRight: 4 }} />
                <Text style={[styles.chipTxt, { color: act ? '#FFF' : colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* FEATURED STORES */}
        {!categoria && (
          <View style={{ marginBottom: Spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.tiendas}</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.sectionLink, { color: colors.accent }]}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={MOCK_TIENDAS}
              keyExtractor={s => String(s.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                >
                  <View style={[styles.storeIconBg, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={22} color="#FFF" />
                  </View>
                  <Text numberOfLines={1} style={[styles.storeName, { color: colors.text }]}>{item.nombre}</Text>
                  <Text style={[styles.storeMuni, { color: colors.muted }]}>{item.municipio}</Text>
                  <View style={styles.storeRating}>
                    <Ionicons name="star" size={10} color="#FECA57" />
                    <Text style={[styles.storeRatingTxt, { color: colors.muted }]}>{item.rating}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* PRODUCTS SECTION TITLE */}
        <View style={[styles.sectionHeader, { paddingHorizontal: Spacing.md }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {categoria ? `${CATS.find(c => c.k === categoria)?.label ?? ''}` : t.home.populares}
          </Text>
          <Text style={[styles.sectionCount, { color: colors.muted }]}>{filtered.length} items</Text>
        </View>

        {/* PRODUCT GRID */}
        <View style={styles.grid}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="cube-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTxt, { color: colors.muted }]}>{t.home.sinProductos}</Text>
            </View>
          ) : (
            filtered.map((item, index) => (
              <View key={item.id} style={styles.gridCell}>
                <ProductCard
                  item={item}
                  index={index}
                  onPress={() => nav.navigate('Product', { productoId: item.id })}
                  onAdd={() => agregarCarrito(item)}
                  onSave={() => toggleGuardar(item)}
                />
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const CARD_W = (W - Spacing.md * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 3,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  entregarEn: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  muniTxt: { fontSize: Fonts.regular, fontWeight: '800', letterSpacing: -0.2 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, position: 'relative' },
  cartDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 7, right: 7, borderWidth: 1.5, borderColor: '#FFF' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm, height: 48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  searchIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  searchTxt: { flex: 1, fontSize: Fonts.regular, fontWeight: '500' },
  filterBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  banner: {
    borderRadius: Radius.lg, padding: Spacing.md,
    height: 130, overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  bannerContent: { zIndex: 2 },
  bannerTitulo: { color: '#FFF', fontWeight: '900', fontSize: Fonts.regular + 2, letterSpacing: -0.3 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: Fonts.small, fontWeight: '500', marginTop: 2, marginBottom: 8 },
  bannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  bannerBtnTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  bannerOrb: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)', right: -20, top: -20,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.pill, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1,
  },
  chipTxt: { fontSize: Fonts.small, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  sectionTitle: { fontSize: Fonts.regular + 1, fontWeight: '900', letterSpacing: -0.3 },
  sectionLink: { fontSize: Fonts.small + 1, fontWeight: '700' },
  sectionCount: { fontSize: Fonts.small, fontWeight: '600' },
  storeCard: {
    width: 110, borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2,
  },
  storeIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xs },
  storeName: { fontWeight: '700', fontSize: Fonts.small, textAlign: 'center', letterSpacing: -0.2 },
  storeMuni: { fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 2 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  storeRatingTxt: { fontSize: 10, fontWeight: '700' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  gridCell: { width: CARD_W },
  emptyBlock: { width: '100%', alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTxt: { marginTop: Spacing.sm, fontWeight: '600', fontSize: Fonts.regular },
  card: {
    borderRadius: Radius.md, borderWidth: 1.5, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  imgBox: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  img: { width: '100%', height: '100%', position: 'absolute' },
  bookmarkBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  hotBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 2,
  },
  hotTxt: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  cardBody: { padding: Spacing.sm + 2 },
  nombre: { fontWeight: '700', fontSize: Fonts.regular - 1, letterSpacing: -0.2 },
  tienda: { fontSize: Fonts.small - 1, marginTop: 1, fontWeight: '500' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  precio: { fontWeight: '900', fontSize: Fonts.regular },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
});
