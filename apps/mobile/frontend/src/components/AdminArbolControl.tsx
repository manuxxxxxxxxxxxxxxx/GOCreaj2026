import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, Endpoints, API_URL, traducirError } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

interface UserNode {
  id: number; nombre: string; username?: string; email?: string;
  foto_perfil?: string | null; activo: 0 | 1; en_linea?: 0 | 1;
}
interface ProductoNode {
  id: number; nombre: string; imagen?: string | null; precio: number;
  stock: number; activo: 0 | 1; es_reel: 0 | 1;
  tienda_nombre: string; tienda_id: number; vendedor_nombre: string;
}
interface ReelNode {
  id: number; nombre: string; imagen?: string | null; video_url?: string | null;
  activo: 0 | 1; es_reel: 0 | 1; tienda_nombre: string; vendedor_nombre: string;
  reportes: number;
}
interface ArbolResp {
  ok: boolean;
  arbol?: {
    vendedores: UserNode[];
    repartidores: UserNode[];
    compradores: UserNode[];
    productos: ProductoNode[];
    reels: ReelNode[];
  };
  error?: string;
}

function img(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

export default function AdminArbolControl() {
  const { colors, isDark } = useTheme();
  const { t, lang } = useLang();
  const [data, setData] = useState<ArbolResp['arbol'] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [grupo, setGrupo] = useState<'vendedores' | 'repartidores' | 'compradores' | 'productos' | 'reels'>('vendedores');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api<ArbolResp>(Endpoints.adminArbol);
      if (r.ok && r.arbol) setData(r.arbol);
      else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
    } catch {
      Alert.alert(t.common.error, t.common.falloRed);
    } finally { setCargando(false); }
  }, [lang, t.common.error, t.common.falloRed]);

  useEffect(() => { void cargar(); }, [cargar]);

  const banear = (uid: number, activo: 0 | 1) => {
    Alert.alert(
      t.admin.banear,
      t.admin.confirmBan,
      [
        { text: t.common.cancelar, style: 'cancel' },
        {
          text: t.common.confirmar,
          style: 'destructive',
          onPress: async () => {
            const r = await api<{ ok: boolean; activo?: number; error?: string }>(
              Endpoints.adminBanearUsuario,
              { body: { usuario_id: uid } },
            );
            if (r.ok) {
              setData(prev => {
                if (!prev) return prev;
                const upd = { ...prev };
                (['vendedores', 'repartidores', 'compradores'] as const).forEach(k => {
                  upd[k] = upd[k].map(u => u.id === uid ? { ...u, activo: (r.activo ?? (activo ? 0 : 1)) as 0 | 1 } : u);
                });
                return upd;
              });
            } else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
          },
        },
      ],
    );
  };

  const eliminarProducto = (pid: number) => {
    Alert.alert(t.admin.eliminar, t.admin.confirmDelete, [
      { text: t.common.cancelar, style: 'cancel' },
      {
        text: t.common.eliminar,
        style: 'destructive',
        onPress: async () => {
          const r = await api<{ ok: boolean; error?: string }>(
            Endpoints.adminEliminarProducto, { body: { producto_id: pid } },
          );
          if (r.ok) {
            setData(prev => prev ? { ...prev, productos: prev.productos.map(p => p.id === pid ? { ...p, activo: 0 } : p) } : prev);
          } else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
        },
      },
    ]);
  };

  const eliminarReel = (pid: number) => {
    Alert.alert(t.admin.eliminar, t.admin.confirmDelete, [
      { text: t.common.cancelar, style: 'cancel' },
      {
        text: t.common.eliminar,
        style: 'destructive',
        onPress: async () => {
          const r = await api<{ ok: boolean; error?: string }>(
            Endpoints.adminEliminarReel, { body: { producto_id: pid } },
          );
          if (r.ok) {
            setData(prev => prev ? { ...prev, reels: prev.reels.filter(rl => rl.id !== pid) } : prev);
          } else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
        },
      },
    ]);
  };

  const tabs: Array<{ key: typeof grupo; label: string; icon: keyof typeof Ionicons.glyphMap; count: number; color: string }> = [
    { key: 'vendedores',   label: 'Vendedores',   icon: 'storefront-outline', count: data?.vendedores.length ?? 0,   color: '#2563EB' },
    { key: 'repartidores', label: 'Repartidores', icon: 'bicycle-outline',    count: data?.repartidores.length ?? 0, color: '#D97706' },
    { key: 'compradores',  label: 'Compradores',  icon: 'people-outline',     count: data?.compradores.length ?? 0,  color: '#6366F1' },
    { key: 'productos',    label: t.admin.productos, icon: 'cube-outline',    count: data?.productos.length ?? 0,    color: '#16A34A' },
    { key: 'reels',        label: t.admin.reels,  icon: 'film-outline',       count: data?.reels.length ?? 0,        color: '#EC4899' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colors.accent} />}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t.admin.arbolControl}</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>Mutaciones reales sobre la BD</Text>

      {/* Tabs jerárquicas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 14 }}>
        {tabs.map(tab => {
          const active = grupo === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setGrupo(tab.key)}
              activeOpacity={0.85}
              style={[
                styles.tab,
                { backgroundColor: active ? tab.color : colors.card, borderColor: active ? tab.color : colors.border },
              ]}
            >
              <Ionicons name={tab.icon} size={18} color={active ? '#FFF' : tab.color} />
              <Text style={[styles.tabTxt, { color: active ? '#FFF' : colors.text }]}>{tab.label}</Text>
              <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : tab.color }]}>
                <Text style={[styles.badgeTxt, { color: '#FFF' }]}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {cargando && !data && (
        <View style={{ padding: 36, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Listas */}
      {data && (grupo === 'vendedores' || grupo === 'repartidores' || grupo === 'compradores') && (
        <View style={{ gap: 10 }}>
          {data[grupo].map(u => (
            <View key={u.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {img(u.foto_perfil)
                  ? <Image source={{ uri: img(u.foto_perfil) }} style={styles.avatar} />
                  : <View style={[styles.avatar, { backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: colors.accent, fontWeight: '800' }}>{u.nombre[0]}</Text>
                    </View>}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{u.nombre}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{u.email ?? u.username ?? '—'}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={[styles.statePill, { backgroundColor: u.activo ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={{ color: u.activo ? '#15803D' : '#B91C1C', fontWeight: '800', fontSize: 11 }}>
                        {u.activo ? 'ACTIVO' : 'SUSPENDIDO'}
                      </Text>
                    </View>
                    {u.en_linea === 1 && (
                      <View style={[styles.statePill, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={{ color: '#1D4ED8', fontWeight: '800', fontSize: 11 }}>EN LÍNEA</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => banear(u.id, u.activo)}
                  style={[styles.actionBtn, { backgroundColor: u.activo ? colors.danger : colors.success }]}
                >
                  <Ionicons name={u.activo ? 'ban-outline' : 'checkmark-circle-outline'} size={16} color="#FFF" />
                  <Text style={styles.actionTxt}>{u.activo ? t.admin.banear : t.admin.desbanear}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {data[grupo].length === 0 && (
            <Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>—</Text>
          )}
        </View>
      )}

      {data && grupo === 'productos' && (
        <View style={{ gap: 10 }}>
          {data.productos.map(p => (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {img(p.imagen)
                  ? <Image source={{ uri: img(p.imagen) }} style={styles.thumb} />
                  : <View style={[styles.thumb, { backgroundColor: colors.accentLight }]} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{p.nombre}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{p.tienda_nombre} · {p.vendedor_nombre}</Text>
                  <Text style={{ color: colors.accent, fontWeight: '900', marginTop: 2 }}>US$ {Number(p.precio).toFixed(2)} · stock {p.stock}</Text>
                  {p.activo === 0 && (
                    <View style={[styles.statePill, { backgroundColor: '#FEE2E2', alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={{ color: '#B91C1C', fontWeight: '800', fontSize: 11 }}>SUSPENDIDO</Text>
                    </View>
                  )}
                </View>
                {p.activo === 1 && (
                  <TouchableOpacity
                    onPress={() => eliminarProducto(p.id)}
                    style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Text style={styles.actionTxt}>{t.admin.eliminar}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {data && grupo === 'reels' && (
        <View style={{ gap: 10 }}>
          {data.reels.map(r => (
            <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {img(r.imagen)
                  ? <Image source={{ uri: img(r.imagen) }} style={styles.thumb} />
                  : <View style={[styles.thumb, { backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="film-outline" size={26} color={colors.accent} />
                    </View>}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{r.nombre}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{r.tienda_nombre} · {r.vendedor_nombre}</Text>
                  {r.reportes > 0 && (
                    <View style={[styles.statePill, { backgroundColor: '#FEF3C7', alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 11 }}>{r.reportes} reporte(s)</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => eliminarReel(r.id)}
                  style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                  <Text style={styles.actionTxt}>{t.admin.eliminar}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {data.reels.length === 0 && (
            <Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>—</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5,
  },
  tabTxt: { fontWeight: '800', fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTxt: { fontWeight: '900', fontSize: 11 },
  card: {
    borderRadius: 18, padding: 12, borderWidth: 1,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  thumb: { width: 60, height: 60, borderRadius: 14 },
  statePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, alignSelf: 'center',
  },
  actionTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },
});
