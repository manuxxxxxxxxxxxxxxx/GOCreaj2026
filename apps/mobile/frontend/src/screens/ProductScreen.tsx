import React, { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
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
  if (!prod) return <View style={styles.root}><Text style={styles.error}>{t.product.productoNoEncontrado}</Text></View>;

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
    <View style={styles.root}>
      <ScreenHeader
        title={t.product.detalle}
        right={
          <TouchableOpacity onPress={guardar} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        }
      />

      <ScreenScroll>
        <View style={styles.imgBox}>
          {prod.imagen ? (
            <Image source={{ uri: prod.imagen }} style={styles.img} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={64} color={Colors.border} />
          )}
        </View>

        <View style={styles.mainInfo}>
          <Text style={styles.titulo}>{prod.nombre}</Text>
          <View style={styles.tiendaRow}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setTiendaSheetId(prod.tienda_id)} activeOpacity={0.7}>
              <Ionicons name="storefront-outline" size={16} color={Colors.muted} style={{ marginRight: 6 }} />
              <Text style={styles.tienda}>{prod.tienda_nombre} • {prod.municipio}</Text>
            </TouchableOpacity>
            {prod.vendedor_id && prod.vendedor_id !== usuario?.id ? (
              <TouchableOpacity onPress={toggleSeguir} style={[styles.seguirBtn, prod.yo_sigo ? styles.seguirBtnActivo : null]} activeOpacity={0.8}>
                <Text style={[styles.seguirTxt, prod.yo_sigo ? styles.seguirTxtActivo : null]}>{prod.yo_sigo ? 'Siguiendo' : 'Seguir'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.precio}>${Number(prod.precio).toFixed(2)}</Text>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.descContainer}>
          <Text style={styles.descTitle}>{t.product.descripcion}</Text>
          <Text style={styles.descripcion}>{prod.descripcion || t.product.sinDescripcion}</Text>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.qtyContainer}>
          <Text style={styles.qtyTitle}>{t.product.cuantosOrdenar}</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity 
              onPress={() => setCantidad(Math.max(1, cantidad - 1))} 
              style={styles.qtyBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{cantidad}</Text>
            <TouchableOpacity 
              onPress={() => setCantidad(cantidad + 1)} 
              style={styles.qtyBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: Spacing.lg + 10 }} />
        <Button label={t.product.anadirCarrito} icon="cart-outline" onPress={addCarrito} />
        <View style={{ height: Spacing.sm }} />
        <Button label={t.product.contactarVendedor} icon="chatbubble-outline" onPress={chatear} variant="secondary" />
      </ScreenScroll>

      <TiendaBottomSheet tiendaId={tiendaSheetId} onClose={() => setTiendaSheetId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border
  },
  imgBox: { 
    aspectRatio: 1.2, 
    backgroundColor: Colors.card, 
    borderRadius: Radius.md, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: Spacing.lg, 
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3
  },
  img: { width: '100%', height: '100%' },
  mainInfo: {
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border
  },
  titulo: { fontSize: Fonts.heading - 4, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  tiendaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tienda: { color: Colors.muted, fontSize: Fonts.small + 1, fontWeight: '600' },
  seguirBtn: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.accent },
  seguirBtnActivo: { backgroundColor: Colors.accent },
  seguirTxt: { color: Colors.accent, fontWeight: '800', fontSize: Fonts.small - 1 },
  seguirTxtActivo: { color: '#FFF' },
  precio: { fontSize: Fonts.heading - 2, color: Colors.accent, fontWeight: '800', marginTop: Spacing.md, letterSpacing: -0.5 },
  sectionDivider: { height: 1.5, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  descContainer: {
    paddingHorizontal: Spacing.xs
  },
  descTitle: { fontSize: Fonts.regular, color: Colors.text, fontWeight: '800', letterSpacing: -0.1 },
  descripcion: { color: Colors.muted, marginTop: Spacing.sm, lineHeight: 22, fontSize: Fonts.regular, fontWeight: '500' },
  qtyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs
  },
  qtyTitle: { fontSize: Fonts.regular, color: Colors.text, fontWeight: '800', flex: 1, letterSpacing: -0.1 },
  qtyRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    borderRadius: Radius.pill, 
    padding: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
    backgroundColor: 'rgba(74, 109, 140, 0.05)'
  },
  qtyText: { marginHorizontal: Spacing.lg, fontSize: Fonts.title - 2, color: Colors.text, fontWeight: '800' },
  error: { color: Colors.danger, padding: Spacing.lg, textAlign: 'center', fontWeight: '600' }
});
