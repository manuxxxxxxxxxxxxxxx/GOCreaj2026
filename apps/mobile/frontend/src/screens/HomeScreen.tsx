import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, Alert, Animated, Easing, Dimensions, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts, FontFamily } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints, API_URL, traducirError } from '@/services/api';
import { Producto, RootStackParamList } from '@/types';
import { SkeletonCard } from '@/components/Skeleton';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

const BANNER_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#D97706'];

interface TiendaNueva {
  id: number;
  nombre: string;
  categoria?: string | null;
  logo?: string | null;
  portada?: string | null;
  foto_negocio?: string | null;
  municipio?: string | null;
  calificacion_promedio?: number;
  total_resenas?: number;
  ventas_completadas?: number;
}

const CATS = [
  { k: 'todas',     icon: 'grid-outline'        as const, label: 'Todas' },
  { k: 'comida',    icon: 'restaurant-outline'  as const, label: 'Comida' },
  { k: 'bebidas',   icon: 'cafe-outline'        as const, label: 'Bebida' },
  { k: 'panaderia', icon: 'nutrition-outline'   as const, label: 'Panadería' },
  { k: 'general',   icon: 'storefront-outline'  as const, label: 'General' },
];

function img(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

/** Encabezado de sección reutilizable: barra de acento + título, opcionalmente con contador numérico (Sora, tabular-nums). */
function SectionHeader({ title, count, colors }: { title: string; count?: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionBar, { backgroundColor: colors.accent }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {count != null && (
        <Text style={[styles.sectionCount, { color: colors.muted }]}>
          <Text style={styles.sectionCountNum}>{count}</Text> items
        </Text>
      )}
    </View>
  );
}

function ProductCard({ item, index, onPress, onAdd, onSave }: {
  item: Producto; index: number; onPress: () => void; onAdd: () => void; onSave: () => void;
}) {
  const { colors } = useTheme();
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, delay: index * 35, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 380, delay: index * 35, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, slide, index]);

  return (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}
        activeOpacity={0.92}
        onPress={onPress}
      >
        <View style={[styles.imgBox, { backgroundColor: colors.accentLight }]}>
          {img(item.imagen)
            ? <Image source={{ uri: `${img(item.imagen)}?v=${Date.now()}` }} style={styles.img} resizeMode="cover" />
            : <Ionicons name="fast-food-outline" size={34} color={colors.accent} />}
          <TouchableOpacity onPress={onSave} style={styles.bookmarkBtn} activeOpacity={0.8}>
            <Ionicons name="bookmark-outline" size={14} color="#FFF" />
          </TouchableOpacity>
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

function StoreCard({ s, index, destacada, onPress }: { s: TiendaNueva; index: number; destacada?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const cover = img(s.portada ?? s.foto_negocio);
  const logo = img(s.logo ?? s.foto_negocio);

  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 360, delay: index * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 360, delay: index * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, slide, index]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}
      >
        <View style={styles.storeCover}>
          {cover
            ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={[styles.storeCoverPlaceholder, { backgroundColor: colors.accentLight }]} />}
          {destacada && (
            <View style={styles.goldBadge}>
              <Ionicons name="star" size={11} color="#FFF" />
              <Text style={styles.goldBadgeTxt}>{Number(s.calificacion_promedio ?? 0).toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {logo
              ? <Image source={{ uri: logo }} style={styles.storeLogo} />
              : <View style={[styles.storeLogo, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.storeAvatarLetter}>{s.nombre[0]}</Text>
                </View>}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[styles.storeNombre, { color: colors.text }]}>{s.nombre}</Text>
              <Text numberOfLines={1} style={[styles.storeMeta, { color: colors.muted }]}>
                {s.categoria ?? 'Tienda'} · {s.municipio ?? '—'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useLang();
  const insets = useSafeAreaInsets();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [nuevas, setNuevas]       = useState<TiendaNueva[]>([]);
  const [destacadas, setDestacadas] = useState<TiendaNueva[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [municipio, setMunicipio] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const bannerIndex = useRef(0);
  const bannerRef  = useRef<FlatList<any>>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!t.home.banners.length) return;
      bannerIndex.current = (bannerIndex.current + 1) % t.home.banners.length;
      bannerRef.current?.scrollToIndex({ index: bannerIndex.current, animated: true });
    }, 4000);
    return () => clearInterval(iv);
  }, [t.home.banners.length]);

  const cargarProductos = useCallback(async (pageNum: number, muni: string, cat: string | null, append = false) => {
    if (pageNum === 1) setCargando(true); else setLoadingMore(true);
    try {
      let url = `${Endpoints.productosListar}&page=${pageNum}&limit=20&stock_min=10`;
      if (muni) url += `&municipio=${encodeURIComponent(muni)}`;
      if (cat)  url += `&categoria=${cat}`;
      const r = await api<{ ok: boolean; productos?: Producto[]; has_more?: boolean }>(url);
      if (r.ok && r.productos) {
        setProductos(prev => append ? [...prev, ...r.productos!] : r.productos!);
        setHasMore(r.has_more ?? false);
      }
    } catch {
      if (!append) setProductos([]);
    } finally {
      setCargando(false);
      setLoadingMore(false);
      setRefrescando(false);
    }
  }, []);

  const cargarTiendas = useCallback(async (muni: string) => {
    try {
      const [rN, rD] = await Promise.all([
        api<{ ok: boolean; tiendas?: TiendaNueva[] }>(`${Endpoints.productosNuevasTiendas}${muni ? `&municipio=${encodeURIComponent(muni)}` : ''}`),
        api<{ ok: boolean; tiendas?: TiendaNueva[] }>(`${Endpoints.productosTiendasDestacadas}${muni ? `&municipio=${encodeURIComponent(muni)}` : ''}`),
      ]);
      if (rN.ok && rN.tiendas) setNuevas(rN.tiendas);
      if (rD.ok && rD.tiendas) setDestacadas(rD.tiendas);
    } catch { /* offline-safe */ }
  }, []);

  const cargar = useCallback(async () => {
    const muni = (await AsyncStorage.getItem('svgo_municipio')) ?? '';
    setMunicipio(muni);
    setPage(1);
    await Promise.all([cargarProductos(1, muni, categoria, false), cargarTiendas(muni)]);
  }, [categoria, cargarProductos, cargarTiendas]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const cargarNotifCount = useCallback(async () => {
    if (!usuario) return;
    try {
      const r = await api<{ ok: boolean; no_leidas?: number }>(Endpoints.notificacionesContador);
      if (r.ok) setNotifCount(r.no_leidas ?? 0);
    } catch {}
  }, [usuario]);

  useFocusEffect(useCallback(() => { void cargarNotifCount(); }, [cargarNotifCount]));
  useEffect(() => {
    if (!usuario) return;
    const iv = setInterval(cargarNotifCount, 30000);
    return () => clearInterval(iv);
  }, [usuario, cargarNotifCount]);

  const cargarMas = async () => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    await cargarProductos(next, municipio, categoria, true);
  };

  const agregarCarrito = async (p: Producto) => {
    if (!usuario) { nav.navigate('Auth' as never); return; }
    try {
      const r = await api<{ ok: boolean; error?: string }>(Endpoints.carritoAgregar, { body: { producto_id: p.id } });
      if (r.ok) {
        Alert.alert(t.cart.miCarrito, `${p.nombre} — ${t.product.agregado}`, [
          { text: t.common.cancelar, style: 'cancel' },
          { text: `${t.cart.miCarrito} →`, onPress: () => nav.navigate('Cart') },
        ]);
      }
      else Alert.alert(t.common.error, traducirError(r.error, lang) || t.common.falloRed);
    } catch { Alert.alert(t.common.error, t.common.falloRed); }
  };

  const toggleGuardar = async (p: Producto) => {
    try { await api<{ ok: boolean }>(Endpoints.interToggleGuardar, { body: { producto_id: p.id } }); } catch {}
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        {usuario && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border, marginRight: 8 }]}
            onPress={() => nav.navigate('Notificaciones' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {notifCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.danger, borderColor: colors.card }]}>
                <Text style={styles.notifBadgeTxt}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => nav.navigate('Cart')}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={20} color={colors.text} />
          <View style={[styles.cartDot, { backgroundColor: colors.danger }]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); void cargar(); }} tintColor={colors.accent} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) void cargarMas();
        }}
        scrollEventThrottle={400}
      >
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}
          activeOpacity={0.9}
          onPress={() => nav.navigate('Explore' as never)}
        >
          <View style={[styles.searchIconBg, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="search" size={16} color={colors.accent} />
          </View>
          <Text style={[styles.searchTxt, { color: colors.muted }]}>{t.home.buscarPlaceholder}</Text>
          <View style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="options-outline" size={16} color={colors.accent} />
          </View>
        </TouchableOpacity>

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
              </View>
              <View style={styles.bannerOrb} />
            </View>
          )}
        />

        {/* ── CATEGORÍAS (filtros que disparan fetch real) ── */}
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

        {/* ── NUEVAS TIENDAS — carrusel dinámico (consume nuevas_tiendas) ── */}
        {!categoria && nuevas.length > 0 && (
          <View style={{ marginBottom: Spacing.lg }}>
            <SectionHeader title={t.home.nuevos} colors={colors} />
            <FlatList
              horizontal
              data={nuevas}
              keyExtractor={s => 'n-' + s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
              renderItem={({ item, index }) => (
                <StoreCard s={item} index={index} onPress={() => nav.navigate('Explore' as never)} />
              )}
            />
          </View>
        )}

        {/* ── TIENDAS DESTACADAS — badge dorado, orden por estrellas ── */}
        {!categoria && destacadas.length > 0 && (
          <View style={{ marginBottom: Spacing.lg }}>
            <SectionHeader title={t.home.tiendas} colors={colors} />
            <FlatList
              horizontal
              data={destacadas}
              keyExtractor={s => 'd-' + s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
              renderItem={({ item, index }) => (
                <StoreCard s={item} index={index} destacada onPress={() => nav.navigate('Explore' as never)} />
              )}
            />
          </View>
        )}

        <SectionHeader
          title={categoria ? `${CATS.find(c => c.k === categoria)?.label ?? ''}` : t.home.populares}
          count={productos.length}
          colors={colors}
        />

        {/* ── GRID DE PRODUCTOS + SKELETONS ── */}
        {cargando ? (
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.gridCell}>
                <SkeletonCard height={140} />
              </View>
            ))}
          </View>
        ) : productos.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="cube-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyTxt, { color: colors.muted }]}>{t.home.sinProductos}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {productos.map((item, index) => (
              <View key={item.id} style={styles.gridCell}>
                <ProductCard
                  item={item}
                  index={index}
                  onPress={() => nav.navigate('Product', { productoId: item.id })}
                  onAdd={() => agregarCarrito(item)}
                  onSave={() => toggleGuardar(item)}
                />
              </View>
            ))}
          </View>
        )}

        {loadingMore && (
          <View style={{ padding: 18, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const CARD_W = (W - Spacing.md * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 3,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  entregarEn: { fontSize: 10, fontFamily: FontFamily.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  muniTxt: { fontSize: Fonts.regular, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, position: 'relative' },
  cartDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 8, right: 8, borderWidth: 1.5, borderColor: '#FFF' },
  notifBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifBadgeTxt: { color: '#FFF', fontSize: 9, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, height: 48,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 2,
  },
  searchIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  searchTxt: { flex: 1, fontSize: Fonts.regular, fontFamily: FontFamily.bodySemiBold },
  filterBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  banner: {
    borderRadius: 20, padding: Spacing.md, height: 132, overflow: 'hidden', justifyContent: 'flex-end',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
  },
  bannerContent: { zIndex: 2 },
  bannerTitulo: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 17, letterSpacing: -0.3 },
  bannerSub: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontFamily: FontFamily.bodySemiBold, marginTop: 4 },
  bannerOrb: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.13)', right: -30, top: -30 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.pill, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chipTxt: { fontSize: 13, fontFamily: FontFamily.bodyExtraBold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: Spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionBar: { width: 4, height: 16, borderRadius: 2, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.5 },
  sectionCount: { fontSize: 12, fontFamily: FontFamily.bodyBold },
  sectionCountNum: { fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },
  storeCard: {
    width: 200, borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  storeCover: { width: '100%', height: 90, position: 'relative' },
  storeCoverPlaceholder: { width: '100%', height: '100%' },
  goldBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D97706', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 4,
  },
  goldBadgeTxt: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 11, fontVariant: ['tabular-nums'] },
  storeLogo: { width: 34, height: 34, borderRadius: 17 },
  storeAvatarLetter: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 15 },
  storeNombre: { fontFamily: FontFamily.displayExtraBold, fontSize: 13 },
  storeMeta: { fontFamily: FontFamily.bodySemiBold, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  gridCell: { width: CARD_W },
  emptyBlock: { width: '100%', alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTxt: { marginTop: Spacing.sm, fontFamily: FontFamily.bodySemiBold, fontSize: Fonts.regular },
  card: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  imgBox: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  img: { width: '100%', height: '100%', position: 'absolute' },
  bookmarkBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { padding: Spacing.sm + 4 },
  nombre: { fontFamily: FontFamily.displayExtraBold, fontSize: 14, letterSpacing: -0.2 },
  tienda: { fontSize: 11, marginTop: 2, fontFamily: FontFamily.bodySemiBold },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  precio: { fontFamily: FontFamily.displayExtraBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.20, shadowRadius: 4, elevation: 3,
  },
});
