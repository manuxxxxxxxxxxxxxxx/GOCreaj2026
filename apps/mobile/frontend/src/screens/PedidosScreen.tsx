import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints, API_URL } from '@/services/api';
import { Pedido, EstadoPedido, RootStackParamList } from '@/types';
import GuestGate from '@/components/GuestGate';
import RatingModal from '@/components/RatingModal';

const APROBACION_LIMITE_MIN = 10;

const ESTADO_CFG: Record<EstadoPedido, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pendiente_confirmacion: { label: 'Pendiente de aprobación', color: '#D97706', icon: 'time-outline' },
  preparacion:            { label: 'Preparando',              color: '#2563EB', icon: 'restaurant-outline' },
  en_camino:              { label: 'En camino',                color: '#7C3AED', icon: 'bicycle-outline' },
  entregado:              { label: 'Entregado',                color: '#16A34A', icon: 'checkmark-circle-outline' },
  cancelado:              { label: 'Cancelado',                color: '#EF4444', icon: 'close-circle-outline' },
  rechazado_repartidor:   { label: 'Rechazado',                color: '#EF4444', icon: 'ban-outline' },
};

const FILTROS: { key: 'todos' | EstadoPedido; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente_confirmacion', label: 'Pendientes' },
  { key: 'preparacion', label: 'Preparando' },
  { key: 'en_camino', label: 'En camino' },
  { key: 'entregado', label: 'Entregados' },
];

function imgUri(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('data:') || p.startsWith('http')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

function minutosDesde(fecha?: string): number {
  if (!fecha) return 0;
  const t = new Date(fecha.replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / 60000;
}

export default function PedidosScreen() {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<'todos' | EstadoPedido>('todos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [calificarId, setCalificarId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api<{ ok: boolean; pedidos?: Pedido[] }>(Endpoints.misPedidos);
      if (r.ok && r.pedidos) { setPedidos(r.pedidos); setError(false); }
      else setError(true);
    } catch { setError(true); }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { if (usuario) void cargar(); }, [cargar, usuario]));

  if (!usuario) {
    return (
      <GuestGate
        icon="receipt-outline"
        title="Inicia sesión para ver tus pedidos"
        subtitle="Aquí verás el estado de tus compras, el repartidor asignado y su ubicación en tiempo real."
      />
    );
  }

  const cancelarPedido = (p: Pedido) => {
    Alert.alert('¿Cancelar pedido?', 'La tienda no aprobó a tiempo. Se reembolsará el total a tu billetera.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
        const r = await api<{ ok: boolean; error?: string }>(Endpoints.carritoCancelar, { body: { pedido_id: p.id } });
        if (r.ok) void cargar();
        else Alert.alert('Error', r.error ?? 'No se pudo cancelar el pedido.');
      }},
    ]);
  };

  const puedeCancelar = (p: Pedido) =>
    p.estado === 'pendiente_confirmacion' && minutosDesde(p.created_at) >= APROBACION_LIMITE_MIN;

  const puedeRastrear = (p: Pedido) =>
    p.estado === 'en_camino' || (p.estado === 'preparacion' && !!p.repartidor_id);

  const lista = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Mis Pedidos</Text>
      </View>

      <View style={[styles.filtrosRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={f => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8 }}
          renderItem={({ item }) => {
            const activo = filtro === item.key;
            return (
              <TouchableOpacity
                onPress={() => setFiltro(item.key)}
                style={[styles.chip, { backgroundColor: activo ? colors.accent : colors.elevated, borderColor: activo ? colors.accent : colors.border }]}
              >
                <Text style={{ color: activo ? '#FFF' : colors.muted, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {cargando && pedidos.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.accent} />
      ) : error ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.muted} />
          <Text style={[styles.emptyTxt, { color: colors.muted }]}>No se pudieron cargar tus pedidos.</Text>
          <TouchableOpacity onPress={cargar} style={[styles.retryBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + 40 }}
          refreshing={cargando}
          onRefresh={cargar}
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Ionicons name="receipt-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTxt, { color: colors.muted }]}>
                {filtro === 'todos' ? 'Aún no has hecho ningún pedido.' : 'No tienes pedidos en esta categoría.'}
              </Text>
            </View>
          }
          renderItem={({ item: p }) => {
            const cfg = ESTADO_CFG[p.estado] ?? ESTADO_CFG.preparacion;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.pedidoId, { color: colors.text }]}>Pedido #{p.id}</Text>
                  <View style={[styles.badge, { backgroundColor: `${cfg.color}20` }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={[styles.tienda, { color: colors.muted }]}>{p.tienda_nombre ?? p.vendedor_nombre}</Text>

                {(p.items ?? []).map(it => (
                  <View key={it.id} style={styles.itemRow}>
                    {it.imagen
                      ? <Image source={{ uri: imgUri(it.imagen) }} style={styles.itemImg} />
                      : <View style={[styles.itemImg, { backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="cube-outline" size={16} color={colors.muted} />
                        </View>
                    }
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{it.nombre} x{it.cantidad}</Text>
                    <Text style={[styles.itemPrice, { color: colors.muted }]}>${(Number(it.precio_unitario) * it.cantidad).toFixed(2)}</Text>
                  </View>
                ))}

                {p.estado === 'pendiente_confirmacion' && (
                  <Text style={[styles.hint, { color: colors.muted }]}>
                    Esperando que la tienda apruebe tu pedido{minutosDesde(p.created_at) < APROBACION_LIMITE_MIN
                      ? ` (puedes cancelar en ${Math.max(0, Math.ceil(APROBACION_LIMITE_MIN - minutosDesde(p.created_at)))} min si no responde)`
                      : ''}.
                  </Text>
                )}

                {p.repartidor_id && (
                  <View style={[styles.driverRow, { borderTopColor: colors.border }]}>
                    <Ionicons name="bicycle" size={16} color={colors.accent} />
                    <Text style={[styles.driverTxt, { color: colors.text }]}>
                      {p.repartidor_nombre}
                      {p.repartidor_calificacion_promedio ? ` · ★ ${Number(p.repartidor_calificacion_promedio).toFixed(1)}` : ''}
                    </Text>
                    {p.estado === 'preparacion' && !p.confirmado_repartidor_recogida && (
                      <Text style={[styles.driverSub, { color: colors.muted }]}>Recogiendo en tienda…</Text>
                    )}
                  </View>
                )}

                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.total, { color: colors.accent }]}>Total: ${Number(p.total).toFixed(2)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {p.vendedor_id != null && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.elevated }]}
                        onPress={() => nav.navigate('Chat', { otroId: p.vendedor_id, nombre: p.vendedor_nombre ?? 'Tienda' })}
                      >
                        <Ionicons name="chatbubble-outline" size={14} color={colors.text} />
                      </TouchableOpacity>
                    )}
                    {puedeCancelar(p) && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444418' }]} onPress={() => cancelarPedido(p)}>
                        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                    {puedeRastrear(p) && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                        onPress={() => nav.navigate('Tracking', { pedidoId: p.id })}
                      >
                        <Ionicons name="location" size={13} color="#FFF" />
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Rastrear</Text>
                      </TouchableOpacity>
                    )}
                    {p.estado === 'entregado' && !p.mi_calificacion && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D97706' }]} onPress={() => setCalificarId(p.id)}>
                        <Ionicons name="star" size={13} color="#FFF" />
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Calificar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <RatingModal
        visible={calificarId !== null}
        pedidoId={calificarId ?? 0}
        onClose={() => setCalificarId(null)}
        onSent={cargar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: Fonts.title + 4, fontWeight: '800', letterSpacing: -0.4 },
  filtrosRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1.5 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyTxt: { fontSize: Fonts.regular, fontWeight: '500', textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: Radius.pill },
  card: { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.md, marginBottom: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pedidoId: { fontWeight: '800', fontSize: Fonts.regular },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  tienda: { fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemImg: { width: 28, height: 28, borderRadius: 8 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600' },
  itemPrice: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 10, flexWrap: 'wrap' },
  driverTxt: { fontSize: 13, fontWeight: '700' },
  driverSub: { fontSize: 11, fontStyle: 'italic' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 10 },
  total: { fontWeight: '800', fontSize: Fonts.regular },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.sm },
});
