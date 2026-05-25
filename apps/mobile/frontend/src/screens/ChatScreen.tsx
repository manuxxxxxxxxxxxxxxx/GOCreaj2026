import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
  Easing, Image, Modal, Alert, ScrollView, Pressable, Vibration,
  Linking, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api, Endpoints, API_URL } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { RootStackParamList } from '@/types';
import { useAuth } from '@/context/AuthContext';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type ChatTab = 'todos' | 'noLeidos' | 'favoritos' | 'archivados';

interface MensajeExt {
  id: number;
  emisor_id: number;
  receptor_id: number;
  mensaje: string;
  tipo?: 'texto' | 'imagen' | 'ubicacion';
  adjunto?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  leido: number;
  reply_to_id?: number | null;
  reply_snapshot?: ReplySnapshot | null;
  created_at: string;
}

interface ReplySnapshot {
  id: number;
  mensaje: string;
  tipo?: string;
  emisor_id: number;
  producto?: { id: number; nombre: string; precio: number; imagen?: string | null } | null;
}

interface ConvExt {
  id: number;
  nombre: string;
  username?: string | null;
  foto_perfil?: string | null;
  rol: string;
  en_linea?: number;
  no_leidos?: number;
  archivado?: number;
  favorito?: number;
  ultimo_mensaje?: { mensaje: string; tipo?: string; created_at: string } | null;
}

interface LlamadaEntrante {
  id: number;
  tipo: 'voz' | 'video';
  webrtc_room: string;
  nombre: string;
  foto_perfil?: string | null;
  emisor_id: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  vendedor: '#4A6D8C', repartidor: '#27AE8F', comprador: '#8E44AD', admin: '#C0392B',
};

// ─── Error Boundary ───────────────────────────────────────────────────────────

class MsgErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: Error) { console.warn('[MsgBoundary]', e.message); }
  render() {
    if (this.state.err) return this.props.fallback ?? <Text style={{ color: '#94A3B8', fontStyle: 'italic' }}>Mensaje no disponible</Text>;
    return this.props.children;
  }
}

// ─── LocationMsg ──────────────────────────────────────────────────────────────

function LocationMsg({ lat, lng, mio, colors }: { lat: any; lng: any; mio: boolean; colors: any }) {
  const [mapErr, setMapErr] = useState(false);
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!numLat || !numLng) return <Text style={{ color: mio ? '#FFF' : colors.muted }}>📍 Ubicación</Text>;

  const openMaps = () => {
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${numLat},${numLng}`
      : `geo:${numLat},${numLng}?q=${numLat},${numLng}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${numLat},${numLng}`));
  };

  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${numLat},${numLng}&zoom=14&size=220x100&markers=${numLat},${numLng},red`;

  return (
    <TouchableOpacity onPress={openMaps} activeOpacity={0.85} style={S.locWrap}>
      {!mapErr ? (
        <Image source={{ uri: mapUrl }} style={S.locMap} onError={() => setMapErr(true)} resizeMode="cover" />
      ) : (
        <View style={[S.locMapFallback, { backgroundColor: mio ? 'rgba(255,255,255,0.12)' : colors.background }]}>
          <Ionicons name="map-outline" size={38} color={mio ? '#FFF' : colors.accent} />
        </View>
      )}
      <View style={[S.locFooter, { backgroundColor: mio ? 'rgba(0,0,0,0.35)' : `${colors.accent}18` }]}>
        <Ionicons name="location-sharp" size={13} color={mio ? '#FFF' : colors.accent} />
        <Text style={[S.locLabel, { color: mio ? '#FFF' : colors.text }]}>Abrir en Mapas</Text>
        <Text style={[S.locCoords, { color: mio ? 'rgba(255,255,255,0.65)' : colors.muted }]}>
          {numLat.toFixed(4)}, {numLng.toFixed(4)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── ReplyCard ────────────────────────────────────────────────────────────────

function ReplyCard({ snap, mio, colors }: { snap: ReplySnapshot; mio: boolean; colors: any }) {
  const preview = snap.tipo === 'imagen' ? '📷 Imagen'
    : snap.tipo === 'ubicacion' ? '📍 Ubicación'
    : snap.mensaje.length > 55 ? snap.mensaje.slice(0, 55) + '…' : snap.mensaje;

  return (
    <View style={[S.replyCard, {
      backgroundColor: mio ? 'rgba(255,255,255,0.15)' : colors.background,
      borderLeftColor: mio ? 'rgba(255,255,255,0.55)' : colors.accent,
    }]}>
      {snap.producto && (
        <View style={S.replyProd}>
          {snap.produto?.imagen ? (
            <Image source={{ uri: imgUri(snap.produto.imagen) }} style={S.replyProdImg} />
          ) : null}
          {snap.producto.imagen ? (
            <Image source={{ uri: imgUri(snap.producto.imagen) }} style={S.replyProdImg} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[S.replyProdNom, { color: mio ? '#FFF' : colors.accent }]} numberOfLines={1}>
              {snap.producto.nombre}
            </Text>
            <Text style={[S.replyProdPx, { color: mio ? 'rgba(255,255,255,0.75)' : colors.muted }]}>
              ${Number(snap.producto.precio).toFixed(2)}
            </Text>
          </View>
        </View>
      )}
      <Text style={[S.replyTxt, { color: mio ? 'rgba(255,255,255,0.75)' : colors.muted }]} numberOfLines={2}>
        {preview}
      </Text>
    </View>
  );
}

// ─── ReplyBar ─────────────────────────────────────────────────────────────────

function ReplyBar({ target, onCancel, colors }: { target: MensajeExt; onCancel: () => void; colors: any }) {
  const preview = target.tipo === 'imagen' ? '📷 Imagen'
    : target.tipo === 'ubicacion' ? '📍 Ubicación'
    : target.mensaje.length > 60 ? target.mensaje.slice(0, 60) + '…' : target.mensaje;
  return (
    <View style={[S.replyBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={[S.replyBarAccent, { backgroundColor: colors.accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[S.replyBarLabel, { color: colors.accent }]}>Respondiendo</Text>
        <Text style={[S.replyBarPrev, { color: colors.muted }]} numberOfLines={1}>{preview}</Text>
      </View>
      <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close-circle" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── MessageActionModal (WhatsApp-style) ──────────────────────────────────────

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🙏'];

function MessageActionModal({ msg, mio, colors, onClose, onReply, onCopy, onDelete }: {
  msg: MensajeExt; mio: boolean; colors: any;
  onClose: () => void; onReply: (m: MensajeExt) => void;
  onCopy: (m: MensajeExt) => void; onDelete: (m: MensajeExt) => void;
}) {
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(scale,   { toValue: 0.92, duration: 110, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,    duration: 110, useNativeDriver: true }),
    ]).start(() => { onClose(); cb?.(); });
  };

  const ACTIONS = [
    { icon: 'arrow-undo-outline' as const, label: 'Responder', color: colors.accent,   onPress: () => close(() => onReply(msg)) },
    { icon: 'copy-outline'       as const, label: 'Copiar',    color: colors.text,     onPress: () => close(() => onCopy(msg)) },
    { icon: 'share-outline'      as const, label: 'Reenviar',  color: colors.text,     onPress: () => close() },
    { icon: 'trash-outline'      as const, label: 'Eliminar',  color: '#EF4444',       onPress: () => close(() => onDelete(msg)) },
  ];

  const tipo = msg.tipo ?? 'texto';

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[S.menuOverlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        <Animated.View style={[S.menuCard, { transform: [{ scale }] }]}>
          {/* Emoji reactions */}
          <View style={[S.emojiRow, { backgroundColor: colors.card }]}>
            {EMOJIS.map(e => (
              <TouchableOpacity key={e} style={S.emojiBtn} onPress={() => close()} activeOpacity={0.7}>
                <Text style={S.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message preview */}
          <View style={[S.msgPreview, { backgroundColor: colors.card }]}>
            <View style={[
              S.previewBubble,
              mio ? { backgroundColor: colors.accent, alignSelf: 'flex-end' } : { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
            ]}>
              {tipo === 'imagen' && msg.adjunto
                ? <Image source={{ uri: imgUri(msg.adjunto) }} style={{ width: 160, height: 120, borderRadius: 10 }} resizeMode="cover" />
                : tipo === 'ubicacion'
                  ? <Text style={{ color: mio ? '#FFF' : colors.text, fontSize: 14 }}>📍 Ubicación compartida</Text>
                  : <Text style={{ color: mio ? '#FFF' : colors.text, fontSize: 14, lineHeight: 20 }} numberOfLines={5}>{msg.mensaje}</Text>
              }
            </View>
            <Text style={[S.previewTime, { color: colors.muted }]}>{formatTime(msg.created_at)}</Text>
          </View>

          {/* Action buttons */}
          <View style={[S.actionsGrid, { backgroundColor: colors.card }]}>
            {ACTIONS.map(({ icon, label, color, onPress }) => (
              <TouchableOpacity key={label} style={S.actionItem} onPress={onPress} activeOpacity={0.7}>
                <View style={[S.actionIcon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={icon} size={22} color={color} />
                </View>
                <Text style={[S.actionLabel, { color }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── IncomingCallModal ────────────────────────────────────────────────────────

function IncomingCallModal({ llamada, onAccept, onDecline }: {
  llamada: LlamadaEntrante; onAccept: () => void; onDecline: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.14, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [pulse]);
  const uri = imgUri(llamada.foto_perfil);
  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={S.callOverlay}>
        <View style={S.callCard}>
          <Text style={S.callInLabel}>Llamada{llamada.tipo === 'video' ? ' de video' : ''} entrante</Text>
          <Animated.View style={[S.callRing, { transform: [{ scale: pulse }] }]}>
            <View style={S.callAvatarCircle}>
              {uri ? <Image source={{ uri }} style={S.callAvatarImg} /> : <Text style={S.callAvatarTxt}>{getInitials(llamada.nombre)}</Text>}
            </View>
          </Animated.View>
          <Text style={S.callName}>{llamada.nombre}</Text>
          <View style={S.callBtnRow}>
            <TouchableOpacity style={[S.callBtn, { backgroundColor: '#EF4444' }]} onPress={onDecline} activeOpacity={0.8}>
              <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={[S.callBtn, { backgroundColor: '#22C55E' }]} onPress={onAccept} activeOpacity={0.8}>
              <Ionicons name="call" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={S.callBtnLabels}>
            <Text style={S.callBtnLabel}>Rechazar</Text>
            <Text style={S.callBtnLabel}>Aceptar</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── OutgoingCallModal (con Mute + Altavoz) ──────────────────────────────────

function OutgoingCallModal({ nombre, tipo, duracion, onEnd }: {
  nombre: string; tipo: 'voz' | 'video'; duracion: number; onEnd: () => void;
}) {
  const pulse    = useRef(new Animated.Value(0.96)).current;
  const [muted,   setMuted]   = useState(false);
  const [speaker, setSpeaker] = useState(false);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.96, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [pulse]);

  const secs      = duracion % 60;
  const mins      = Math.floor(duracion / 60);
  const timeStr   = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const connected = duracion > 0;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={S.callOverlay}>
        <View style={S.callCard}>
          {/* Indicador de estado */}
          <View style={[S.callStatusPill, { backgroundColor: connected ? '#10B98120' : '#3B82F620' }]}>
            <View style={[S.callStatusDot, { backgroundColor: connected ? '#10B981' : '#3B82F6' }]} />
            <Text style={[S.callStatusTxt, { color: connected ? '#10B981' : '#3B82F6' }]}>
              {connected ? timeStr : tipo === 'video' ? 'Videollamada…' : 'Llamando…'}
            </Text>
          </View>

          {/* Avatar pulsante */}
          <Animated.View style={[S.callRing, { borderColor: connected ? '#10B981' : '#3B82F6', transform: [{ scale: pulse }] }]}>
            <View style={[S.callAvatarCircle, { backgroundColor: connected ? '#10B981' : '#3B82F6' }]}>
              <Text style={S.callAvatarTxt}>{getInitials(nombre)}</Text>
            </View>
          </Animated.View>

          <Text style={S.callName}>{nombre}</Text>
          {!connected && <Text style={[S.callInLabel, { color: '#64748B', marginTop: 4, marginBottom: 8 }]}>Esperando respuesta…</Text>}

          {/* Controles: Mute | Colgar | Altavoz */}
          <View style={S.callControls}>
            <View style={S.callControlItem}>
              <TouchableOpacity
                style={[S.callControlBtn, { backgroundColor: muted ? '#EF4444' : 'rgba(255,255,255,0.12)' }]}
                onPress={() => { setMuted(v => !v); Vibration.vibrate(15); }}
                activeOpacity={0.8}
              >
                <Ionicons name={muted ? 'mic-off' : 'mic-outline'} size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={S.callControlLbl}>{muted ? 'Activar mic' : 'Silenciar'}</Text>
            </View>

            <View style={S.callControlItem}>
              <TouchableOpacity
                style={[S.callHangBtn]}
                onPress={onEnd}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={S.callControlLbl}>Colgar</Text>
            </View>

            <View style={S.callControlItem}>
              <TouchableOpacity
                style={[S.callControlBtn, { backgroundColor: speaker ? '#3B82F6' : 'rgba(255,255,255,0.12)' }]}
                onPress={() => { setSpeaker(v => !v); Vibration.vibrate(15); }}
                activeOpacity={0.8}
              >
                <Ionicons name={speaker ? 'volume-high' : 'volume-medium-outline'} size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={S.callControlLbl}>{speaker ? 'Altavoz ON' : 'Altavoz'}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Chat List ────────────────────────────────────────────────────────────────

export function ChatListScreen() {
  const nav    = useNavigation<Nav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [convs, setConvs]       = useState<ConvExt[]>([]);
  const [tab, setTab]           = useState<ChatTab>('todos');
  const [search, setSearch]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [totalUnread, setTotal] = useState(0);

  const cargar = useCallback(async (t = tab, q = search) => {
    setCargando(true);
    const r = await api<{ ok: boolean; conversaciones?: ConvExt[]; total_no_leidos?: number }>(
      Endpoints.chatConversacionesTab(t, q)
    );
    if (r.ok) { setConvs(r.conversaciones ?? []); setTotal(r.total_no_leidos ?? 0); }
    setCargando(false);
  }, [tab, search]);

  useEffect(() => { void cargar(tab, search); }, [tab, search]);
  useEffect(() => {
    const iv = setInterval(() => void cargar(tab, search), 6000);
    return () => clearInterval(iv);
  }, [cargar, tab, search]);

  const onLongPress = (conv: ConvExt) => {
    Vibration.vibrate(25);
    Alert.alert(conv.nombre, undefined, [
      { text: conv.favorito ? '★ Quitar favorito' : '☆ Agregar favorito', onPress: async () => { await api(Endpoints.chatToggleFavorito, { body: { otro_id: conv.id } }); void cargar(tab, search); } },
      { text: conv.archivado ? '📂 Desarchivar' : '🗂 Archivar', onPress: async () => { await api(Endpoints.chatToggleArchivado, { body: { otro_id: conv.id } }); void cargar(tab, search); } },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const TABS: { key: ChatTab; label: string }[] = [
    { key: 'todos', label: 'Todos' }, { key: 'noLeidos', label: 'No leídos' },
    { key: 'favoritos', label: 'Favoritos' }, { key: 'archivados', label: 'Archivados' },
  ];

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <View style={[S.topBar, { paddingTop: insets.top + 14, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[S.topTitle, { color: colors.text }]}>Mensajes</Text>
          {totalUnread > 0 && <Text style={[S.topSub, { color: colors.muted }]}>{totalUnread} sin leer</Text>}
        </View>
        <TouchableOpacity style={[S.newChatBtn, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="create-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={[S.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[S.searchInner, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.muted} style={{ marginRight: 6 }} />
          <TextInput style={[S.searchInput, { color: colors.text }]} placeholder="Buscar…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.muted} /></TouchableOpacity>}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[S.tabScroll, { backgroundColor: colors.card, borderBottomColor: colors.border }]} contentContainerStyle={S.tabScrollContent}>
        {TABS.map(tb => {
          const isActive = tab === tb.key;
          return (
            <TouchableOpacity key={tb.key} style={[S.tabItem, isActive && [S.tabActive, { borderBottomColor: colors.accent }]]} onPress={() => setTab(tb.key)} activeOpacity={0.8}>
              <Text style={[S.tabTxt, { color: isActive ? colors.accent : colors.muted }]}>{tb.label}</Text>
              {tb.key === 'noLeidos' && totalUnread > 0 && (
                <View style={[S.badge, { backgroundColor: colors.accent }]}><Text style={S.badgeTxt}>{totalUnread > 99 ? '99+' : totalUnread}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {cargando && convs.length === 0 ? <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.xl }} /> : null}

      <FlatList
        data={convs}
        keyExtractor={i => String(i.id)}
        onRefresh={() => void cargar(tab, search)}
        refreshing={cargando}
        contentContainerStyle={convs.length === 0 ? S.emptyContainer : { paddingVertical: Spacing.xs }}
        ListEmptyComponent={!cargando ? <EmptyState colors={colors} tab={tab} /> : null}
        renderItem={({ item }) => {
          const roleColor = ROLE_COLORS[item.rol] ?? colors.accent;
          const isUnread  = (item.no_leidos ?? 0) > 0;
          const uri       = imgUri(item.foto_perfil);
          const lastMsg   = item.ultimo_mensaje?.tipo === 'imagen' ? '📷 Imagen'
                          : item.ultimo_mensaje?.tipo === 'ubicacion' ? '📍 Ubicación'
                          : (item.ultimo_mensaje?.mensaje ?? 'Iniciar conversación');
          return (
            <TouchableOpacity
              style={[S.convRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
              onPress={() => nav.navigate('Chat', { otroId: item.id, nombre: item.nombre })}
              onLongPress={() => onLongPress(item)}
              activeOpacity={0.85}
            >
              <View style={[S.avatar, { backgroundColor: roleColor }]}>
                {uri ? <Image source={{ uri }} style={S.avatarImg} /> : <Text style={S.avatarTxt}>{getInitials(item.nombre)}</Text>}
                {item.en_linea === 1 && <View style={[S.onlineDot, { borderColor: colors.card }]} />}
              </View>
              <View style={S.convBody}>
                <View style={S.convTopRow}>
                  <Text style={[S.convNombre, { color: colors.text, fontWeight: isUnread ? '800' : '600' }]}>{item.nombre}{item.favorito ? ' ★' : ''}</Text>
                  <Text style={[S.convTime, { color: isUnread ? colors.accent : colors.muted }]}>{item.ultimo_mensaje ? formatTime(item.ultimo_mensaje.created_at) : ''}</Text>
                </View>
                <View style={S.convBotRow}>
                  <Text numberOfLines={1} style={[S.convMsg, { color: isUnread ? colors.text : colors.muted, fontWeight: isUnread ? '600' : '400' }]}>{lastMsg}</Text>
                  {isUnread && <View style={[S.badge, { backgroundColor: colors.accent }]}><Text style={S.badgeTxt}>{item.no_leidos! > 99 ? '99+' : item.no_leidos}</Text></View>}
                </View>
              </View>
              <View style={[S.rolPill, { backgroundColor: `${roleColor}18` }]}>
                <Text style={[S.rolTxt, { color: roleColor }]}>{item.rol.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function EmptyState({ colors, tab }: { colors: any; tab: ChatTab }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [pulse]);
  const msgs: Record<ChatTab, [string, string]> = {
    todos:      ['Sin conversaciones', 'Compra algo en el mercado para chatear.'],
    noLeidos:   ['Todo leído ✓', 'No tienes mensajes pendientes.'],
    favoritos:  ['Sin favoritos', 'Mantén pulsada una conversación para marcarla.'],
    archivados: ['Sin archivados', 'Las archivadas aparecerán aquí.'],
  };
  const [title, sub] = msgs[tab];
  return (
    <View style={S.emptyBlock}>
      <Animated.View style={[S.emptyIconBg, { backgroundColor: colors.accentLight, transform: [{ scale: pulse }] }]}>
        <Ionicons name="chatbubbles-outline" size={52} color={colors.accent} />
      </Animated.View>
      <Text style={[S.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[S.emptySub, { color: colors.muted }]}>{sub}</Text>
    </View>
  );
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const route  = useRoute<ChatRoute>();
  const nav    = useNavigation<Nav>();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { otroId, nombre, pedidoId } = route.params;

  const [mensajes, setMensajes]       = useState<MensajeExt[]>([]);
  const [texto, setTexto]             = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [attachModal, setAttachModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState<MensajeExt | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<MensajeExt | null>(null);
  const [imgPreview, setImgPreview]   = useState<string | null>(null);
  const [outCall, setOutCall]         = useState<{ tipo: 'voz' | 'video'; llamadaId: number } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [inCall, setInCall]           = useState<LlamadaEntrante | null>(null);

  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef= useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef     = useRef<FlatList<MensajeExt>>(null);

  const cargar = useCallback(async () => {
    const r = await api<{ ok: boolean; mensajes?: MensajeExt[] }>(Endpoints.chatMensajes(otroId));
    if (r.ok && r.mensajes) {
      setMensajes(r.mensajes);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
    }
  }, [otroId]);

  const checkIncoming = useCallback(async () => {
    if (inCall || outCall) return;
    const r = await api<{ ok: boolean; llamada?: LlamadaEntrante }>(Endpoints.chatLlamadasEntrantes);
    if (r.ok && r.llamada && r.llamada.emisor_id === otroId) setInCall(r.llamada);
  }, [inCall, outCall, otroId]);

  useEffect(() => {
    void cargar();
    pollRef.current     = setInterval(() => void cargar(), 3000);
    callPollRef.current = setInterval(() => void checkIncoming(), 5000);
    return () => {
      if (pollRef.current)     clearInterval(pollRef.current);
      if (callPollRef.current) clearInterval(callPollRef.current);
    };
  }, [cargar, checkIncoming]);

  useEffect(() => {
    if (outCall) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [!!outCall]);

  const enviar = async () => {
    if (!texto.trim()) return;
    const msg = texto.trim();
    setTexto('');
    const body: Record<string, unknown> = { receptor_id: otroId, mensaje: msg };
    if (replyTarget) {
      body.reply_to_id = replyTarget.id;
      body.reply_snapshot = {
        id: replyTarget.id, mensaje: replyTarget.mensaje,
        tipo: replyTarget.tipo, emisor_id: replyTarget.emisor_id,
      };
      setReplyTarget(null);
    }
    setEnviando(true);
    await api(Endpoints.chatEnviar, { body });
    setEnviando(false);
    void cargar();
  };

  const pickImage = async () => {
    setAttachModal(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.65, base64: true });
    if (result.canceled || !result.assets[0].base64) return;
    setEnviando(true);
    await api(Endpoints.chatEnviar, { body: { receptor_id: otroId, tipo: 'imagen', mensaje: '', adjunto: 'data:image/jpeg;base64,' + result.assets[0].base64 } });
    setEnviando(false);
    void cargar();
  };

  const shareLocation = async () => {
    setAttachModal(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setEnviando(true);
      await api(Endpoints.chatEnviar, {
        body: { receptor_id: otroId, tipo: 'ubicacion', mensaje: '📍 Ubicación compartida', lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
      setEnviando(false);
      void cargar();
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    }
  };

  const iniciarLlamada = async (tipo: 'voz' | 'video') => {
    const r = await api<{ ok: boolean; llamada_id?: number }>(Endpoints.chatIniciarLlamada, { body: { receptor_id: otroId, tipo } });
    if (r.ok && r.llamada_id) setOutCall({ tipo, llamadaId: r.llamada_id });
  };

  const finalizarLlamada = async () => {
    if (!outCall) return;
    await api(Endpoints.chatFinalizarLlamada, { body: { llamada_id: outCall.llamadaId, duracion: callDuration } });
    setOutCall(null);
  };

  const responderLlamada = async (aceptar: boolean) => {
    if (!inCall) return;
    await api(Endpoints.chatResponderLlamada, { body: { llamada_id: inCall.id, aceptar } });
    if (aceptar) setOutCall({ tipo: inCall.tipo, llamadaId: inCall.id });
    setInCall(null);
  };

  const onLongPressMsg = (msg: MensajeExt) => {
    Vibration.vibrate(30);
    setSelectedMsg(msg);
  };

  const handleCopy = (msg: MensajeExt) => {
    Alert.alert('Mensaje', msg.mensaje, [{ text: 'OK' }]);
  };

  const handleDelete = (msg: MensajeExt) => {
    Alert.alert('Eliminar', '¿Eliminar este mensaje para ti?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => setMensajes(prev => prev.filter(m => m.id !== msg.id)) },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[S.root, { backgroundColor: colors.background }]}>
      {inCall && <IncomingCallModal llamada={inCall} onAccept={() => void responderLlamada(true)} onDecline={() => void responderLlamada(false)} />}
      {outCall && <OutgoingCallModal nombre={nombre} tipo={outCall.tipo} duracion={callDuration} onEnd={() => void finalizarLlamada()} />}

      {selectedMsg && (
        <MessageActionModal
          msg={selectedMsg}
          mio={selectedMsg.emisor_id === usuario?.id}
          colors={colors}
          onClose={() => setSelectedMsg(null)}
          onReply={m => { setSelectedMsg(null); setReplyTarget(m); }}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      )}

      {/* Image full-screen preview */}
      {imgPreview && (
        <Modal transparent animationType="fade" statusBarTranslucent>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' }} onPress={() => setImgPreview(null)}>
            <Image source={{ uri: imgPreview }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
            <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 16, fontWeight: '600' }}>Toca para cerrar</Text>
          </Pressable>
        </Modal>
      )}

      {/* Header */}
      <View style={[S.chatHeader, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={[S.backBtn, { backgroundColor: colors.background }]} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={[S.chatAvatar, { backgroundColor: ROLE_COLORS.vendedor }]}>
          <Text style={S.chatAvatarTxt}>{getInitials(nombre)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={[S.chatName, { color: colors.text }]}>{nombre}</Text>
          <Text style={[S.chatOnline, { color: colors.success }]}>En línea</Text>
        </View>
        <TouchableOpacity
          style={[S.callBtn, { backgroundColor: colors.accentLight }]}
          onPress={() => Alert.alert('Llamar', undefined, [
            { text: '📞 Llamada de voz',  onPress: () => void iniciarLlamada('voz') },
            { text: '📹 Video llamada',   onPress: () => void iniciarLlamada('video') },
            { text: 'Cancelar', style: 'cancel' },
          ])}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
        renderItem={({ item }) => {
          const mio  = item.emisor_id === usuario?.id;
          const tipo = item.tipo ?? 'texto';
          const uri  = tipo === 'imagen' ? imgUri(item.adjunto) : undefined;
          return (
            <View style={[S.bubbleWrap, mio && S.bubbleWrapMio]}>
              <Pressable onLongPress={() => onLongPressMsg(item)} delayLongPress={350}>
                <MsgErrorBoundary fallback={<View style={[S.bubble, mio ? S.bubbleMio : S.bubbleOtro, { backgroundColor: mio ? colors.accent : colors.card }]}><Text style={{ color: colors.muted }}>Mensaje no disponible</Text></View>}>
                  <View style={[
                    S.bubble,
                    mio ? [S.bubbleMio, { backgroundColor: colors.accent }] : [S.bubbleOtro, { backgroundColor: colors.card, borderColor: colors.border }],
                    (tipo === 'imagen' || tipo === 'ubicacion') && { padding: 4 },
                  ]}>
                    {item.reply_snapshot && <ReplyCard snap={item.reply_snapshot} mio={mio} colors={colors} />}
                    {tipo === 'imagen' && uri ? (
                      <TouchableOpacity onPress={() => setImgPreview(uri)} activeOpacity={0.9}>
                        <Image source={{ uri }} style={S.msgImage} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : tipo === 'ubicacion' ? (
                      <MsgErrorBoundary fallback={<Text style={{ color: mio ? '#FFF' : colors.muted, padding: 8 }}>📍 Ubicación compartida</Text>}>
                        <LocationMsg lat={item.lat} lng={item.lng} mio={mio} colors={colors} />
                      </MsgErrorBoundary>
                    ) : (
                      <Text style={[S.bubbleTxt, { color: mio ? '#FFF' : colors.text }]}>{item.mensaje}</Text>
                    )}
                  </View>
                </MsgErrorBoundary>
              </Pressable>
              <View style={[S.bubbleMeta, mio && S.bubbleMetaMio]}>
                <Text style={[S.bubbleTime, { color: colors.muted }]}>{formatTime(item.created_at)}</Text>
                {mio && <Ionicons name="checkmark-done" size={12} color={item.leido === 1 ? '#3B82F6' : colors.muted} style={{ marginLeft: 3 }} />}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={S.emptyChat}>
            <Ionicons name="chatbubble-outline" size={36} color={colors.muted} />
            <Text style={[S.emptyChatTxt, { color: colors.muted }]}>Inicia la conversación</Text>
          </View>
        }
      />

      {replyTarget && <ReplyBar target={replyTarget} onCancel={() => setReplyTarget(null)} colors={colors} />}

      {attachModal && (
        <View style={[S.attachSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[S.attachHandle, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={S.attachRow} onPress={pickImage} activeOpacity={0.8}>
            <View style={[S.attachIcon, { backgroundColor: '#6366F118' }]}><Ionicons name="image-outline" size={22} color="#6366F1" /></View>
            <Text style={[S.attachTxt, { color: colors.text }]}>Galería de fotos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.attachRow} onPress={shareLocation} activeOpacity={0.8}>
            <View style={[S.attachIcon, { backgroundColor: '#10B98118' }]}><Ionicons name="location-outline" size={22} color="#10B981" /></View>
            <Text style={[S.attachTxt, { color: colors.text }]}>Compartir ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.attachCancel, { backgroundColor: colors.background }]} onPress={() => setAttachModal(false)} activeOpacity={0.8}>
            <Text style={{ color: colors.muted, fontWeight: '700', fontSize: Fonts.regular }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[S.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : Spacing.sm }]}>
        <TouchableOpacity style={[S.attachBtn, { backgroundColor: colors.accentLight }]} onPress={() => setAttachModal(v => !v)} activeOpacity={0.8}>
          <Ionicons name={attachModal ? 'close' : 'add'} size={20} color={colors.accent} />
        </TouchableOpacity>
        <View style={[S.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TextInput
            style={[S.input, { color: colors.text }]}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            onSubmitEditing={enviar}
          />
        </View>
        <TouchableOpacity style={[S.sendBtn, { backgroundColor: texto.trim() ? colors.accent : colors.border }]} onPress={enviar} disabled={enviando || !texto.trim()} activeOpacity={0.85}>
          {enviando ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color={texto.trim() ? '#FFF' : colors.muted} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  topTitle: { fontSize: Fonts.heading - 6, fontWeight: '900', letterSpacing: -0.5 },
  topSub: { fontSize: Fonts.small, fontWeight: '500', marginTop: 2 },
  newChatBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 1 },
  searchInner: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 7 },
  searchInput: { flex: 1, fontSize: Fonts.regular, fontWeight: '500' },
  tabScroll: { borderBottomWidth: 1, flexGrow: 0 },
  tabScrollContent: { paddingHorizontal: Spacing.sm },
  tabItem: { paddingHorizontal: Spacing.sm, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabActive: {},
  tabTxt: { fontSize: Fonts.small + 1, fontWeight: '700' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.regular - 1 },
  onlineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#22C55E', position: 'absolute', bottom: 1, right: 1, borderWidth: 2 },
  convBody: { flex: 1, marginHorizontal: Spacing.sm },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convNombre: { fontSize: Fonts.regular, flex: 1, marginRight: 4 },
  convTime: { fontSize: Fonts.small - 1, fontWeight: '600' },
  convBotRow: { flexDirection: 'row', alignItems: 'center' },
  convMsg: { flex: 1, fontSize: Fonts.small + 1 },
  rolPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.pill, marginLeft: Spacing.sm },
  rolTxt: { fontSize: 8, fontWeight: '900' },
  emptyContainer: { flex: 1 },
  emptyBlock: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIconBg: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { fontSize: Fonts.title - 2, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: Fonts.regular, textAlign: 'center', lineHeight: 22 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  chatAvatarTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.small + 1 },
  chatName: { fontWeight: '800', fontSize: Fonts.regular },
  chatOnline: { fontSize: Fonts.small - 1, fontWeight: '600', marginTop: 1 },
  callBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  bubbleWrap: { alignSelf: 'flex-start', maxWidth: '80%', marginBottom: Spacing.xs },
  bubbleWrapMio: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden' },
  bubbleMio: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleOtro: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 18, borderWidth: 1.5 },
  bubbleTxt: { fontSize: Fonts.regular, fontWeight: '500', lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  bubbleMetaMio: { justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, fontWeight: '500' },
  msgImage: { width: 200, height: 180, borderRadius: 14 },
  emptyChat: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyChatTxt: { fontWeight: '600', fontSize: Fonts.regular },

  // Location
  locWrap: { borderRadius: 14, overflow: 'hidden', width: 222 },
  locMap: { width: 222, height: 108 },
  locMapFallback: { width: 222, height: 108, justifyContent: 'center', alignItems: 'center' },
  locFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  locLabel: { fontWeight: '700', fontSize: Fonts.small + 1, flex: 1 },
  locCoords: { fontSize: 9 },

  // Reply card (inside bubble)
  replyCard: { borderLeftWidth: 3, borderRadius: 8, padding: 8, marginBottom: 6 },
  replyProd: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  replyProdImg: { width: 36, height: 36, borderRadius: 6 },
  replyProdNom: { fontSize: 12, fontWeight: '700' },
  replyProdPx: { fontSize: 11, fontWeight: '600' },
  replyTxt: { fontSize: 12 },

  // Reply bar (above input)
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: Spacing.md, borderTopWidth: 1, gap: 10 },
  replyBarAccent: { width: 3, height: 36, borderRadius: 2 },
  replyBarLabel: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  replyBarPrev: { fontSize: 12, fontWeight: '500' },
  replyClose: { padding: 4 },

  // Action menu modal
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  menuCard: { width: '90%', gap: 8 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 14, borderRadius: 18 },
  emojiBtn: { padding: 6 },
  emoji: { fontSize: 26 },
  msgPreview: { borderRadius: 18, padding: 14, gap: 6 },
  previewBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, maxWidth: '82%' },
  previewTime: { fontSize: 10, textAlign: 'right', fontWeight: '500' },
  actionsGrid: { flexDirection: 'row', borderRadius: 18, paddingVertical: 8 },
  actionItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: Fonts.small, fontWeight: '700' },

  // Attach
  attachSheet: { borderTopWidth: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
  attachHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  attachRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  attachIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  attachTxt: { fontSize: Fonts.regular, fontWeight: '600' },
  attachCancel: { marginTop: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },

  // Input
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1 },
  inputWrap: { flex: 1, borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing.md, paddingVertical: 8, marginRight: Spacing.sm, maxHeight: 100 },
  input: { fontSize: Fonts.regular, fontWeight: '500', maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // Calls
  callOverlay:    { flex: 1, backgroundColor: 'rgba(2,8,23,0.95)', justifyContent: 'center', alignItems: 'center' },
  callBg:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,8,23,0.95)' },
  callCard:       { width: 300, alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  callStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, marginBottom: 28 },
  callStatusDot:  { width: 8, height: 8, borderRadius: 4 },
  callStatusTxt:  { fontSize: 13, fontWeight: '700' },
  callInLabel:    { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginBottom: 28 },
  callRing:       { width: 120, height: 120, borderRadius: 60, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  callAvatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  callAvatarImg:  { width: 100, height: 100, borderRadius: 50 },
  callAvatarTxt:  { color: '#FFF', fontSize: 36, fontWeight: '800' },
  callName:       { fontSize: 24, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  // Controles de llamada
  callControls:    { flexDirection: 'row', gap: 28, marginTop: 36, justifyContent: 'center' },
  callControlItem: { alignItems: 'center', gap: 8 },
  callControlBtn:  { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  callHangBtn:     { width: 68, height: 68, borderRadius: 34, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  callControlLbl:  { color: '#94A3B8', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  // Legacy (por compatibilidad con IncomingCallModal)
  callBtnRow:    { flexDirection: 'row', gap: 44, marginTop: 32 },
  callBtn:       { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  callBtnLabels: { flexDirection: 'row', gap: 66, marginTop: 10 },
  callBtnLabel:  { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
});
