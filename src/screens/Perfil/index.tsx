// src/screens/Perfil/index.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { ORDERS, SETTINGS_OPTIONS } from './ProfileData';
import { s } from './styles';

const AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [notifs, setNotifs] = useState(true);
  const [tab, setTab] = useState<'pedidos' | 'favoritos' | 'configuracion'>('pedidos');

  const irAEditar = () => router.push('/editar-perfil');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        <View style={s.profileHeader}>
          <View style={s.avatarContainer}>
            <TouchableOpacity onPress={irAEditar} activeOpacity={0.85}>
              <Image
                source={{ uri: user?.avatar || AVATAR_PLACEHOLDER }}
                style={s.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity style={s.editAvatarBtn} onPress={irAEditar} hitSlop={6}>
              <Text>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.name}>{user?.nombre || 'Usuario'}</Text>
          <Text style={s.handle}>{user?.email} • San Salvador, SV</Text>

          {/* Botón "Editar perfil" — paleta verde, con feedback al press */}
          <Pressable
            onPress={irAEditar}
            style={({ pressed }) => [
              s.editProfileBtn,
              pressed && s.editProfileBtnPressed,
            ]}
          >
            {({ pressed }) => (
              <Text style={[s.editProfileBtnTxt, pressed && s.editProfileBtnTxtPressed]}>
                👤  Editar perfil
              </Text>
            )}
          </Pressable>

          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>47</Text><Text style={s.statLabel}>Pedidos</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>$1,240</Text><Text style={s.statLabel}>Ahorrado</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>4.9⭐</Text><Text style={s.statLabel}>Rating</Text></View>
          </View>
        </View>

        <View style={s.walletCard}>
          <View>
            <Text style={s.walletLabel}>💳 Mi Billetera SVGo</Text>
            <Text style={s.walletBalance}>$245.50</Text>
            <Text style={s.walletSub}>Saldo disponible</Text>
          </View>
          <View style={s.walletActions}>
            <TouchableOpacity style={s.walletBtn}><Text style={s.walletBtnTxt}>+ Recargar</Text></TouchableOpacity>
            <TouchableOpacity style={[s.walletBtn, s.walletBtnOut]}><Text style={[s.walletBtnTxt, { color: '#fff' }]}>Retirar</Text></TouchableOpacity>
          </View>
        </View>

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
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'configuracion' && (
          <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 8 }}>
            <View style={s.settingRow}>
              <Text style={s.settingIcon}>🔔</Text>
              <Text style={s.settingLabel}>Notificaciones</Text>
              <Switch value={notifs} onValueChange={setNotifs} trackColor={{ false: '#d1d5db', true: '#059669' }} />
            </View>

            {SETTINGS_OPTIONS.map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow}>
                <Text style={s.settingIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingLabel}>{item.label}</Text>
                  {item.sub ? <Text style={s.settingSub}>{item.sub}</Text> : null}
                </View>
                <Text style={{ fontSize: 18, color: '#d1d5db' }}>›</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
              <Text style={s.logoutTxt}>🚪 Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
