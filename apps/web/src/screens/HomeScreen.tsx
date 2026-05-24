import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  TextInput, StyleSheet, Animated, Dimensions, FlatList,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const BANNER_W = W - 32;
const CARD_W = (W - 48) / 2;

const BANNERS = [
  { id: 1, title: '¡Envío GRATIS hoy!', subtitle: 'En tu primera compra local', cta: 'Pedir ahora', emoji: '🛵', bg: 'https://images.unsplash.com/photo-1764745223157-64f76610cb3c?auto=format&fit=crop&w=600&q=80', color: '#059669' },
  { id: 2, title: 'Tacos El Compa', subtitle: 'Birria fresquita • Solo hoy 2×1', cta: 'Ver oferta', emoji: '🌮', bg: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=600&q=80', color: '#f97316' },
  { id: 3, title: 'Artesanías Locales', subtitle: 'Piezas únicas con 20% OFF', cta: 'Explorar', emoji: '🏺', bg: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=600&q=80', color: '#a855f7' },
];

const CATS = [
  { id: 0, name: 'Todos', icon: '🌟' }, { id: 1, name: 'Comida', icon: '🍔' },
  { id: 2, name: 'Artesanías', icon: '🏺' }, { id: 3, name: 'Moda', icon: '👗' },
  { id: 4, name: 'Mercado', icon: '🥦' }, { id: 5, name: 'Café', icon: '☕' },
  { id: 6, name: 'Plantas', icon: '🌿' }, { id: 7, name: 'Servicios', icon: '🛠️' },
];

const DEALS = [
  { id: 1, name: 'Tacos Birria x3', original: '$120', price: '$85', discount: '29%', image: 'https://images.unsplash.com/photo-1726514733212-0d99c0e2f1f4?auto=format&fit=crop&w=300&q=80', store: 'El Compa', sold: 67 },
  { id: 2, name: 'Jugo Verde 500ml', original: '$45', price: '$29', discount: '35%', image: 'https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?auto=format&fit=crop&w=300&q=80', store: 'NaturalMix', sold: 43 },
  { id: 3, name: 'Pan Artesanal', original: '$60', price: '$40', discount: '33%', image: 'https://images.unsplash.com/photo-1695767146048-939d927ef43c?auto=format&fit=crop&w=300&q=80', store: 'Panadería', sold: 28 },
];

const TRENDING = [
  { id: 1, name: 'Mochila Piel Artesanal', price: '$450', image: 'https://images.unsplash.com/photo-1731169243668-20feffc9d65a?auto=format&fit=crop&w=300&q=80', rating: 4.9, reviews: 128, tag: 'Más vendido', tagColor: '#fef3c7', tagTextColor: '#b45309' },
  { id: 2, name: 'Vasija Oaxaqueña', price: '$280', image: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=300&q=80', rating: 4.8, reviews: 94, tag: 'Artesanal', tagColor: '#ede9fe', tagTextColor: '#7c3aed' },
  { id: 3, name: 'Canasta Orgánica', price: '$150', image: 'https://images.unsplash.com/photo-1687199126774-bc777f6d7c6e?auto=format&fit=crop&w=300&q=80', rating: 4.7, reviews: 210, tag: 'Orgánico', tagColor: '#dcfce7', tagTextColor: '#15803d' },
  { id: 4, name: 'Café Oaxaqueño 250g', price: '$120', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=80', rating: 4.9, reviews: 176, tag: 'Premium', tagColor: '#fef3c7', tagTextColor: '#b45309' },
];

const NEARBY = [
  { id: 1, name: 'Tacos El Compa', category: 'Comida Callejera', image: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=200&q=80', rating: 4.8, distance: '1.2 km', time: '15-25 min', open: true },
  { id: 2, name: 'Artesanías Oaxaca', category: 'Artesanías & Arte', image: 'https://images.unsplash.com/photo-1773802551633-6068010cdaa4?auto=format&fit=crop&w=200&q=80', rating: 4.9, distance: '3.5 km', time: 'Recoge tú', open: true },
  { id: 3, name: 'Café El Retiro', category: 'Cafetería', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=200&q=80', rating: 4.9, distance: '0.8 km', time: '10-15 min', open: true },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCat, setActiveCat] = useState(0);
  const [favs, setFavs] = useState<number[]>([]);
  const [cartCount, setCartCount] = useState(2);
  const bannerRef = useRef<FlatList>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setInterval(() => {
      const next = (activeBanner + 1) % BANNERS.length;
      setActiveBanner(next);
      bannerRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(t);
  }, [activeBanner]);

  const toggleFav = (id: number) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setFavs(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);
  };

  const addToCart = () => {
    setCartCount(p => p + 1);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* HEADER */}
        <View style={s.header}>
          <View>
            <TouchableOpacity style={s.locationRow}>
              <Text style={s.locationPin}>📍</Text>
              <Text style={s.locationText}>San Salvador, SV</Text>
              <Text style={s.locationChevron}>▾</Text>
            </TouchableOpacity>
            <Text style={s.greeting}>¡Buenas! 👋</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconWrap}>
              <Text style={s.iconTxt}>🔔</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>3</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={s.iconWrap}>
              <Text style={s.iconTxt}>🛒</Text>
              {cartCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{cartCount}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH */}
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput style={s.searchInput} placeholder="Buscar tiendas, productos..." placeholderTextColor="#9ca3af" />
          <TouchableOpacity style={s.filterBtn}><Text style={s.filterTxt}>⚡</Text></TouchableOpacity>
        </View>

        {/* BANNERS */}
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <FlatList
            ref={bannerRef}
            data={BANNERS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => String(i.id)}
            onMomentumScrollEnd={e => setActiveBanner(Math.round(e.nativeEvent.contentOffset.x / BANNER_W))}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.95} style={s.bannerCard}>
                <Image source={{ uri: item.bg }} style={s.bannerImg} />
                <View style={[s.bannerOverlay, { backgroundColor: item.color + 'CC' }]}>
                  <Text style={s.bannerEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bannerTitle}>{item.title}</Text>
                    <Text style={s.bannerSub}>{item.subtitle}</Text>
                    <TouchableOpacity style={s.bannerCta}>
                      <Text style={s.bannerCtaTxt}>{item.cta} →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={s.dotsRow}>
            {BANNERS.map((_, i) => <View key={i} style={[s.dot, i === activeBanner && s.dotActive]} />)}
          </View>
        </View>

        {/* CATS */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Categorías</Text>
            <TouchableOpacity><Text style={s.seeAll}>Ver todas</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {CATS.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setActiveCat(c.id)} style={[s.chip, activeCat === c.id && s.chipActive]}>
                <Text style={s.chipIcon}>{c.icon}</Text>
                <Text style={[s.chipTxt, activeCat === c.id && s.chipTxtActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FLASH DEALS */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>⚡ Ofertas Flash</Text>
            <TouchableOpacity><Text style={s.seeAll}>Ver más</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {DEALS.map(d => (
              <TouchableOpacity key={d.id} style={s.dealCard} activeOpacity={0.9}>
                <View style={s.dealBadge}><Text style={s.dealBadgeTxt}>-{d.discount}</Text></View>
                <Image source={{ uri: d.image }} style={s.dealImg} />
                <View style={s.dealInfo}>
                  <Text style={s.dealName} numberOfLines={2}>{d.name}</Text>
                  <Text style={s.dealStore}>{d.store}</Text>
                  <View style={s.dealPriceRow}>
                    <Text style={s.dealOriginal}>{d.original}</Text>
                    <Text style={s.dealPrice}>{d.price}</Text>
                  </View>
                  <View style={s.soldRow}>
                    <View style={s.soldBar}>
                      <View style={[s.soldFill, { width: `${d.sold}%` }]} />
                    </View>
                    <Text style={s.soldTxt}>{d.sold} vendidos</Text>
                  </View>
                  <TouchableOpacity style={s.addDealBtn} onPress={addToCart}>
                    <Text style={s.addDealTxt}>+ Agregar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* TRENDING */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>🔥 En Tendencia</Text>
            <TouchableOpacity><Text style={s.seeAll}>Ver más</Text></TouchableOpacity>
          </View>
          <View style={s.grid}>
            {TRENDING.map(t => (
              <TouchableOpacity key={t.id} style={s.trendCard} activeOpacity={0.9}>
                <View style={{ position: 'relative', height: 140 }}>
                  <Image source={{ uri: t.image }} style={s.trendImg} />
                  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity style={s.favBtn} onPress={() => toggleFav(t.id)}>
                      <Text style={{ fontSize: 14 }}>{favs.includes(t.id) ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <View style={[s.trendTag, { backgroundColor: t.tagColor }]}>
                    <Text style={[s.trendTagTxt, { color: t.tagTextColor }]}>{t.tag}</Text>
                  </View>
                </View>
                <View style={s.trendInfo}>
                  <Text style={s.trendName} numberOfLines={2}>{t.name}</Text>
                  <View style={s.ratingRow}>
                    <Text style={{ fontSize: 10 }}>⭐</Text>
                    <Text style={s.ratingTxt}>{t.rating}</Text>
                    <Text style={s.reviewsTxt}>({t.reviews})</Text>
                  </View>
                  <View style={s.trendBottom}>
                    <Text style={s.trendPrice}>{t.price}</Text>
                    <TouchableOpacity style={s.addBtn} onPress={addToCart}>
                      <Text style={s.addBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* NEARBY STORES */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>📍 Tiendas Cercanas</Text>
            <TouchableOpacity><Text style={s.seeAll}>Ver mapa</Text></TouchableOpacity>
          </View>
          {NEARBY.map(n => (
            <TouchableOpacity key={n.id} style={s.nearbyCard} activeOpacity={0.9}>
              <Image source={{ uri: n.image }} style={s.nearbyImg} />
              <View style={{ flex: 1 }}>
                <View style={s.nearbyHead}>
                  <Text style={s.nearbyName}>{n.name}</Text>
                  <View style={[s.openBadge, !n.open && s.closedBadge]}>
                    <Text style={[s.openTxt, !n.open && s.closedTxt]}>{n.open ? 'Abierto' : 'Cerrado'}</Text>
                  </View>
                </View>
                <Text style={s.nearbyCat}>{n.category}</Text>
                <View style={s.nearbyMeta}>
                  <Text style={s.nearbyMetaTxt}>⭐ {n.rating}</Text>
                  <Text style={s.nearbyDot}>•</Text>
                  <Text style={s.nearbyMetaTxt}>📍 {n.distance}</Text>
                  <Text style={s.nearbyDot}>•</Text>
                  <Text style={s.nearbyMetaTxt}>⏱ {n.time}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 20, color: '#d1d5db' }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationPin: { fontSize: 12 },
  locationText: { fontSize: 14, fontWeight: '800', color: '#111' },
  locationChevron: { fontSize: 10, color: '#6b7280' },
  greeting: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconWrap: { position: 'relative', padding: 6 },
  iconTxt: { fontSize: 22 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', borderRadius: 999, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontSize: 9, color: '#fff', fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  filterBtn: { backgroundColor: '#f3f4f6', borderRadius: 10, padding: 6 },
  filterTxt: { fontSize: 14 },
  bannerCard: { width: BANNER_W, height: 160, borderRadius: 20, overflow: 'hidden', marginRight: 8 },
  bannerImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', padding: 20 },
  bannerEmoji: { fontSize: 48, marginRight: 16 },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  bannerCta: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, alignSelf: 'flex-start' },
  bannerCtaTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#d1d5db' },
  dotActive: { width: 20, backgroundColor: '#059669' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  seeAll: { fontSize: 12, fontWeight: '700', color: '#059669' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  chipActive: { backgroundColor: '#111' },
  chipIcon: { fontSize: 14 },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#374151' },
  chipTxtActive: { color: '#fff' },
  dealCard: { width: 150, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  dealBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, zIndex: 10 },
  dealBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  dealImg: { width: '100%', height: 110 },
  dealInfo: { padding: 10 },
  dealName: { fontSize: 12, fontWeight: '800', color: '#111', lineHeight: 16 },
  dealStore: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dealOriginal: { fontSize: 10, color: '#9ca3af', textDecorationLine: 'line-through' },
  dealPrice: { fontSize: 14, fontWeight: '900', color: '#059669' },
  soldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  soldBar: { flex: 1, height: 4, backgroundColor: '#f3f4f6', borderRadius: 999 },
  soldFill: { height: '100%', backgroundColor: '#f97316', borderRadius: 999 },
  soldTxt: { fontSize: 9, color: '#9ca3af' },
  addDealBtn: { backgroundColor: '#059669', borderRadius: 8, paddingVertical: 6, alignItems: 'center', marginTop: 8 },
  addDealTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  trendCard: { width: CARD_W, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  trendImg: { width: '100%', height: 140 },
  favBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  trendTag: { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  trendTagTxt: { fontSize: 9, fontWeight: '800' },
  trendInfo: { padding: 10 },
  trendName: { fontSize: 12, fontWeight: '800', color: '#111' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  ratingTxt: { fontSize: 11, fontWeight: '800', color: '#111' },
  reviewsTxt: { fontSize: 10, color: '#9ca3af' },
  trendBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  trendPrice: { fontSize: 14, fontWeight: '900', color: '#059669' },
  addBtn: { width: 28, height: 28, backgroundColor: '#111', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  nearbyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  nearbyImg: { width: 64, height: 64, borderRadius: 16, marginRight: 12 },
  nearbyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  nearbyName: { fontSize: 13, fontWeight: '900', color: '#111', flex: 1 },
  openBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  closedBadge: { backgroundColor: '#fee2e2' },
  openTxt: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  closedTxt: { color: '#dc2626' },
  nearbyCat: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  nearbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyMetaTxt: { fontSize: 11, color: '#6b7280' },
  nearbyDot: { fontSize: 10, color: '#d1d5db' },
});
