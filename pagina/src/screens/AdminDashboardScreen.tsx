import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney, fmtDate } from '../utils/formatters';
import { DEMO_USERS } from '../data/catalog';
import Toast from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;
type AdminTab = 'resumen' | 'usuarios' | 'pedidos';

const ROLE_LABELS: Record<string, string> = {
  buyer: 'Comprador', seller: 'Vendedor', driver: 'Repartidor', admin: 'Admin', master_admin: 'Master',
};

export default function AdminDashboardScreen({ navigation }: Props) {
  const [activeTab, setActiveTab]   = useState<AdminTab>('resumen');
  const [userSearch, setUserSearch] = useState('');
  const [toast,      setToast]      = useState({ visible: false, message: '' });
  const [users,      setUsers]      = useState(DEMO_USERS);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'verified' ? 'banned' : 'verified' } : u
      )
    );
    setToast({ visible: true, message: 'Estado de usuario actualizado' });
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel Admin</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['resumen', 'usuarios', 'pedidos'] as AdminTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {activeTab === 'resumen' && (
          <>
            <View style={styles.kpiGrid}>
              {[
                { label: 'Ingresos plataforma',  value: fmtMoney(2840.50), icon: '💰', color: Colors.green },
                { label: 'Total usuarios',        value: '8',              icon: '👥', color: Colors.blue },
                { label: 'Verificaciones pendientes', value: '2',          icon: '⏳', color: Colors.amber },
                { label: 'Pedidos este mes',      value: '34',             icon: '📦', color: Colors.purple },
              ].map((k) => (
                <View key={k.label} style={[styles.kpiCard, { borderTopColor: k.color }]}>
                  <Text style={styles.kpiIcon}>{k.icon}</Text>
                  <Text style={styles.kpiValue}>{k.value}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>

            {/* Users by role */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Usuarios por rol</Text>
              {[
                { role: 'buyer',  count: users.filter((u) => u.role === 'buyer').length,  icon: '🛒' },
                { role: 'seller', count: users.filter((u) => u.role === 'seller').length, icon: '🏪' },
                { role: 'driver', count: users.filter((u) => u.role === 'driver').length, icon: '🛵' },
                { role: 'admin',  count: users.filter((u) => u.role === 'admin' || u.role === 'master_admin').length, icon: '⚙️' },
              ].map((r) => (
                <View key={r.role} style={styles.roleRow}>
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={styles.roleLabel}>{ROLE_LABELS[r.role]}</Text>
                  <View style={styles.roleBar}>
                    <View style={[styles.roleBarFill, { width: `${(r.count / users.length) * 100}%` as any, backgroundColor: Colors.blue }]} />
                  </View>
                  <Text style={styles.roleCount}>{r.count}</Text>
                </View>
              ))}
            </View>

            {/* Recent activity */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Actividad reciente</Text>
              {[
                { msg: 'María López solicitó verificación como repartidor', time: 'Hace 2h',  icon: '🛵' },
                { msg: 'José Hernández se registró como repartidor',         time: 'Hace 1d',  icon: '👤' },
                { msg: 'Nuevo pedido LM-48291 completado',                  time: 'Hace 3h',  icon: '✓' },
              ].map((a, i) => (
                <View key={i} style={styles.activityRow}>
                  <Text style={styles.activityIcon}>{a.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityMsg}>{a.msg}</Text>
                    <Text style={styles.activityTime}>{a.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'usuarios' && (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o correo…"
              value={userSearch}
              onChangeText={setUserSearch}
              placeholderTextColor={Colors.textMuted}
            />
            {filteredUsers.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitials}>{u.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.userBadgeRow}>
                    <View style={styles.userRoleBadge}>
                      <Text style={styles.userRoleBadgeText}>{ROLE_LABELS[u.role] ?? u.role}</Text>
                    </View>
                    <View style={[styles.userStatusBadge, { backgroundColor: u.status === 'verified' ? Colors.green + '20' : Colors.amber + '20' }]}>
                      <Text style={[styles.userStatusText, { color: u.status === 'verified' ? Colors.green : Colors.amber }]}>
                        {u.status === 'verified' ? 'Verificado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: u.status === 'verified' ? Colors.red + '18' : Colors.green + '18' }]}
                  onPress={() => toggleStatus(u.id)}
                >
                  <Text style={{ color: u.status === 'verified' ? Colors.red : Colors.green, fontSize: 12, fontWeight: '600' }}>
                    {u.status === 'verified' ? 'Banear' : 'Aprobar'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {activeTab === 'pedidos' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Todos los pedidos</Text>
            {[
              { id: 'LM-48293', buyer: 'Ana García',   seller: 'Panadería Don José', total: 8.55,  status: 'preparando' },
              { id: 'LM-48291', buyer: 'Luis Torres',  seller: 'Huerto Verde',        total: 12.00, status: 'entregado' },
              { id: 'LM-48288', buyer: 'María López',  seller: 'Café del Barrio',     total: 9.25,  status: 'en_camino' },
            ].map((o) => (
              <View key={o.id} style={styles.orderRow}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderId}>{o.id}</Text>
                  <Text style={[styles.orderStatus, { color: o.status === 'entregado' ? Colors.green : Colors.blue }]}>{o.status}</Text>
                </View>
                <Text style={styles.orderParties}>{o.buyer} → {o.seller}</Text>
                <Text style={styles.orderTotal}>{fmtMoney(o.total)}</Text>
              </View>
            ))}
          </View>
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
  tabActive:       { borderBottomWidth: 2, borderBottomColor: Colors.orange },
  tabText:         { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive:   { color: Colors.orange },
  content:         { padding: 16, paddingBottom: 80 },
  kpiGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: 14, borderWidth: 1,
    borderColor: Colors.border, borderTopWidth: 3, alignItems: 'center', ...Shadow.card,
  },
  kpiIcon:         { fontSize: 24, marginBottom: 6 },
  kpiValue:        { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  kpiLabel:        { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  roleRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  roleIcon:        { fontSize: 18, width: 24 },
  roleLabel:       { fontSize: 13, color: Colors.text, width: 80 },
  roleBar:         { flex: 1, height: 8, backgroundColor: Colors.bg, borderRadius: 4, overflow: 'hidden' },
  roleBarFill:     { height: '100%', borderRadius: 4 },
  roleCount:       { fontSize: 13, fontWeight: '700', color: Colors.text, width: 20, textAlign: 'right' },
  activityRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  activityIcon:    { fontSize: 18, width: 24 },
  activityMsg:     { fontSize: 13, color: Colors.text, lineHeight: 18 },
  activityTime:    { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  searchInput:     { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, marginBottom: 12 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  userAvatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.orange + '25', alignItems: 'center', justifyContent: 'center' },
  userInitials:    { fontSize: 18, fontWeight: '700', color: Colors.orange },
  userName:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  userEmail:       { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  userBadgeRow:    { flexDirection: 'row', gap: 6, marginTop: 5 },
  userRoleBadge:   { backgroundColor: Colors.blue + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  userRoleBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.blue },
  userStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  userStatusText:  { fontSize: 10, fontWeight: '600' },
  toggleBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm },
  orderRow:        { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderTop:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderId:         { fontSize: 13, fontWeight: '700', color: Colors.text },
  orderStatus:     { fontSize: 12, fontWeight: '600' },
  orderParties:    { fontSize: 12, color: Colors.textMuted, marginBottom: 3 },
  orderTotal:      { fontSize: 14, fontWeight: '700', color: Colors.text },
});
