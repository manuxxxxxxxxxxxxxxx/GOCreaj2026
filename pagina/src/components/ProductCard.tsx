import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';
import type { Product } from '../types';

const BADGE_COLORS: Record<string, string> = {
  Promo:      Colors.badge.promo,
  Nuevo:      Colors.badge.new,
  Destacado:  Colors.badge.feat,
  Popular:    Colors.badge.pop,
};

interface Props {
  product: Product;
  onAddToCart: (product: Product) => void;
  onPress?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(product)} activeOpacity={0.85}>
      <View style={styles.imgBox}>
        <Text style={styles.emoji}>{product.emoji}</Text>
        {product.badge && (
          <View style={[styles.badge, { backgroundColor: BADGE_COLORS[product.badge] ?? Colors.badge.promo }]}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.seller}>{product.seller}</Text>

        <View style={styles.meta}>
          {product.rating != null && (
            <Text style={styles.rating}>⭐ {product.rating.toFixed(1)}</Text>
          )}
          {product.prepTime && (
            <Text style={styles.metaItem}>🕐 {product.prepTime}</Text>
          )}
          {product.distance && (
            <Text style={styles.metaItem}>📍 {product.distance}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{fmtMoney(product.price)}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => onAddToCart(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addBtnText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  imgBox: {
    height: 120,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: {
    fontSize: 52,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  seller: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  rating: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaItem: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  addBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
