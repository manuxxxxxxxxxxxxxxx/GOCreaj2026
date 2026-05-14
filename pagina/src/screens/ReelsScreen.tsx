import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useCart } from '../hooks/useCart';
import Toast from '../components/Toast';
import { Colors, Radius } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';
import type { Reel } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reels'>;

const { width, height } = Dimensions.get('window');
const REEL_HEIGHT = height - 80;

const REELS: Reel[] = [
  {
    id: 1, author: 'Panadería Don José', handle: '@panaderia_jose', verified: true,
    description: '🥖 Pan recién horneado cada mañana. ¡Pedido mínimo $5!',
    music: '🎵 Música tradicional · Local beats', distance: '0.3 km',
    likes: 1284, comments: 89,
    product: { name: 'Pan Artesanal Integral', price: 4.05, emoji: '🥖' },
  },
  {
    id: 2, author: 'Huerto Verde', handle: '@huerto_verde', verified: true,
    description: '🥬 Verduras orgánicas cosechadas hoy. ¡Frescura garantizada!',
    music: '🎵 Nature sounds · Ambient', distance: '0.7 km',
    likes: 876, comments: 45,
    product: { name: 'Verduras Orgánicas Mix', price: 12.00, emoji: '🥬' },
  },
  {
    id: 3, author: 'Café del Barrio', handle: '@cafe_barrio', verified: false,
    description: '☕ El mejor café de especialidad del barrio. Latte art incluido.',
    music: '🎵 Jazz café · Morning vibes', distance: '0.5 km',
    likes: 2103, comments: 134,
    product: { name: 'Café Premium 250g', price: 8.75, emoji: '☕' },
  },
  {
    id: 4, author: 'Manos Creativas', handle: '@manos_creativas', verified: false,
    description: '🎨 Artesanías únicas hechas a mano. Cada pieza es especial.',
    music: '🎵 Folk local · Artisan sounds', distance: '1.2 km',
    likes: 543, comments: 67,
    product: { name: 'Artesanías Decorativas', price: 21.25, emoji: '🎨' },
  },
];

export default function ReelsScreen({ navigation }: Props) {
  const { addItem }       = useCart();
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState({ visible: false, message: '' });
  const scaleAnims = useRef<Record<number, Animated.Value>>({});

  REELS.forEach((r) => {
    if (!scaleAnims.current[r.id]) {
      scaleAnims.current[r.id] = new Animated.Value(1);
    }
  });

  function handleLike(id: number) {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    Animated.sequence([
      Animated.timing(scaleAnims.current[id], { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnims.current[id], { toValue: 1,   duration: 150, useNativeDriver: true }),
    ]).start();
  }

  function handleBuy(reel: Reel) {
    if (!reel.product) return;
    const product = { id: reel.id, name: reel.product.name, price: reel.product.price, emoji: reel.product.emoji, cat: 'otros' as const, seller: reel.author };
    addItem(product);
    setToast({ visible: true, message: `${reel.product.emoji} Agregado al carrito` });
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark }}>
      {/* Back button */}
      <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack()}>
        <Text style={styles.navBackText}>‹</Text>
      </TouchableOpacity>

      <FlatList
        data={REELS}
        keyExtractor={(r) => String(r.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={[styles.reel, { height: REEL_HEIGHT }]}>
            {/* Background gradient */}
            <View style={styles.reelBg}>
              <Text style={styles.reelBgEmoji}>{item.product?.emoji ?? '▶️'}</Text>
            </View>

            {/* Overlay */}
            <View style={styles.overlay} />

            {/* Right actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
                <Animated.Text style={[styles.actionIcon, { transform: [{ scale: scaleAnims.current[item.id] }] }]}>
                  {liked[item.id] ? '❤️' : '🤍'}
                </Animated.Text>
                <Text style={styles.actionCount}>{liked[item.id] ? item.likes + 1 : item.likes}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setToast({ visible: true, message: 'Comentarios próximamente' })}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionCount}>{item.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setToast({ visible: true, message: 'Compartido' })}>
                <Text style={styles.actionIcon}>↗️</Text>
                <Text style={styles.actionCount}>Compartir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setSaved((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}>
                <Text style={styles.actionIcon}>{saved[item.id] ? '🔖' : '🏷️'}</Text>
                <Text style={styles.actionCount}>Guardar</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom info */}
            <View style={styles.info}>
              <View style={styles.authorRow}>
                <View style={styles.authorAvatar}>
                  <Text style={{ fontSize: 16 }}>{item.product?.emoji ?? '🏪'}</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.authorName}>{item.author}</Text>
                    {item.verified && <Text style={{ fontSize: 13 }}>✓</Text>}
                  </View>
                  <Text style={styles.authorHandle}>{item.handle}</Text>
                </View>
              </View>

              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.music}>{item.music}</Text>
              <Text style={styles.distance}>📍 {item.distance}</Text>

              {/* Product buy card */}
              {item.product && (
                <View style={styles.productCard}>
                  <Text style={styles.productEmoji}>{item.product.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.product.name}</Text>
                    <Text style={styles.productPrice}>{fmtMoney(item.product.price)}</Text>
                  </View>
                  <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(item)}>
                    <Text style={styles.buyBtnText}>Comprar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      />

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navBack:         { position: 'absolute', top: 50, left: 16, zIndex: 20, padding: 8 },
  navBackText:     { fontSize: 28, color: Colors.white, fontWeight: '600' },
  reel:            { width, position: 'relative' },
  reelBg:          { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
  reelBgEmoji:     { fontSize: 120, opacity: 0.15 },
  overlay:         { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  actions: {
    position: 'absolute', right: 12, bottom: 180,
    alignItems: 'center', gap: 20,
  },
  actionBtn:       { alignItems: 'center', gap: 3 },
  actionIcon:      { fontSize: 28 },
  actionCount:     { color: Colors.white, fontSize: 11, fontWeight: '600' },
  info:            { position: 'absolute', left: 16, right: 72, bottom: 30 },
  authorRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  authorAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  authorName:      { color: Colors.white, fontWeight: '700', fontSize: 14 },
  authorHandle:    { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  description:     { color: Colors.white, fontSize: 13, lineHeight: 19, marginBottom: 6 },
  music:           { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  distance:        { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 12 },
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: Radius.lg, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  productEmoji:    { fontSize: 28 },
  productName:     { color: Colors.white, fontWeight: '700', fontSize: 13 },
  productPrice:    { color: Colors.cyan, fontSize: 14, fontWeight: '800', marginTop: 2 },
  buyBtn:          { backgroundColor: Colors.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  buyBtnText:      { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
