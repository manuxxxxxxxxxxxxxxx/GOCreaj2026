import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Dimensions, FlatList, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

const REELS = [
  { id: 1, bg: 'https://images.unsplash.com/photo-1615312090659-f1da3fd2d85b?auto=format&fit=crop&w=800&q=80', avatar: 'https://images.unsplash.com/photo-1767327142296-c4999b0aadb9?auto=format&fit=crop&w=100&q=80', author: '@TacosElCompa', authorName: 'Tacos El Compa', verified: true, desc: '¡Saliendo la birria caliente del comal! 🔥 Ven hoy antes de que se acaben.', music: 'Banda El Recodo • Corrido Clásico', likes: '12.4k', comments: '340', shares: '89', distance: '1.2 km', product: 'Orden de Birria x3', price: '$85.00', productImg: 'https://images.unsplash.com/photo-1726514733212-0d99c0e2f1f4?auto=format&fit=crop&w=80&q=80', color: '#f97316' },
  { id: 2, bg: 'https://images.unsplash.com/photo-1773802551633-6068010cdaa4?auto=format&fit=crop&w=800&q=80', avatar: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=100&q=80', author: '@ArtesaniasOaxaca', authorName: 'Artesanías Oaxaca', verified: true, desc: 'Proceso de pintado a mano ✨ Cada pieza tarda 3 días. Somos artesanos de 4ta generación.', music: 'Los Mezcaleros • Tradición', likes: '8.5k', comments: '120', shares: '205', distance: '3.5 km', product: 'Vasija Artesanal XL', price: '$280.00', productImg: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=80&q=80', color: '#a855f7' },
  { id: 3, bg: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80', avatar: 'https://images.unsplash.com/photo-1751956066306-c5684cbcf385?auto=format&fit=crop&w=100&q=80', author: '@CafeElRetiro', authorName: 'Café El Retiro', verified: false, desc: 'Cosecha directa de las montañas de Chiapas ☕ Cada taza cuenta una historia.', music: 'Jazz Local • Morning Vibes', likes: '5.1k', comments: '87', shares: '134', distance: '0.8 km', product: 'Café Especial 250g', price: '$120.00', productImg: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=80&q=80', color: '#059669' },
  { id: 4, bg: 'https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?auto=format&fit=crop&w=800&q=80', avatar: 'https://images.unsplash.com/photo-1767327142296-c4999b0aadb9?auto=format&fit=crop&w=100&q=80', author: '@NaturalMix', authorName: 'NaturalMix', verified: true, desc: '🥤 Jugos 100% naturales sin azúcar añadida. ¡Energía pura para tu día!', music: 'Cumbia Sonidera • Mix 2024', likes: '3.2k', comments: '45', shares: '67', distance: '2.1 km', product: 'Jugo Verde 500ml', price: '$29.00', productImg: 'https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?auto=format&fit=crop&w=80&q=80', color: '#10b981' },
];

export function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const likeAnim = useRef(new Animated.Value(1)).current;

  const toggleLike = (id: number) => {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setLiked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const renderReel = ({ item }: { item: typeof REELS[0] }) => (
    <View style={[s.reel, { height: H - insets.bottom - 60 }]}>
      <Image source={{ uri: item.bg }} style={s.bg} />
      <View style={s.overlay} />

      {/* TOP BAR */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={s.topTitle}>⚡ [SV]Go Reels</Text>
        <TouchableOpacity style={s.cameraBtn}>
          <Text style={{ fontSize: 20 }}>📸</Text>
        </TouchableOpacity>
      </View>

      {/* RIGHT ACTIONS */}
      <View style={[s.actions, { paddingBottom: insets.bottom + 80 }]}>
        <View style={s.avatarWrap}>
          <Image source={{ uri: item.avatar }} style={s.avatar} />
          <View style={[s.followBtn, { backgroundColor: item.color }]}>
            <Text style={s.followTxt}>+</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
          <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(item.id)}>
            <Text style={s.actionIcon}>{liked.includes(item.id) ? '❤️' : '🤍'}</Text>
            <Text style={s.actionTxt}>{item.likes}</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={s.actionBtn}>
          <Text style={s.actionIcon}>💬</Text>
          <Text style={s.actionTxt}>{item.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn}>
          <Text style={s.actionIcon}>↗️</Text>
          <Text style={s.actionTxt}>{item.shares}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => setSaved(p => p.includes(item.id) ? p.filter(x => x !== item.id) : [...p, item.id])}>
          <Text style={s.actionIcon}>{saved.includes(item.id) ? '🔖' : '📌'}</Text>
          <Text style={s.actionTxt}>Guardar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn}>
          <Text style={s.actionIcon}>⋯</Text>
          <Text style={s.actionTxt}>Más</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INFO */}
      <View style={[s.bottomInfo, { paddingBottom: insets.bottom + 80 }]}>
        <View style={s.authorRow}>
          <Text style={s.authorName}>{item.authorName}</Text>
          {item.verified && <Text style={{ fontSize: 14 }}>✅</Text>}
          <Text style={s.authorHandle}>{item.author}</Text>
        </View>
        <Text style={s.desc} numberOfLines={2}>{item.desc}</Text>
        <Text style={s.music}>🎵 {item.music}</Text>
        <Text style={s.distance}>📍 {item.distance} de ti</Text>

        {/* PRODUCT CARD */}
        <View style={s.productCard}>
          <Image source={{ uri: item.productImg }} style={s.productImg} />
          <View style={{ flex: 1 }}>
            <Text style={s.productName}>{item.product}</Text>
            <Text style={[s.productPrice, { color: item.color }]}>{item.price}</Text>
          </View>
          <TouchableOpacity style={[s.buyBtn, { backgroundColor: item.color }]}>
            <Text style={s.buyBtnTxt}>🛒 Comprar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={REELS}
        renderItem={renderReel}
        keyExtractor={i => String(i.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={H - insets.bottom - 60}
        decelerationRate="fast"
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems[0]) setVisibleIndex(viewableItems[0].index ?? 0);
        }}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  reel: { width: W, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  cameraBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: 8 },
  actions: { position: 'absolute', right: 12, bottom: 0, alignItems: 'center', gap: 20 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 999, borderWidth: 2, borderColor: '#fff' },
  followBtn: { position: 'absolute', bottom: -8, left: '50%', marginLeft: -10, width: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  followTxt: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 18 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 28 },
  actionTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottomInfo: { position: 'absolute', left: 16, right: 80, bottom: 0 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '900' },
  authorHandle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  desc: { color: '#fff', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  music: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 },
  distance: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 10 },
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 10, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  productImg: { width: 48, height: 48, borderRadius: 10 },
  productName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  productPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  buyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  buyBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
