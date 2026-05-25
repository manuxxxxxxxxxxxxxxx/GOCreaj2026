import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Animated, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints, traducirError } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { Spacing } from '@/theme/colors';

interface PedidoMatch {
  id: number;
  total: number;
  estado: string;
  vendedor_nombre: string;
  comprador_nombre: string;
  tienda_nombre?: string;
  tienda_direccion?: string;
  direccion_entrega?: string;
  ganancia_repartidor: number;
}
interface PedidoEntrega extends PedidoMatch {
  created_at: string;
  total_repartidor?: number;
}
interface WalletResp {
  ok: boolean;
  saldo: number;
  movimientos: Array<{ id: number; tipo: string; monto: number; referencia?: string; pedido_id?: number | null; created_at: string }>;
  stats: { hoy: number; semana: number; entregas_hoy: number };
}

export default function DriverScreen() {
  const { colors } = useTheme();
  const { t, lang } = useLang();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

  const [enLinea, setEnLinea]       = useState<boolean>(!!usuario?.en_linea);
  const [pendientes, setPendientes] = useState<PedidoMatch[]>([]);
  const [entregas, setEntregas]     = useState<PedidoEntrega[]>([]);
  const [wallet, setWallet]         = useState<WalletResp | null>(null);
  const [refresh, setRefresh]       = useState(false);
  const [tab, setTab]               = useState<'match' | 'mias' | 'wallet'>('match');

  const switchAnim = useRef(new Animated.Value(enLinea ? 1 : 0)).current;

  const cargar = useCallback(async () => {
    try {
      const [pd, en, w] = await Promise.all([
        api<{ ok: boolean; pedidos?: PedidoMatch[]; en_linea?: boolean }>(Endpoints.repartidorDisponibles),
        api<{ ok: boolean; pedidos?: PedidoEntrega[] }>(Endpoints.repartidorEntregas),
        api<WalletResp>(Endpoints.repartidorWallet),
      ]);
      setPendientes(pd.pedidos ?? []);
      setEntregas(en.pedidos ?? []);
      setWallet(w);
      if (pd.en_linea !== undefined) {
        setEnLinea(pd.en_linea);
        Animated.timing(switchAnim, { toValue: pd.en_linea ? 1 : 0, duration: 220, useNativeDriver: false }).start();
      }
    } catch { /* offline safe */ }
    finally { setRefresh(false); }
  }, [switchAnim]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => {
    if (!enLinea) return;
    const iv = setInterval(cargar, 8000);
    return () => clearInterval(iv);
  }, [enLinea, cargar]);

  const toggleEnLinea = async () => {
    const nuevo = !enLinea;
    setEnLinea(nuevo);
    Animated.timing(switchAnim, { toValue: nuevo ? 1 : 0, duration: 220, useNativeDriver: false }).start();
    try {
      const r = await api<{ ok: boolean; en_linea?: boolean; error?: string }>(
        Endpoints.repartidorToggleEnLinea, { body: { en_linea: nuevo } },
      );
      if (!r.ok) {
        setEnLinea(!nuevo);
        Animated.timing(switchAnim, { toValue: !nuevo ? 1 : 0, duration: 220, useNativeDriver: false }).start();
        Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
      } else { void cargar(); }
    } catch {
      setEnLinea(!nuevo);
    }
  };

  const aceptar = async (p: PedidoMatch) => {
    const r = await api<{ ok: boolean; error?: string }>(Endpoints.repartidorAceptar, { body: { pedido_id: p.id } });
    if (r.ok) { Alert.alert('Pedido tomado', `Vas a recoger en ${p.tienda_nombre ?? p.vendedor_nombre}`); void cargar(); }
    else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
  };

  const completar = async (p: PedidoEntrega) => {
    const r = await api<{ ok: boolean; ganancia_repartidor?: number; error?: string }>(
      Endpoints.repartidorCompletar, { body: { pedido_id: p.id } },
    );
    if (r.ok) {
      Alert.alert('Entrega registrada', `+US$ ${Number(r.ganancia_repartidor ?? 0).toFixed(2)} a tu wallet`);
      void cargar();
    } else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
  };

  const switchBg = switchAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.success] });
  const switchKnob = switchAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 32] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>{usuario?.nombre?.[0] ?? 'R'}</Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>{usuario?.nombre}</Text>
            <Text style={{ color: enLinea ? colors.success : colors.muted, fontWeight: '700', fontSize: 11 }}>
              {enLinea ? t.driver.enLinea : t.driver.fueraLinea}
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={toggleEnLinea}>
          <Animated.View style={[styles.switch, { backgroundColor: switchBg }]}>
            <Animated.View style={[styles.switchKnob, { left: switchKnob }]}>
              <Ionicons name={enLinea ? 'flash' : 'power'} size={14} color={enLinea ? colors.success : colors.muted} />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {([
          { k: 'match', label: 'Disponibles', icon: 'flash-outline' as const },
          { k: 'mias',  label: 'Mis entregas', icon: 'list-outline' as const },
          { k: 'wallet', label: 'Wallet',     icon: 'wallet-outline' as const },
        ] as const).map(it => {
          const act = tab === it.k;
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => setTab(it.k)}
              activeOpacity={0.85}
              style={[styles.tabBtn, act && { backgroundColor: colors.accent }]}
            >
              <Ionicons name={it.icon} size={15} color={act ? '#FFF' : colors.muted} />
              <Text style={{ color: act ? '#FFF' : colors.text, fontWeight: '800', fontSize: 12 }}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); void cargar(); }} tintColor={colors.accent} />}
      >
        {tab === 'match' && (
          <>
            {!enLinea && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <Ionicons name="power-outline" size={28} color={colors.muted} />
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15, marginTop: 8 }}>{t.driver.fueraLinea}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                  Activa el interruptor para empezar a recibir pedidos.
                </Text>
              </View>
            )}
            {enLinea && pendientes.length === 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="hourglass-outline" size={28} color={colors.muted} />
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 14, marginTop: 8 }}>Esperando pedidos...</Text>
              </View>
            )}
            {pendientes.map(p => (
              <View key={p.id} style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.muted, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }}>#SV-{p.id}</Text>
                  <View style={[styles.ganBadge, { backgroundColor: colors.success }]}>
                    <Ionicons name="cash" size={12} color="#FFF" />
                    <Text style={styles.ganTxt}>+US$ {Number(p.ganancia_repartidor).toFixed(2)}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <View style={styles.locRow}>
                    <View style={[styles.locDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {p.tienda_nombre ?? p.vendedor_nombre} <Text style={{ color: colors.muted, fontWeight: '600' }}>· origen</Text>
                    </Text>
                  </View>
                  <View style={styles.locRow}>
                    <View style={[styles.locDot, { backgroundColor: colors.success }]} />
                    <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {p.comprador_nombre} <Text style={{ color: colors.muted, fontWeight: '600' }}>· destino</Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>Total pedido</Text>
                  <Text style={{ color: colors.text, fontWeight: '900' }}>US$ {Number(p.total).toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => aceptar(p)}
                  activeOpacity={0.88}
                  style={[styles.acceptBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.acceptTxt}>Aceptar pedido</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === 'mias' && (
          <>
            {entregas.length === 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="cube-outline" size={28} color={colors.muted} />
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 14, marginTop: 8 }}>Sin entregas aún</Text>
              </View>
            )}
            {entregas.map(p => (
              <View key={p.id} style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.muted, fontWeight: '800', fontSize: 11 }}>#SV-{p.id}</Text>
                  <Text style={{ color: p.estado === 'entregado' ? colors.success : colors.warning, fontWeight: '900', fontSize: 11 }}>
                    {p.estado.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>{p.vendedor_nombre} → {p.comprador_nombre}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(p.created_at).toLocaleString()}</Text>

                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Tu ganancia</Text>
                  <Text style={{ color: colors.success, fontWeight: '900' }}>
                    US$ {Number(p.total_repartidor ?? p.ganancia_repartidor ?? 0).toFixed(2)}
                  </Text>
                </View>

                {p.estado === 'en_camino' && (
                  <TouchableOpacity
                    onPress={() => completar(p)}
                    activeOpacity={0.88}
                    style={[styles.acceptBtn, { backgroundColor: colors.success, shadowColor: colors.success }]}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFF" />
                    <Text style={styles.acceptTxt}>Marcar entregado</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'wallet' && wallet && (
          <>
            <View style={[styles.walletBig, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
              <Ionicons name="wallet" size={24} color="rgba(255,255,255,0.85)" />
              <Text style={styles.walletLabel}>Saldo actual</Text>
              <Text style={styles.walletSaldo}>US$ {Number(wallet.saldo).toFixed(2)}</Text>
              <View style={styles.walletStats}>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatVal}>US$ {Number(wallet.stats.hoy).toFixed(2)}</Text>
                  <Text style={styles.walletStatLab}>{t.driver.gananciasHoy}</Text>
                </View>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatVal}>US$ {Number(wallet.stats.semana).toFixed(2)}</Text>
                  <Text style={styles.walletStatLab}>{t.driver.gananciasSemanales}</Text>
                </View>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatVal}>{wallet.stats.entregas_hoy}</Text>
                  <Text style={styles.walletStatLab}>{t.driver.entregasHoy}</Text>
                </View>
              </View>
            </View>

            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15, marginTop: 16, marginBottom: 10 }}>Movimientos</Text>
            {wallet.movimientos.map(m => (
              <View key={m.id} style={[styles.mov, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.movIcon, { backgroundColor: m.monto > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Ionicons name={m.monto > 0 ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color={m.monto > 0 ? '#16A34A' : '#DC2626'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{m.referencia ?? m.tipo}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(m.created_at).toLocaleString()}</Text>
                </View>
                <Text style={{ color: m.monto > 0 ? colors.success : colors.danger, fontWeight: '900' }}>
                  {m.monto > 0 ? '+' : ''}{Number(m.monto).toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: 14, borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  switch: { width: 60, height: 32, borderRadius: 18, position: 'relative', justifyContent: 'center' },
  switchKnob: {
    width: 26, height: 26, borderRadius: 13, position: 'absolute',
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 4, elevation: 3,
  },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, margin: 12, borderRadius: 22, borderWidth: 1.5 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 18 },
  card: {
    borderRadius: 20, padding: 18, borderWidth: 1, alignItems: 'center', marginTop: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  matchCard: {
    borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 4,
  },
  ganBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  ganTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 22, marginTop: 12,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5,
  },
  acceptTxt: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
  walletBig: {
    borderRadius: 24, padding: 22,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 20, elevation: 10,
  },
  walletLabel: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontWeight: '700', fontSize: 12 },
  walletSaldo: { color: '#FFF', fontWeight: '900', fontSize: 36, letterSpacing: -1, marginTop: 4 },
  walletStats: { flexDirection: 'row', gap: 14, marginTop: 18 },
  walletStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12 },
  walletStatVal: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  walletStatLab: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  mov: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  movIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
