import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';
import Toast from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverDashboard'>;

const AVAILABLE_DELIVERIES = [
  { id: 'LM-48293', seller: 'Panadería Don José', buyer: 'Ana García',  address: 'Calle Principal 45',   earnings: 3.08, distance: '0.8 km', items: 3 },
  { id: 'LM-48292', seller: 'Huerto Verde',        buyer: 'Luis Torres', address: 'Av. Central 120',      earnings: 2.40, distance: '1.2 km', items: 2 },
];

export default function DriverDashboardScreen({ navigation }: Props) {
  const [toast,     setToast]     = useState({ visible: false, message: '' });
  const [accepted,  setAccepted]  = useState<string[]>([]);

  function acceptDelivery(id: string) {
    setAccepted((prev) => [...prev, id]);
    setToast({ visible: true, message: `Entrega ${id} aceptada` });
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Repartidor</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Earnings KPIs */}
        <View style={styles.kpiGrid}>
          {[
            { label: 'Hoy',    value: fmtMoney(18.40), icon: '💵', color: Colors.green },
            { label: 'Semana', value: fmtMoney(124.60), icon: '📈', color: Colors.blue },
            { label: 'Mes',    value: fmtMoney(487.20), icon: '💰', color: Colors.purple },
            { label: 'Rating', value: '4.9 ⭐',        icon: '⭐', color: Colors.amber },
          ].map((k) => (
            <View key={k.label} style={[styles.kpiCard, { borderTopColor: k.color }]}>
              <Text style={styles.kpiIcon}>{k.icon}</Text>
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estadísticas</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>23</Text>
              <Text style={styles.statLabel}>Entregas hoy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>12 min</Text>
              <Text style={styles.statLabel}>Tiempo prom.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>98%</Text>
              <Text style={styles.statLabel}>Aceptación</Text>
            </View>
          </View>
        </View>

        {/* Available deliveries */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entregas disponibles</Text>
          {AVAILABLE_DELIVERIES.map((d) => {
            const isAccepted = accepted.includes(d.id);
            return (
              <View key={d.id} style={styles.deliveryCard}>
                <View style={styles.deliveryTop}>
                  <Text style={styles.deliveryId}>{d.id}</Text>
                  <Text style={styles.deliveryDistance}>📍 {d.distance}</Text>
                </View>
                <Text style={styles.deliverySeller}>🏪 {d.seller}</Text>
                <Text style={styles.deliveryBuyer}>👤 {d.buyer}</Text>
                <Text style={styles.deliveryAddress}>📍 {d.address}</Text>
                <View style={styles.deliveryFooter}>
                  <View style={styles.deliveryEarnings}>
                    <Text style={styles.deliveryEarningsLabel}>Ganancia</Text>
                    <Text style={styles.deliveryEarningsValue}>{fmtMoney(d.earnings)}</Text>
                  </View>
                  {isAccepted ? (
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: Colors.green }]}
                      onPress={() => navigation.navigate('Delivery' as any)}
                    >
                      <Text style={styles.acceptBtnText}>Ver entrega →</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => acceptDelivery(d.id)}
                    >
                      <Text style={styles.acceptBtnText}>Aceptar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery history */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Últimas entregas</Text>
          {[
            { id: 'LM-48288', buyer: 'María López',   earnings: 2.80, time: '09:45 AM', rating: 5 },
            { id: 'LM-48281', buyer: 'Pedro García',  earnings: 3.20, time: '09:12 AM', rating: 5 },
            { id: 'LM-48275', buyer: 'Rosa Martínez', earnings: 2.40, time: 'Ayer',      rating: 4 },
          ].map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={styles.historyIconBox}>
                <Text style={{ fontSize: 18 }}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyId}>{h.id} · {h.buyer}</Text>
                <Text style={styles.historyTime}>{h.time}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.historyEarnings}>{fmtMoney(h.earnings)}</Text>
                <Text style={styles.historyRating}>{'⭐'.repeat(h.rating)}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ visible: false, message: '' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  backText:        { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  content:         { padding: 16, paddingBottom: 80 },
  kpiGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 3, ...Shadow.card,
    alignItems: 'center',
  },
  kpiIcon:         { fontSize: 24, marginBottom: 6 },
  kpiValue:        { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  kpiLabel:        { fontSize: 11, color: Colors.textMuted },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  statsRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  stat:            { alignItems: 'center' },
  statNum:         { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel:       { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider:     { width: 1, height: 32, backgroundColor: Colors.border },
  deliveryCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, marginBottom: 12,
  },
  deliveryTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  deliveryId:      { fontSize: 13, fontWeight: '700', color: Colors.text },
  deliveryDistance:{ fontSize: 12, color: Colors.textMuted },
  deliverySeller:  { fontSize: 12, color: Colors.text, marginBottom: 3 },
  deliveryBuyer:   { fontSize: 12, color: Colors.textMuted, marginBottom: 3 },
  deliveryAddress: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  deliveryFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryEarnings:{ },
  deliveryEarningsLabel: { fontSize: 11, color: Colors.textMuted },
  deliveryEarningsValue: { fontSize: 17, fontWeight: '800', color: Colors.green },
  acceptBtn:       { backgroundColor: Colors.blue, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.md },
  acceptBtnText:   { color: Colors.white, fontWeight: '700', fontSize: 14 },
  historyRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyIconBox:  { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.green + '20', alignItems: 'center', justifyContent: 'center' },
  historyId:       { fontSize: 13, fontWeight: '600', color: Colors.text },
  historyTime:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyEarnings: { fontSize: 14, fontWeight: '700', color: Colors.green },
  historyRating:   { fontSize: 10, marginTop: 2 },
});
