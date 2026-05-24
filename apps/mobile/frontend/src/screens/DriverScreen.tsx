import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { Pedido, RootStackParamList } from '@/types';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';

type Tab = 'disponibles' | 'entregas';
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface RespPedidos { ok: boolean; pedidos?: Pedido[] }
interface RespGen { ok: boolean; error?: string }

export default function DriverScreen() {
  const { cerrarSesion, usuario } = useAuth();
  const { colors } = useTheme();
  const { t } = useLang();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [tab, setTab]         = useState<Tab>('disponibles');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [enLinea, setEnLinea] = useState(false);
  const [toggling, setToggling] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const ep = tab === 'disponibles' ? Endpoints.repartidorDisponibles : Endpoints.repartidorEntregas;
      const r = await api<RespPedidos>(ep);
      if (r.ok && r.pedidos) setPedidos(r.pedidos);
      else setPedidos([]);
    } catch { setPedidos([]); }
    setCargando(false);
  }, [tab]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function toggleEnLinea() {
    setToggling(true);
    try {
      const nuevo = !enLinea;
      const r = await api<{ ok: boolean; en_linea?: boolean }>(
        Endpoints.repartidorToggleEnLinea,
        { body: { en_linea: nuevo } }
      );
      if (r.ok) setEnLinea(r.en_linea ?? nuevo);
    } catch { Alert.alert('Error', 'No se pudo actualizar el estado'); }
    setToggling(false);
  }

  async function aceptar(p: Pedido) {
    const r = await api<RespGen>(Endpoints.repartidorAceptar, { body: { pedido_id: p.id } });
    if (r.ok) { Alert.alert('Aceptado', `Pedido #${p.id} asignado`); setTab('entregas'); await cargar(); }
    else Alert.alert('Error', r.error ?? 'Fallo');
  }

  async function rechazar(p: Pedido) {
    const r = await api<RespGen>(Endpoints.repartidorRechazar, { body: { pedido_id: p.id } });
    if (r.ok) await cargar();
    else Alert.alert('Error', r.error ?? 'Fallo');
  }

  async function completar(p: Pedido) {
    Alert.alert('Confirmar', '¿Marcar como entregado?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí', onPress: async () => {
        const r = await api<RespGen>(Endpoints.repartidorCompletar, { body: { pedido_id: p.id } });
        if (r.ok) await cargar(); else Alert.alert('Error', r.error ?? 'Fallo');
      }}
    ]);
  }

  const c = colors;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: c.accent }]}>
        <View>
          <Text style={[styles.headerTitle, { color: '#FFF' }]}>Panel Repartidor</Text>
          <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.85)' }]}>{usuario?.nombre}</Text>
        </View>
        <TouchableOpacity onPress={cerrarSesion} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Online status card */}
      <View style={[styles.statusCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: enLinea ? '#22C55E' : c.muted }]} />
          <View>
            <Text style={[styles.statusLabel, { color: c.text }]}>
              {enLinea ? t.driver.enLinea : t.driver.fueraLinea}
            </Text>
            <Text style={[styles.statusHint, { color: c.muted }]}>
              {enLinea ? 'Recibiendo pedidos' : 'No estás recibiendo pedidos'}
            </Text>
          </View>
        </View>
        {toggling ? (
          <ActivityIndicator size="small" color={c.accent} />
        ) : (
          <Switch
            value={enLinea}
            onValueChange={toggleEnLinea}
            trackColor={{ false: c.border, true: '#22C55E' }}
            thumbColor="#FFF"
          />
        )}
      </View>

      {/* Earnings card */}
      <View style={[styles.earningsCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.earningItem}>
          <Text style={[styles.earningVal, { color: c.accent }]}>$12.50</Text>
          <Text style={[styles.earningLbl, { color: c.muted }]}>{t.driver.gananciasHoy}</Text>
        </View>
        <View style={[styles.earningDivider, { backgroundColor: c.border }]} />
        <View style={styles.earningItem}>
          <Text style={[styles.earningVal, { color: c.accent }]}>$78.00</Text>
          <Text style={[styles.earningLbl, { color: c.muted }]}>{t.driver.gananciasSemanales}</Text>
        </View>
        <View style={[styles.earningDivider, { backgroundColor: c.border }]} />
        <View style={styles.earningItem}>
          <Text style={[styles.earningVal, { color: c.text }]}>4</Text>
          <Text style={[styles.earningLbl, { color: c.muted }]}>{t.driver.entregasHoy}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: `${c.accent}0D`, borderColor: `${c.accent}14` }]}>
        {(['disponibles', 'entregas'] as Tab[]).map(tabKey => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tab, tab === tabKey && [styles.tabAct, { backgroundColor: c.accent, shadowColor: c.accent }]]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[styles.tabTxt, { color: tab === tabKey ? '#FFF' : c.muted }]}>
              {tabKey.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.accent} />}>
        {pedidos.length === 0 && !cargando ? (
          <Text style={[styles.vacio, { color: c.muted }]}>Sin pedidos</Text>
        ) : null}

        {pedidos.map(p => (
          <View key={p.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardTit, { color: c.text }]}>Pedido #{p.id}</Text>
              <Text style={[styles.cardTit, { color: c.accent }]}>${Number(p.total).toFixed(2)}</Text>
            </View>
            <Text style={[styles.cardSub, { color: c.muted }]}>De: {p.vendedor_nombre}</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>Para: {p.comprador_nombre}</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>Dir: {p.direccion_entrega}</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>Pago: {p.metodo_pago} · Estado: {p.estado}</Text>
            {tab === 'disponibles' ? (
              <View style={styles.btns}>
                <View style={{ flex: 1 }}><Button label="Aceptar" icon="checkmark-outline" onPress={() => aceptar(p)} /></View>
                <View style={{ width: Spacing.sm }} />
                <View style={{ flex: 1 }}><Button label="Rechazar" icon="close-outline" variant="danger" onPress={() => rechazar(p)} /></View>
              </View>
            ) : (
              <View style={styles.btns}>
                <View style={{ flex: 1 }}><Button label="Ver mapa" icon="map-outline" onPress={() => nav.navigate('Tracking', { pedidoId: p.id })} /></View>
                {p.estado === 'en_camino' ? (
                  <>
                    <View style={{ width: Spacing.sm }} />
                    <View style={{ flex: 1 }}><Button label="Entregado" icon="checkmark-done-outline" onPress={() => completar(p)} /></View>
                  </>
                ) : null}
              </View>
            )}
          </View>
        ))}

        {cargando ? <ActivityIndicator color={c.accent} style={{ marginTop: Spacing.md }} /> : null}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 4,
  },
  headerTitle: { fontSize: Fonts.title - 2, fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { marginTop: 2, fontSize: Fonts.small, fontWeight: '600' },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontWeight: '800', fontSize: Fonts.regular },
  statusHint: { fontSize: Fonts.small, fontWeight: '500', marginTop: 1 },
  earningsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  earningItem: { flex: 1, alignItems: 'center' },
  earningVal: { fontSize: Fonts.title - 4, fontWeight: '900', letterSpacing: -0.5 },
  earningLbl: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  earningDivider: { width: 1, marginVertical: 4 },
  tabs: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 6,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.pill },
  tabAct: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  tabTxt: { fontWeight: '700', fontSize: Fonts.small },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 3, elevation: 1,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTit: { fontWeight: '800', fontSize: Fonts.regular, letterSpacing: -0.2 },
  cardSub: { marginTop: 4, fontSize: Fonts.small + 1, fontWeight: '500' },
  btns: { flexDirection: 'row', marginTop: Spacing.md },
  vacio: { textAlign: 'center', padding: Spacing.lg, fontWeight: '600' },
});
