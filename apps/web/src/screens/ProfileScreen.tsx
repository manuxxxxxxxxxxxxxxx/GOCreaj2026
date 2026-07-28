import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORDERS = [
  { id: 1, store: 'Tacos El Compa', product: 'Birria x3', price: '$85', status: 'Entregado', statusColor: '#059669', date: 'Hoy 2:45 PM', image: 'https://images.unsplash.com/photo-1726514733212-0d99c0e2f1f4?auto=format&fit=crop&w=80&q=80' },
  { id: 2, store: 'Artesanías Oaxaca', product: 'Vasija XL', price: '$280', status: 'En camino', statusColor: '#f97316', date: 'Hoy 1:20 PM', image: 'https://images.unsplash.com/photo-1562868198-be7fbd14123d?auto=format&fit=crop&w=80&q=80' },
  { id: 3, store: 'NaturalMix', product: 'Jugo Verde 500ml', price: '$29', status: 'Cancelado', statusColor: '#ef4444', date: 'Ayer', image: 'https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?auto=format&fit=crop&w=80&q=80' },
];

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [tab, setTab] = useState<'pedidos' | 'favoritos' | 'configuracion'>('pedidos');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* PROFILE HEADER */}
        <View style={s.profileHeader}>
          <View style={s.avatarContainer}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }} style={s.avatar} />
            <TouchableOpacity style={s.editAvatarBtn}><Text style={{ fontSize: 14 }}>✏️</Text></TouchableOpacity>
          </View>
          <Text style={s.name}>Carlos Martínez</Text>
          <Text style={s.handle}>@carlos_sv • San Salvador, SV</Text>
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>47</Text><Text style={s.statLabel}>Pedidos</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>$1,240</Text><Text style={s.statLabel}>Ahorrado</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>4.9⭐</Text><Text style={s.statLabel}>Rating</Text></View>
          </View>
          <View style={s.actionRow}>
            <TouchableOpacity style={s.editBtn}><Text style={s.editBtnTxt}>✏️ Editar perfil</Text></TouchableOpacity>
            <TouchableOpacity style={s.shareBtn}><Text style={s.shareBtnTxt}>↗️ Compartir</Text></TouchableOpacity>
          </View>
        </View>

        {/* WALLET CARD */}
        <View style={s.walletCard}>
          <View>
            <Text style={s.walletLabel}>💳 Mi Billetera [SV]Go</Text>
            <Text style={s.walletBalance}>$245.50</Text>
            <Text style={s.walletSub}>Saldo disponible</Text>
          </View>
          <View style={s.walletActions}>
            <TouchableOpacity style={s.walletBtn}><Text style={s.walletBtnTxt}>+ Recargar</Text></TouchableOpacity>
            <TouchableOpacity style={[s.walletBtn, s.walletBtnOut]}><Text style={[s.walletBtnTxt, { color: '#059669' }]}>Retirar</Text></TouchableOpacity>
          </View>
        </View>

        {/* TABS */}
        <View style={s.tabRow}>
          {(['pedidos', 'favoritos', 'configuracion'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                {t === 'pedidos' ? '📦 Pedidos' : t === 'favoritos' ? '❤️ Favoritos' : '⚙️ Config'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'pedidos' && (
          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
            {ORDERS.map(o => (
              <TouchableOpacity key={o.id} style={s.orderCard}>
                <Image source={{ uri: o.image }} style={s.orderImg} />
                <View style={{ flex: 1 }}>
                  <Text style={s.orderStore}>{o.store}</Text>
                  <Text style={s.orderProduct}>{o.product}</Text>
                  <Text style={s.orderDate}>{o.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={s.orderPrice}>{o.price}</Text>
                  <View style={[s.statusBadge, { backgroundColor: o.statusColor + '20' }]}>
                    <Text style={[s.statusTxt, { color: o.statusColor }]}>{o.status}</Text>
                  </View>
                  {o.status === 'Entregado' && <TouchableOpacity style={s.reorderBtn}><Text style={s.reorderTxt}>Repetir</Text></TouchableOpacity>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'favoritos' && (
          <View style={{ paddingHorizontal: 16, marginTop: 8, alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>❤️</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginTop: 12 }}>Tus favoritos aquí</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>Guarda tiendas y productos para encontrarlos rápido</Text>
            <TouchableOpacity style={s.exploreBtn}><Text style={s.exploreBtnTxt}>Explorar tiendas →</Text></TouchableOpacity>
          </View>
        )}

        {tab === 'configuracion' && (
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 8 }}>
            {[
              { icon: '🔔', label: 'Notificaciones', toggle: true, value: notifs, onToggle: setNotifs },
              { icon: '🌙', label: 'Modo oscuro', toggle: true, value: darkMode, onToggle: setDarkMode },
            ].map((item, i) => (
              <View key={i} style={s.settingRow}>
                <Text style={s.settingIcon}>{item.icon}</Text>
                <Text style={s.settingLabel}>{item.label}</Text>
                <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ false: '#d1d5db', true: '#059669' }} thumbColor="#fff" />
              </View>
            ))}
            {[
              { icon: '📍', label: 'Mi dirección', sub: 'San Salvador, SV' },
              { icon: '💳', label: 'Métodos de pago', sub: '2 tarjetas guardadas' },
              { icon: '🔒', label: 'Privacidad y seguridad', sub: '' },
              { icon: '❓', label: 'Ayuda y soporte', sub: '' },
              { icon: '📋', label: 'Términos y condiciones', sub: '' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow}>
                <Text style={s.settingIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>{item.label}</Text>
                  {item.sub ? <Text style={s.settingSub}>{item.sub}</Text> : null}
                </View>
                <Text style={{ fontSize: 18, color: '#d1d5db' }}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.logoutBtn}>
              <Text style={s.logoutTxt}>🚪 Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },
  profileHeader: { backgroundColor: '#fff', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24, marginBottom: 12 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 999, borderWidth: 3, borderColor: '#059669' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 999, padding: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontSize: 22, fontWeight: '900', color: '#111' },
  handle: { fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#111' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  actionRow: { flexDirection: 'row', gap: 12 },
  editBtn: { flex: 1, backgroundColor: '#111', paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  editBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  shareBtn: { backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center' },
  shareBtnTxt: { color: '#111', fontWeight: '800', fontSize: 13 },
  walletCard: { backgroundColor: '#059669', marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 },
  walletBalance: { color: '#fff', fontSize: 28, fontWeight: '900' },
  walletSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  walletActions: { gap: 8 },
  walletBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  walletBtnOut: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  walletBtnTxt: { color: '#059669', fontWeight: '800', fontSize: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  tabActive: { backgroundColor: '#059669' },
  tabTxt: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  tabTxtActive: { color: '#fff' },
  orderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  orderImg: { width: 56, height: 56, borderRadius: 12 },
  orderStore: { fontSize: 13, fontWeight: '800', color: '#111' },
  orderProduct: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  orderDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  orderPrice: { fontSize: 14, fontWeight: '900', color: '#059669' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusTxt: { fontSize: 10, fontWeight: '800' },
  reorderBtn: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  reorderTxt: { fontSize: 10, color: '#059669', fontWeight: '700' },
  exploreBtn: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
  exploreBtnTxt: { color: '#fff', fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12 },
  settingIcon: { fontSize: 20 },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111' },
  settingSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  logoutBtn: { backgroundColor: '#fee2e2', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 8 },
  logoutTxt: { color: '#ef4444', fontWeight: '800', fontSize: 14 },
});
