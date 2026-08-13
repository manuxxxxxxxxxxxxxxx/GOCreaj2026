import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, Endpoints, API_URL } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

interface Repartidor {
  id: number;
  nombre: string;
  foto_perfil?: string | null;
  telefono?: string | null;
  en_linea?: 0 | 1;
  tipo_vehiculo?: string | null;
  licencia_frente?: string | null;
}

function img(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('http') || p.startsWith('data:')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

export default function RepartidorAsignadoCard({ pedidoId, mostrarUbicacion = true }: { pedidoId: number; mostrarUbicacion?: boolean }) {
  const { colors } = useTheme();
  const { t } = useLang();
  const nav = useNavigation<any>();
  const [r, setR] = useState<Repartidor | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; repartidor: Repartidor | null }>(Endpoints.vendedorRepartidorPedido(pedidoId));
      if (res.ok) setR(res.repartidor ?? null);
    } catch { /* offline-safe */ }
    finally { setLoading(false); }
  }, [pedidoId]);

  useEffect(() => {
    void cargar();
    const iv = setInterval(cargar, 12000); // polling 12s para detectar match
    return () => clearInterval(iv);
  }, [cargar]);

  if (loading && !r) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!r) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <Ionicons name="bicycle-outline" size={20} color={colors.muted} />
        <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13 }}>{t.seller.sinRepartidor}</Text>
      </View>
    );
  }

  const fotoUri = img(r.foto_perfil);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
      {fotoUri
        ? <Image source={{ uri: fotoUri }} style={styles.avatar} />
        : <View style={[styles.avatar, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>{r.nombre[0]}</Text>
          </View>}

      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t.seller.repartidorAsignado}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>{r.nombre}</Text>
          {r.en_linea === 1 && <View style={styles.onlineDot} />}
        </View>
        {(r.tipo_vehiculo) && (
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
            {t.seller.vehiculo}: <Text style={{ color: colors.text, fontWeight: '700' }}>{r.tipo_vehiculo}</Text>
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {mostrarUbicacion && (
          <TouchableOpacity
            onPress={() => nav.navigate('Tracking', { pedidoId })}
            activeOpacity={0.85}
            style={[styles.chatBtn, { backgroundColor: colors.accentLight, shadowOpacity: 0 }]}
          >
            <Ionicons name="location" size={16} color={colors.accent} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => nav.navigate('Chat', { otroId: r.id, otroNombre: r.nombre })}
          activeOpacity={0.85}
          style={[styles.chatBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
          <Text style={styles.chatTxt}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 5,
    marginTop: 8,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  onlineDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#16A34A', borderWidth: 1.5, borderColor: '#FFF' },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 8, elevation: 5,
  },
  chatTxt: { color: '#FFF', fontWeight: '900', fontSize: 13 },
});
