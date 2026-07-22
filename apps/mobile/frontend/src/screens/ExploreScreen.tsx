import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Dimensions, Animated, Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, Endpoints, API_URL } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { RootStackParamList } from '@/types';
import ExploreMapView, { ExploreMapHandle } from '@/components/ExploreMapView';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: W, height: H } = Dimensions.get('window');

const CATEGORIAS = [
  { key: '',           label: 'Todo',       icon: 'grid-outline' as const },
  { key: 'Comida',     label: 'Comida',     icon: 'fast-food-outline' as const },
  { key: 'Bebidas',    label: 'Bebidas',    icon: 'cafe-outline' as const },
  { key: 'Panadería',  label: 'Panadería',  icon: 'nutrition-outline' as const },
  { key: 'Ropa',       label: 'Ropa',       icon: 'shirt-outline' as const },
  { key: 'Electrónica',label: 'Tech',       icon: 'phone-portrait-outline' as const },
  { key: 'Mascotas',   label: 'Mascotas',   icon: 'paw-outline' as const },
  { key: 'Salud',      label: 'Salud',      icon: 'medkit-outline' as const },
];

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen?: string | null;
  categoria: string;
  tienda_nombre?: string;
  municipio?: string;
  tienda_lat?: number;
  tienda_lng?: number;
  rating?: number;
  distancia?: string;
}

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  return `${API_URL}/uploads/${path}`;
}

function ProductCard({ item, onPress }: { item: Producto; onPress: () => void }) {
  const { colors } = useTheme();
  const uri = imgUri(item.imagen);
  return (
    <TouchableOpacity style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.88}>
      <View style={S.cardImgWrap}>
        {uri
          ? <Image source={{ uri }} style={S.cardImg} resizeMode="cover" />
          : <View style={[S.cardImg, { backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="cube-outline" size={28} color={colors.muted} />
            </View>
        }
        <View style={[S.cardPricePill, { backgroundColor: colors.accent }]}>
          <Text style={S.cardPriceStr}>${Number(item.precio).toFixed(2)}</Text>
        </View>
      </View>
      <View style={S.cardBody}>
        <Text style={[S.cardName, { color: colors.text }]} numberOfLines={2}>{item.nombre}</Text>
        <Text style={[S.cardStore, { color: colors.muted }]} numberOfLines={1}>
          <Ionicons name="storefront-outline" size={11} color={colors.muted} /> {item.tienda_nombre ?? '—'}
        </Text>
        <View style={S.cardFoot}>
          <View style={[S.catPill, { backgroundColor: colors.accentLight }]}>
            <Text style={[S.catTxt, { color: colors.accent }]}>{item.categoria}</Text>
          </View>
          {item.municipio && (
            <Text style={[S.distTxt, { color: colors.muted }]}>
              <Ionicons name="location-outline" size={10} color={colors.muted} /> {item.municipio}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();

  const [query, setQuery]       = useState('');
  const [cat, setCat]           = useState('');
  const [items, setItems]       = useState<Producto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<number | null>(null);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);

  const mapRef   = useRef<ExploreMapHandle>(null);
  const listRef  = useRef<FlatList<Producto>>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mapItemsWithCoords = items.filter(i => i.tienda_lat && i.tienda_lng);
  const mapPins = mapItemsWithCoords.map(i => ({
    id: i.id, lat: Number(i.tienda_lat), lng: Number(i.tienda_lng),
    precio: i.precio, nombre: i.nombre, tiendaNombre: i.tienda_nombre,
  }));

  const buscar = useCallback(async (q: string, categoria: string, pageNum = 1, append = false) => {
    setLoading(true);
    try {
      // Endpoint correcto: productos.php?action=buscar (LIKE + FULLTEXT) o listar si no hay query
      const cleanQ = q.trim();
      const base = cleanQ
        ? `productos.php?action=buscar&q=${encodeURIComponent(cleanQ)}`
        : `productos.php?action=listar`;
      const url =
        `${base}&page=${pageNum}&limit=20&con_coordenadas=1` +
        (categoria ? `&categoria=${encodeURIComponent(categoria)}` : '');
      const r = await api<{ ok: boolean; productos?: Producto[]; has_more?: boolean }>(url);
      if (r.ok && r.productos) {
        setItems(prev => append ? [...prev, ...r.productos!] : r.productos!);
        setHasMore(r.has_more ?? (r.productos!.length === 20));
      }
    } catch { /* offline-safe */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    void buscar(query, cat, 1, false);
  }, [query, cat, buscar]);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    void buscar(query, cat, next, true);
  };

  const selectItem = (item: Producto) => {
    setSelected(item.id);
    if (item.tienda_lat && item.tienda_lng) {
      mapRef.current?.flyTo(item.tienda_lat, item.tienda_lng);
    }
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0 && viewMode === 'list') {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  };

  const selectById = (id: number) => {
    const item = items.find(i => i.id === id);
    if (item) selectItem(item);
  };

  const toggleView = () => {
    const toList = viewMode === 'map';
    Animated.timing(slideAnim, {
      toValue: toList ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
    setViewMode(toList ? 'list' : 'map');
  };

  const mapH = H * 0.52;

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>

      {/* ── Barra superior ── */}
      <View style={[S.topBar, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[S.topTitle, { color: colors.text }]}>Explorar</Text>

        {/* Buscador */}
        <View style={[S.searchRow, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={[S.searchInput, { color: colors.text }]}
            placeholder="Busca productos, tiendas…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle mapa / lista */}
        <TouchableOpacity
          style={[S.viewToggle, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          onPress={toggleView}
          activeOpacity={0.85}
        >
          <Ionicons
            name={viewMode === 'map' ? 'list-outline' : 'map-outline'}
            size={20}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* ── Filtros de categoría ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[S.catsScroll, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={S.catsContent}
      >
        {CATEGORIAS.map(c => {
          const active = cat === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[
                S.catChip,
                {
                  backgroundColor: active ? colors.accent : colors.elevated,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setCat(c.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={c.icon} size={14} color={active ? '#FFF' : colors.muted} style={{ marginRight: 5 }} />
              <Text style={[S.catChipTxt, { color: active ? '#FFF' : colors.text }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {viewMode === 'map' ? (
        /* ─── VISTA MAPA ─────────────────────────────────────── */
        <View style={{ flex: 1 }}>
          <View style={{ width: W, height: mapH }}>
            <ExploreMapView
              ref={mapRef}
              pins={mapPins}
              selectedId={selected}
              isDark={isDark}
              accent={colors.accent}
              onSelectMarker={selectById}
            />
          </View>

          {/* Botón mi ubicación */}
          <TouchableOpacity
            style={[S.myLocBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => mapRef.current?.reset()}
          >
            <Ionicons name="locate-outline" size={20} color={colors.accent} />
          </TouchableOpacity>

          {/* Carrusel de productos debajo del mapa */}
          <View style={[S.carouselWrap, { backgroundColor: colors.background }]}>
            <View style={S.carouselHeaderRow}>
              <Text style={[S.carouselTitle, { color: colors.text }]}>
                {loading ? 'Buscando…' : `${items.length} resultado${items.length !== 1 ? 's' : ''}`}
              </Text>
              {loading && <ActivityIndicator size="small" color={colors.accent} />}
            </View>
            {items.length === 0 && !loading ? (
              <View style={S.emptyCarousel}>
                <Ionicons name="search-outline" size={32} color={colors.muted} />
                <Text style={[S.emptyTxt, { color: colors.muted }]}>Sin resultados. Prueba otra búsqueda.</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={items}
                keyExtractor={i => String(i.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}
                ItemSeparatorComponent={() => <View style={{ width: Spacing.sm }} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      S.carouselCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: selected === item.id ? colors.accent : colors.border,
                        borderWidth: selected === item.id ? 2 : StyleSheet.hairlineWidth,
                      },
                    ]}
                    onPress={() => { selectItem(item); nav.navigate('Product', { productId: item.id }); }}
                    activeOpacity={0.88}
                  >
                    {imgUri(item.imagen)
                      ? <Image source={{ uri: imgUri(item.imagen) }} style={S.carouselImg} resizeMode="cover" />
                      : <View style={[S.carouselImg, { backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="cube-outline" size={22} color={colors.muted} />
                        </View>
                    }
                    <View style={S.carouselInfo}>
                      <Text style={[S.carouselName, { color: colors.text }]} numberOfLines={2}>{item.nombre}</Text>
                      <Text style={[S.carouselPrice, { color: colors.accent }]}>${Number(item.precio).toFixed(2)}</Text>
                      <Text style={[S.carouselStore, { color: colors.muted }]} numberOfLines={1}>{item.tienda_nombre}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      ) : (
        /* ─── VISTA LISTA ────────────────────────────────────── */
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={i => String(i.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm }}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : (
              <View style={S.emptyBlock}>
                <Ionicons name="search-outline" size={44} color={colors.muted} />
                <Text style={[S.emptyTxt, { color: colors.muted }]}>Sin resultados. Prueba otra búsqueda.</Text>
              </View>
            )
          }
          ListFooterComponent={hasMore && items.length > 0 ? <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} /> : null}
          renderItem={({ item }) => (
            <ProductCard item={item} onPress={() => nav.navigate('Product', { productId: item.id })} />
          )}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  topTitle: { fontSize: Fonts.heading - 6, fontWeight: '900', letterSpacing: -0.5 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1.5,
    paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: Fonts.regular, fontWeight: '500' },
  viewToggle: {
    position: 'absolute', right: Spacing.md, bottom: 10,
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },

  // Categorías
  catsScroll: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  catsContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1.5,
  },
  catChipTxt: { fontSize: Fonts.small + 1, fontWeight: '700' },

  // My location button
  myLocBtn: {
    position: 'absolute', right: Spacing.md, top: 10,
    width: 42, height: 42, borderRadius: 21, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },

  // Carousel bajo el mapa
  carouselWrap:      { flex: 1 },
  carouselHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 12, paddingBottom: 4 },
  carouselTitle:     { fontSize: Fonts.small + 1, fontWeight: '700' },
  emptyCarousel:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  carouselCard: {
    width: 150, borderRadius: Radius.md, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  carouselImg:   { width: 150, height: 110 },
  carouselInfo:  { padding: 8 },
  carouselName:  { fontSize: 12, fontWeight: '700', marginBottom: 2, lineHeight: 16 },
  carouselPrice: { fontSize: 14, fontWeight: '900', marginBottom: 1 },
  carouselStore: { fontSize: 10, fontWeight: '500' },

  // Grid list
  card: {
    flex: 1, borderRadius: Radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardImgWrap: { position: 'relative', height: 130 },
  cardImg:     { width: '100%', height: 130 },
  cardPricePill: {
    position: 'absolute', bottom: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  cardPriceStr: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  cardBody:     { padding: Spacing.sm },
  cardName:     { fontSize: 13, fontWeight: '800', marginBottom: 3, lineHeight: 18 },
  cardStore:    { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  cardFoot:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  catPill:      { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.pill },
  catTxt:       { fontSize: 9, fontWeight: '800' },
  distTxt:      { fontSize: 9, fontWeight: '500' },

  // Empty
  emptyBlock: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyTxt:   { fontSize: Fonts.regular, fontWeight: '500', textAlign: 'center', paddingHorizontal: Spacing.xl },
});
