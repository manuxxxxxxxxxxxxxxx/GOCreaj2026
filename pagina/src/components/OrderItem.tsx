import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney, fmtDate } from '../utils/formatters';
import type { Order } from '../types';

const STATUS_COLORS: Record<string, string> = {
  confirmado: Colors.blue,
  preparando: Colors.amber,
  en_camino:  Colors.purple,
  entregado:  Colors.green,
  cancelado:  Colors.red,
};

const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  en_camino:  'En camino',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
};

interface Props {
  order: Order;
  onReorder?: (order: Order) => void;
  onTrack?: (order: Order) => void;
}

export default function OrderItemCard({ order, onReorder, onTrack }: Props) {
  const color = STATUS_COLORS[order.status] ?? Colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>{order.id}</Text>
          <Text style={styles.date}>{fmtDate(order.savedAt)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
        </View>
      </View>

      <View style={styles.items}>
        {order.items.map((item, idx) => (
          <Text key={idx} style={styles.itemRow}>
            {item.emoji} {item.name} ×{item.qty}
            {'  '}
            <Text style={styles.itemPrice}>{fmtMoney(item.price * item.qty)}</Text>
          </Text>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.total}>Total: {fmtMoney(order.total)}</Text>
        <View style={styles.actions}>
          {order.status !== 'entregado' && onTrack && (
            <TouchableOpacity style={styles.trackBtn} onPress={() => onTrack(order)}>
              <Text style={styles.trackBtnText}>Rastrear</Text>
            </TouchableOpacity>
          )}
          {onReorder && (
            <TouchableOpacity style={styles.reorderBtn} onPress={() => onReorder(order)}>
              <Text style={styles.reorderBtnText}>Repetir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  items: {
    marginBottom: 12,
    gap: 4,
  },
  itemRow: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  itemPrice: {
    color: Colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  total: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackBtn: {
    backgroundColor: Colors.purple + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  trackBtnText: {
    color: Colors.purple,
    fontSize: 12,
    fontWeight: '600',
  },
  reorderBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  reorderBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
