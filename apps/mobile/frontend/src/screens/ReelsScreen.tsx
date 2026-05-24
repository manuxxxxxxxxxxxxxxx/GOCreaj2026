import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, TextInput, Modal, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { api, Endpoints } from '@/services/api';
import { Producto, Comentario, RootStackParamList } from '@/types';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

const CARD_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#A29BFE', '#FF9FF3'];

const MOCK_REELS: Producto[] = [
  { id: 1, tienda_id: 1, nombre: 'Pupusas de Queso $0.75', precio: 0.75, stock: 50, es_reel: 1, activo: 1, tienda_nombre: '@comedordoñarosa', descripcion: 'Las mejores pupusas del barrio 🔥 Tradicionales y artesanales, hechas con amor cada día. ¡Ven a visitarnos!', categoria: 'comida', municipio: 'San Salvador', likes_count: 1247, compartidos_count: 89, comentarios_count: 156, vendedor_id: 1 },
  { id: 2, tienda_id: 2, nombre: 'Café Molido Premium $3.50', precio: 3.50, stock: 200, es_reel: 1, activo: 1, tienda_nombre: '@fincaelcafetal', descripcion: 'Café de altura 100% salvadoreño ☕ Cultivado en las montañas de Ahuachapán a 1,400 metros. Aroma y sabor únicos.', categoria: 'bebidas', municipio: 'Ahuachapán', likes_count: 3821, compartidos_count: 412, comentarios_count: 298, vendedor_id: 4 },
  { id: 3, tienda_id: 3, nombre: 'Pan de Yema $0.50', precio: 0.50, stock: 80, es_reel: 1, activo: 1, tienda_nombre: '@panaderialahermosa', descripcion: 'Pan artesanal salvadoreño 🍞 Receta de la abuela, horneado fresco cada mañana. El desayuno perfecto.', categoria: 'panaderia', municipio: 'Santa Ana', likes_count: 892, compartidos_count: 67, comentarios_count: 104, vendedor_id: 3 },
  { id: 4, tienda_id: 5, nombre: 'Quesillo con Curtido $2.00', precio: 2.00, stock: 40, es_reel: 1, activo: 1, tienda_nombre: '@antojitoselsalvador', descripcion: 'El auténtico quesillo salvadoreño 🧀 Con curtido crujiente y loroco fresco. ¡Tradición en cada mordida!', categoria: 'comida', municipio: 'Santa Ana', likes_count: 2156, compartidos_count: 234, comentarios_count: 187, vendedor_id: 5 },
  { id: 5, tienda_id: 6, nombre: 'Horchata Natural $1.25', precio: 1.25, stock: 150, es_reel: 1, activo: 1, tienda_nombre: '@bebidaselchele', descripcion: 'Horchata de arroz con canela 🥤 Preparada naturalmente, sin conservantes. Refrescante y deliciosa. ¡Pruébala!', categoria: 'bebidas', municipio: 'San Miguel', likes_count: 743, compartidos_count: 55, comentarios_count: 82, vendedor_id: 6 },
];

const MOCK_COMMENTS: Comentario[] = [
  { id: 1, usuario_id: 2, producto_id: 1, comentario: '¡Las mejores pupusas del barrio! Siempre vengo los domingos 😍', created_at: '2026-05-23', nombre: 'María García' },
  { id: 2, usuario_id: 3, producto_id: 1, comentario: 'El precio está increíble, $0.75 es muy barato para la calidad 🔥', created_at: '2026-05-23', nombre: 'Carlos López' },
  { id: 3, usuario_id: 4, producto_id: 1, comentario: '¿Tienen delivery? Quiero pedir para llevar', created_at: '2026-05-22', nombre: 'Ana Martínez' },
];

interface ReelsResp { ok: boolean; reels?: Producto[] }
interface ComResp { ok: boolean; comentarios?: Comentario[] }
interface ToggleResp { ok: boolean; accion?: string; contadores?: { likes: number; guardados: number; compartidos: number; comentarios: number } }

export default function ReelsScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [reels, setReels]         = useState<Producto[]>(MOCK_REELS);
  const [cargando, setCargando]   = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [comVisible, setComVisible]   = useState(false);
  const [comLista, setComLista]       = useState<Comentario[]>(MOCK_COMMENTS);
  const [comTexto, setComTexto]       = useState('');
  const [productoActivo, setProductoActivo] = useState<Producto | null>(null);

  const cargar = useCallback(async () => {
    const muni = (await AsyncStorage.getItem('svgo_municipio')) ?? '';
    const url  = `${Endpoints.productosReels}${muni ? `&municipio=${encodeURIComponent(muni)}` : ''}`;
    try {
      const r = await api<ReelsResp>(url);
      if (r.ok && r.reels && r.reels.length > 0) setReels(r.reels);
      else setReels(MOCK_REELS);
    } catch { setReels(MOCK_REELS); }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
  }).current;

  const toggleLike = async (p: Producto) => {
    const r = await api<ToggleResp>(Endpoints.interToggleLike, { body: { producto_id: p.id } });
    if (r.ok && r.contadores) {
      setReels(prev => prev.map(x => x.id === p.id ? { ...x, likes_count: r.contadores?.likes } : x));
    } else {
      setReels(prev => prev.map(x => x.id === p.id ? { ...x, likes_count: (x.likes_count ?? 0) + 1 } : x));
    }
  };

  const abrirComentarios = async (p: Producto) => {
    setProductoActivo(p);
    try {
      const r = await api<ComResp>(Endpoints.interListarComentarios(p.id));
      if (r.ok && r.comentarios && r.comentarios.length > 0) setComLista(r.comentarios);
      else setComLista(MOCK_COMMENTS);
    } catch { setComLista(MOCK_COMMENTS); }
    setComVisible(true);
  };

  const enviarComentario = async () => {
    if (!productoActivo || !comTexto.trim()) return;
    await api<ToggleResp>(Endpoints.interComentar, { body: { producto_id: productoActivo.id, comentario: comTexto } });
    const nuevoComentario: Comentario = {
      id: Date.now(), usuario_id: 0, producto_id: productoActivo.id,
      comentario: comTexto, created_at: new Date().toISOString(), nombre: 'Tú',
    };
    setComLista(prev => [...prev, nuevoComentario]);
    setComTexto('');
  };

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
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { height, width }]}>
            {/* Fondo de color cuando no hay video/imagen */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }]}>
              {item.imagen
                ? <Image source={{ uri: item.imagen }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                : (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="fast-food-outline" size={120} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
              {item.video ? (
                <Video
                  source={{ uri: item.video }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={index === activeIndex}
                  isLooping
                  isMuted={false}
                  onPlaybackStatusUpdate={(_: AVPlaybackStatus) => {}}
                />
              ) : null}
            </View>

            {/* Gradiente inferior */}
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
              <TouchableOpacity style={styles.actionBtn} onPress={() => api(Endpoints.interToggleGuardar, { body: { producto_id: item.id } })}>
                <Ionicons name="bookmark" size={28} color="#FFF" />
                <Text style={styles.actionCount}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => api(Endpoints.interCompartir, { body: { producto_id: item.id, canal: 'app' } })}>
                <Ionicons name="paper-plane" size={26} color="#FFF" />
                <Text style={styles.actionCount}>{item.compartidos_count ?? 0}</Text>
              </TouchableOpacity>
              {item.vendedor_id ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => nav.navigate('Chat', { otroId: item.vendedor_id!, nombre: item.tienda_nombre ?? 'Vendedor' })}>
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
                <Text style={styles.infoTienda}>{item.tienda_nombre}</Text>
              </View>
              <Text style={styles.infoTitulo}>{item.nombre}</Text>
              <Text style={styles.infoDesc} numberOfLines={2}>{item.descripcion}</Text>
              <View style={styles.infoBottom}>
                <View style={styles.precioBox}>
                  <Text style={styles.precioTxt}>${Number(item.precio).toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.comprarBtn}
                  onPress={() => nav.navigate('Product', { productoId: item.id })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.comprarTxt}>Ver producto</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Indicador de índice */}
            <View style={[styles.indexIndicator, { top: insets.top + 16 }]}>
              <Text style={styles.indexTxt}>{index + 1} / {reels.length}</Text>
            </View>
          </View>
        )}
      />

      {/* Modal comentarios */}
      <Modal visible={comVisible} animationType="slide" transparent>
        <View style={[styles.modalRoot, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Comentarios · {comLista.length}
              </Text>
              <TouchableOpacity onPress={() => setComVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={comLista}
              keyExtractor={c => String(c.id)}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => (
                <View style={[styles.comItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.comAvatar, { backgroundColor: colors.accent }]}>
                    <Ionicons name="person" size={14} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.comNombre, { color: colors.text }]}>{item.nombre}</Text>
                    <Text style={[styles.comTxt, { color: colors.text }]}>{item.comentario}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.sinCom, { color: colors.muted }]}>Sin comentarios aún</Text>}
            />
            <View style={[styles.comInputRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.muted}
                value={comTexto}
                onChangeText={setComTexto}
                style={[styles.comInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              />
              <TouchableOpacity onPress={enviarComentario} style={[styles.sendBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', gap: Spacing.sm,
  },
  actionBtn: { alignItems: 'center', paddingVertical: 4 },
  actionCount: {
    color: '#FFF', fontSize: Fonts.small - 1, marginTop: 3, fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  info: { padding: Spacing.md, paddingRight: 80 },
  tiendaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tiendaAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  infoTienda: {
    color: '#FFF', fontWeight: '900', fontSize: Fonts.regular,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  infoTitulo: {
    color: '#FFF', fontWeight: '800', fontSize: Fonts.title - 3,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  infoDesc: {
    color: 'rgba(255,255,255,0.9)', fontSize: Fonts.small + 1, marginTop: 4, lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  infoBottom: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.sm },
  precioBox: {
    backgroundColor: 'rgba(74,109,140,0.9)',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  precioTxt: { color: '#FFF', fontWeight: '900', fontSize: Fonts.small + 1 },
  comprarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  comprarTxt: { color: '#FFF', fontWeight: '700', fontSize: Fonts.small },
  indexIndicator: {
    position: 'absolute', right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill,
  },
  indexTxt: { color: '#FFF', fontSize: Fonts.small - 1, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { height: '75%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, overflow: 'hidden' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1.5,
  },
  modalTitle: { fontWeight: '800', fontSize: Fonts.title - 3 },
  comItem: {
    flexDirection: 'row', marginBottom: Spacing.sm,
    padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1,
  },
  comAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  comNombre: { fontWeight: '700', fontSize: Fonts.small + 1 },
  comTxt: { fontSize: Fonts.regular, marginTop: 2, fontWeight: '400' },
  sinCom: { textAlign: 'center', paddingVertical: Spacing.xl, fontWeight: '600' },
  comInputRow: {
    flexDirection: 'row', padding: Spacing.md,
    borderTopWidth: 1.5, alignItems: 'center', paddingBottom: 30,
  },
  comInput: {
    flex: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md,
    paddingVertical: 10, borderWidth: 1.5, fontWeight: '500',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm,
  },
});
