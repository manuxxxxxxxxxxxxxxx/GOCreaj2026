import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenScroll from '@/components/ScreenScroll';

interface Notificacion {
  id: number;
  titulo: string;
  cuerpo: string | null;
  tipo: 'pedido' | 'chat' | 'sistema' | 'promocion';
  leida: number;
  referencia_id: number | null;
  created_at: string;
}

const TIPO_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  pedido: 'receipt-outline',
  chat: 'chatbubble-outline',
  sistema: 'information-circle-outline',
  promocion: 'pricetag-outline',
};

function tiempoRelativo(fecha: string): string {
  const diffMs = Date.now() - new Date(fecha.replace(' ', 'T')).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default function NotificacionesScreen(): React.JSX.Element {
  const { colors: c } = useTheme();
  const nav = useNavigation<any>();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await api<{ ok: boolean; notificaciones?: Notificacion[] }>(Endpoints.notificacionesListar);
      if (r.ok) setItems(r.notificaciones ?? []);
    } catch {}
    setCargando(false);
    setRefrescando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const marcarLeida = async (n: Notificacion) => {
    if (!n.leida) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, leida: 1 } : x));
      api(Endpoints.notificacionesMarcarLeida, { body: { id: n.id } }).catch(() => {});
    }
    if (n.tipo === 'pedido' && n.referencia_id) {
      nav.navigate('Tracking' as never, { pedidoId: n.referencia_id } as never);
    } else if (n.tipo === 'chat' && n.referencia_id) {
      nav.navigate('Chat' as never, { otroId: n.referencia_id } as never);
    }
  };

  const marcarTodasLeidas = async () => {
    setItems(prev => prev.map(x => ({ ...x, leida: 1 })));
    api(Endpoints.notificacionesMarcarTodasLeidas).catch(() => {});
  };

  const hayNoLeidas = items.some(n => !n.leida);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader
        title="Notificaciones"
        right={hayNoLeidas ? (
          <TouchableOpacity onPress={marcarTodasLeidas}>
            <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12 }}>Marcar leídas</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      {cargando ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScreenScroll
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); void cargar(); }} tintColor={c.accent} />}
        >
          {items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="notifications-off-outline" size={48} color={c.muted} />
              <Text style={{ color: c.muted, fontWeight: '700', marginTop: 12 }}>Sin notificaciones todavía</Text>
            </View>
          ) : items.map(n => (
            <TouchableOpacity
              key={n.id}
              onPress={() => marcarLeida(n)}
              activeOpacity={0.7}
              style={[
                styles.row,
                { backgroundColor: n.leida ? c.card : c.accentLight, borderColor: c.border },
              ]}
            >
              <View style={[styles.iconBg, { backgroundColor: c.background }]}>
                <Ionicons name={TIPO_ICON[n.tipo] ?? 'notifications-outline'} size={18} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: n.leida ? '600' : '800', fontSize: 13.5 }}>{n.titulo}</Text>
                {n.cuerpo ? <Text style={{ color: c.muted, fontSize: 12.5, marginTop: 2 }}>{n.cuerpo}</Text> : null}
                <Text style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>{tiempoRelativo(n.created_at)}</Text>
              </View>
              {!n.leida && <View style={[styles.dot, { backgroundColor: c.accent }]} />}
            </TouchableOpacity>
          ))}
        </ScreenScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm },
  iconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
