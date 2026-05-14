import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  FlatList, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';
import { CATALOG } from '../data/catalog';
import Toast from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerDashboard'>;

type DashTab = 'resumen' | 'productos' | 'pedidos';

const DEMO_ORDERS = [
  { id: 'LM-48291', buyer: 'Ana García',  items: 'Pan Integral ×2, Croissant ×1', total: 11.55, status: 'preparando', time: '10:32 AM' },
  { id: 'LM-48290', buyer: 'Luis Torres', items: 'Baguette ×3',                   total: 12.00, status: 'confirmado', time: '10:15 AM' },
  { id: 'LM-48285', buyer: 'María López', items: 'Pan Integral ×1, Galletas ×2',  total: 16.05, status: 'entregado',  time: 'Ayer' },
];

const STATUS_COLOR: Record<string, string> = {
  confirmado: Colors.blue,
  preparando: Colors.amber,
  entregado:  Colors.green,
};

export default function SellerDashboardScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<DashTab>('resumen');
  const [toast,     setToast]     = useState({ visible: false, message: '' });

  const myProducts = CATALOG.filter((p) => p.seller === 'Panadería Don José');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Vendedor</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {([
          { key: 'resumen',   label: 'Resumen' },
          { key: 'productos', label: 'Productos' },
          { key: 'pedidos',   label: 'Pedidos' },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {activeTab === 'resumen' && (
          <>
            {/* KPI cards */}
            <View style={styles.kpiGrid}>
              {[
                { label: 'Ingresos totales', value: fmtMoney(843.20), icon: '💰', color: Colors.green },
                { label: 'Pedidos hoy',       value: '7',             icon: '📦', color: Colors.blue },
                { label: 'Rating',            value: '4.8 ⭐',        icon: '⭐', color: Colors.amber },
                { label: 'Comisión (10%)',    value: fmtMoney(84.32), icon: '📊', color: Colors.purple },
              ].map((k) => (
                <View key={k.label} style={[styles.kpiCard, { borderLeftColor: k.color }]}>
                  <Text style={styles.kpiIcon}>{k.icon}</Text>
                  <Text style={styles.kpiValue}>{k.value}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>

            {/* Top products */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Productos más vendidos</Text>
              {[
                { name: 'Pan Artesanal Integral', sales: 48, revenue: fmtMoney(194.40) },
                { name: 'Croissant de Mantequilla', sales: 31, revenue: fmtMoney(108.50) },
                { name: 'Baguette Clásica', sales: 24, revenue: fmtMoney(96.00) },
              ].map((p, i) => (
                <View key={p.name} style={styles.topProductRow}>
                  <View style={styles.topProductRank}><Text style={styles.topProductRankText}>#{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topProductName}>{p.name}</Text>
                    <Text style={styles.topProductSales}>{p.sales} ventas</Text>
                  </View>
                  <Text style={styles.topProductRevenue}>{p.revenue}</Text>
                </View>
              ))}
            </View>

            {/* Weekly chart placeholder */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ventas esta semana</Text>
              <View style={styles.chartPlaceholder}>
                {[60, 85, 45, 90, 70, 100, 65].map((h, i) => (
                  <View key={i} style={styles.barWrap}>
                    <View style={[styles.bar, { height: h * 0.8, backgroundColor: Colors.blue + (i === 5 ? 'ff' : '80') }]} />
                    <Text style={styles.barLabel}>{['L','M','X','J','V','S','D'][i]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === 'productos' && (
          <>
            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={() => setToast({ visible: true, message: 'Formulario de producto próximamente' })}
            >
              <Text style={styles.addProductBtnText}>+ Agregar Producto</Text>
            </TouchableOpacity>
            {myProducts.map((p) => (
              <View key={p.id} style={styles.productRow}>
                <Text style={styles.productEmoji}>{p.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productPrice}>{fmtMoney(p.price)}</Text>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => setToast({ visible: true, message: `Editar ${p.name}` })}>
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {activeTab === 'pedidos' && (
          <>
            {DEMO_ORDERS.map((o) => (
              <View key={o.id} style={styles.orderRow}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderId}>{o.id}</Text>
                  <View style={[styles.orderBadge, { backgroundColor: (STATUS_COLOR[o.status] ?? Colors.textMuted) + '20' }]}>
                    <Text style={[styles.orderBadgeText, { color: STATUS_COLOR[o.status] ?? Colors.textMuted }]}>{o.status}</Text>
                  </View>
                </View>
                <Text style={styles.orderBuyer}>{o.buyer} · {o.time}</Text>
                <Text style={styles.orderItems}>{o.items}</Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>{fmtMoney(o.total)}</Text>
                  {o.status !== 'entregado' && (
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => setToast({ visible: true, message: `Pedido ${o.id} actualizado` })}
                    >
                      <Text style={styles.confirmBtnText}>
                        {o.status === 'confirmado' ? 'Preparar' : 'Listo para entrega'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ visible: false, message: '' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  backText:        { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  tabs:            { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab:             { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:       { borderBottomWidth: 2, borderBottomColor: Colors.blue },
  tabText:         { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive:   { color: Colors.blue },
  content:         { padding: 16, paddingBottom: 80 },
  kpiGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, ...Shadow.card,
  },
  kpiIcon:         { fontSize: 22, marginBottom: 6 },
  kpiValue:        { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  kpiLabel:        { fontSize: 11, color: Colors.textMuted },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  topProductRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topProductRank:  { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.blue + '20', alignItems: 'center', justifyContent: 'center' },
  topProductRankText: { fontSize: 11, fontWeight: '700', color: Colors.blue },
  topProductName:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  topProductSales: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  topProductRevenue: { fontSize: 13, fontWeight: '700', color: Colors.green },
  chartPlaceholder:{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 90, marginTop: 8 },
  barWrap:         { alignItems: 'center', gap: 4 },
  bar:             { width: 28, borderRadius: 4 },
  barLabel:        { fontSize: 10, color: Colors.textMuted },
  addProductBtn:   { backgroundColor: Colors.blue, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  addProductBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  productEmoji:    { fontSize: 32 },
  productName:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  productPrice:    { fontSize: 13, color: Colors.blue, fontWeight: '600', marginTop: 2 },
  editBtn:         { backgroundColor: Colors.blue + '18', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm },
  editBtnText:     { color: Colors.blue, fontWeight: '600', fontSize: 13 },
  orderRow: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  orderTop:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId:         { fontSize: 13, fontWeight: '700', color: Colors.text },
  orderBadge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  orderBadgeText:  { fontSize: 11, fontWeight: '700' },
  orderBuyer:      { fontSize: 12, color: Colors.textMuted, marginBottom: 3 },
  orderItems:      { fontSize: 13, color: Colors.text, marginBottom: 10 },
  orderFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal:      { fontSize: 15, fontWeight: '800', color: Colors.text },
  confirmBtn:      { backgroundColor: Colors.green, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm },
  confirmBtnText:  { color: Colors.white, fontWeight: '600', fontSize: 12 },
});
