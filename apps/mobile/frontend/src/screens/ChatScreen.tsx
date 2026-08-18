import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
  Easing, Image, Modal, Alert, ScrollView, Pressable, Vibration,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import { api, Endpoints, API_URL, getToken } from '@/services/api';
import { Spacing, Radius, Fonts, FontFamily } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { RootStackParamList } from '@/types';
import { useAuth } from '@/context/AuthContext';
import GuestGate from '@/components/GuestGate';
import LeafletMapView from '@/components/LeafletMapView';
import CallWebViewModal, { CallInfo } from '@/components/CallWebViewModal';

const SOCKET_URL: string = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://192.168.1.63:3001';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type ChatTab = 'todos' | 'noLeidos' | 'favoritos' | 'archivados';
type MsgTipo = 'texto' | 'imagen' | 'ubicacion' | 'pdf' | 'audio' | 'producto';
type LlamadaTipo = 'voz' | 'video';

interface Reaccion {
  emoji: string;
  count: number;
  mio: boolean;
}

interface MensajeExt {
  id: number;
  emisor_id: number;
  receptor_id: number;
  mensaje: string;
  tipo?: MsgTipo;
  adjunto?: string | null;
  adjunto_nombre?: string | null;
  adjunto_tamano?: number | null;
  adjunto_duracion?: number | null;
  lat?: number | string | null;
  lng?: number | string | null;
  leido: number;
  reply_to_id?: number | null;
  reply_snapshot?: ReplySnapshot | null;
  reacciones?: Reaccion[];
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
  ultimo_mensaje?: { mensaje: string; tipo?: string; emisor_id?: number; leido?: number; created_at: string } | null;
}

interface OtroInfo {
  id: number;
  nombre: string;
  username?: string | null;
  foto_perfil?: string | null;
  rol: string;
  en_linea?: number;
  ultimo_visto?: string | null;
}

interface PickerUser {
  id: number;
  nombre: string;
  username?: string | null;
  foto_perfil?: string | null;
  rol: string;
  en_linea?: number;
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

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Preview de tipo de mensaje (ubicación/imagen/pdf/audio) para listas, respuestas y
// fallbacks de error: un ícono Ionicons + label corto, sin depender de emoji.
function tipoPreview(tipo?: string): { icon: keyof typeof Ionicons.glyphMap; label: string } | null {
  switch (tipo) {
    case 'imagen': return { icon: 'image-outline', label: 'Imagen' };
    case 'ubicacion': return { icon: 'location-outline', label: 'Ubicación' };
    case 'pdf': return { icon: 'document-text-outline', label: 'Documento' };
    case 'audio': return { icon: 'mic-outline', label: 'Nota de voz' };
    default: return null;
  }
}

function presenceLabel(otro: OtroInfo | null): string {
  if (!otro) return '';
  if (otro.en_linea === 1) return 'En línea';
  if (!otro.ultimo_visto) return '';
  const diffMs = Date.now() - new Date(otro.ultimo_visto.replace(' ', 'T')).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Activo hace un momento';
  if (mins < 60) return `Activo hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Activo hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Activo hace ${days} d`;
}

const ROLE_COLORS: Record<string, string> = {
  vendedor: '#1D5FD1', repartidor: '#27AE8F', comprador: '#8E44AD', admin: '#C0392B',
};

const REACTION_EMOJIS = ['🔥', '👏', '😂', '🙈', '🙏', '😡'];
const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '😢', '🎉'];

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

// ─── LocationMsg (abre mapa embebido, ya no sale de la app) ───────────────────

function LocationMsg({ lat, lng, mio, colors, onOpen }: { lat: any; lng: any; mio: boolean; colors: any; onOpen: (lat: number, lng: number) => void }) {
  const [mapErr, setMapErr] = useState(false);
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!numLat || !numLng) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
      <Ionicons name="location-outline" size={14} color={mio ? '#FFF' : colors.muted} />
      <Text style={{ color: mio ? '#FFF' : colors.muted, fontFamily: FontFamily.bodySemiBold }}>Ubicación</Text>
    </View>
  );

  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${numLat},${numLng}&zoom=14&size=220x100&markers=${numLat},${numLng},red`;

  return (
    <TouchableOpacity onPress={() => onOpen(numLat, numLng)} activeOpacity={0.85} style={S.locWrap}>
      {!mapErr ? (
        <Image source={{ uri: mapUrl }} style={S.locMap} onError={() => setMapErr(true)} resizeMode="cover" />
      ) : (
        <View style={[S.locMapFallback, { backgroundColor: mio ? 'rgba(255,255,255,0.12)' : colors.background }]}>
          <Ionicons name="map-outline" size={38} color={mio ? '#FFF' : colors.accent} />
        </View>
      )}
      <View style={[S.locFooter, { backgroundColor: mio ? 'rgba(0,0,0,0.35)' : `${colors.accent}18` }]}>
        <Ionicons name="location-sharp" size={13} color={mio ? '#FFF' : colors.accent} />
        <Text style={[S.locLabel, { color: mio ? '#FFF' : colors.text }]}>Ver mapa</Text>
        <Text style={[S.locCoords, { color: mio ? 'rgba(255,255,255,0.65)' : colors.muted }]}>
          {numLat.toFixed(4)}, {numLng.toFixed(4)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── MapModal (mapa dentro de la app) ─────────────────────────────────────────

function MapModal({ lat, lng, colors, onClose }: { lat: number; lng: number; colors: any; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const openExternal = () => {
    const url = Platform.OS === 'ios' ? `maps:0,0?q=${lat},${lng}` : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`));
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LeafletMapView lat={lat} lng={lng} />
        <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onClose} style={S.mapTopBtn} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openExternal} style={[S.mapTopBtn, { flexDirection: 'row', width: 'auto', paddingHorizontal: 14, gap: 6 }]} activeOpacity={0.85}>
            <Ionicons name="navigate" size={16} color="#0F172A" />
            <Text style={{ fontFamily: FontFamily.bodyBold, color: '#0F172A', fontSize: 12 }}>Abrir en Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── LocationPickerModal (elegir ubicación exacta con tap-to-pick) ───────────

function LocationPickerModal({ initialLat, initialLng, colors, onConfirm, onClose }: {
  initialLat: number; initialLng: number; colors: any;
  onConfirm: (lat: number, lng: number) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState({ lat: initialLat, lng: initialLng });
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LeafletMapView lat={initialLat} lng={initialLng} pickable onPick={(lat, lng) => setPicked({ lat, lng })} />
        <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16 }}>
          <TouchableOpacity onPress={onClose} style={S.mapTopBtn} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 16, right: 16 }}>
          <View style={[S.pickerCard, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontFamily: FontFamily.bodyBold, fontSize: 12, marginBottom: 10 }}>
              Toca el mapa o arrastra el pin para ajustar
            </Text>
            <TouchableOpacity
              onPress={() => onConfirm(picked.lat, picked.lng)}
              style={[S.pickerConfirmBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontFamily: FontFamily.bodyExtraBold }}>Enviar esta ubicación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── PdfMsg / PdfModal (PDF dentro de la app) ─────────────────────────────────

function PdfMsg({ msg, mio, colors, onOpen }: { msg: MensajeExt; mio: boolean; colors: any; onOpen: (url: string, nombre?: string | null) => void }) {
  const nombre = msg.adjunto_nombre || 'Documento.pdf';
  const tamano = formatBytes(msg.adjunto_tamano);

  return (
    <TouchableOpacity
      onPress={() => msg.adjunto && onOpen(msg.adjunto, msg.adjunto_nombre)}
      activeOpacity={0.85}
      style={[S.pdfCard, { backgroundColor: mio ? 'rgba(255,255,255,0.14)' : colors.background }]}
    >
      <View style={[S.pdfIcon, { backgroundColor: mio ? 'rgba(255,255,255,0.18)' : `${colors.accent}18` }]}>
        <Ionicons name="document-text" size={22} color={mio ? '#FFF' : colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.pdfNombre, { color: mio ? '#FFF' : colors.text }]} numberOfLines={1}>{nombre}</Text>
        {!!tamano && <Text style={[S.pdfTamano, { color: mio ? 'rgba(255,255,255,0.7)' : colors.muted }]}>{tamano} · PDF</Text>}
      </View>
      <View style={[S.pdfDownload, { backgroundColor: mio ? 'rgba(255,255,255,0.18)' : `${colors.accent}18` }]}>
        <Ionicons name="eye-outline" size={16} color={mio ? '#FFF' : colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

function PdfModal({ url, nombre, colors, onClose }: { url: string; nombre?: string | null; colors: any; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0B0F19' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: insets.top + 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          <Text style={{ color: '#FFF', fontFamily: FontFamily.displayBold, flex: 1, fontSize: 14 }} numberOfLines={1}>{nombre ?? 'Documento.pdf'}</Text>
        </View>
        {loading && <ActivityIndicator color={colors.accent} style={{ position: 'absolute', top: '50%', left: 0, right: 0 }} />}
        <WebView source={{ uri: url }} style={{ flex: 1, backgroundColor: '#0B0F19' }} onLoadEnd={() => setLoading(false)} />
      </View>
    </Modal>
  );
}

// ─── AudioMsg ─────────────────────────────────────────────────────────────────

function AudioMsg({ msg, mio, colors }: { msg: MensajeExt; mio: boolean; colors: any }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState((msg.adjunto_duracion ?? 0) * 1000);

  useEffect(() => {
    return () => { void soundRef.current?.unloadAsync(); };
  }, []);

  const toggle = async () => {
    if (!msg.adjunto) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          if (status.isLoaded && status.didJustFinish) await soundRef.current.setPositionAsync(0);
          await soundRef.current.playAsync();
        }
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: msg.adjunto },
        { shouldPlay: true },
        status => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis ?? 0);
          if (status.durationMillis) setDuration(status.durationMillis);
          setPlaying(status.isPlaying);
          if (status.didJustFinish) setPlaying(false);
        }
      );
      soundRef.current = sound;
    } catch {
      Alert.alert('Error', 'No se pudo reproducir la nota de voz.');
    }
  };

  const progreso = duration > 0 ? Math.min(1, position / duration) : 0;
  const segundosMostrar = (playing || position > 0) ? position / 1000 : duration / 1000;

  return (
    <View style={[S.audioWrap, { backgroundColor: mio ? 'rgba(255,255,255,0.14)' : colors.background }]}>
      <TouchableOpacity onPress={toggle} style={[S.audioPlayBtn, { backgroundColor: mio ? '#FFF' : colors.accent }]} activeOpacity={0.85}>
        <Ionicons name={playing ? 'pause' : 'play'} size={16} color={mio ? colors.accent : '#FFF'} style={{ marginLeft: playing ? 0 : 2 }} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={[S.audioTrack, { backgroundColor: mio ? 'rgba(255,255,255,0.3)' : colors.border }]}>
          <View style={[S.audioProgress, { backgroundColor: mio ? '#FFF' : colors.accent, width: `${progreso * 100}%` }]} />
        </View>
        <Text style={[S.audioTime, { color: mio ? 'rgba(255,255,255,0.8)' : colors.muted }]}>{formatDuration(segundosMostrar)}</Text>
      </View>
      <Ionicons name="mic" size={14} color={mio ? 'rgba(255,255,255,0.7)' : colors.muted} />
    </View>
  );
}

// ─── ReactionsRow ─────────────────────────────────────────────────────────────

function ReactionsRow({ reacciones, mio, colors, onPress }: {
  reacciones: Reaccion[]; mio: boolean; colors: any; onPress: (emoji: string) => void;
}) {
  if (!reacciones?.length) return null;
  return (
    <View style={[S.reaccionesRow, mio && { justifyContent: 'flex-end' }]}>
      {reacciones.map(r => (
        <TouchableOpacity
          key={r.emoji}
          onPress={() => onPress(r.emoji)}
          style={[
            S.reaccionPill,
            { backgroundColor: colors.card, borderColor: colors.border },
            r.mio && { backgroundColor: colors.accentLight, borderColor: colors.accent },
          ]}
          activeOpacity={0.7}
        >
          <Text style={S.reaccionEmoji}>{r.emoji}</Text>
          {r.count > 1 && <Text style={[S.reaccionCount, { color: colors.muted }]}>{r.count}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── ReplyCard / ReplyBar ──────────────────────────────────────────────────────

function ReplyCard({ snap, mio, colors }: { snap: ReplySnapshot; mio: boolean; colors: any }) {
  const prev = tipoPreview(snap.tipo);
  const textColor = mio ? 'rgba(255,255,255,0.75)' : colors.muted;

  return (
    <View style={[S.replyCard, {
      backgroundColor: mio ? 'rgba(255,255,255,0.15)' : colors.background,
      borderLeftColor: mio ? 'rgba(255,255,255,0.55)' : colors.accent,
    }]}>
      {snap.producto && (
        <View style={S.replyProd}>
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
      {prev ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={prev.icon} size={12} color={textColor} />
          <Text style={[S.replyTxt, { color: textColor }]} numberOfLines={2}>{prev.label}</Text>
        </View>
      ) : (
        <Text style={[S.replyTxt, { color: textColor }]} numberOfLines={2}>
          {snap.mensaje.length > 55 ? snap.mensaje.slice(0, 55) + '…' : snap.mensaje}
        </Text>
      )}
    </View>
  );
}

function ReplyBar({ target, onCancel, colors }: { target: MensajeExt; onCancel: () => void; colors: any }) {
  const prev = tipoPreview(target.tipo);
  return (
    <View style={[S.replyBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={[S.replyBarAccent, { backgroundColor: colors.accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[S.replyBarLabel, { color: colors.accent }]}>Respondiendo</Text>
        {prev ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={prev.icon} size={12} color={colors.muted} />
            <Text style={[S.replyBarPrev, { color: colors.muted }]} numberOfLines={1}>{prev.label}</Text>
          </View>
        ) : (
          <Text style={[S.replyBarPrev, { color: colors.muted }]} numberOfLines={1}>
            {target.mensaje.length > 60 ? target.mensaje.slice(0, 60) + '…' : target.mensaje}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close-circle" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── MessageActionModal ────────────────────────────────────────────────────────

function MessageActionModal({ msg, mio, colors, onClose, onCopy, onReply, onForward, onDelete, onReact }: {
  msg: MensajeExt; mio: boolean; colors: any;
  onClose: () => void;
  onCopy: (m: MensajeExt) => void;
  onReply: (m: MensajeExt) => void;
  onForward: (m: MensajeExt) => void;
  onDelete: (m: MensajeExt) => void;
  onReact: (m: MensajeExt, emoji: string) => void;
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

  const ACTIONS: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }> = [
    { icon: 'copy-outline',       label: 'Copiar',   color: colors.text,   onPress: () => close(() => onCopy(msg)) },
    { icon: 'arrow-undo-outline', label: 'Responder',color: colors.accent, onPress: () => close(() => onReply(msg)) },
    { icon: 'arrow-redo-outline', label: 'Reenviar', color: colors.text,   onPress: () => close(() => onForward(msg)) },
    ...(mio ? [{ icon: 'trash-outline' as const, label: 'Eliminar', color: '#EF4444', onPress: () => close(() => onDelete(msg)) }] : []),
  ];

  const tipo = msg.tipo ?? 'texto';

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[S.menuOverlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()}>
          <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        <Animated.View style={[S.menuCard, { transform: [{ scale }] }]}>
          <View style={[S.emojiRow, { backgroundColor: colors.card }]}>
            {REACTION_EMOJIS.map(e => (
              <TouchableOpacity key={e} style={S.emojiBtn} onPress={() => close(() => onReact(msg, e))} activeOpacity={0.7}>
                <Text style={S.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[S.msgPreview, { backgroundColor: colors.card }]}>
            <View style={[
              S.previewBubble,
              mio ? { backgroundColor: colors.accent, alignSelf: 'flex-end' } : { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
            ]}>
              {tipo === 'imagen' && msg.adjunto
                ? <Image source={{ uri: imgUri(msg.adjunto) }} style={{ width: 160, height: 120, borderRadius: 10 }} resizeMode="cover" />
                : tipo === 'ubicacion'
                  ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="location-outline" size={16} color={mio ? '#FFF' : colors.text} />
                      <Text style={{ color: mio ? '#FFF' : colors.text, fontSize: 14, fontFamily: FontFamily.bodyRegular }}>Ubicación compartida</Text>
                    </View>
                  : tipo === 'pdf'
                    ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="document-text-outline" size={16} color={mio ? '#FFF' : colors.text} />
                        <Text style={{ color: mio ? '#FFF' : colors.text, fontSize: 14, fontFamily: FontFamily.bodyRegular }}>{msg.adjunto_nombre ?? 'Documento.pdf'}</Text>
                      </View>
                    : tipo === 'audio'
                      ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="mic-outline" size={16} color={mio ? '#FFF' : colors.text} />
                          <Text style={{ color: mio ? '#FFF' : colors.text, fontSize: 14, fontFamily: FontFamily.bodyRegular }}>Nota de voz</Text>
                        </View>
                      : <Text style={{ color: mio ? '#FFF' : colors.text, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.bodyRegular }} numberOfLines={5}>{msg.mensaje}</Text>
              }
            </View>
            <Text style={[S.previewTime, { color: colors.muted }]}>{formatTime(msg.created_at)}</Text>
          </View>

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

// ─── PeoplePickerModal (contactos permitidos / reenviar a un chat existente) ──

function PeoplePickerModal({ visible, title, colors, insets, people, loading, onClose, onSelect }: {
  visible: boolean; title: string; colors: any; insets: { top: number };
  people: PickerUser[]; loading: boolean;
  onClose: () => void; onSelect: (u: PickerUser) => void;
}) {
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) setQ(''); }, [visible]);

  const filtered = q.trim()
    ? people.filter(u => u.nombre.toLowerCase().includes(q.toLowerCase()) || (u.username ?? '').toLowerCase().includes(q.toLowerCase()))
    : people;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontFamily: FontFamily.displayExtraBold, fontSize: 18, color: colors.text }}>{title}</Text>
        </View>
        <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.elevated, borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput
              placeholder="Buscar..."
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 14 }}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={u => String(u.id)}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Ionicons name="people-outline" size={48} color={colors.muted} />
                <Text style={{ color: colors.muted, marginTop: 10, fontFamily: FontFamily.bodyBold, textAlign: 'center' }}>
                  {people.length === 0 ? 'Aún no tienes contactos.\nAparecerán aquí tras tu primer pedido.' : 'Sin resultados'}
                </Text>
              </View>
            }
            renderItem={({ item: u }) => {
              const uri = imgUri(u.foto_perfil);
              const roleColor = ROLE_COLORS[u.rol] ?? colors.accent;
              return (
                <TouchableOpacity
                  onPress={() => onSelect(u)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}
                  activeOpacity={0.85}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: roleColor, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#FFF', fontFamily: FontFamily.bodyExtraBold, fontSize: 16 }}>{u.nombre.charAt(0).toUpperCase()}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontFamily: FontFamily.bodyExtraBold, fontSize: 14 }}>{u.nombre}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {u.username && <Text style={{ color: colors.muted, fontSize: 12, fontFamily: FontFamily.bodyRegular }}>@{u.username}</Text>}
                      <View style={{ backgroundColor: `${roleColor}22`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ color: roleColor, fontSize: 9, fontFamily: FontFamily.bodyExtraBold, letterSpacing: 0.5, textTransform: 'uppercase' }}>{u.rol}</Text>
                      </View>
                      {u.en_linea === 1 && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }} />}
                    </View>
                  </View>
                  <Ionicons name="chatbubble-ellipses" size={20} color={colors.accent} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Chat List ────────────────────────────────────────────────────────────────

export function ChatListScreen() {
  const nav    = useNavigation<Nav>();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [convs, setConvs]       = useState<ConvExt[]>([]);
  const [tab, setTab]           = useState<ChatTab>('todos');
  const [search, setSearch]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [totalUnread, setTotal] = useState(0);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactos, setContactos] = useState<PickerUser[]>([]);
  const [contactosLoading, setContactosLoading] = useState(false);

  const lastConvsJson = useRef<string>('');
  const socketRef = useRef<Socket | null>(null);

  const cargar = useCallback(async (t = tab, q = search) => {
    setCargando(true);
    const r = await api<{ ok: boolean; conversaciones?: ConvExt[]; total_no_leidos?: number }>(
      Endpoints.chatConversacionesTab(t, q)
    );
    if (r.ok) {
      const json = JSON.stringify(r.conversaciones ?? []);
      if (json !== lastConvsJson.current) {
        lastConvsJson.current = json;
        setConvs(r.conversaciones ?? []);
      }
      setTotal(r.total_no_leidos ?? 0);
    }
    setCargando(false);
  }, [tab, search]);

  useEffect(() => { void cargar(tab, search); }, [tab, search]);

  // Poll de respaldo (baja frecuencia): el socket es la vía principal de refresco
  useEffect(() => {
    const iv = setInterval(() => void cargar(tab, search), 25000);
    return () => clearInterval(iv);
  }, [cargar, tab, search]);

  // Tiempo real: refresca la lista solo cuando algo realmente cambió
  useEffect(() => {
    if (!usuario?.id) return;
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-user', { userId: usuario.id }));
    const refrescar = () => void cargar(tab, search);
    socket.on('new-message', refrescar);
    socket.on('messages-read', refrescar);
    socket.on('reaction-change', refrescar);
    socket.on('message-deleted', refrescar);
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, tab, search]);

  const onLongPress = (conv: ConvExt) => {
    Vibration.vibrate(25);
    Alert.alert(conv.nombre, undefined, [
      { text: conv.favorito ? 'Quitar favorito' : 'Agregar favorito', onPress: async () => { await api(Endpoints.chatToggleFavorito, { body: { otro_id: conv.id } }); void cargar(tab, search); } },
      { text: conv.archivado ? 'Desarchivar' : 'Archivar', onPress: async () => { await api(Endpoints.chatToggleArchivado, { body: { otro_id: conv.id } }); void cargar(tab, search); } },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const abrirChat = (conv: ConvExt) => nav.navigate('Chat', { otroId: conv.id, nombre: conv.nombre, otroFoto: conv.foto_perfil });

  const abrirContactos = async () => {
    setNewChatOpen(true);
    setContactosLoading(true);
    const r = await api<{ ok: boolean; contactos?: PickerUser[] }>(Endpoints.chatContactos);
    setContactos(r.ok ? (r.contactos ?? []) : []);
    setContactosLoading(false);
  };

  const TABS: { key: ChatTab; label: string }[] = [
    { key: 'todos', label: 'Todos' }, { key: 'noLeidos', label: 'No leídos' },
    { key: 'favoritos', label: 'Favoritos' }, { key: 'archivados', label: 'Archivados' },
  ];

  if (!usuario) {
    return (
      <GuestGate
        icon="chatbubbles-outline"
        title="Inicia sesión para chatear"
        subtitle="Los chats están disponibles solo para cuentas registradas. Inicia sesión o crea una cuenta para hablar con tiendas y repartidores."
      />
    );
  }

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <View style={[S.topBar, { paddingTop: insets.top + 14, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[S.topTitle, { color: colors.text }]}>Mensajes</Text>
          {totalUnread > 0 && <Text style={[S.topSub, { color: colors.muted }]}>{totalUnread} sin leer</Text>}
        </View>
        <TouchableOpacity style={[S.newChatBtn, { backgroundColor: colors.accentLight }]} onPress={abrirContactos} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <PeoplePickerModal
        visible={newChatOpen}
        title="Tus contactos"
        colors={colors}
        insets={insets}
        people={contactos}
        loading={contactosLoading}
        onClose={() => setNewChatOpen(false)}
        onSelect={u => { setNewChatOpen(false); nav.navigate('Chat', { otroId: u.id, nombre: u.nombre, otroFoto: u.foto_perfil }); }}
      />

      <View style={[S.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[S.searchInner, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.muted} style={{ marginRight: 6 }} />
          <TextInput style={[S.searchInput, { color: colors.text }]} placeholder="Buscar…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.muted} /></TouchableOpacity>}
        </View>
      </View>

      <View style={[S.segmentWrap, { backgroundColor: colors.elevated }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map(tb => {
            const isActive = tab === tb.key;
            return (
              <TouchableOpacity
                key={tb.key}
                style={[S.segmentItem, isActive && { backgroundColor: colors.accent }]}
                onPress={() => setTab(tb.key)}
                activeOpacity={0.85}
              >
                <Text style={[S.segmentTxt, { color: isActive ? '#FFF' : colors.muted }]}>{tb.label}</Text>
                {tb.key === 'noLeidos' && totalUnread > 0 && (
                  <View style={[S.badge, { backgroundColor: isActive ? '#FFF' : colors.accent }]}>
                    <Text style={[S.badgeTxt, { color: isActive ? colors.accent : '#FFF' }]}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {cargando && convs.length === 0 ? <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.xl }} /> : null}

      <FlatList
        data={convs}
        keyExtractor={i => String(i.id)}
        onRefresh={() => void cargar(tab, search)}
        refreshing={cargando}
        contentContainerStyle={convs.length === 0 ? S.emptyContainer : { paddingVertical: Spacing.xs }}
        ListEmptyComponent={!cargando ? <EmptyState colors={colors} tab={tab} onNewChat={abrirContactos} /> : null}
        renderItem={({ item }) => {
          const roleColor = ROLE_COLORS[item.rol] ?? colors.accent;
          const isUnread  = (item.no_leidos ?? 0) > 0;
          const uri       = imgUri(item.foto_perfil);
          const lastMsgPreview = tipoPreview(item.ultimo_mensaje?.tipo);
          const lastMsg   = lastMsgPreview ? lastMsgPreview.label : (item.ultimo_mensaje?.mensaje ?? 'Iniciar conversación');
          const esMio = !!item.ultimo_mensaje && item.ultimo_mensaje.emisor_id === usuario?.id;
          return (
            <TouchableOpacity
              style={[S.convRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
              onPress={() => abrirChat(item)}
              onLongPress={() => onLongPress(item)}
              activeOpacity={0.85}
            >
              <View style={[S.avatarRing, { borderColor: item.en_linea === 1 ? '#22C55E' : 'transparent' }]}>
                <View style={[S.avatar, { backgroundColor: roleColor }]}>
                  {uri ? <Image source={{ uri }} style={S.avatarImg} /> : <Text style={S.avatarTxt}>{getInitials(item.nombre)}</Text>}
                </View>
              </View>
              <View style={S.convBody}>
                <View style={S.convTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4 }}>
                    <Text style={[S.convNombre, { flex: 0, color: colors.text, fontFamily: isUnread ? FontFamily.bodyExtraBold : FontFamily.bodySemiBold }]} numberOfLines={1}>{item.nombre}</Text>
                    {!!item.favorito && <Ionicons name="star" size={12} color={colors.ctaAccent} style={{ marginLeft: 4 }} />}
                  </View>
                  <Text style={[S.convTime, { color: isUnread ? colors.accent : colors.muted }]}>{item.ultimo_mensaje ? formatTime(item.ultimo_mensaje.created_at) : ''}</Text>
                </View>
                <View style={S.convBotRow}>
                  {esMio && (
                    <Ionicons
                      name={item.ultimo_mensaje?.leido ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={item.ultimo_mensaje?.leido ? colors.accent : colors.muted}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  {lastMsgPreview && (
                    <Ionicons name={lastMsgPreview.icon} size={13} color={isUnread ? colors.text : colors.muted} style={{ marginRight: 3 }} />
                  )}
                  <Text numberOfLines={1} style={[S.convMsg, { color: isUnread ? colors.text : colors.muted, fontFamily: isUnread ? FontFamily.bodySemiBold : FontFamily.bodyRegular }]}>{lastMsg}</Text>
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

function EmptyState({ colors, tab, onNewChat }: { colors: any; tab: ChatTab; onNewChat?: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [pulse]);
  const msgs: Record<ChatTab, [string, string, keyof typeof Ionicons.glyphMap]> = {
    todos:      ['¡Bienvenido a tus mensajes!', 'Habla con la tienda o el repartidor de tus pedidos.', 'chatbubbles-outline'],
    noLeidos:   ['Todo leído', 'No tienes mensajes pendientes.', 'checkmark-circle-outline'],
    favoritos:  ['Sin favoritos', 'Mantén pulsada una conversación para marcarla.', 'star-outline'],
    archivados: ['Sin archivados', 'Las archivadas aparecerán aquí.', 'archive-outline'],
  };
  const [title, sub, icon] = msgs[tab];
  return (
    <View style={S.emptyBlock}>
      <Animated.View style={[S.emptyIconBg, { backgroundColor: colors.accentLight, transform: [{ scale: pulse }] }]}>
        <Ionicons name={icon} size={52} color={colors.accent} />
      </Animated.View>
      <Text style={[S.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[S.emptySub, { color: colors.muted }]}>{sub}</Text>
      {tab === 'todos' && onNewChat && (
        <TouchableOpacity
          onPress={onNewChat}
          style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99 }}
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontFamily: FontFamily.bodyExtraBold }}>Ver mis contactos</Text>
        </TouchableOpacity>
      )}
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
  const { otroId, nombre, otroFoto } = route.params;

  const [mensajes, setMensajes]       = useState<MensajeExt[]>([]);
  const [otro, setOtro]               = useState<OtroInfo | null>(null);
  const [texto, setTexto]             = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [attachModal, setAttachModal] = useState(false);
  const [emojiOpen, setEmojiOpen]     = useState(false);
  const [replyTarget, setReplyTarget] = useState<MensajeExt | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<MensajeExt | null>(null);
  const [imgPreview, setImgPreview]   = useState<string | null>(null);
  const [mapTarget, setMapTarget]     = useState<{ lat: number; lng: number } | null>(null);
  const [pdfTarget, setPdfTarget]     = useState<{ url: string; nombre?: string | null } | null>(null);
  const [forwardTarget, setForwardTarget] = useState<MensajeExt | null>(null);
  const [forwardChats, setForwardChats]   = useState<PickerUser[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [grabando, setGrabando]       = useState(false);
  const [grabacionSeg, setGrabacionSeg] = useState(0);
  const [authToken, setAuthToken]     = useState<string | null>(null);
  const [outCall, setOutCall]         = useState<CallInfo | null>(null);
  const [locPicker, setLocPicker]     = useState<{ lat: number; lng: number } | null>(null);

  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const grabacionTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef    = useRef<Audio.Recording | null>(null);
  const listRef         = useRef<FlatList<MensajeExt>>(null);
  const socketRef       = useRef<Socket | null>(null);
  const lastMsgsJson    = useRef<string>('');

  useEffect(() => { void getToken().then(setAuthToken); }, []);

  const cargar = useCallback(async () => {
    const r = await api<{ ok: boolean; mensajes?: MensajeExt[]; otro?: OtroInfo }>(Endpoints.chatMensajes(otroId));
    if (r.ok) {
      if (r.mensajes) {
        const json = JSON.stringify(r.mensajes);
        if (json !== lastMsgsJson.current) {
          lastMsgsJson.current = json;
          setMensajes(r.mensajes);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
        }
      }
      if (r.otro) setOtro(r.otro);
    }
  }, [otroId]);

  useEffect(() => {
    void cargar();
    pollRef.current = setInterval(() => void cargar(), 15000); // respaldo, el socket lleva el peso
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [cargar]);

  // ── Tiempo real ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!usuario?.id) return;
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-user', { userId: usuario.id }));
    socket.on('new-message', (msg: MensajeExt) => { if (msg.emisor_id === otroId) void cargar(); });
    socket.on('messages-read', () => void cargar());
    socket.on('reaction-change', () => void cargar());
    socket.on('message-deleted', () => void cargar());
    return () => { socket.disconnect(); };
  }, [usuario?.id, otroId, cargar]);

  useEffect(() => {
    return () => { void recordingRef.current?.stopAndUnloadAsync().catch(() => {}); };
  }, []);

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
    const r = await api<{ ok: boolean; id?: number }>(Endpoints.chatEnviar, { body });
    setEnviando(false);
    if (r.ok) socketRef.current?.emit('send-message', { receptorId: otroId, message: { id: r.id, emisor_id: usuario?.id, mensaje: msg, tipo: 'texto' } });
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
    socketRef.current?.emit('send-message', { receptorId: otroId, message: { emisor_id: usuario?.id, tipo: 'imagen' } });
    void cargar();
  };

  const pickPdf = async () => {
    setAttachModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      if (file.size && file.size > 15 * 1024 * 1024) {
        Alert.alert('Archivo muy grande', 'El PDF supera el límite de 15 MB.');
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      setEnviando(true);
      await api(Endpoints.chatEnviar, {
        body: {
          receptor_id: otroId, tipo: 'pdf', mensaje: '',
          adjunto: `data:application/pdf;base64,${base64}`,
          nombre: file.name, tamano: file.size ?? null,
        },
      });
      setEnviando(false);
      socketRef.current?.emit('send-message', { receptorId: otroId, message: { emisor_id: usuario?.id, tipo: 'pdf' } });
      void cargar();
    } catch {
      setEnviando(false);
      Alert.alert('Error', 'No se pudo adjuntar el documento.');
    }
  };

  const abrirSelectorUbicacion = async () => {
    setAttachModal(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocPicker({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    }
  };

  const confirmarUbicacion = async (lat: number, lng: number) => {
    setLocPicker(null);
    setEnviando(true);
    await api(Endpoints.chatEnviar, {
      body: { receptor_id: otroId, tipo: 'ubicacion', mensaje: '📍 Ubicación compartida', lat, lng },
    });
    setEnviando(false);
    socketRef.current?.emit('send-message', { receptorId: otroId, message: { emisor_id: usuario?.id, tipo: 'ubicacion' } });
    void cargar();
  };

  const iniciarGrabacion = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso al micrófono.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      Vibration.vibrate(20);
      setGrabando(true);
      setGrabacionSeg(0);
      grabacionTimer.current = setInterval(() => setGrabacionSeg(s => s + 1), 1000);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  };

  const cancelarGrabacion = async () => {
    if (grabacionTimer.current) clearInterval(grabacionTimer.current);
    setGrabando(false);
    setGrabacionSeg(0);
    const recording = recordingRef.current;
    recordingRef.current = null;
    try { await recording?.stopAndUnloadAsync(); } catch {}
  };

  const enviarGrabacion = async () => {
    if (grabacionTimer.current) clearInterval(grabacionTimer.current);
    const duracion = grabacionSeg;
    setGrabando(false);
    setGrabacionSeg(0);
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setEnviando(true);
      await api(Endpoints.chatEnviar, {
        body: { receptor_id: otroId, tipo: 'audio', mensaje: '', adjunto: `data:audio/m4a;base64,${base64}`, duracion },
      });
      setEnviando(false);
      socketRef.current?.emit('send-message', { receptorId: otroId, message: { emisor_id: usuario?.id, tipo: 'audio' } });
      void cargar();
    } catch {
      setEnviando(false);
      Alert.alert('Error', 'No se pudo enviar la nota de voz.');
    }
  };

  const reaccionar = async (msg: MensajeExt, emoji: string) => {
    setSelectedMsg(null);
    await api(Endpoints.chatReaccionar, { body: { chat_id: msg.id, emoji } });
    socketRef.current?.emit('reaction-change', { otroId, chatId: msg.id, emoji, usuarioId: usuario?.id });
    void cargar();
  };

  const onLongPressMsg = (msg: MensajeExt) => {
    Vibration.vibrate(30);
    setSelectedMsg(msg);
  };

  const handleCopy = async (msg: MensajeExt) => {
    await Clipboard.setStringAsync(msg.mensaje);
  };

  const handleForward = async (msg: MensajeExt) => {
    setForwardTarget(msg);
    setForwardLoading(true);
    const r = await api<{ ok: boolean; conversaciones?: PickerUser[] }>(Endpoints.chatConversaciones);
    setForwardChats(r.ok ? (r.conversaciones ?? []) : []);
    setForwardLoading(false);
  };

  const enviarReenvio = async (u: PickerUser) => {
    const msg = forwardTarget;
    setForwardTarget(null);
    if (!msg) return;
    const body: Record<string, unknown> = { receptor_id: u.id, tipo: msg.tipo ?? 'texto', mensaje: msg.mensaje };
    if (msg.adjunto) body.adjunto = msg.adjunto;
    if (msg.adjunto_nombre) body.nombre = msg.adjunto_nombre;
    if (msg.adjunto_tamano) body.tamano = msg.adjunto_tamano;
    if (msg.adjunto_duracion) body.duracion = msg.adjunto_duracion;
    if (msg.lat) body.lat = msg.lat;
    if (msg.lng) body.lng = msg.lng;
    await api(Endpoints.chatEnviar, { body });
    socketRef.current?.emit('send-message', { receptorId: u.id, message: { emisor_id: usuario?.id, tipo: msg.tipo ?? 'texto' } });
    if (u.id === otroId) void cargar();
  };

  const handleDelete = (msg: MensajeExt) => {
    Alert.alert('Eliminar mensaje', '¿Eliminar este mensaje para todos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setMensajes(prev => prev.filter(m => m.id !== msg.id));
          await api(Endpoints.chatEliminarMensaje, { body: { chat_id: msg.id } });
          socketRef.current?.emit('message-deleted', { otroId, chatId: msg.id });
        },
      },
    ]);
  };

  // ── Llamadas ─────────────────────────────────────────────────────────────
  const iniciarLlamada = async (tipo: LlamadaTipo) => {
    // Si el usuario toca "Llamar" antes de que termine de cargar el token (useEffect async),
    // lo esperamos aquí para no abrir el WebView de la llamada con un token vacío.
    let token = authToken;
    if (!token) {
      token = await getToken();
      setAuthToken(token);
    }
    const r = await api<{ ok: boolean; llamada_id?: number; room?: string }>(Endpoints.chatIniciarLlamada, { body: { receptor_id: otroId, tipo } });
    if (r.ok && r.llamada_id && r.room) setOutCall({ llamadaId: r.llamada_id, tipo, room: r.room });
  };

  const avatarUri = imgUri(otro?.foto_perfil ?? otroFoto);
  const presencia = presenceLabel(otro);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[S.root, { backgroundColor: colors.background }]}>
      {outCall && (
        <CallWebViewModal
          call={outCall}
          nombre={otro?.nombre ?? nombre}
          fotoUri={avatarUri}
          token={authToken}
          onClose={() => setOutCall(null)}
        />
      )}

      {selectedMsg && (
        <MessageActionModal
          msg={selectedMsg}
          mio={selectedMsg.emisor_id === usuario?.id}
          colors={colors}
          onClose={() => setSelectedMsg(null)}
          onCopy={handleCopy}
          onReply={m => { setSelectedMsg(null); setReplyTarget(m); }}
          onForward={m => void handleForward(m)}
          onDelete={handleDelete}
          onReact={reaccionar}
        />
      )}

      <PeoplePickerModal
        visible={!!forwardTarget}
        title="Reenviar a…"
        colors={colors}
        insets={insets}
        people={forwardChats}
        loading={forwardLoading}
        onClose={() => setForwardTarget(null)}
        onSelect={u => void enviarReenvio(u)}
      />

      {imgPreview && (
        <Modal transparent animationType="fade" statusBarTranslucent>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' }} onPress={() => setImgPreview(null)}>
            <Image source={{ uri: imgPreview }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
            <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 16, fontFamily: FontFamily.bodySemiBold }}>Toca para cerrar</Text>
          </Pressable>
        </Modal>
      )}

      {mapTarget && <MapModal lat={mapTarget.lat} lng={mapTarget.lng} colors={colors} onClose={() => setMapTarget(null)} />}
      {pdfTarget && <PdfModal url={pdfTarget.url} nombre={pdfTarget.nombre} colors={colors} onClose={() => setPdfTarget(null)} />}
      {locPicker && (
        <LocationPickerModal
          initialLat={locPicker.lat}
          initialLng={locPicker.lng}
          colors={colors}
          onConfirm={(lat, lng) => void confirmarUbicacion(lat, lng)}
          onClose={() => setLocPicker(null)}
        />
      )}

      {/* Header */}
      <View style={[S.chatHeader, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={[S.backBtn, { backgroundColor: colors.background }]} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={[S.chatAvatar, { backgroundColor: ROLE_COLORS[otro?.rol ?? 'vendedor'] ?? colors.accent }]}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={S.chatAvatarImg} /> : <Text style={S.chatAvatarTxt}>{getInitials(otro?.nombre ?? nombre)}</Text>}
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={[S.chatName, { color: colors.text }]}>{otro?.nombre ?? nombre}</Text>
          {!!presencia && (
            <Text style={[S.chatOnline, { color: otro?.en_linea === 1 ? colors.success : colors.muted }]}>{presencia}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[S.callHeaderBtn, { backgroundColor: colors.accentLight }]}
          onPress={() => Alert.alert('Llamar', undefined, [
            { text: 'Llamada de voz', onPress: () => void iniciarLlamada('voz') },
            { text: 'Videollamada',   onPress: () => void iniciarLlamada('video') },
            { text: 'Cancelar', style: 'cancel' },
          ])}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.callHeaderBtn, { backgroundColor: colors.accentLight, marginLeft: 8 }]}
          onPress={() => Alert.alert(otro?.nombre ?? nombre, undefined, [
            {
              text: 'Bloquear usuario', style: 'destructive', onPress: () => {
                Alert.alert('Bloquear', `¿Bloquear a ${otro?.nombre ?? nombre}? No podrán escribirte y no verás sus mensajes.`, [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Bloquear', style: 'destructive', onPress: async () => {
                      await api(Endpoints.authBloquearUsuario, { body: { usuario_id: otroId } });
                      nav.goBack();
                    },
                  },
                ]);
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ])}
          activeOpacity={0.8}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.accent} />
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
                    (tipo === 'imagen' || tipo === 'ubicacion' || tipo === 'pdf' || tipo === 'audio') && { padding: 4 },
                  ]}>
                    {item.reply_snapshot && <ReplyCard snap={item.reply_snapshot} mio={mio} colors={colors} />}
                    {tipo === 'imagen' && uri ? (
                      <TouchableOpacity onPress={() => setImgPreview(uri)} activeOpacity={0.9}>
                        <Image source={{ uri }} style={S.msgImage} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : tipo === 'ubicacion' ? (
                      <MsgErrorBoundary fallback={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 }}>
                          <Ionicons name="location-outline" size={14} color={mio ? '#FFF' : colors.muted} />
                          <Text style={{ color: mio ? '#FFF' : colors.muted, fontFamily: FontFamily.bodyRegular }}>Ubicación compartida</Text>
                        </View>
                      }>
                        <LocationMsg lat={item.lat} lng={item.lng} mio={mio} colors={colors} onOpen={(lat, lng) => setMapTarget({ lat, lng })} />
                      </MsgErrorBoundary>
                    ) : tipo === 'pdf' ? (
                      <MsgErrorBoundary fallback={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 }}>
                          <Ionicons name="document-text-outline" size={14} color={mio ? '#FFF' : colors.muted} />
                          <Text style={{ color: mio ? '#FFF' : colors.muted, fontFamily: FontFamily.bodyRegular }}>Documento</Text>
                        </View>
                      }>
                        <PdfMsg msg={item} mio={mio} colors={colors} onOpen={(url, nom) => setPdfTarget({ url, nombre: nom })} />
                      </MsgErrorBoundary>
                    ) : tipo === 'audio' ? (
                      <MsgErrorBoundary fallback={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 }}>
                          <Ionicons name="mic-outline" size={14} color={mio ? '#FFF' : colors.muted} />
                          <Text style={{ color: mio ? '#FFF' : colors.muted, fontFamily: FontFamily.bodyRegular }}>Nota de voz</Text>
                        </View>
                      }>
                        <AudioMsg msg={item} mio={mio} colors={colors} />
                      </MsgErrorBoundary>
                    ) : (
                      <Text style={[S.bubbleTxt, { color: mio ? '#FFF' : colors.text }]}>{item.mensaje}</Text>
                    )}
                  </View>
                </MsgErrorBoundary>
              </Pressable>
              <ReactionsRow reacciones={item.reacciones ?? []} mio={mio} colors={colors} onPress={emoji => reaccionar(item, emoji)} />
              <View style={[S.bubbleMeta, mio && S.bubbleMetaMio]}>
                <Text style={[S.bubbleTime, { color: colors.muted }]}>{formatTime(item.created_at)}</Text>
                {mio && <Ionicons name={item.leido === 1 ? 'checkmark-done' : 'checkmark'} size={12} color={item.leido === 1 ? colors.accent : colors.muted} style={{ marginLeft: 3 }} />}
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
          <TouchableOpacity style={S.attachRow} onPress={pickPdf} activeOpacity={0.8}>
            <View style={[S.attachIcon, { backgroundColor: '#EF444418' }]}><Ionicons name="document-text-outline" size={22} color="#EF4444" /></View>
            <Text style={[S.attachTxt, { color: colors.text }]}>Documento PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.attachRow} onPress={() => void abrirSelectorUbicacion()} activeOpacity={0.8}>
            <View style={[S.attachIcon, { backgroundColor: '#10B98118' }]}><Ionicons name="location-outline" size={22} color="#10B981" /></View>
            <Text style={[S.attachTxt, { color: colors.text }]}>Compartir ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.attachCancel, { backgroundColor: colors.background }]} onPress={() => setAttachModal(false)} activeOpacity={0.8}>
            <Text style={{ color: colors.muted, fontFamily: FontFamily.bodyBold, fontSize: Fonts.regular }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {emojiOpen && (
        <View style={[S.emojiStrip, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {QUICK_EMOJIS.map(e => (
            <TouchableOpacity key={e} onPress={() => setTexto(t => t + e)} style={{ padding: 6 }} activeOpacity={0.7}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {grabando ? (
        <View style={[S.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : Spacing.sm }]}>
          <TouchableOpacity onPress={() => void cancelarGrabacion()} style={[S.attachBtn, { backgroundColor: '#EF444418' }]} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
          <View style={S.recordingInfo}>
            <View style={S.recordingDot} />
            <Text style={[S.recordingTime, { color: colors.text }]}>{formatDuration(grabacionSeg)}</Text>
            <Text style={[S.recordingHint, { color: colors.muted }]}>Grabando nota de voz…</Text>
          </View>
          <TouchableOpacity style={[S.sendBtn, { backgroundColor: colors.accent }]} onPress={() => void enviarGrabacion()} activeOpacity={0.85}>
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[S.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : Spacing.sm }]}>
          <TouchableOpacity style={[S.attachBtn, { backgroundColor: colors.accentLight }]} onPress={() => { setEmojiOpen(false); setAttachModal(v => !v); }} activeOpacity={0.8}>
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
            <TouchableOpacity onPress={() => { setAttachModal(false); setEmojiOpen(v => !v); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="happy-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {texto.trim() ? (
            <TouchableOpacity style={[S.sendBtn, { backgroundColor: colors.accent }]} onPress={enviar} disabled={enviando} activeOpacity={0.85}>
              {enviando ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[S.sendBtn, { backgroundColor: colors.accent }]} onPress={() => void iniciarGrabacion()} activeOpacity={0.85}>
              <Ionicons name="mic" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  topTitle: { fontSize: Fonts.heading - 6, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.5 },
  topSub: { fontSize: Fonts.small, fontFamily: FontFamily.bodyRegular, marginTop: 2 },
  newChatBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 1 },
  searchInner: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 7 },
  searchInput: { flex: 1, fontSize: Fonts.regular, fontFamily: FontFamily.bodyRegular },
  segmentWrap: { flexDirection: 'row', margin: Spacing.md, marginBottom: Spacing.sm, borderRadius: 14, padding: 4 },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  segmentTxt: { fontSize: Fonts.small + 1, fontFamily: FontFamily.bodyExtraBold },
  badge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeTxt: { fontSize: 9, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: 1 },
  avatarRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarTxt: { color: '#FFF', fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.regular - 1 },
  convBody: { flex: 1, marginHorizontal: Spacing.sm },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convNombre: { fontSize: Fonts.regular, flex: 1, marginRight: 4 },
  convTime: { fontSize: Fonts.small - 1, fontFamily: FontFamily.bodySemiBold },
  convBotRow: { flexDirection: 'row', alignItems: 'center' },
  convMsg: { flex: 1, fontSize: Fonts.small + 1 },
  rolPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.pill, marginLeft: Spacing.sm },
  rolTxt: { fontSize: 8, fontFamily: FontFamily.bodyExtraBold, letterSpacing: 0.5 },
  emptyContainer: { flex: 1 },
  emptyBlock: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIconBg: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { fontSize: Fonts.title - 2, fontFamily: FontFamily.displayExtraBold, marginBottom: 8 },
  emptySub: { fontSize: Fonts.regular, textAlign: 'center', lineHeight: 22 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  chatAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  chatAvatarTxt: { color: '#FFF', fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.small + 1 },
  chatName: { fontFamily: FontFamily.displayBold, fontSize: Fonts.regular },
  chatOnline: { fontSize: Fonts.small - 1, fontFamily: FontFamily.bodySemiBold, marginTop: 1 },
  callHeaderBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  bubbleWrap: { alignSelf: 'flex-start', maxWidth: '80%', marginBottom: Spacing.xs + 2 },
  bubbleWrapMio: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  bubbleMio: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleOtro: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 18, borderWidth: 1.5 },
  bubbleTxt: { fontSize: Fonts.regular, fontFamily: FontFamily.bodyRegular, lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  bubbleMetaMio: { justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, fontFamily: FontFamily.bodyRegular },
  msgImage: { width: 200, height: 180, borderRadius: 14 },
  emptyChat: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyChatTxt: { fontFamily: FontFamily.bodySemiBold, fontSize: Fonts.regular },

  // Location
  locWrap: { borderRadius: 14, overflow: 'hidden', width: 222 },
  locMap: { width: 222, height: 108 },
  locMapFallback: { width: 222, height: 108, justifyContent: 'center', alignItems: 'center' },
  locFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  locLabel: { fontFamily: FontFamily.bodyBold, fontSize: Fonts.small + 1, flex: 1 },
  locCoords: { fontSize: 9 },
  mapTopBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },

  // PDF card
  pdfCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, width: 230, gap: 10 },
  pdfIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  pdfNombre: { fontSize: Fonts.small + 1, fontFamily: FontFamily.bodyBold },
  pdfTamano: { fontSize: 10, fontFamily: FontFamily.bodySemiBold, marginTop: 2 },
  pdfDownload: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  // Audio message
  audioWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, width: 210, gap: 10 },
  audioPlayBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  audioTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  audioProgress: { height: 4, borderRadius: 2 },
  audioTime: { fontSize: 10, fontFamily: FontFamily.displayBold, marginTop: 5, fontVariant: ['tabular-nums'] },

  // Reactions
  reaccionesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  reaccionPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  reaccionEmoji: { fontSize: 13 },
  reaccionCount: { fontSize: 10, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },

  // Reply card / bar
  replyCard: { borderLeftWidth: 3, borderRadius: 8, padding: 8, marginBottom: 6 },
  replyProd: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  replyProdImg: { width: 36, height: 36, borderRadius: 6 },
  replyProdNom: { fontSize: 12, fontFamily: FontFamily.bodyBold },
  replyProdPx: { fontSize: 11, fontFamily: FontFamily.displayBold, fontVariant: ['tabular-nums'] },
  replyTxt: { fontSize: 12 },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: Spacing.md, borderTopWidth: 1, gap: 10 },
  replyBarAccent: { width: 3, height: 36, borderRadius: 2 },
  replyBarLabel: { fontSize: 12, fontFamily: FontFamily.bodyExtraBold, marginBottom: 2 },
  replyBarPrev: { fontSize: 12, fontFamily: FontFamily.bodyRegular },

  // Action menu modal
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  menuCard: { width: '90%', gap: 8 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 14, borderRadius: 18 },
  emojiBtn: { padding: 6 },
  emoji: { fontSize: 26 },
  msgPreview: { borderRadius: 18, padding: 14, gap: 6 },
  previewBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, maxWidth: '82%' },
  previewTime: { fontSize: 10, textAlign: 'right', fontFamily: FontFamily.bodyRegular },
  actionsGrid: { flexDirection: 'row', borderRadius: 18, paddingVertical: 8 },
  actionItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: Fonts.small, fontFamily: FontFamily.bodyBold },

  // Attach
  attachSheet: { borderTopWidth: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
  attachHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  attachRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  attachIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  attachTxt: { fontSize: Fonts.regular, fontFamily: FontFamily.bodySemiBold },
  attachCancel: { marginTop: Spacing.sm, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },

  // Emoji strip
  emojiStrip: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },

  // Recording bar
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.sm },
  recordingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444' },
  recordingTime: { fontSize: Fonts.regular, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },
  recordingHint: { fontSize: Fonts.small, fontFamily: FontFamily.bodyRegular },

  // Input
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing.md, paddingVertical: 8, marginRight: Spacing.sm, maxHeight: 100 },
  input: { flex: 1, fontSize: Fonts.regular, fontFamily: FontFamily.bodyRegular, maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // Selector de ubicación (mapa propio)
  pickerCard:       { borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  pickerConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13 },
});
