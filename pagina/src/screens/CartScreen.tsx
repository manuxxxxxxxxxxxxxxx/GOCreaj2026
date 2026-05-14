import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useCart } from '../hooks/useCart';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/Toast';
import { Colors, Radius, Shadow } from '../theme/colors';
import { fmtMoney } from '../utils/formatters';
import { COUPONS, SHIPPING_FEE } from '../data/catalog';
import type { Coupon } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;
type Step = 1 | 2;

export default function CartScreen({ navigation }: Props) {
  const { items, updateQty, removeItem, subtotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { user }       = useAuth();

  const [step,         setStep]         = useState<Step>(1);
  const [couponCode,   setCouponCode]   = useState('');
  const [coupon,       setCoupon]       = useState<Coupon | null>(null);
  const [couponError,  setCouponError]  = useState('');
  const [address,      setAddress]      = useState(user?.address ?? '');
  const [payment,      setPayment]      = useState<'card' | 'cash' | 'transfer'>('card');
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState({ visible: false, message: '' });

  function showToast(msg: string) { setToast({ visible: true, message: msg }); }

  const discount = coupon
    ? coupon.type === 'percent'
      ? subtotal * coupon.value
      : Math.min(SHIPPING_FEE, SHIPPING_FEE * coupon.value)
    : 0;

  const shipping    = coupon?.type === 'shipping' ? 0 : SHIPPING_FEE;
  const total       = subtotal + shipping - (coupon?.type === 'percent' ? discount : 0);

  function applyCoupon() {
    const found = COUPONS[couponCode.trim().toUpperCase()];
    if (!found) {
      setCouponError('Cupón no válido.');
      setCoupon(null);
      return;
    }
    setCoupon(found);
    setCouponError('');
    showToast(`Cupón aplicado: ${found.label}`);
  }

  async function handleCheckout() {
    if (!address.trim()) {
      showToast('Ingresa una dirección de entrega.');
      return;
    }
    setLoading(true);
    const orderItems = items.map((i) => ({
      productId: i.product.id,
      name:      i.product.name,
      price:     i.product.price,
      qty:       i.qty,
      emoji:     i.product.emoji,
    }));
    await placeOrder({
      items:    orderItems,
      total,
      shipping: fmtMoney(shipping),
      payment,
      address,
    });
    await clearCart();
    setLoading(false);
    showToast('¡Pedido confirmado! 🎉');
    setTimeout(() => navigation.replace('Historial' as any), 1200);
  }

  if (items.length === 0 && step === 1) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptyDesc}>Agrega productos desde el mercado.</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Market' as any)}>
          <Text style={styles.shopBtnText}>Ir al Mercado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
          <Text style={styles.backText}>‹ {step === 1 ? 'Atrás' : 'Carrito'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Mi Carrito' : 'Finalizar Pedido'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Step indicators */}
      <View style={styles.steps}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
          <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {step === 1 && (
          <>
            {/* Cart items */}
            {items.map((item) => (
              <View key={item.product.id} style={styles.cartItem}>
                <Text style={styles.itemEmoji}>{item.product.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemSeller}>{item.product.seller}</Text>
                  <Text style={styles.itemPrice}>{fmtMoney(item.product.price)}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.qty - 1)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.qty + 1)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.product.id)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Coupon */}
            <View style={styles.couponRow}>
              <TextInput
                style={[styles.couponInput, couponError && styles.inputError]}
                placeholder="Código de cupón (ej. DESCUENTO10)"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity style={styles.couponBtn} onPress={applyCoupon}>
                <Text style={styles.couponBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
            {couponError && <Text style={styles.errorText}>{couponError}</Text>}
            {coupon && <Text style={styles.couponLabel}>✓ {coupon.label}</Text>}

            {/* Summary */}
            <View style={styles.summary}>
              <SummaryRow label="Subtotal" value={fmtMoney(subtotal)} />
              <SummaryRow label="Envío" value={fmtMoney(SHIPPING_FEE)} />
              {coupon && <SummaryRow label={`Descuento (${coupon.label})`} value={`-${fmtMoney(discount)}`} color={Colors.green} />}
              <View style={styles.divider} />
              <SummaryRow label="Total" value={fmtMoney(total)} bold />
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <Text style={styles.nextBtnText}>Continuar al Pago →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📍 Dirección de entrega</Text>
              <TextInput
                style={styles.input}
                placeholder="Calle, número, colonia, ciudad…"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💳 Método de pago</Text>
              {([
                { key: 'card',     label: 'Tarjeta',          emoji: '💳' },
                { key: 'cash',     label: 'Efectivo',         emoji: '💵' },
                { key: 'transfer', label: 'Transferencia',    emoji: '🏦' },
              ] as const).map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.payOption, payment === p.key && styles.payOptionActive]}
                  onPress={() => setPayment(p.key)}
                >
                  <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                  <Text style={[styles.payLabel, payment === p.key && styles.payLabelActive]}>{p.label}</Text>
                  <View style={[styles.radio, payment === p.key && styles.radioActive]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Order summary */}
            <View style={styles.summary}>
              <SummaryRow label="Subtotal" value={fmtMoney(subtotal)} />
              <SummaryRow label="Envío" value={fmtMoney(shipping)} />
              {coupon && <SummaryRow label={`Descuento`} value={`-${fmtMoney(discount)}`} color={Colors.green} />}
              <View style={styles.divider} />
              <SummaryRow label="Total a pagar" value={fmtMoney(total)} bold />
            </View>

            <TouchableOpacity style={[styles.nextBtn, loading && styles.btnDisabled]} onPress={handleCheckout} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.nextBtnText}>Confirmar Pedido ✓</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ visible: false, message: '' })} />
    </View>
  );
}

function SummaryRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, padding: 32 },
  emptyEmoji:    { fontSize: 64, marginBottom: 16 },
  emptyTitle:    { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyDesc:     { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 28 },
  shopBtn:       { backgroundColor: Colors.blue, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.md },
  shopBtnText:   { color: Colors.white, fontWeight: '700', fontSize: 15 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backText:      { fontSize: 16, color: Colors.blue, fontWeight: '600' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: Colors.text },
  steps:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 0 },
  stepDot:       { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: Colors.blue, backgroundColor: Colors.blue },
  stepNum:       { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  stepNumActive: { color: Colors.white },
  stepLine:      { width: 60, height: 2, backgroundColor: Colors.border },
  stepLineActive:{ backgroundColor: Colors.blue },
  content:       { padding: 16, paddingBottom: 80 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  itemEmoji:     { fontSize: 32 },
  itemName:      { fontSize: 14, fontWeight: '700', color: Colors.text },
  itemSeller:    { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  itemPrice:     { fontSize: 14, fontWeight: '700', color: Colors.blue },
  qtyControls:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:        { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:    { fontSize: 16, fontWeight: '700', color: Colors.text },
  qtyVal:        { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
  removeBtn:     { padding: 6 },
  removeText:    { fontSize: 14, color: Colors.textMuted },
  couponRow:     { flexDirection: 'row', gap: 10, marginVertical: 12 },
  couponInput:   { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text, backgroundColor: Colors.inputBg },
  inputError:    { borderColor: Colors.red },
  couponBtn:     { backgroundColor: Colors.blue + '18', paddingHorizontal: 16, borderRadius: Radius.sm, justifyContent: 'center' },
  couponBtnText: { color: Colors.blue, fontWeight: '600', fontSize: 13 },
  errorText:     { fontSize: 11, color: Colors.red, marginBottom: 8 },
  couponLabel:   { fontSize: 12, color: Colors.green, fontWeight: '600', marginBottom: 8 },
  summary:       { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.card, marginBottom: 16 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel:  { fontSize: 13, color: Colors.textMuted },
  summaryValue:  { fontSize: 13, color: Colors.text },
  summaryBold:   { fontWeight: '800', fontSize: 16, color: Colors.text },
  divider:       { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  nextBtn:       { backgroundColor: Colors.blue, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  nextBtnText:   { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnDisabled:   { opacity: 0.6 },
  section:       { marginBottom: 16 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, backgroundColor: Colors.white,
  },
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  payOptionActive:{ borderColor: Colors.blue, backgroundColor: Colors.blue + '10' },
  payLabel:      { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  payLabelActive:{ color: Colors.blue },
  radio:         { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border },
  radioActive:   { borderColor: Colors.blue, backgroundColor: Colors.blue },
});
