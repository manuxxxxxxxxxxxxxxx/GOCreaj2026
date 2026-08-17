import React, { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { Spacing, Radius, Fonts, FontFamily } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { api, Endpoints } from '@/services/api';
import { Producto, RootStackParamList } from '@/types';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenScroll from '@/components/ScreenScroll';
import TiendaBottomSheet from '@/components/TiendaBottomSheet';

interface Resp { ok: boolean; producto?: Producto; error?: string; }

export default function ProductScreen() {
  const { t } = useLang();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'Product'>>();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { usuario } = useAuth();
  const { productoId } = route.params;
  const [prod, setProd] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [cantidad, setCantidad] = useState<number>(1);
  const [tiendaSheetId, setTiendaSheetId] = useState<number | null>(null);

  useEffect(() => {
    (async (): Promise<void> => {
      const r = await api<Resp>(Endpoints.productosDetalle(productoId));
      if (r.ok && r.producto) setProd(r.producto);
      setCargando(false);
    })();
  }, [productoId]);

  if (cargando) return <LoadingScreen mensaje={t.product.cargandoProducto} />;
  if (!prod) return <View style={[styles.root, { backgroundColor: colors.background }]}><Text style={[styles.error, { color: colors.danger }]}>{t.product.productoNoEncontrado}</Text></View>;

  const addCarrito = async (): Promise<void> => {
    if (!usuario) { nav.navigate('Auth' as never); return; }
    const r = await api<{ ok: boolean; error?: string }>(Endpoints.carritoAgregar, { body: { producto_id: prod.id, cantidad } });
    if (r.ok) {
      Alert.alert(t.cart.miCarrito, `${prod.nombre} — ${t.product.agregado}`, [
        { text: t.common.cancelar, style: 'cancel' },
        { text: `${t.cart.miCarrito} →`, onPress: () => nav.navigate('Cart') },
      ]);
    } else Alert.alert(t.common.error, r.error ?? t.common.falloRed);
  };

  const guardar = async (): Promise<void> => {
    if (!usuario) { nav.navigate('Auth' as never); return; }
    const r = await api<{ ok: boolean; accion?: string }>(Endpoints.interToggleGuardar, { body: { producto_id: prod.id } });
    if (r.ok) Alert.alert(t.profile.guardados, r.accion === 'guardar' ? 'Guardado para más tarde' : 'Eliminado de guardados');
  };

  const chatear = (): void => {
    if (!usuario) { nav.navigate('Auth' as never); return; }
    if (prod.vendedor_id) nav.navigate('Chat', { otroId: prod.vendedor_id, nombre: prod.tienda_nombre ?? 'Vendedor' });
  };

  const toggleSeguir = async (): Promise<void> => {
    if (!usuario) { nav.navigate('Auth' as never); return; }
    const r = await api<{ ok: boolean; accion?: string; total_seguidores?: number }>(Endpoints.interSeguirTienda, { body: { tienda_id: prod.tienda_id } });
    if (r.ok) setProd(p => p ? { ...p, yo_sigo: r.accion === 'follow' ? 1 : 0, seguidores_count: r.total_seguidores ?? p.seguidores_count } : p);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={t.product.detalle}
        right={
          <TouchableOpacity onPress={guardar} style={[styles.backBtn, { backgroundColor: colors.background, borderColor: colors.border }]} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScreenScroll>
        {/* Imagen protagonista: la foto del producto es el cue principal de escaneo visual */}
        <View style={[styles.imgBox, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          {prod.imagen ? (
            <Image source={{ uri: prod.imagen }} style={styles.img} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={64} color={colors.border} />
          )}
        </View>

        <View style={[styles.mainInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.titulo, { color: colors.text }]}>{prod.nombre}</Text>
          <View style={styles.tiendaRow}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setTiendaSheetId(prod.tienda_id)} activeOpacity={0.7}>
              <Ionicons name="storefront-outline" size={16} color={colors.muted} style={{ marginRight: 6 }} />
              <Text style={[styles.tienda, { color: colors.muted }]}>{prod.tienda_nombre} • {prod.municipio}</Text>
            </TouchableOpacity>
            {prod.vendedor_id && prod.vendedor_id !== usuario?.id ? (
              <TouchableOpacity
                onPress={toggleSeguir}
                style={[styles.seguirBtn, { borderColor: colors.accent }, prod.yo_sigo ? { backgroundColor: colors.accent } : null]}
                activeOpacity={0.8}
              >
                <Text style={[styles.seguirTxt, { color: prod.yo_sigo ? colors.contrast : colors.accent }]}>{prod.yo_sigo ? 'Siguiendo' : 'Seguir'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Precio: numeral grande en Sora ExtraBold, tabular-nums — el número más importante de la pantalla */}
          <Text style={[styles.precio, { color: colors.accent }]}>${Number(prod.precio).toFixed(2)}</Text>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

        <View style={styles.descContainer}>
          <Text style={[styles.descTitle, { color: colors.text }]}>{t.product.descripcion}</Text>
          <Text style={[styles.descripcion, { color: colors.muted }]}>{prod.descripcion || t.product.sinDescripcion}</Text>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

        <View style={styles.qtyContainer}>
          <Text style={[styles.qtyTitle, { color: colors.text }]}>{t.product.cuantosOrdenar}</Text>
          <View style={[styles.qtyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setCantidad(Math.max(1, cantidad - 1))}
              style={[styles.qtyBtn, { backgroundColor: colors.elevated }]}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: colors.text }]}>{cantidad}</Text>
            <TouchableOpacity
              onPress={() => setCantidad(cantidad + 1)}
              style={[styles.qtyBtn, { backgroundColor: colors.elevated }]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: Spacing.lg + 10 }} />
        {/* CTA principal de compra en ctaAccent (naranja) para darle energía/urgencia — único acento cálido de la pantalla, sin competir con el azul de "Seguir" */}
        <Button
          label={t.product.anadirCarrito}
          icon="cart-outline"
          onPress={addCarrito}
          style={{ backgroundColor: colors.ctaAccent, borderColor: colors.ctaAccent }}
        />
        <View style={{ height: Spacing.sm }} />
        <Button label={t.product.contactarVendedor} icon="chatbubble-outline" onPress={chatear} variant="secondary" />
      </ScreenScroll>

      <TiendaBottomSheet tiendaId={tiendaSheetId} onClose={() => setTiendaSheetId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  imgBox: {
    aspectRatio: 1.1,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  img: { width: '100%', height: '100%' },
  mainInfo: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  titulo: { fontSize: Fonts.heading - 4, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.5 },
  tiendaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tienda: { fontSize: Fonts.small + 1, fontFamily: FontFamily.bodySemiBold },
  seguirBtn: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1.5 },
  seguirTxt: { fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.small - 1 },
  precio: { fontSize: Fonts.heading + 4, fontFamily: FontFamily.displayExtraBold, marginTop: Spacing.md, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  sectionDivider: { height: 1.5, marginVertical: Spacing.lg },
  descContainer: {
    paddingHorizontal: Spacing.xs
  },
  descTitle: { fontSize: Fonts.regular, fontFamily: FontFamily.displayBold, letterSpacing: -0.1 },
  descripcion: { marginTop: Spacing.sm, lineHeight: 22, fontSize: Fonts.regular, fontFamily: FontFamily.bodySemiBold },
  qtyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs
  },
  qtyTitle: { fontSize: Fonts.regular, fontFamily: FontFamily.displayBold, flex: 1, letterSpacing: -0.1 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    padding: 4,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  qtyBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { marginHorizontal: Spacing.lg, fontSize: Fonts.title - 2, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] },
  error: { padding: Spacing.lg, textAlign: 'center', fontFamily: FontFamily.bodySemiBold }
});
