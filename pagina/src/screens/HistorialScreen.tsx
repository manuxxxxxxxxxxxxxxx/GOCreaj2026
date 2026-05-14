import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import OrderItemCard from '../components/OrderItem';
import { useOrders } from '../hooks/useOrders';
import { useCart } from '../hooks/useCart';
import Toast from '../components/Toast';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';
import type { Order, OrderStatus } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Historial'>;

const STATUS_FILTERS: { key: OrderStatus | 'todos'; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'confirmado', label: 'Confirmado' },
  { key: 'preparando', label: 'Preparando' },
  { key: 'en_camino',  label: 'En camino' },
  { key: 'entregado',  label: 'Entregado' },
];

export default function HistorialScreen({ navigation }: Props) {
  const { orders, loading, stats } = useOrders();
  const { addItem }                = useCart();
  const [filter, setFilter]        = useState<OrderStatus | 'todos'>('todos');
  const [toast,  setToast]         = useState({ visible: false, message: '' });

  const filtered = filter === 'todos' ? orders : orders.filter((o) => o.status === filter);

  async function handleReorder(order: Order) {
    for (const item of order.items) {
      const product = {
        id: item.productId, name: item.name, price: item.price,
        emoji: item.emoji, cat: 'otros' as const, seller: '—',
      };
      await addItem(product, item.qty);
    }
    setToast({ visible: true, message: '¡Pedido repetido! Revisa tu carrito.' });
    setTimeout(() => navigation.navigate('Cart' as any), 1200);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Pedidos</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.count}</Text>
          <Text style={styles.statLabel}>Pedidos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{fmtMoney(stats.totalSpent)}</Text>
          <Text style={styles.statLabel}>Total gastado</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
      </View>

      {/* Filter */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Orders */}
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Sin pedidos</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'todos' ? 'Aún no tienes pedidos. ¡Explora el mercado!' : 'No hay pedidos con ese estado.'}
            </Text>
            {filter === 'todos' && (
              <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Market' as any)}>
                <Text style={styles.shopBtnText}>Ir al Mercado</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <OrderItemCard
            order={item}
            onReorder={handleReorder}
            onTrack={() => navigation.navigate('Delivery' as any)}
          />
        )}
      />

      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ visible: false, message: '' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  backText:        { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 16,
  },
  stat:            { alignItems: 'center' },
  statNum:         { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel:       { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider:     { width: 1, height: 28, backgroundColor: Colors.border },
  filters:         { maxHeight: 52, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filtersContent:  { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  filterChipActive:{ backgroundColor: Colors.blue + '18', borderColor: Colors.blue },
  filterChipText:  { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  filterChipTextActive: { color: Colors.blue },
  listContent:     { padding: 16, paddingBottom: 80 },
  empty:           { alignItems: 'center', marginTop: 60 },
  emptyEmoji:      { fontSize: 56, marginBottom: 14 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyDesc:       { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  shopBtn:         { backgroundColor: Colors.blue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md },
  shopBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
