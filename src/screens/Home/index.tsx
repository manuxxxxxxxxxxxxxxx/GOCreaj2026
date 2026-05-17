// src/screens/Home/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { BANNERS, CATS, DEALS, NEARBY, TRENDING } from './HomeData';
import { s } from './styles';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W - 32;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        <View style={s.header}>
          <View>
            <TouchableOpacity style={s.locationRow}>
              <Text style={s.locationPin}>📍</Text>
              <Text style={s.locationText}>San Salvador, SV</Text>
              <Text style={s.locationChevron}>▾</Text>
            </TouchableOpacity>
            <Text style={s.greeting}>
              ¡Buenas, {user?.nombre || 'invitado'}! 👋
            </Text>
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

        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput style={s.searchInput} placeholder="Buscar tiendas, productos..." placeholderTextColor="#9ca3af" />
          <TouchableOpacity style={s.filterBtn}><Text style={s.filterTxt}>⚡</Text></TouchableOpacity>
        </View>

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
                  <TouchableOpacity style={s.addDealBtn} onPress={() => setCartCount(c => c + 1)}>
                    <Text style={s.addDealTxt}>+ Agregar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
                  <Animated.View style={{ transform: [{ scale: scaleAnim }], position: 'absolute', top: 8, right: 8 }}>
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
                    <TouchableOpacity style={s.addBtn} onPress={() => setCartCount(c => c + 1)}>
                      <Text style={s.addBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
                  <Text style={s.nearbyMetaTxt}>⭐ {n.rating}  •  📍 {n.distance}  •  ⏱ {n.time}</Text>
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