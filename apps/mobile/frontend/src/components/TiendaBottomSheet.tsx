import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator,
  Animated, PanResponder, Dimensions, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { api, Endpoints } from '@/services/api';
import { Tienda, Producto } from '@/types';
import { Spacing, Radius, Fonts, FontFamily } from '@/theme/colors';
import { resolveMediaUrl } from '@/utils/media';

const { height: SCREEN_H } = Dimensions.get('window');
const PEEK_H = SCREEN_H * 0.55;

interface Props {
  tiendaId: number | null;
  onClose: () => void;
}

/**
 * Bottom sheet de tienda: aparece en modo "peek" al abrir. A diferencia del gesto
 * habitual, aquí deslizar hacia ABAJO expande a pantalla completa y deslizar hacia
 * ARRIBA colapsa/cierra — así lo pidió el spec para este flujo en particular.
 */
export default function TiendaBottomSheet({ tiendaId, onClose }: Props): React.JSX.Element | null {
  const { colors: c } = useTheme();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [seguidores, setSeguidores] = useState(0);

  // top del sheet medido desde arriba de la pantalla. CLOSED = fuera de vista.
  const CLOSED_TOP = SCREEN_H;
  const PEEK_TOP = SCREEN_H - PEEK_H;
  const FULL_TOP = insets.top;

  const top = useRef(new Animated.Value(CLOSED_TOP)).current;
  const topOffset = useRef(CLOSED_TOP);
  const [estado, setEstado] = useState<'cerrado' | 'peek' | 'full'>('cerrado');

  useEffect(() => {
    const id = top.addListener(({ value }) => { topOffset.current = value; });
    return () => top.removeListener(id);
  }, [top]);

  const animarA = (valor: number, next: 'cerrado' | 'peek' | 'full') => {
    Animated.spring(top, { toValue: valor, useNativeDriver: false, bounciness: 4, speed: 14 }).start();
    setEstado(next);
  };

  useEffect(() => {
    if (tiendaId) {
      top.setValue(PEEK_TOP);
      setEstado('peek');
      setCargando(true);
      Promise.all([
        api<{ ok: boolean; tienda?: Tienda }>(Endpoints.productosTiendaDetalle(tiendaId)),
        api<{ ok: boolean; productos?: Producto[] }>(Endpoints.productosPorTienda(tiendaId)),
      ]).then(([rt, rp]) => {
        if (rt.ok && rt.tienda) {
          setTienda(rt.tienda);
          setSiguiendo(!!Number(rt.tienda.yo_sigo));
          setSeguidores(Number(rt.tienda.seguidores_count) || 0);
        }
        if (rp.ok) setProductos(rp.productos ?? []);
      }).catch(() => {}).finally(() => setCargando(false));
    } else {
      animarA(CLOSED_TOP, 'cerrado');
      setTienda(null);
      setProductos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiendaId]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_e, g) => {
        const base = estado === 'full' ? FULL_TOP : PEEK_TOP;
        const next = base + g.dy;
        top.setValue(Math.max(FULL_TOP, Math.min(next, SCREEN_H)));
      },
      onPanResponderRelease: (_e, g) => {
        const THRESH = 60;
        if (g.dy > THRESH) {
          // Deslizó hacia abajo → expande (o cierra si ya estaba en peek y sigue bajando fuerte)
          if (estado === 'full') animarA(PEEK_TOP, 'peek');
          else animarA(FULL_TOP, 'full');
        } else if (g.dy < -THRESH) {
          // Deslizó hacia arriba → colapsa/cierra
          if (estado === 'full') animarA(PEEK_TOP, 'peek');
          else { animarA(CLOSED_TOP, 'cerrado'); onClose(); }
        } else {
          // Vuelve a su posición actual
          animarA(estado === 'full' ? FULL_TOP : PEEK_TOP, estado === 'full' ? 'full' : 'peek');
        }
      },
    })
  ).current;

  const toggleSeguir = async () => {
    if (!tienda) return;
    if (!usuario) { onClose(); nav.navigate('Auth'); return; }
    const r = await api<{ ok: boolean; accion?: string; total_seguidores?: number }>(Endpoints.interSeguirTienda, { body: { tienda_id: tienda.id } });
    if (r.ok) {
      setSiguiendo(r.accion === 'follow');
      setSeguidores(r.total_seguidores ?? seguidores);
    }
  };

  const irAProducto = (p: Producto) => {
    animarA(CLOSED_TOP, 'cerrado');
    onClose();
    nav.navigate('Product', { productoId: p.id });
  };

  if (!tiendaId) return null;

  return (
    <>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => { animarA(CLOSED_TOP, 'cerrado'); onClose(); }}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.sheet,
          { top, height: SCREEN_H, backgroundColor: c.background },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragZone}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
        </View>

        {cargando || !tienda ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
            <View style={[styles.banner, { backgroundColor: c.accent }]}>
              {tienda.portada ? (
                <Image source={{ uri: resolveMediaUrl(tienda.portada) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : null}
            </View>

            <View style={{ paddingHorizontal: Spacing.md }}>
              <View style={[styles.logo, { borderColor: c.background, backgroundColor: c.accent }]}>
                {tienda.logo
                  ? <Image source={{ uri: resolveMediaUrl(tienda.logo) }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={styles.avatarLetter}>{tienda.nombre.charAt(0).toUpperCase()}</Text>
                }
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nombre, { color: c.text }]}>{tienda.nombre}</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {tienda.municipio}{tienda.categoria ? ` · ${tienda.categoria}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleSeguir}
                  style={[styles.seguirBtn, { borderColor: c.accent, backgroundColor: siguiendo ? c.accent : 'transparent' }]}
                >
                  <Text style={[styles.seguirTxt, { color: siguiendo ? c.contrast : c.accent }]}>
                    {siguiendo ? 'Siguiendo' : 'Seguir'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
                {!!tienda.calificacion_promedio && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={12} color={c.ctaAccent} />
                    <Text style={[styles.statNum, { color: c.text }]}>{Number(tienda.calificacion_promedio).toFixed(1)}</Text>
                    <Text style={[styles.statTxt, { color: c.muted }]}>({tienda.total_resenas ?? 0})</Text>
                  </View>
                )}
                <Text style={[styles.statTxt, { color: c.muted }]}>
                  <Text style={styles.statNum}>{seguidores}</Text> seguidores
                </Text>
              </View>

              {!!tienda.descripcion && (
                <Text style={[styles.descripcion, { color: c.text }]}>{tienda.descripcion}</Text>
              )}

              <Text style={[styles.sectionLabel, { color: c.muted }]}>
                Productos de esta tienda (<Text style={styles.sectionLabelNum}>{productos.length}</Text>)
              </Text>

              {productos.length === 0 ? (
                <Text style={[styles.emptyTxt, { color: c.muted }]}>Esta tienda no tiene productos publicados.</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {productos.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => irAProducto(p)}
                      style={[styles.prodCard, { borderColor: c.border, backgroundColor: c.card }]}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.prodImgWrap, { backgroundColor: c.elevated }]}>
                        {p.imagen
                          ? <Image source={{ uri: resolveMediaUrl(p.imagen) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <Ionicons name="image-outline" size={28} color={c.muted} />
                        }
                      </View>
                      <Text numberOfLines={1} style={[styles.prodNombre, { color: c.text }]}>{p.nombre}</Text>
                      <Text style={[styles.prodPrecio, { color: c.accent }]}>${Number(p.precio).toFixed(2)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </>
  );
}

const CARD_W = (Dimensions.get('window').width - Spacing.md * 2 - 10) / 2;

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 12,
  },
  dragZone: { paddingVertical: 10, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  banner: { height: 110, width: '100%' },
  logo: {
    width: 72, height: 72, borderRadius: 36, marginTop: -36,
    borderWidth: 3, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarLetter: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 28 },
  nombre: { fontSize: Fonts.title - 1, fontFamily: FontFamily.displayExtraBold },
  meta: { fontSize: Fonts.small, fontFamily: FontFamily.bodySemiBold, marginTop: 2 },
  seguirBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1.5 },
  seguirTxt: { fontFamily: FontFamily.bodyExtraBold, fontSize: 12 },
  statNum: { fontFamily: FontFamily.displayBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  statTxt: { fontFamily: FontFamily.bodySemiBold, fontSize: 12 },
  descripcion: { fontSize: 13, fontFamily: FontFamily.bodyRegular, lineHeight: 19, marginTop: 12 },
  sectionLabel: { fontSize: 12, fontFamily: FontFamily.bodyExtraBold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: 10 },
  sectionLabelNum: { fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },
  emptyTxt: { fontSize: 13, fontFamily: FontFamily.bodyRegular },
  prodCard: { width: CARD_W, borderRadius: Radius.md, borderWidth: 1.5, overflow: 'hidden' },
  prodImgWrap: { width: '100%', height: CARD_W * 0.8, justifyContent: 'center', alignItems: 'center' },
  prodNombre: { fontFamily: FontFamily.displayBold, fontSize: 12, marginTop: 6, paddingHorizontal: 6 },
  prodPrecio: { fontFamily: FontFamily.displayExtraBold, fontSize: 13, paddingHorizontal: 6, paddingBottom: 8, fontVariant: ['tabular-nums'] },
});
