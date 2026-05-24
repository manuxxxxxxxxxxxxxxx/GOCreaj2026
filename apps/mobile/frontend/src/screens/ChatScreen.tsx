import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { Mensaje, RootStackParamList, Conversacion } from '@/types';
import { useAuth } from '@/context/AuthContext';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type ChatTab = 'todos' | 'noLeidos' | 'archivados';

interface RespMensajes { ok: boolean; mensajes?: Mensaje[] }
interface RespEnviar  { ok: boolean; error?: string }
interface RespConvs   { ok: boolean; conversaciones?: Conversacion[] }

const MOCK_CONVS: Conversacion[] = [
  { id: 1, nombre: 'Comedor Doña Rosa', rol: 'vendedor', ultimo_mensaje: { mensaje: 'Claro, están recién hechas con queso y loroco.', created_at: new Date().toISOString() } },
  { id: 2, nombre: 'Finca El Cafetal',  rol: 'vendedor', ultimo_mensaje: { mensaje: 'El café de altura ya está disponible en bolsas de 500g.', created_at: new Date(Date.now() - 3600000).toISOString() } },
  { id: 3, nombre: 'Carlos (Repartidor)', rol: 'repartidor', ultimo_mensaje: { mensaje: 'Ya voy en camino, llego en 10 minutos.', created_at: new Date(Date.now() - 7200000).toISOString() } },
  { id: 4, nombre: 'Panadería La Hermosa', rol: 'vendedor', ultimo_mensaje: { mensaje: 'Tenemos pan de yema, semita y quesadilla disponibles.', created_at: new Date(Date.now() - 86400000).toISOString() } },
];

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
  vendedor: '#4A6D8C',
  repartidor: '#27AE8F',
  comprador: '#8E44AD',
  admin: '#C0392B',
};

// ─── Chat List ───────────────────────────────────────────────────────────────

export function ChatListScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();

  const [convs, setConvs]     = useState<Conversacion[]>(MOCK_CONVS);
  const [tab, setTab]         = useState<ChatTab>('todos');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await api<RespConvs>(Endpoints.chatConversaciones);
    if (r.ok && r.conversaciones && r.conversaciones.length > 0) setConvs(r.conversaciones);
    else setConvs(MOCK_CONVS);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
    const iv = setInterval(() => { void cargar(); }, 6000);
    return () => clearInterval(iv);
  }, [cargar]);

  const TABS: { key: ChatTab; label: string }[] = [
    { key: 'todos',      label: t.chat.todos },
    { key: 'noLeidos',   label: t.chat.noLeidos },
    { key: 'archivados', label: t.chat.archivados },
  ];

  const filtered = tab === 'todos' ? convs : tab === 'noLeidos' ? convs.slice(0, 2) : [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 14, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.topTitle, { color: colors.text }]}>{t.chat.mensajes}</Text>
        <TouchableOpacity style={[styles.newChatBtn, { backgroundColor: colors.accentLight }]} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[styles.tabItem, tab === tb.key && [styles.tabActive, { borderBottomColor: colors.accent }]]}
            onPress={() => setTab(tb.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabTxt, { color: tab === tb.key ? colors.accent : colors.muted }]}>
              {tb.label}
            </Text>
            {tb.key === 'noLeidos' && convs.length > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.unreadTxt}>2</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {cargando && convs.length === 0
        ? <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.xl }} />
        : null}

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : { paddingVertical: Spacing.xs }}
        ListEmptyComponent={
          <EmptyState colors={colors} t={t} />
        }
        renderItem={({ item, index }) => {
          const roleColor = ROLE_COLORS[item.rol] ?? colors.accent;
          const initials  = getInitials(item.nombre);
          const timeStr   = item.ultimo_mensaje ? formatTime(item.ultimo_mensaje.created_at) : '';
          const isUnread  = index < 2;

          return (
            <TouchableOpacity
              style={[styles.convRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
              onPress={() => nav.navigate('Chat', { otroId: item.id, nombre: item.nombre })}
              activeOpacity={0.85}
            >
              <View style={[styles.avatar, { backgroundColor: roleColor }]}>
                <Text style={styles.avatarTxt}>{initials}</Text>
              </View>
              <View style={styles.convBody}>
                <View style={styles.convTopRow}>
                  <Text style={[styles.convNombre, { color: colors.text, fontWeight: isUnread ? '800' : '600' }]}>
                    {item.nombre}
                  </Text>
                  <Text style={[styles.convTime, { color: isUnread ? colors.accent : colors.muted }]}>{timeStr}</Text>
                </View>
                <View style={styles.convBotRow}>
                  <Ionicons name={isUnread ? 'ellipse' : 'checkmark-done'} size={12} color={isUnread ? colors.accent : colors.muted} style={{ marginRight: 4 }} />
                  <Text
                    numberOfLines={1}
                    style={[styles.convMsg, { color: isUnread ? colors.text : colors.muted, fontWeight: isUnread ? '600' : '400' }]}
                  >
                    {item.ultimo_mensaje?.mensaje ?? t.chat.iniciarConv}
                  </Text>
                  {isUnread && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
                  )}
                </View>
              </View>
              <View style={[styles.rolPill, { backgroundColor: `${roleColor}18` }]}>
                <Text style={[styles.rolTxt, { color: roleColor }]}>{item.rol.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function EmptyState({ colors, t }: { colors: any; t: any }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={styles.emptyBlock}>
      <Animated.View style={[styles.emptyIconBg, { backgroundColor: colors.accentLight, transform: [{ scale: pulse }] }]}>
        <Ionicons name="chatbubbles-outline" size={52} color={colors.accent} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.chat.sinMensajes}</Text>
      <Text style={[styles.emptySub, { color: colors.muted }]}>{t.chat.sinMensajesSub}</Text>
    </View>
  );
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const route = useRoute<ChatRoute>();
  const nav   = useNavigation<Nav>();
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { otroId, nombre, pedidoId } = route.params;

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto]       = useState('');
  const [enviando, setEnviando] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<FlatList<Mensaje>>(null);

  const cargar = useCallback(async () => {
    const r = await api<RespMensajes>(Endpoints.chatMensajes(otroId));
    if (r.ok && r.mensajes) setMensajes(r.mensajes);
  }, [otroId]);

  useEffect(() => {
    void cargar();
    pollRef.current = setInterval(() => { void cargar(); }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [cargar]);

  const enviar = async () => {
    if (!texto.trim()) return;
    const msg = texto.trim();
    setTexto('');
    setEnviando(true);
    const r = await api<RespEnviar>(Endpoints.chatEnviar, {
      body: { receptor_id: otroId, mensaje: msg, pedido_id: pedidoId },
    });
    setEnviando(false);
    if (r.ok) await cargar();
  };

  const roleColor = ROLE_COLORS['vendedor'];
  const initials  = getInitials(nombre);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={[styles.backBtn, { backgroundColor: colors.background }]} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.chatAvatar, { backgroundColor: roleColor }]}>
          <Text style={styles.chatAvatarTxt}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={[styles.chatName, { color: colors.text }]}>{nombre}</Text>
          <Text style={[styles.chatOnline, { color: colors.success }]}>En línea</Text>
        </View>
        <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.accentLight }]} activeOpacity={0.8}>
          <Ionicons name="call-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={m => String(m.id)}
        inverted
        contentContainerStyle={{ padding: Spacing.md, flexDirection: 'column-reverse', gap: Spacing.xs }}
        renderItem={({ item }) => {
          const mio = item.emisor_id === usuario?.id;
          const time = formatTime(item.created_at);
          return (
            <View style={[styles.bubbleWrap, mio && styles.bubbleWrapMio]}>
              <View style={[
                styles.bubble,
                mio
                  ? [styles.bubbleMio, { backgroundColor: colors.accent }]
                  : [styles.bubbleOtro, { backgroundColor: colors.card, borderColor: colors.border }],
              ]}>
                <Text style={[styles.bubbleTxt, { color: mio ? '#FFF' : colors.text }]}>{item.mensaje}</Text>
              </View>
              <View style={[styles.bubbleMeta, mio && styles.bubbleMetaMio]}>
                <Text style={[styles.bubbleTime, { color: colors.muted }]}>{time}</Text>
                {mio && (
                  <Ionicons name="checkmark-done" size={12} color={item.leido === 1 ? '#3B82F6' : colors.muted} style={{ marginLeft: 3 }} />
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyChatTxt, { color: colors.muted }]}>{t.chat.iniciarConv}</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={[
        styles.inputBar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : Spacing.sm,
        },
      ]}>
        <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={texto}
            onChangeText={setTexto}
            placeholder={t.chat.escribir}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: texto.trim() ? colors.accent : colors.border }]}
          onPress={enviar}
          disabled={enviando || !texto.trim()}
          activeOpacity={0.85}
        >
          {enviando
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Ionicons name="send" size={18} color={texto.trim() ? '#FFF' : colors.muted} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // List
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 2,
  },
  topTitle: { fontSize: Fonts.heading - 6, fontWeight: '900', letterSpacing: -0.5 },
  newChatBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.md },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: {},
  tabTxt: { fontSize: Fonts.small + 1, fontWeight: '700' },
  unreadBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  unreadTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  convRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.regular - 1, letterSpacing: 0.5 },
  convBody: { flex: 1, marginHorizontal: Spacing.sm },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convNombre: { fontSize: Fonts.regular, letterSpacing: -0.2 },
  convTime: { fontSize: Fonts.small - 1, fontWeight: '600' },
  convBotRow: { flexDirection: 'row', alignItems: 'center' },
  convMsg: { flex: 1, fontSize: Fonts.small + 1, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6, flexShrink: 0 },
  rolPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.pill, marginLeft: Spacing.sm },
  rolTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  emptyContainer: { flex: 1 },
  emptyBlock: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIconBg: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle: { fontSize: Fonts.title - 2, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
  emptySub: { fontSize: Fonts.regular, textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  // Chat
  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 2,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  chatAvatarTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.small + 1 },
  chatName: { fontWeight: '800', fontSize: Fonts.regular, letterSpacing: -0.2 },
  chatOnline: { fontSize: Fonts.small - 1, fontWeight: '600', marginTop: 1 },
  callBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  bubbleWrap: { alignSelf: 'flex-start', maxWidth: '78%' },
  bubbleWrapMio: { alignSelf: 'flex-end' },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bubbleMio: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleOtro: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 18, borderWidth: 1.5 },
  bubbleTxt: { fontSize: Fonts.regular, fontWeight: '500', lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  bubbleMetaMio: { justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, fontWeight: '500' },
  emptyChat: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyChatTxt: { fontWeight: '600', fontSize: Fonts.regular },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  inputWrap: {
    flex: 1, borderRadius: Radius.lg,
    borderWidth: 1.5, paddingHorizontal: Spacing.md,
    paddingVertical: 8, marginRight: Spacing.sm, maxHeight: 100,
  },
  input: { fontSize: Fonts.regular, fontWeight: '500', maxHeight: 80 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4A6D8C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
});
