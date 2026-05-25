import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Pressable, TextInput, Modal, Image, ActivityIndicator,
  Share, Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api, API_URL, Endpoints } from '@/services/api';
import { Reel, ReelComentario, RootStackParamList } from '@/types';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// Extrae el origen del servidor (ej. "http://192.168.0.16") para reemplazar "localhost"
// en las URLs que guarda el backend PHP con UPLOAD_URL
const SERVER_ORIGIN = API_URL.match(/^https?:\/\/[^/]+/)?.[0] ?? 'http://localhost';

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('file') || path.startsWith('data:')) return path;
  if (path.startsWith('http')) {
    // Corrige URLs con localhost (guardadas por PHP) → IP real del servidor
    return path.replace(/^https?:\/\/localhost/, SERVER_ORIGIN);
  }
  return `${API_URL}/uploads/${path}`;
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ── CommentItem ────────────────────────────────────────────────────────────────

interface ComItemProps {
  item: ReelComentario;
  onLike: (c: ReelComentario) => void;
  onReply: (c: ReelComentario) => void;
  expanded: boolean;
  onToggleExpand: (id: number) => void;
  depth?: number;
  colors: ReturnType<typeof useTheme>['colors'];
}

function CommentItem({ item, onLike, onReply, expanded, onToggleExpand, depth = 0, colors }: ComItemProps) {
  const uri = imgUri(item.usuario_foto);
  return (
    <View style={[S.comItem, depth > 0 && S.comReply]}>
      <View style={S.comRow}>
        <View style={S.comAvatar}>
          {uri
            ? <Image source={{ uri }} style={S.comAvatarImg} />
            : <Text style={S.comAvatarTxt}>{(item.usuario_nombre?.[0] ?? '?').toUpperCase()}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Text style={S.comName}>{item.usuario_nombre}</Text>
            <Text style={S.comTime}>{ago(item.created_at)}</Text>
          </View>
          <Text style={S.comText}>{item.comentario}</Text>
          <View style={S.comActions}>
            <TouchableOpacity style={S.comActBtn} onPress={() => onLike(item)}>
              <Ionicons
                name={item.me_gusta ? 'heart' : 'heart-outline'}
                size={15}
                color={item.me_gusta ? '#EF4444' : 'rgba(255,255,255,0.55)'}
              />
              {item.likes_count > 0 && (
                <Text style={S.comActTxt}>{item.likes_count}</Text>
              )}
            </TouchableOpacity>
            {depth === 0 && (
              <TouchableOpacity style={S.comActBtn} onPress={() => onReply(item)}>
                <Text style={S.comActTxt}>Responder</Text>
              </TouchableOpacity>
            )}
            {depth === 0 && (item.respuestas_count ?? 0) > 0 && (
              <TouchableOpacity style={S.comActBtn} onPress={() => onToggleExpand(item.id)}>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="#60A5FA" />
                <Text style={[S.comActTxt, { color: '#60A5FA' }]}>
                  {expanded ? 'Ocultar' : `${item.respuestas_count} respuesta${(item.respuestas_count ?? 0) !== 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {expanded && (item.respuestas ?? []).map(rep => (
        <CommentItem
          key={rep.id}
          item={rep}
          onLike={onLike}
          onReply={onReply}
          expanded={false}
          onToggleExpand={() => {}}
          depth={1}
          colors={colors}
        />
      ))}
    </View>
  );
}

// ── ReelSlide ──────────────────────────────────────────────────────────────────
// Componente separado para poder usar useVideoPlayer (hook) por slide

interface SlideProps {
  reel: Reel;
  isActive: boolean;
  screenFocused: boolean;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onLike: (r: Reel) => void;
  onSave: (r: Reel) => void;
  onShare: (r: Reel) => void;
  onComment: (r: Reel) => void;
  onProduct: (r: Reel) => void;
  onDelete: (r: Reel) => void;
  isOwner: boolean;
}

function ReelSlide({ reel, isActive, screenFocused, insets, onLike, onSave, onShare, onComment, onProduct, onDelete, isOwner }: SlideProps) {
  const uri     = imgUri(reel.archivo);
  const userUri = imgUri(reel.usuario_foto);

  const [paused, setPaused]           = useState(false);
  const [showIcon, setShowIcon]       = useState(false);
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(reel.tipo === 'video' && uri ? uri : null, p => {
    p.loop   = true;
    p.muted  = false;
  });

  useEffect(() => {
    if (reel.tipo !== 'video' || !uri) return;
    try {
      if (isActive && !paused && screenFocused) { player.play(); } else { player.pause(); }
    } catch {}
  }, [isActive, paused, screenFocused]);

  const handleTap = () => {
    if (reel.tipo !== 'video') return;
    setPaused(p => !p);
    setShowIcon(true);
    if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
    iconTimerRef.current = setTimeout(() => setShowIcon(false), 700);
  };

  return (
    <View style={[S.slide, { height: SCREEN_H, width: SCREEN_W }]}>
      {/* Fondo */}
      <View style={StyleSheet.absoluteFill}>
        {reel.tipo === 'video' && uri ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
          />
        ) : uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, S.placeholderBg]}>
            <Ionicons name="play-circle" size={100} color="rgba(255,255,255,0.2)" />
          </View>
        )}
      </View>

      {/* Área táctil central para pausa */}
      {reel.tipo === 'video' && (
        <Pressable style={S.tapArea} onPress={handleTap} />
      )}

      {/* Ícono de pausa/play momentáneo */}
      {showIcon && (
        <View style={S.pauseIconWrap} pointerEvents="none">
          <Ionicons name={paused ? 'play-circle' : 'pause-circle'} size={72} color="rgba(255,255,255,0.85)" />
        </View>
      )}


      {/* Barra superior: tipo + eliminar */}
      <View style={[S.topBar, { top: insets.top + 12 }]}>
        <View style={S.typePill}>
          <Ionicons name={reel.tipo === 'video' ? 'videocam' : 'image'} size={12} color="#FFF" />
          <Text style={S.typeTxt}>{reel.tipo === 'video' ? 'VIDEO' : 'FOTO'}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity style={S.deletePill} onPress={() => onDelete(reel)}>
            <Ionicons name="trash-outline" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Acciones derechas */}
      <View style={[S.actions, { bottom: 96 + insets.bottom }]}>
        <TouchableOpacity style={S.actBtn} onPress={() => onLike(reel)}>
          <Ionicons name={reel.me_gusta ? 'heart' : 'heart-outline'} size={32} color={reel.me_gusta ? '#EF4444' : '#FFF'} />
          <Text style={S.actCount}>{fmt(reel.likes_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={S.actBtn} onPress={() => onComment(reel)}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
          <Text style={S.actCount}>{fmt(reel.comentarios_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={S.actBtn} onPress={() => onSave(reel)}>
          <Ionicons name={reel.guardado ? 'bookmark' : 'bookmark-outline'} size={28} color={reel.guardado ? '#FBBF24' : '#FFF'} />
          <Text style={S.actCount}>{fmt(reel.guardados_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={S.actBtn} onPress={() => onShare(reel)}>
          <Ionicons name="paper-plane-outline" size={26} color="#FFF" />
          <Text style={S.actCount}>Compartir</Text>
        </TouchableOpacity>

        {reel.producto_id && (
          <TouchableOpacity style={S.actBtn} onPress={() => onProduct(reel)}>
            <View style={S.productIcon}>
              <Ionicons name="bag-outline" size={20} color="#FFF" />
            </View>
            <Text style={S.actCount}>Producto</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info inferior */}
      <View style={[S.info, { paddingBottom: 80 + insets.bottom }]}>
        <View style={S.authorRow}>
          <View style={S.authorAvatar}>
            {userUri
              ? <Image source={{ uri: userUri }} style={S.authorAvatarImg} />
              : <Text style={S.authorAvatarTxt}>{(reel.usuario_nombre?.[0] ?? '?').toUpperCase()}</Text>}
          </View>
          <Text style={S.authorName}>@{reel.usuario_username ?? reel.usuario_nombre}</Text>
        </View>
        {reel.titulo    && <Text style={S.reelTitle}>{reel.titulo}</Text>}
        {reel.descripcion && <Text style={S.reelDesc} numberOfLines={3}>{reel.descripcion}</Text>}
        {reel.producto_id && reel.producto_nombre && (
          <TouchableOpacity style={S.productChip} onPress={() => onProduct(reel)}>
            <Ionicons name="bag" size={12} color="#FFF" />
            <Text style={S.productChipTxt}>
              {reel.producto_nombre}{reel.producto_precio ? `  $${Number(reel.producto_precio).toFixed(2)}` : ''}
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ReelsScreen() {
  const nav         = useNavigation<NavigationProp<RootStackParamList>>();
  const { usuario } = useAuth();
  const { colors }  = useTheme();
  const insets      = useSafeAreaInsets();
  const isVendedor  = usuario?.rol === 'vendedor';

  const [reels, setReels]             = useState<Reel[]>([]);
  const [loading, setLoading]         = useState(false);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIdx, setActiveIdx]     = useState(0);
  const [screenFocused, setScreenFocused] = useState(true);

  const [comVisible, setComVisible]   = useState(false);
  const [activeReel, setActiveReel]   = useState<Reel | null>(null);
  const [comentarios, setComentarios] = useState<ReelComentario[]>([]);
  const [comLoading, setComLoading]   = useState(false);
  const [comTexto, setComTexto]       = useState('');
  const [replyTo, setReplyTo]         = useState<ReelComentario | null>(null);
  const [expanded, setExpanded]       = useState<Set<number>>(new Set());
  const [sending, setSending]         = useState(false);
  const comInputRef = useRef<TextInput>(null);

  // ── Compartir en-app ────────────────────────────────────────────────────────
  const [shareVisible, setShareVisible]   = useState(false);
  const [shareReel, setShareReel]         = useState<Reel | null>(null);
  const [shareQuery, setShareQuery]       = useState('');
  const [shareUsers, setShareUsers]       = useState<Array<{ id: number; nombre: string; username?: string | null; foto?: string | null }>>([]);
  const [shareLoading, setShareLoading]   = useState(false);
  const [shareSending, setShareSending]   = useState<number | null>(null);
  const shareInputRef = useRef<TextInput>(null);

  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems[0]?.index != null) setActiveIdx(viewableItems[0].index);
  }).current;

  const cargar = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (!reset && !hasMore) return;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const r = await api<{ ok: boolean; reels?: Reel[] }>(Endpoints.reelsFeed(p));
      if (r.ok && r.reels) {
        setReels(prev => reset ? r.reels! : [...prev, ...r.reels!]);
        setPage(p + 1);
        setHasMore(r.reels.length === 10);
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, [page, hasMore]);

  // Carga inicial — solo una vez al montar (no en cada focus para no resetear el feed)
  useEffect(() => { void cargar(true); }, []);

  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));

  useEffect(() => {
    if (!shareQuery.trim()) { setShareUsers([]); return; }
    const t = setTimeout(async () => {
      setShareLoading(true);
      try {
        const r = await api<{ ok: boolean; usuarios?: Array<{ id: number; nombre: string; username?: string | null; foto?: string | null }> }>(
          Endpoints.authBuscarUsuarios, { body: { q: shareQuery } }
        );
        if (r.ok) setShareUsers(r.usuarios ?? []);
      } catch {}
      finally { setShareLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [shareQuery]);

  // ── Interactions ────────────────────────────────────────────────────────────

  const toggleLike = async (reel: Reel) => {
    const snap = { me_gusta: reel.me_gusta, likes_count: reel.likes_count };
    setReels(rs => rs.map(r => r.id === reel.id ? { ...r, me_gusta: !r.me_gusta, likes_count: r.me_gusta ? r.likes_count - 1 : r.likes_count + 1 } : r));
    try {
      const res = await api<{ ok: boolean; likes_count?: number }>(Endpoints.reelsToggleLike, { body: { reel_id: reel.id } });
      if (res.ok && res.likes_count !== undefined)
        setReels(rs => rs.map(r => r.id === reel.id ? { ...r, likes_count: res.likes_count! } : r));
    } catch { setReels(rs => rs.map(r => r.id === reel.id ? { ...r, ...snap } : r)); }
  };

  const toggleSave = async (reel: Reel) => {
    const snap = { guardado: reel.guardado, guardados_count: reel.guardados_count };
    setReels(rs => rs.map(r => r.id === reel.id ? { ...r, guardado: !r.guardado, guardados_count: r.guardado ? r.guardados_count - 1 : r.guardados_count + 1 } : r));
    try {
      await api(Endpoints.reelsToggleGuardado, { body: { reel_id: reel.id } });
    } catch { setReels(rs => rs.map(r => r.id === reel.id ? { ...r, ...snap } : r)); }
  };

  const compartir = (reel: Reel) => {
    setShareReel(reel);
    setShareQuery('');
    setShareUsers([]);
    setShareVisible(true);
    setTimeout(() => shareInputRef.current?.focus(), 300);
  };

  const compartirExterno = () => {
    if (!shareReel) return;
    const reel   = shareReel;
    const titulo = reel.titulo ?? 'Mira este reel en SVGo';
    const desc   = reel.descripcion ? `\n${reel.descripcion}` : '';
    // Cerramos el modal primero para que el dialog nativo no quede bloqueado
    setShareVisible(false);
    setTimeout(() => {
      Share.share({ message: `${titulo}${desc}\n— SVGo App` })
        .catch(e => Alert.alert('Error al compartir', String(e)));
    }, 350);
  };

  const enviarPorChat = async (otroId: number) => {
    if (!shareReel) return;
    setShareSending(otroId);
    const titulo = shareReel.titulo ?? 'un reel';
    const desc   = shareReel.descripcion ? `\n${shareReel.descripcion}` : '';
    const msg    = `🎬 Te comparto este reel: "${titulo}"${desc}`;
    try {
      const res = await api<{ ok: boolean; error?: string }>(Endpoints.chatEnviar, { body: { receptor_id: otroId, mensaje: msg } });
      if (res.ok) {
        setShareVisible(false);
        Alert.alert('¡Enviado!', 'El reel fue enviado por chat.');
      } else {
        Alert.alert('Error', res.error ?? 'No se pudo enviar.');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar el mensaje.');
    } finally {
      setShareSending(null);
    }
  };

  const eliminar = async (reel: Reel) => {
    try {
      const res = await api<{ ok: boolean }>(Endpoints.reelsEliminar, { body: { reel_id: reel.id } });
      if (res.ok) setReels(rs => rs.filter(r => r.id !== reel.id));
    } catch {}
  };

  const abrirComentarios = async (reel: Reel) => {
    setActiveReel(reel);
    setComVisible(true);
    setComLoading(true);
    setComentarios([]);
    setExpanded(new Set());
    setReplyTo(null);
    try {
      const res = await api<{ ok: boolean; comentarios?: ReelComentario[] }>(Endpoints.reelsComentarios(reel.id));
      if (res.ok) setComentarios(res.comentarios ?? []);
    } catch {}
    finally { setComLoading(false); }
  };

  const enviarComentario = async () => {
    if (!comTexto.trim() || !activeReel) return;
    const texto = comTexto.trim();
    setComTexto('');
    Keyboard.dismiss();
    setSending(true);
    try {
      const body: Record<string, unknown> = { reel_id: activeReel.id, comentario: texto };
      if (replyTo) body.parent_id = replyTo.id;
      const res = await api<{ ok: boolean; comentario?: ReelComentario; total?: number }>(Endpoints.reelsComentar, { body });
      if (res.ok && res.comentario) {
        if (replyTo) {
          setComentarios(cs => cs.map(c => c.id === replyTo.id ? {
            ...c,
            respuestas_count: (c.respuestas_count ?? 0) + 1,
            respuestas: [...(c.respuestas ?? []), res.comentario!],
          } : c));
          setExpanded(e => new Set([...e, replyTo.id]));
        } else {
          setComentarios(cs => [res.comentario!, ...cs]);
        }
        if (res.total !== undefined)
          setReels(rs => rs.map(r => r.id === activeReel.id ? { ...r, comentarios_count: res.total! } : r));
      }
    } catch {}
    finally { setSending(false); setReplyTo(null); }
  };

  const likeComentario = async (com: ReelComentario) => {
    const toggle = (list: ReelComentario[]): ReelComentario[] =>
      list.map(c => {
        if (c.id === com.id) return { ...c, me_gusta: !c.me_gusta, likes_count: c.me_gusta ? c.likes_count - 1 : c.likes_count + 1 };
        if (c.respuestas?.length) return { ...c, respuestas: toggle(c.respuestas) };
        return c;
      });
    setComentarios(toggle);
    try {
      const res = await api<{ ok: boolean; likes_count?: number }>(Endpoints.reelsToggleLikeComentario, { body: { comentario_id: com.id } });
      if (res.ok && res.likes_count !== undefined) {
        setComentarios(cs => cs.map(c => {
          if (c.id === com.id) return { ...c, likes_count: res.likes_count! };
          if (c.respuestas?.length) return { ...c, respuestas: c.respuestas.map(r => r.id === com.id ? { ...r, likes_count: res.likes_count! } : r) };
          return c;
        }));
      }
    } catch {}
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading && reels.length === 0) {
    return (
      <View style={S.loader}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={S.loaderTxt}>Cargando reels...</Text>
      </View>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <View style={S.empty}>
        <Ionicons name="play-circle-outline" size={80} color="rgba(255,255,255,0.3)" />
        <Text style={S.emptyTitle}>Sin reels aún</Text>
        <Text style={S.emptySub}>
          {isVendedor ? 'Sé el primero en publicar un reel' : 'Aún no hay reels disponibles'}
        </Text>
        {isVendedor && (
          <TouchableOpacity style={S.uploadBtnEmpty} onPress={() => nav.navigate('UploadReel')}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={S.uploadBtnTxt}>Subir primer reel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={S.root}>
      <FlatList
        data={reels}
        keyExtractor={r => String(r.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        onEndReached={() => { if (!loadingMore) void cargar(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#FFF" style={{ margin: 20 }} /> : null}
        renderItem={({ item, index }) => (
          <ReelSlide
            reel={item}
            isActive={index === activeIdx}
            screenFocused={screenFocused}
            insets={insets}
            onLike={toggleLike}
            onSave={toggleSave}
            onShare={compartir}
            onComment={abrirComentarios}
            onProduct={r => r.producto_id && nav.navigate('Product', { productoId: r.producto_id })}
            onDelete={eliminar}
            isOwner={!!usuario && usuario.id === item.usuario_id}
          />
        )}
      />

      {/* Botón subir — solo vendedores */}
      {isVendedor && (
        <TouchableOpacity
          style={[S.uploadFab, { top: insets.top + 12 }]}
          onPress={() => nav.navigate('UploadReel')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal comentarios */}
      <Modal visible={comVisible} animationType="slide" transparent onRequestClose={() => setComVisible(false)}>
        <View style={S.modalBg}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setComVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={S.modalSheet}>
            <View style={S.handle} />
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Comentarios · {comentarios.length}</Text>
              <TouchableOpacity onPress={() => setComVisible(false)}>
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            {comLoading ? (
              <View style={S.comLoading}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={comentarios}
                keyExtractor={c => String(c.id)}
                contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={S.noComments}>Sin comentarios aún. ¡Sé el primero!</Text>
                }
                renderItem={({ item }) => (
                  <CommentItem
                    item={item}
                    onLike={likeComentario}
                    onReply={c => {
                      setReplyTo(c);
                      setComTexto(`@${c.usuario_nombre} `);
                      setTimeout(() => comInputRef.current?.focus(), 100);
                    }}
                    expanded={expanded.has(item.id)}
                    onToggleExpand={id => setExpanded(e => {
                      const n = new Set(e);
                      n.has(id) ? n.delete(id) : n.add(id);
                      return n;
                    })}
                    colors={colors}
                  />
                )}
              />
            )}

            {replyTo && (
              <View style={[S.replyBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Text style={[S.replyTxt, { color: colors.muted }]}>
                  Respondiendo a <Text style={{ color: colors.accent, fontWeight: '700' }}>{replyTo.usuario_nombre}</Text>
                </Text>
                <TouchableOpacity onPress={() => { setReplyTo(null); setComTexto(''); }}>
                  <Ionicons name="close" size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[S.comInputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <TextInput
                ref={comInputRef}
                style={[S.comInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.muted}
                value={comTexto}
                onChangeText={setComTexto}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[S.sendBtn, { backgroundColor: comTexto.trim() ? colors.accent : colors.border }]}
                onPress={enviarComentario}
                disabled={!comTexto.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Ionicons name="send" size={17} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Modal compartir en-app ── */}
      <Modal visible={shareVisible} animationType="slide" transparent onRequestClose={() => setShareVisible(false)}>
        <View style={S.modalBg}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShareVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[S.modalSheet, { height: '60%' }]}>
            <View style={S.handle} />
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Compartir reel</Text>
              <TouchableOpacity onPress={() => setShareVisible(false)}>
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            {/* Buscador de usuarios */}
            <View style={S.shareSearchRow}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                ref={shareInputRef}
                style={S.shareSearchInput}
                placeholder="Buscar usuario para enviar..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={shareQuery}
                onChangeText={setShareQuery}
                returnKeyType="search"
              />
              {shareLoading && <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />}
            </View>

            {/* Resultados */}
            <FlatList
              data={shareUsers}
              keyExtractor={u => String(u.id)}
              contentContainerStyle={{ padding: 12 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                shareQuery.trim() && !shareLoading
                  ? <Text style={S.shareEmpty}>Sin resultados para "{shareQuery}"</Text>
                  : <Text style={S.shareEmpty}>Escribe un nombre o @usuario para buscar</Text>
              }
              renderItem={({ item: u }) => {
                const uUri = imgUri(u.foto);
                return (
                  <TouchableOpacity
                    style={S.shareUserRow}
                    onPress={() => enviarPorChat(u.id)}
                    disabled={shareSending === u.id}
                    activeOpacity={0.7}
                  >
                    <View style={S.shareAvatar}>
                      {uUri
                        ? <Image source={{ uri: uUri }} style={S.shareAvatarImg} />
                        : <Text style={S.shareAvatarTxt}>{(u.nombre?.[0] ?? '?').toUpperCase()}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.shareUserName}>{u.nombre}</Text>
                      {u.username && <Text style={S.shareUserSub}>@{u.username}</Text>}
                    </View>
                    {shareSending === u.id
                      ? <ActivityIndicator size="small" color="#60A5FA" />
                      : <Ionicons name="paper-plane" size={20} color="#60A5FA" />}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Botón compartir externo */}
            <TouchableOpacity style={S.shareExternalBtn} onPress={compartirExterno} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={20} color="#FFF" />
              <Text style={S.shareExternalTxt}>Compartir fuera de la app</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#000' },
  slide: { backgroundColor: '#000' },
  placeholderBg: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },

  tapArea:       { position: 'absolute', top: 0, left: 0, right: 80, bottom: 80 },
  pauseIconWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },

  topBar: { position: 'absolute', left: 16, right: 70, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  typeTxt:    { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  deletePill: { backgroundColor: 'rgba(220,38,38,0.7)', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  actions:     { position: 'absolute', right: 14, alignItems: 'center', gap: 4 },
  actBtn:      { alignItems: 'center', paddingVertical: 6 },
  actCount:    { color: '#FFF', fontSize: 11, marginTop: 2, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  productIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },

  info:           { position: 'absolute', bottom: 0, left: 0, right: 80, padding: 16 },
  authorRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  authorAvatar:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#4A6D8C', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  authorAvatarImg:{ width: '100%', height: '100%', borderRadius: 17 },
  authorAvatarTxt:{ color: '#FFF', fontWeight: '900', fontSize: 13 },
  authorName:     { color: '#FFF', fontWeight: '900', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  reelTitle:      { color: '#FFF', fontWeight: '800', fontSize: 16, marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  reelDesc:       { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 18, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  productChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(74,109,140,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  productChipTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  uploadFab: {
    position: 'absolute', right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(79,110,247,0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },

  loader:    { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  empty:         { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle:    { color: '#FFF', fontWeight: '900', fontSize: 22 },
  emptySub:      { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },
  uploadBtnEmpty:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#4f6ef7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 28 },
  uploadBtnTxt:  { color: '#FFF', fontWeight: '800', fontSize: 15 },

  modalBg:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: { height: '80%', backgroundColor: '#0A0F1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginTop: 10 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, backgroundColor: '#0A0F1E', borderBottomColor: '#1E293B' },
  modalTitle: { fontWeight: '800', fontSize: 15, color: '#F8FAFC' },
  comLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noComments: { textAlign: 'center', paddingVertical: 48, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },

  comItem:    { marginBottom: 12 },
  comReply:   { marginLeft: 40, marginTop: 8 },
  comRow:     { flexDirection: 'row', gap: 10 },
  comAvatar:  { width: 34, height: 34, borderRadius: 17, backgroundColor: '#4A6D8C', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  comAvatarImg:{ width: '100%', height: '100%' },
  comAvatarTxt:{ color: '#FFF', fontWeight: '900', fontSize: 13 },
  comName:    { fontWeight: '700', fontSize: 13, color: '#F8FAFC' },
  comTime:    { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  comText:    { fontSize: 14, lineHeight: 20, color: '#E2E8F0' },
  comActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  comActBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comActTxt:  { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  replyBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  replyTxt:   { fontSize: 12 },

  comInputRow:{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  comInput:   { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, fontSize: 14, maxHeight: 100 },
  sendBtn:    { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  // ── Share modal ──
  shareSearchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  shareSearchInput:{ flex: 1, color: '#F8FAFC', fontSize: 14, fontWeight: '500' },
  shareEmpty:      { textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '500' },
  shareUserRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  shareAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4A6D8C', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  shareAvatarImg:  { width: '100%', height: '100%' },
  shareAvatarTxt:  { color: '#FFF', fontWeight: '900', fontSize: 15 },
  shareUserName:   { color: '#F8FAFC', fontWeight: '700', fontSize: 14 },
  shareUserSub:    { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },
  shareExternalBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  shareExternalTxt:{ color: '#F8FAFC', fontWeight: '700', fontSize: 15 },
});
