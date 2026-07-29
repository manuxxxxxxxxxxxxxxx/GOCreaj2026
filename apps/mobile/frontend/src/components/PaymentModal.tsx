import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Animated, Easing, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import Input from '@/components/Input';
import { CarritoItem } from '@/types';
import { api, Endpoints } from '@/services/api';

interface MetodoGuardado {
  id: number; marca: string; ultimos4: string; exp_mes: number; exp_anio: number; predeterminado: number;
}

export interface PaymentExtra {
  metodo_pago_id?: number;
  tarjeta_numero?: string;
  tarjeta_cvv?: string;
  tarjeta_exp?: string;
  guardar_tarjeta?: boolean;
}

type PayStep = 'select' | 'card' | 'paypal_auth' | 'paypal_2fa' | 'review' | 'processing' | 'success';
type MetodoPago = 'tarjeta' | 'paypal' | 'efectivo';

function luhn(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function generateRef(): string {
  return `SVG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

interface Props {
  visible: boolean;
  total: number;
  items?: CarritoItem[];
  direccion?: string;
  onClose: () => void;
  onSuccess: (metodo: MetodoPago, extra?: PaymentExtra) => void;
}

export default function PaymentModal({ visible, total, items = [], direccion, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const { t } = useLang();

  const [step, setStep] = useState<PayStep>('select');
  const [metodoElegido, setMetodoElegido] = useState<MetodoPago>('tarjeta');
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [ppEmail, setPpEmail] = useState('');
  const [ppPass, setPpPass] = useState('');
  const [ppCode, setPpCode] = useState('');
  const [ref] = useState(generateRef());

  const [tarjetasGuardadas, setTarjetasGuardadas] = useState<MetodoGuardado[]>([]);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<MetodoGuardado | null>(null);
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const r = await api<{ ok: boolean; metodos?: MetodoGuardado[] }>(Endpoints.metodosPagoListar);
        if (r.ok) setTarjetasGuardadas(r.metodos ?? []);
      } catch {}
    })();
  }, [visible]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  const resetState = () => {
    setStep('select');
    setMetodoElegido('tarjeta');
    setCardNum(''); setCardName(''); setCardExp(''); setCardCvv('');
    setPpEmail(''); setPpPass(''); setPpCode('');
    setTarjetaSeleccionada(null);
    setGuardarTarjeta(false);
    progressAnim.setValue(0);
    successAnim.setValue(0);
    checkAnim.setValue(0);
  };

  const handleClose = () => { resetState(); onClose(); };

  const startProcessing = () => {
    setStep('processing');
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setStep('success');
      Animated.parallel([
        Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 5 }),
        Animated.timing(checkAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const cardValid = luhn(cardNum.replace(/\s/g, ''));
  const cardNameValid = cardName.trim().length > 3;
  const expiryValid = /^\d{2}\/\d{2}$/.test(cardExp);
  const cvvValid = /^\d{3}$/.test(cardCvv);
  const canPayCard = !!tarjetaSeleccionada || (cardValid && cardNameValid && expiryValid && cvvValid);

  const canPayPpAuth = ppEmail.includes('@') && ppPass.length >= 4;
  const canVerify2fa = ppCode.length === 6;

  const c = colors;
  const now = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: c.card }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          {/* HEADER */}
          {step !== 'success' && (
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              {step !== 'select' && step !== 'processing' ? (
                <TouchableOpacity
                  onPress={() => {
                    if (step === 'review') {
                      setStep(metodoElegido === 'tarjeta' ? 'card' : metodoElegido === 'paypal' ? 'paypal_2fa' : 'select');
                    } else {
                      setStep('select');
                    }
                  }}
                  style={[styles.backBtn, { backgroundColor: c.background }]}
                >
                  <Ionicons name="arrow-back" size={18} color={c.text} />
                </TouchableOpacity>
              ) : <View style={{ width: 36 }} />}
              <Text style={[styles.headerTxt, { color: c.text }]}>
                {step === 'processing' ? t.payment.procesando : t.payment.pagoSeguro}
              </Text>
              {step === 'select' ? (
                <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: c.background }]}>
                  <Ionicons name="close" size={18} color={c.text} />
                </TouchableOpacity>
              ) : <View style={{ width: 36 }} />}
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* STEP: SELECT */}
            {step === 'select' && (
              <View>
                <Text style={[styles.totalTxt, { color: c.accent }]}>${total.toFixed(2)}</Text>
                <Text style={[styles.sectionLbl, { color: c.muted }]}>{t.payment.seleccionaMetodo}</Text>
                {total > 20 && (
                  <View style={[styles.gateInfo, { backgroundColor: `${c.warning}18`, borderColor: `${c.warning}40` }]}>
                    <Ionicons name="information-circle-outline" size={15} color={c.warning} />
                    <Text style={[styles.gateTxt, { color: c.warning }]}>
                      Efectivo disponible solo para pedidos de $20.00 o menos
                    </Text>
                  </View>
                )}
                <View style={{ gap: Spacing.sm }}>
                  {([
                    { key: 'card',     icon: 'card-outline',  label: t.cart.tarjeta,  color: '#5B8ED6' },
                    { key: 'paypal',   icon: 'logo-paypal',   label: 'PayPal',         color: '#009CDE' },
                    ...(total <= 20
                      ? [{ key: 'efectivo', icon: 'cash-outline', label: t.cart.efectivo, color: '#27AE8F' }]
                      : []),
                  ] as { key: string; icon: string; label: string; color: string }[]).map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.methodCard, { backgroundColor: c.background, borderColor: c.border }]}
                      onPress={() => {
                        if (opt.key === 'card') { setMetodoElegido('tarjeta'); setStep('card'); }
                        else if (opt.key === 'paypal') { setMetodoElegido('paypal'); setStep('paypal_auth'); }
                        else { setMetodoElegido('efectivo'); setStep('review'); }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.methodIcon, { backgroundColor: `${opt.color}18` }]}>
                        <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                      </View>
                      <Text style={[styles.methodTxt, { color: c.text }]}>{opt.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color={c.muted} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[styles.secureRow, { marginTop: Spacing.lg }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={c.muted} />
                  <Text style={[styles.secureTxt, { color: c.muted }]}>
                    Transacción cifrada con SSL 256-bit
                  </Text>
                </View>
              </View>
            )}

            {/* STEP: CARD */}
            {step === 'card' && (
              <View>
                <Text style={[styles.stepTitle, { color: c.text }]}>{t.cart.tarjeta}</Text>

                {tarjetasGuardadas.length > 0 && (
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={[styles.sectionLbl, { color: c.muted }]}>Tarjetas guardadas</Text>
                    <View style={{ gap: Spacing.sm }}>
                      {tarjetasGuardadas.map(m => {
                        const sel = tarjetaSeleccionada?.id === m.id;
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[styles.methodCard, { backgroundColor: c.background, borderColor: sel ? c.accent : c.border, borderWidth: sel ? 2 : 1.5 }]}
                            onPress={() => setTarjetaSeleccionada(sel ? null : m)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.methodIcon, { backgroundColor: `${c.accent}18` }]}>
                              <Ionicons name="card-outline" size={22} color={c.accent} />
                            </View>
                            <Text style={[styles.methodTxt, { color: c.text }]}>
                              {m.marca.charAt(0).toUpperCase() + m.marca.slice(1)} •••• {m.ultimos4}
                            </Text>
                            <Ionicons name={sel ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={sel ? c.accent : c.muted} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TouchableOpacity
                      style={[styles.payBtn, { backgroundColor: tarjetaSeleccionada ? c.accent : c.border, marginTop: Spacing.md }]}
                      onPress={() => tarjetaSeleccionada && setStep('review')}
                      disabled={!tarjetaSeleccionada}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.payBtnTxt, { color: tarjetaSeleccionada ? '#FFF' : c.muted }]}>Usar esta tarjeta</Text>
                    </TouchableOpacity>
                    <Text style={[styles.sectionLbl, { color: c.muted, marginTop: Spacing.lg }]}>O usa una tarjeta nueva</Text>
                  </View>
                )}

                <View style={[styles.cardPreview, { backgroundColor: c.accent }]}>
                  <Ionicons name="card" size={28} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.cardPreviewNum}>
                    {cardNum || '•••• •••• •••• ••••'}
                  </Text>
                  <View style={styles.cardPreviewRow}>
                    <Text style={styles.cardPreviewName}>{cardName.toUpperCase() || 'NOMBRE TITULAR'}</Text>
                    <Text style={styles.cardPreviewExp}>{cardExp || 'MM/AA'}</Text>
                  </View>
                </View>

                <Input
                  label={t.payment.nombreTarjeta}
                  icon="person-outline"
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                  valid={cardNameValid || undefined}
                />
                <Input
                  label={t.payment.numeroTarjeta}
                  icon="card-outline"
                  value={cardNum}
                  onChangeText={setCardNum}
                  inputType="card"
                  valid={cardValid || undefined}
                  error={cardNum.replace(/\s/g, '').length >= 16 && !cardValid ? t.payment.luhnError : undefined}
                />
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t.payment.vencimiento}
                      icon="calendar-outline"
                      value={cardExp}
                      onChangeText={setCardExp}
                      inputType="expiry"
                      valid={expiryValid || undefined}
                    />
                  </View>
                  <View style={{ width: Spacing.sm }} />
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t.payment.cvv}
                      icon="lock-closed-outline"
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      inputType="cvv"
                      valid={cvvValid || undefined}
                      secureTextEntry
                    />
                  </View>
                </View>
                <Text style={[styles.cvvHint, { color: c.muted }]}>{t.payment.cvvHint}</Text>

                <TouchableOpacity
                  style={styles.saveCardRow}
                  onPress={() => setGuardarTarjeta(v => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={guardarTarjeta ? 'checkbox' : 'square-outline'} size={20} color={guardarTarjeta ? c.accent : c.muted} />
                  <Text style={[styles.saveCardTxt, { color: c.text }]}>Guardar esta tarjeta para la próxima vez</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: (cardValid && cardNameValid && expiryValid && cvvValid) ? c.accent : c.border }]}
                  onPress={() => {
                    if (!(cardValid && cardNameValid && expiryValid && cvvValid)) return;
                    setTarjetaSeleccionada(null);
                    setStep('review');
                  }}
                  disabled={!(cardValid && cardNameValid && expiryValid && cvvValid)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={(cardValid && cardNameValid && expiryValid && cvvValid) ? '#FFF' : c.muted} style={{ marginRight: 8 }} />
                  <Text style={[styles.payBtnTxt, { color: (cardValid && cardNameValid && expiryValid && cvvValid) ? '#FFF' : c.muted }]}>
                    {t.payment.pagoSeguro} · ${total.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP: PAYPAL AUTH */}
            {step === 'paypal_auth' && (
              <View>
                <View style={styles.ppHeader}>
                  <View style={[styles.ppLogoBg, { backgroundColor: '#003087' }]}>
                    <Ionicons name="logo-paypal" size={28} color="#FFF" />
                  </View>
                  <Text style={[styles.stepTitle, { color: c.text, marginTop: Spacing.md }]}>Accede a PayPal</Text>
                </View>
                <Input label={t.payment.paypalEmail} icon="mail-outline" value={ppEmail} onChangeText={setPpEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  valid={ppEmail.includes('@') || undefined}
                />
                <Input label={t.payment.paypalPass} icon="lock-closed-outline" value={ppPass} onChangeText={setPpPass}
                  secureTextEntry valid={ppPass.length >= 4 || undefined}
                />
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: canPayPpAuth ? '#003087' : c.border }]}
                  onPress={() => canPayPpAuth && setStep('paypal_2fa')}
                  disabled={!canPayPpAuth}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.payBtnTxt, { color: canPayPpAuth ? '#FFF' : c.muted }]}>Iniciar sesión</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP: PAYPAL 2FA */}
            {step === 'paypal_2fa' && (
              <View>
                <View style={styles.ppHeader}>
                  <View style={[styles.ppLogoBg, { backgroundColor: '#003087' }]}>
                    <Ionicons name="shield-checkmark-outline" size={28} color="#FFF" />
                  </View>
                  <Text style={[styles.stepTitle, { color: c.text, marginTop: Spacing.md }]}>{t.payment.codigo2fa}</Text>
                  <Text style={[styles.ppHint, { color: c.muted }]}>{t.payment.enviarCodigo}</Text>
                </View>
                <Input label="Código de 6 dígitos" icon="key-outline" value={ppCode} onChangeText={v => setPpCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad" valid={canVerify2fa || undefined}
                />
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: canVerify2fa ? '#003087' : c.border }]}
                  onPress={() => canVerify2fa && setStep('review')}
                  disabled={!canVerify2fa}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.payBtnTxt, { color: canVerify2fa ? '#FFF' : c.muted }]}>
                    {t.payment.verificar} · ${total.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP: REVIEW — confirmación previa al cargo real */}
            {step === 'review' && (
              <View>
                <Text style={[styles.stepTitle, { color: c.text }]}>Revisa tu pedido</Text>

                {items.length > 0 && (
                  <View style={[styles.reviewCard, { backgroundColor: c.background, borderColor: c.border }]}>
                    {items.map(it => (
                      <View key={it.id} style={styles.reviewItemRow}>
                        <Text style={[styles.reviewItemTxt, { color: c.text }]} numberOfLines={1}>
                          {it.cantidad}× {it.nombre}
                        </Text>
                        <Text style={[styles.reviewItemPrice, { color: c.muted }]}>
                          ${(Number(it.precio) * it.cantidad).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {!!direccion && (
                  <View style={[styles.reviewCard, { backgroundColor: c.background, borderColor: c.border }]}>
                    <View style={styles.reviewItemRow}>
                      <Ionicons name="location-outline" size={15} color={c.accent} style={{ marginRight: 6 }} />
                      <Text style={[styles.reviewItemTxt, { color: c.text, flex: 1 }]} numberOfLines={2}>{direccion}</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.reviewCard, { backgroundColor: c.background, borderColor: c.border }]}>
                  <View style={styles.reviewItemRow}>
                    <Ionicons
                      name={metodoElegido === 'tarjeta' ? 'card-outline' : metodoElegido === 'paypal' ? 'logo-paypal' : 'cash-outline'}
                      size={15} color={c.accent} style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.reviewItemTxt, { color: c.text }]}>
                      {metodoElegido === 'tarjeta'
                        ? `${t.cart.tarjeta} •••• ${tarjetaSeleccionada ? tarjetaSeleccionada.ultimos4 : cardNum.replace(/\s/g, '').slice(-4)}`
                        : metodoElegido === 'paypal' ? 'PayPal' : t.cart.efectivo}
                    </Text>
                  </View>
                </View>

                <View style={[styles.reviewTotalRow, { borderTopColor: c.border }]}>
                  <Text style={[styles.reviewTotalLbl, { color: c.muted }]}>Total a pagar</Text>
                  <Text style={[styles.reviewTotalVal, { color: c.accent }]}>${total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: c.accent }]}
                  onPress={startProcessing}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.payBtnTxt, { color: '#FFF' }]}>Sí, confirmar y pagar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP: PROCESSING */}
            {step === 'processing' && (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="large" color={c.accent} style={{ marginBottom: Spacing.lg }} />
                <Text style={[styles.stepTitle, { color: c.text, textAlign: 'center' }]}>{t.payment.procesando}</Text>
                <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: c.accent,
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      },
                    ]}
                  />
                </View>
                {['Validando datos', 'Autorizando transacción', 'Confirmando pago'].map((s, i) => (
                  <View key={s} style={styles.processingStep}>
                    <Ionicons name="checkmark-circle" size={16} color={c.success} style={{ marginRight: 8 }} />
                    <Text style={[styles.processingTxt, { color: c.muted }]}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* STEP: SUCCESS */}
            {step === 'success' && (
              <Animated.View style={[styles.successBlock, { opacity: successAnim, transform: [{ scale: successAnim }] }]}>
                <Animated.View
                  style={[
                    styles.successIcon,
                    { backgroundColor: c.success, transform: [{ scale: checkAnim }] },
                  ]}
                >
                  <Ionicons name="checkmark" size={40} color="#FFF" />
                </Animated.View>
                <Text style={[styles.successTitle, { color: c.text }]}>{t.payment.exito}</Text>
                <Text style={[styles.successSub, { color: c.muted }]}>{t.payment.exitoMsg}</Text>

                <View style={[styles.receipt, { backgroundColor: c.background, borderColor: c.border }]}>
                  <Text style={[styles.receiptTitle, { color: c.text }]}>{t.payment.recibo}</Text>
                  <View style={[styles.divLine, { backgroundColor: c.border }]} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLbl, { color: c.muted }]}>Total</Text>
                    <Text style={[styles.receiptVal, { color: c.accent }]}>${total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLbl, { color: c.muted }]}>{t.payment.referencia}</Text>
                    <Text style={[styles.receiptVal, { color: c.text }]}>{ref}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLbl, { color: c.muted }]}>{t.payment.fecha}</Text>
                    <Text style={[styles.receiptVal, { color: c.text }]}>{now}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLbl, { color: c.muted }]}>Estado</Text>
                    <View style={[styles.estadoBadge, { backgroundColor: c.success }]}>
                      <Text style={styles.estadoBadgeTxt}>APROBADO</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: c.accent, marginTop: Spacing.lg }]}
                  onPress={() => {
                    const metodo = metodoElegido;
                    const extra: PaymentExtra = metodo === 'tarjeta'
                      ? (tarjetaSeleccionada
                        ? { metodo_pago_id: tarjetaSeleccionada.id }
                        : { tarjeta_numero: cardNum.replace(/\s/g, ''), tarjeta_cvv: cardCvv, tarjeta_exp: cardExp, guardar_tarjeta: guardarTarjeta })
                      : {};
                    resetState();
                    onSuccess(metodo, extra);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="bicycle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.payBtnTxt, { color: '#FFF' }]}>{t.payment.volverInicio}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTxt: { fontSize: Fonts.regular + 1, fontWeight: '800', letterSpacing: -0.2 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  totalTxt: { fontSize: 42, fontWeight: '900', textAlign: 'center', letterSpacing: -1, marginBottom: Spacing.sm },
  sectionLbl: { fontSize: Fonts.small, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  methodCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1,
  },
  methodIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  methodTxt: { flex: 1, fontWeight: '700', fontSize: Fonts.regular },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureTxt: { fontSize: Fonts.small, fontWeight: '500' },
  stepTitle: { fontSize: Fonts.title - 2, fontWeight: '800', letterSpacing: -0.3, marginBottom: Spacing.lg },
  cardPreview: {
    borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.lg,
    aspectRatio: 1.7,
    justifyContent: 'space-between',
    shadowColor: '#4A6D8C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPreviewNum: { color: '#FFF', fontSize: Fonts.title - 2, fontWeight: '700', letterSpacing: 3, marginTop: Spacing.sm },
  cardPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardPreviewName: { color: 'rgba(255,255,255,0.9)', fontSize: Fonts.small, fontWeight: '700', letterSpacing: 1 },
  cardPreviewExp: { color: 'rgba(255,255,255,0.9)', fontSize: Fonts.small, fontWeight: '700' },
  row2: { flexDirection: 'row' },
  cvvHint: { fontSize: Fonts.small, fontWeight: '500', marginTop: -Spacing.sm, marginBottom: Spacing.md },
  saveCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  saveCardTxt: { fontSize: Fonts.small + 1, fontWeight: '600' },
  payBtn: {
    height: 56, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
  },
  payBtnTxt: { fontSize: Fonts.regular + 1, fontWeight: '800', letterSpacing: 0.2 },
  ppHeader: { alignItems: 'center', marginBottom: Spacing.md },
  ppLogoBg: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  ppHint: { fontSize: Fonts.small + 1, textAlign: 'center', marginTop: 4, fontWeight: '500', lineHeight: 18 },
  centerBlock: { alignItems: 'center', paddingVertical: Spacing.xl },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginVertical: Spacing.lg, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  processingStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  processingTxt: { fontSize: Fonts.small + 1, fontWeight: '500' },
  successBlock: { alignItems: 'center' },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: { fontSize: Fonts.heading - 4, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  successSub: { fontSize: Fonts.regular, fontWeight: '500', textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 },
  receipt: {
    width: '100%', borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1.5,
  },
  receiptTitle: { fontWeight: '800', fontSize: Fonts.regular, marginBottom: Spacing.sm },
  divLine: { height: 1, marginBottom: Spacing.sm },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptLbl: { fontSize: Fonts.small + 1, fontWeight: '500' },
  receiptVal: { fontSize: Fonts.small + 1, fontWeight: '700' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  estadoBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  gateInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  gateTxt: { flex: 1, fontSize: Fonts.small, fontWeight: '600', lineHeight: 16 },
  reviewCard: { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.md, marginBottom: Spacing.sm },
  reviewItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  reviewItemTxt: { fontSize: Fonts.small + 1, fontWeight: '600', flexShrink: 1 },
  reviewItemPrice: { fontSize: Fonts.small + 1, fontWeight: '700' },
  reviewTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, paddingTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  reviewTotalLbl: { fontSize: Fonts.regular, fontWeight: '700' },
  reviewTotalVal: { fontSize: Fonts.title - 4, fontWeight: '900' },
});
