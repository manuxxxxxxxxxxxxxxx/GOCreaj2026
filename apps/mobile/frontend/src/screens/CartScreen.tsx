import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints, API_URL } from '@/services/api';
import { CarritoItem, RootStackParamList } from '@/types';
import LoadingScreen from '@/components/LoadingScreen';
import Input from '@/components/Input';
import PaymentModal, { PaymentExtra } from '@/components/PaymentModal';
import GuestGate from '@/components/GuestGate';

const CARD_BG = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];

// Helper para resolver URLs de imágenes (acepta absolutas, data:, o relativas)
function imgUri(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('data:') || p.startsWith('http')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

interface ListResp     { ok: boolean; items?: CarritoItem[]; total?: number }
interface CheckoutResp { ok: boolean; pedidos?: number[]; error?: string }

export default function CartScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useLang();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems]       = useState<CarritoItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [cargando, setCargando] = useState(false);
  const [pagoVisible, setPagoVisible] = useState(false);
  const [direccion, setDireccion]     = useState('');
  const [showDirInput, setShowDirInput] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await api<ListResp>(Endpoints.carritoListar);
      if (r.ok && r.items) {
        setItems(r.items);
        setTotal(r.total ?? r.items.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0));
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => {
    if (!usuario) { setCargando(false); return; }
    setCargando(true); void cargar();
  }, [cargar, usuario]));

  const actualizar = async (id: number, cantidad: number) => {
    if (cantidad < 1) { await eliminar(id); return; }
    await api(Endpoints.carritoActualizar, { body: { carrito_id: id, cantidad } });
    void cargar();
  };

  const eliminar = async (id: number) => {
    await api(Endpoints.carritoEliminar, { body: { carrito_id: id } });
    void cargar();
  };

  const handleProceder = () => {
    if (!direccion.trim()) { setShowDirInput(true); return; }
    setPagoVisible(true);
  };

  const onPaySuccess = async (metodo: 'tarjeta' | 'paypal' | 'efectivo', extra?: PaymentExtra) => {
    try {
      const r = await api<CheckoutResp>(Endpoints.carritoCheckout, {
        body: { metodo_pago: metodo, direccion_entrega: direccion, ...extra },
      });
      if (r.ok && r.pedidos && r.pedidos.length > 0) {
        const pid = r.pedidos[0];
        if (pid != null) nav.navigate('Tracking', { pedidoId: pid });
      } else {
        nav.navigate('Main');
      }
    } catch {
      nav.navigate('Main');
    }
  };

  if (!usuario) {
    return (
      <GuestGate
        icon="cart-outline"
        title="Inicia sesión para ver tu carrito"
        subtitle="Necesitas una cuenta para agregar productos al carrito y completar tu compra."
      />
    );
  }

  if (cargando) return <LoadingScreen mensaje={t.cart.miCarrito} />;

  const c = colors;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>{t.cart.miCarrito}</Text>
          <Text style={[styles.headerSub, { color: c.muted }]}>
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </Text>
        </View>
        {items.length > 0 && (
          <View style={[styles.totalBadge, { backgroundColor: c.accentLight }]}>
            <Text style={[styles.totalBadgeTxt, { color: c.accent }]}>${total.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={it => String(it.id)}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          showDirInput ? (
            <View style={[styles.dirCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.dirTitle, { color: c.text }]}>{t.cart.direccionEntrega}</Text>
              <Input
                label={t.cart.direccionEntrega}
                icon="location-outline"
                value={direccion}
                onChangeText={setDireccion}
                placeholder={t.cart.direccionPlaceholder}
                valid={direccion.trim().length > 5 || undefined}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconBg, { backgroundColor: c.accentLight }]}>
              <Ionicons name="cart" size={52} color={c.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>{t.cart.carritoVacio}</Text>
            <Text style={[styles.emptySub, { color: c.muted }]}>{t.cart.carritoVacioSub}</Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: c.accent }]}
              onPress={() => nav.navigate('Main')}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: Fonts.regular }}>{t.cart.explorar}</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.itemCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.itemImg, { backgroundColor: CARD_BG[index % CARD_BG.length] }]}>
              {item.imagen
                ? <Image source={{ uri: imgUri(item.imagen) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <Ionicons name="fast-food-outline" size={26} color="rgba(255,255,255,0.9)" />}
            </View>
            <View style={styles.itemDetails}>
              <Text numberOfLines={1} style={[styles.itemNombre, { color: c.text }]}>{item.nombre}</Text>
              <Text numberOfLines={1} style={[styles.itemTienda, { color: c.muted }]}>{item.tienda_nombre}</Text>
              <Text style={[styles.itemPrecio, { color: c.accent }]}>${Number(item.precio).toFixed(2)} c/u</Text>
              <View style={styles.itemBottom}>
                <View style={[styles.qtyRow, { backgroundColor: c.background, borderColor: c.border }]}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: c.card }]}
                    onPress={() => actualizar(item.id, item.cantidad - 1)}
                  >
                    <Ionicons
                      name={item.cantidad === 1 ? 'trash-outline' : 'remove'}
                      size={13}
                      color={item.cantidad === 1 ? c.danger : c.text}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.qtyTxt, { color: c.text }]}>{item.cantidad}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: c.card }]}
                    onPress={() => actualizar(item.id, item.cantidad + 1)}
                  >
                    <Ionicons name="add" size={13} color={c.text} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.itemSubtotal, { color: c.text }]}>
                  ${(item.precio * item.cantidad).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Footer */}
      {items.length > 0 && (
        <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <View style={[styles.breakdownBox, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={styles.bRow}>
              <Text style={[styles.bLabel, { color: c.muted }]}>{t.cart.subtotal}</Text>
              <Text style={[styles.bValue, { color: c.text }]}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.bRow}>
              <Text style={[styles.bLabel, { color: c.muted }]}>{t.cart.costoEnvio}</Text>
              <Text style={[styles.bValue, { color: c.success }]}>{t.cart.gratis}</Text>
            </View>
            <View style={[styles.divLine, { backgroundColor: c.border }]} />
            <View style={styles.bRow}>
              <Text style={[styles.totalLabel, { color: c.text }]}>{t.cart.totalEstimado}</Text>
              <Text style={[styles.totalValue, { color: c.text }]}>${total.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.proceedBtn, { backgroundColor: c.accent }]}
            onPress={handleProceder}
            activeOpacity={0.85}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.proceedBtnTxt}>{t.cart.procederPago} · ${total.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      <PaymentModal
        visible={pagoVisible}
        total={total}
        items={items}
        direccion={direccion}
        onClose={() => setPagoVisible(false)}
        onSuccess={onPaySuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 3,
  },
  headerTitle: { fontSize: Fonts.title + 2, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: Fonts.small + 1, fontWeight: '600', marginTop: 2 },
  totalBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill },
  totalBadgeTxt: { fontWeight: '900', fontSize: Fonts.regular + 1 },
  dirCard: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5, marginBottom: Spacing.md },
  dirTitle: { fontWeight: '800', fontSize: Fonts.regular, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', padding: Spacing.xl, paddingTop: 80 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.title - 2, fontWeight: '800' },
  emptySub: { textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: Spacing.lg, fontWeight: '500' },
  emptyBtn: { marginTop: Spacing.lg, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.pill },
  itemCard: {
    flexDirection: 'row', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  itemImg: { width: 76, height: 76, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  itemDetails: { flex: 1, marginLeft: Spacing.md },
  itemNombre: { fontWeight: '700', fontSize: Fonts.regular, letterSpacing: -0.2 },
  itemTienda: { fontSize: Fonts.small, marginTop: 1, fontWeight: '500' },
  itemPrecio: { fontWeight: '800', marginTop: 4, fontSize: Fonts.small + 1 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.pill, padding: 3, borderWidth: 1 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  qtyTxt: { marginHorizontal: 12, fontWeight: '800', fontSize: Fonts.small + 1 },
  itemSubtotal: { fontWeight: '900', fontSize: Fonts.regular },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1.5,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 10,
  },
  breakdownBox: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, marginBottom: Spacing.md },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bLabel: { fontSize: Fonts.small + 1, fontWeight: '600' },
  bValue: { fontSize: Fonts.small + 1, fontWeight: '700' },
  divLine: { height: 1, marginVertical: 8 },
  totalLabel: { fontSize: Fonts.regular, fontWeight: '800' },
  totalValue: { fontSize: Fonts.title - 2, fontWeight: '900', letterSpacing: -0.5 },
  proceedBtn: {
    height: 56, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1D5FD1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  proceedBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.regular + 1, letterSpacing: 0.1 },
});
