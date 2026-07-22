import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints, API_URL, getToken } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import CallWebViewModal, { CallInfo } from './CallWebViewModal';

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface Llamada {
  id: number;
  tipo: 'voz' | 'video';
  webrtc_room: string;
  nombre: string;
  foto_perfil?: string | null;
  emisor_id: number;
}

// Notificación de llamada entrante como banner superior (no bloquea toda la
// pantalla): el usuario puede seguir navegando y decidir si contesta.
// Vive a nivel de navegación (AppNavigator), no dentro de ChatScreen, para
// que suene sin importar en qué pantalla esté el usuario.
export default function IncomingCallBanner() {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const [incoming, setIncoming] = useState<Llamada | null>(null);
  const [call, setCall]         = useState<CallInfo | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef   = useRef(false);

  useEffect(() => { void getToken().then(setToken); }, []);
  useEffect(() => { activeRef.current = !!incoming || !!call; }, [incoming, call]);

  const check = useCallback(async () => {
    if (!usuario || activeRef.current) return;
    try {
      const r = await api<{ ok: boolean; llamada?: Llamada }>(Endpoints.chatLlamadasEntrantes);
      if (r.ok && r.llamada) setIncoming(r.llamada);
    } catch { /* ignore */ }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    pollRef.current = setInterval(() => void check(), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [usuario, check]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: incoming ? 0 : -160,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [incoming, translateY]);

  const aceptar = async () => {
    if (!incoming) return;
    await api(Endpoints.chatResponderLlamada, { body: { llamada_id: incoming.id, aceptar: true } });
    setCall({ llamadaId: incoming.id, tipo: incoming.tipo, room: incoming.webrtc_room });
    setIncoming(null);
  };

  const rechazar = async () => {
    if (!incoming) return;
    await api(Endpoints.chatResponderLlamada, { body: { llamada_id: incoming.id, aceptar: false } });
    setIncoming(null);
  };

  if (!incoming && !call) return null;

  return (
    <>
      {incoming && (
        <Animated.View style={[S.banner, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}>
          <View style={S.avatar}>
            {imgUri(incoming.foto_perfil)
              ? <Image source={{ uri: imgUri(incoming.foto_perfil) }} style={S.avatarImg} />
              : <Text style={S.avatarTxt}>{getInitials(incoming.nombre)}</Text>}
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={S.name} numberOfLines={1}>{incoming.nombre}</Text>
            <Text style={S.sub}>{incoming.tipo === 'video' ? '📹 Videollamada entrante' : '📞 Llamada entrante'}</Text>
          </View>
          <TouchableOpacity onPress={() => void rechazar()} style={[S.btn, { backgroundColor: '#EF4444' }]} activeOpacity={0.85}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void aceptar()} style={[S.btn, { backgroundColor: '#22C55E' }]} activeOpacity={0.85}>
            <Ionicons name="call" size={18} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
      {call && (
        <CallWebViewModal
          call={call}
          nombre={incoming?.nombre ?? 'Llamada'}
          fotoUri={imgUri(incoming?.foto_perfil)}
          token={token}
          onClose={() => setCall(null)}
        />
      )}
    </>
  );
}

const S = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#121B2D', paddingHorizontal: 14, paddingBottom: 12,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 14,
  },
  avatar:    { width: 42, height: 42, borderRadius: 21, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarTxt: { color: '#FFF', fontWeight: '800' },
  name:      { color: '#FFF', fontWeight: '800', fontSize: 14 },
  sub:       { color: '#94A3B8', fontSize: 12, marginTop: 1 },
  btn:       { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
