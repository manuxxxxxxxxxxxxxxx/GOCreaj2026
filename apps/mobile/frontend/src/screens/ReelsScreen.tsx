import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, TextInput, Modal, Image, ActivityIndicator, Pressable, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints, API_URL } from '@/services/api';
import { Producto, Comentario, RootStackParamList } from '@/types';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

function imgUri(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('data:') || p.startsWith('http')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

interface ReelsResp { ok: boolean; reels?: Producto[] }
interface ComResp   { ok: boolean; comentarios?: Comentario[] }
interface CtxResp   { ok: boolean; accion?: string; contadores?: { likes: number; guardados: number; compartidos: number; comentarios: number } }
interface ConvResp  { ok: boolean; conversaciones?: Array<{ id: number; nombre: string; foto_perfil?: string | null }> }

// ─── Helpers para construir árbol de comentarios ─────────────────────────
function buildCommentTree(flat: Comentario[]): Comentario[] {
  const byId = new Map<number, Comentario>();
  const roots: Comentario[] = [];
  flat.forEach(c => { byId.set(c.id, { ...c, respuestas: [] }); });
  byId.forEach(c => {
    if (c.parent_id && byId.has(c.parent_id)) {
      const parent = byId.get(c.parent_id)!;
      parent.respuestas = parent.respuestas ?? [];
      parent.respuestas.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

export default function ReelsScreen(): React.JSX.Element {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

  const [reels, setReels]       = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused]     = useState<Record<number, boolean>>({});

  // Comentarios
  const [comVisible, setComVisible]   = useState(false);
  const [comLista, setComLista]       = useState<Comentario[]>([]);
  const [comTree, setComTree]         = useState<Comentario[]>([]);
  const [comTexto, setComTexto]       = useState('');
  const [respondiendo, setRespondiendo] = useState<{ id: number; nombre: string } | null>(null);
  const [productoActivo, setProductoActivo] = useState<Producto | null>(null);
  const [cargandoCom, setCargandoCom] = useState(false);

  // Compartir por chat
  const [shareVisible, setShareVisible] = useState(false);
  const [conversaciones, setConversaciones] = useState<Array<{ id: number; nombre: string; foto_perfil?: string | null }>>([]);
  const [productoCompartir, setProductoCompartir] = useState<Producto | null>(null);

  // ─── Carga inicial ───
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const muni = (await AsyncStorage.getItem('svgo_municipio')) ?? '';
      const url = `${Endpoints.productosReels}${muni ? `&municipio=${encodeURIComponent(muni)}` : ''}`;
      const r = await api<ReelsResp>(url);
      setReels(r.ok && r.reels ? r.reels : []);
    } catch {
      setReels([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
  }).current;

  // ─── Acciones ───
  const toggleLike = async (p: Producto) => {
    const r = await api<CtxResp>(Endpoints.interToggleLike, { body: { producto_id: p.id } });
    if (r.ok && r.contadores) {
      setReels(prev => prev.map(x => x.id === p.id ? { ...x, likes_count: r.contadores!.likes } : x));
    }
  };

  const toggleGuardar = async (p: Producto) => {
    const r = await api<CtxResp>(Endpoints.interToggleGuardar, { body: { producto_id: p.id } });
    if (r.ok) {
      Alert.alert(
        r.accion === 'guardar' ? '✓ Guardado' : 'Eliminado de guardados',
        r.accion === 'guardar' ? 'El reel se añadió a tu lista de guardados.' : '',
        [{ text: 'OK' }],
      );
    }
  };

  const abrirCompartir = async (p: Producto) => {
    setProductoCompartir(p);
    try {
      const r = await api<ConvResp>(Endpoints.chatConversaciones);
      setConversaciones(r.ok && r.conversaciones ? r.conversaciones : []);
    } catch { setConversaciones([]); }
    setShareVisible(true);
  };

  const compartirAUsuario = async (otroId: number) => {
    if (!productoCompartir) return;
    try {
      // Usar el endpoint dedicado de "compartir desde producto" que adjunta snapshot
      await api(Endpoints.chatDesdeProducto, {
        body: { producto_id: productoCompartir.id, mensaje: `Mira este reel: ${productoCompartir.nombre}` },
      });
      // Registrar también como "compartido" en métricas
      await api(Endpoints.interCompartir, { body: { producto_id: productoCompartir.id, canal: 'chat' } });
      setShareVisible(false);
      Alert.alert('✓ Compartido', 'El reel se envió por chat.');
    } catch {
      Alert.alert('Error', 'No se pudo compartir');
    }
  };

  // ─── Comentarios ───
  const abrirComentarios = async (p: Producto) => {
    setProductoActivo(p);
    setComVisible(true);
    setCargandoCom(true);
    try {
      const r = await api<ComResp>(Endpoints.interListarComentarios(p.id));
      const lista = r.ok && r.comentarios ? r.comentarios : [];
      setComLista(lista);
      setComTree(buildCommentTree(lista));
    } catch {
      setComLista([]); setComTree([]);
    }
    setCargandoCom(false);
  };

  const recargarComentarios = async () => {
    if (!productoActivo) return;
    try {
      const r = await api<ComResp>(Endpoints.interListarComentarios(productoActivo.id));
      const lista = r.ok && r.comentarios ? r.comentarios : [];
      setComLista(lista);
      setComTree(buildCommentTree(lista));
    } catch {}
  };

  const enviarComentario = async () => {
    if (!productoActivo || !comTexto.trim()) return;
    const body: Record<string, unknown> = {
      producto_id: productoActivo.id,
      comentario: comTexto.trim(),
    };
    if (respondiendo) body.parent_id = respondiendo.id;
    await api(Endpoints.interComentar, { body });
    setComTexto('');
    setRespondiendo(null);
    await recargarComentarios();
    // Actualiza el contador local
    setReels(prev => prev.map(x =>
      x.id === productoActivo.id ? { ...x, comentarios_count: (x.comentarios_count ?? 0) + 1 } : x
    ));
  };

  const toggleLikeComentario = async (cid: number) => {
    const r = await api<{ ok: boolean; accion?: string }>(Endpoints.interLikeComentario, { body: { comentario_id: cid } });
    if (r.ok) {
      const delta = r.accion === 'like' ? 1 : -1;
      setComLista(prev => prev.map(c => c.id === cid ? { ...c, likes_count: Math.max(0, (c.likes_count ?? 0) + delta), yo_like: r.accion === 'like' ? 1 : 0 } : c));
      setComTree(buildCommentTree(comLista.map(c => c.id === cid ? { ...c, likes_count: Math.max(0, (c.likes_count ?? 0) + delta), yo_like: r.accion === 'like' ? 1 : 0 } : c)));
    }
  };

  // ─── Render ───
  if (cargando) return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FFF" />
      <Text style={{ color: '#FFF', marginTop: 12, fontWeight: '600' }}>Cargando reels...</Text>
    </View>
  );

  if (reels.length === 0) return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Ionicons name="videocam-off-outline" size={64} color="#FFF" style={{ opacity: 0.5 }} />
      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18, marginTop: 16, textAlign: 'center' }}>
        No hay reels aún
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
        Cuando los vendedores publiquen reels aparecerán aquí.
      </Text>
      {usuario?.rol === 'vendedor' && (
        <TouchableOpacity
          onPress={() => nav.navigate('Main' as any)}
          style={{ marginTop: 24, backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 99 }}
        >
          <Text style={{ color: '#FFF', fontWeight: '800' }}>Subir mi primer reel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={reels}
        keyExtractor={it => String(it.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          const isPaused = paused[item.id] ?? false;
          const videoUri = (item as any).video_url || (item as any).video;

          return (
            <Pressable
              onPress={() => setPaused(p => ({ ...p, [item.id]: !isPaused }))}
              style={[styles.slide, { height, width }]}
            >
              {/* Fondo: video o imagen */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
                {videoUri ? (
                  <Video
                    source={{ uri: imgUri(videoUri) ?? videoUri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={isActive && !isPaused}
                    isLooping
                    isMuted={false}
                  />
                ) : item.imagen ? (
                  <Image source={{ uri: imgUri(item.imagen) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={120} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
              </View>

              {/* Ícono pausa central cuando está pausado */}
              {isPaused && isActive && videoUri && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="play" size={42} color="#FFF" />
                  </View>
                </View>
              )}

              {/* Gradiente inferior para legibilidad */}
              <View style={styles.gradient} />

              {/* Acciones lado derecho */}
              <View style={[styles.actions, { bottom: 100 + insets.bottom }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item)}>
                  <Ionicons name="heart" size={32} color="#FFF" />
                  <Text style={styles.actionCount}>{item.likes_count ?? 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => abrirComentarios(item)}>
                  <Ionicons name="chatbubble" size={28} color="#FFF" />
                  <Text style={styles.actionCount}>{item.comentarios_count ?? 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleGuardar(item)}>
                  <Ionicons name="bookmark" size={28} color="#FFF" />
                  <Text style={styles.actionCount}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => abrirCompartir(item)}>
                  <Ionicons name="paper-plane" size={26} color="#FFF" />
                  <Text style={styles.actionCount}>{item.compartidos_count ?? 0}</Text>
                </TouchableOpacity>
                {item.vendedor_id ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => nav.navigate('Chat' as any, { otroId: item.vendedor_id!, nombre: item.tienda_nombre ?? 'Vendedor' })}>
                    <Ionicons name="send" size={26} color="#FFF" />
                    <Text style={styles.actionCount}>DM</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Info inferior */}
              <View style={[styles.info, { paddingBottom: 90 + insets.bottom }]}>
                <View style={styles.tiendaRow}>
                  <View style={styles.tiendaAvatar}>
                    <Ionicons name="storefront" size={14} color="#FFF" />
                  </View>
                  <Text style={styles.infoTienda}>@{item.tienda_nombre ?? 'tienda'}</Text>
                </View>
                <Text style={styles.infoTitulo} numberOfLines={2}>{item.nombre}</Text>
                {item.descripcion ? <Text style={styles.infoDesc} numberOfLines={2}>{item.descripcion}</Text> : null}
                <View style={styles.infoBottom}>
                  <View style={styles.precioBox}>
                    <Text style={styles.precioTxt}>${Number(item.precio).toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.comprarBtn}
                    onPress={() => nav.navigate('Product' as any, { productoId: item.id })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.comprarTxt}>Ver producto</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Indicador */}
              <View style={[styles.indexIndicator, { top: insets.top + 16 }]}>
                <Text style={styles.indexTxt}>{index + 1} / {reels.length}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ── Modal Comentarios ── */}
      <Modal visible={comVisible} animationType="slide" transparent onRequestClose={() => setComVisible(false)}>
        <KeyboardAvoidingView
          style={[styles.modalRoot, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Comentarios · {comLista.length}
              </Text>
              <TouchableOpacity onPress={() => { setComVisible(false); setRespondiendo(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {cargandoCom ? (
              <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={comTree}
                keyExtractor={c => String(c.id)}
                contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
                renderItem={({ item: c }) => (
                  <CommentItem
                    c={c} colors={colors}
                    onResponder={(parent) => { setRespondiendo({ id: parent.id, nombre: parent.nombre }); }}
                    onLike={toggleLikeComentario}
                  />
                )}
                ListEmptyComponent={<Text style={[styles.sinCom, { color: colors.muted }]}>Sé el primero en comentar</Text>}
              />
            )}

            {/* Banner de responder */}
            {respondiendo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.elevated, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Ionicons name="return-down-forward" size={14} color={colors.accent} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.muted, fontWeight: '600' }}>
                  Respondiendo a <Text style={{ color: colors.accent, fontWeight: '900' }}>{respondiendo.nombre}</Text>
                </Text>
                <TouchableOpacity onPress={() => setRespondiendo(null)}>
                  <Ionicons name="close" size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.comInputRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                placeholder={respondiendo ? `Responder a ${respondiendo.nombre}...` : 'Escribe un comentario...'}
                placeholderTextColor={colors.muted}
                value={comTexto}
                onChangeText={setComTexto}
                style={[styles.comInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              />
              <TouchableOpacity onPress={enviarComentario} style={[styles.sendBtn, { backgroundColor: comTexto.trim() ? colors.accent : colors.border }]} disabled={!comTexto.trim()}>
                <Ionicons name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal Compartir por chat ── */}
      <Modal visible={shareVisible} animationType="slide" transparent onRequestClose={() => setShareVisible(false)}>
        <View style={[styles.modalRoot, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.background, height: '60%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Compartir por chat</Text>
              <TouchableOpacity onPress={() => setShareVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={conversaciones}
              keyExtractor={u => String(u.id)}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item: u }) => (
                <TouchableOpacity
                  onPress={() => compartirAUsuario(u.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginBottom: 8 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    {u.foto_perfil
                      ? <Image source={{ uri: imgUri(u.foto_perfil) }} style={{ width: '100%', height: '100%' }} />
                      : <Text style={{ color: '#FFF', fontWeight: '900' }}>{u.nombre.charAt(0).toUpperCase()}</Text>
                    }
                  </View>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 }}>{u.nombre}</Text>
                  <Ionicons name="paper-plane" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, padding: 30 }}>No tienes conversaciones aún. Empieza una desde un producto.</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Componente recursivo de comentario ────────────────────────────────
function CommentItem({ c, colors, depth = 0, onResponder, onLike }: {
  c: Comentario; colors: any; depth?: number;
  onResponder: (c: Comentario) => void;
  onLike: (id: number) => void;
}): React.JSX.Element {
  return (
    <View style={{ marginLeft: depth * 24, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {c.foto_perfil
            ? <Image source={{ uri: imgUri(c.foto_perfil) }} style={{ width: '100%', height: '100%' }} />
            : <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>{c.nombre.charAt(0).toUpperCase()}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{c.nombre}</Text>
            <Text style={{ color: colors.text, marginTop: 2, fontSize: 13, lineHeight: 18 }}>{c.comentario}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6, marginLeft: 4, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => onLike(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={c.yo_like ? 'heart' : 'heart-outline'} size={14} color={c.yo_like ? '#EF4444' : colors.muted} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.yo_like ? '#EF4444' : colors.muted }}>{c.likes_count ?? 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onResponder(c)}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>Responder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Respuestas anidadas */}
      {c.respuestas?.map(r => (
        <CommentItem key={r.id} c={r} colors={colors} depth={depth + 1} onResponder={onResponder} onLike={onLike} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  slide: { backgroundColor: '#000' },
  gradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  actions: {
    position: 'absolute', right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', gap: Spacing.sm,
  },
  actionBtn:   { alignItems: 'center', paddingVertical: 4 },
  actionCount: { color: '#FFF', fontSize: Fonts.small - 1, marginTop: 3, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  info: { padding: Spacing.md, paddingRight: 80 },
  tiendaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tiendaAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  infoTienda: { color: '#FFF', fontWeight: '900', fontSize: Fonts.regular, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  infoTitulo: { color: '#FFF', fontWeight: '800', fontSize: Fonts.title - 3, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  infoDesc:   { color: 'rgba(255,255,255,0.9)', fontSize: Fonts.small + 1, marginTop: 4, lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  infoBottom: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.sm },
  precioBox:  { backgroundColor: 'rgba(74,109,140,0.9)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
  precioTxt:  { color: '#FFF', fontWeight: '900', fontSize: Fonts.small + 1 },
  comprarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  comprarTxt: { color: '#FFF', fontWeight: '700', fontSize: Fonts.small },
  indexIndicator: { position: 'absolute', right: Spacing.md, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  indexTxt: { color: '#FFF', fontSize: Fonts.small - 1, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBox:  { height: '75%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, overflow: 'hidden' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1.5 },
  modalTitle:  { fontWeight: '800', fontSize: Fonts.title - 3 },
  sinCom: { textAlign: 'center', paddingVertical: Spacing.xl, fontWeight: '600' },
  comInputRow: { flexDirection: 'row', padding: Spacing.md, borderTopWidth: 1.5, alignItems: 'center', paddingBottom: 30 },
  comInput: { flex: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1.5, fontWeight: '500' },
  sendBtn:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm },
});
