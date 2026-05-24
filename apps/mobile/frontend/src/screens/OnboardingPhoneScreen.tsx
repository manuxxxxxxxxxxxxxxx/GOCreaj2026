import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, KeyboardAvoidingView, Platform,
  Keyboard, TouchableWithoutFeedback, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import Input from '@/components/Input';

type Paso = 'enviar' | 'verificar';

export default function OnboardingPhoneScreen() {
  const { colors } = useTheme();
  const { t } = useLang();
  const { usuario, refrescar } = useAuth();
  const insets = useSafeAreaInsets();

  const [paso, setPaso]             = useState<Paso>('enviar');
  const [codigo, setCodigo]         = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState('');
  const [cargando, setCargando]     = useState(false);

  const iconAnim = useRef(new Animated.Value(0)).current;
  const fadeIn   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconAnim, { toValue: -6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(iconAnim, { toValue: 0,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [fadeIn, iconAnim]);

  const telefono = usuario?.telefono ?? '';

  async function enviarCodigo() {
    setCargando(true);
    try {
      const r = await api<{ ok: boolean; codigo?: string; telefono?: string }>(
        Endpoints.authEnviarSms,
        { body: {} }
      );
      if (r.ok && r.codigo) {
        setCodigoEnviado(r.codigo);
        setPaso('verificar');
      } else {
        Alert.alert(t.common.error, 'No se pudo enviar el código');
      }
    } catch {
      Alert.alert(t.common.error, t.auth.sinConexion);
    }
    setCargando(false);
  }

  async function verificar() {
    if (codigo.length < 4) return;
    setCargando(true);
    try {
      const r = await api<{ ok: boolean; usuario?: object }>(
        Endpoints.authVerificarSms,
        { body: { codigo } }
      );
      if (r.ok) {
        await refrescar();
        // AppNavigator detecta telefono_verificado=1 y muestra UsernameSetup
      } else {
        Alert.alert(t.common.error, 'Código incorrecto');
      }
    } catch {
      Alert.alert(t.common.error, t.auth.sinConexion);
    }
    setCargando(false);
  }

  async function saltar() {
    setCargando(true);
    try {
      await api(Endpoints.authVerificarSms, { body: { skip: true } });
      await refrescar();
    } catch {
      // Si falla la red, igual avanzamos (evitamos bloqueo)
      await refrescar();
    }
    setCargando(false);
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Animated.View
          style={[s.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, opacity: fadeIn }]}
        >
          {/* Icono */}
          <Animated.View style={[s.iconWrap, { backgroundColor: colors.accent, transform: [{ translateY: iconAnim }] }]}>
            <Ionicons name="call-outline" size={42} color="#FFF" />
          </Animated.View>

          <Text style={[s.titulo, { color: colors.text }]}>
            {paso === 'enviar' ? 'Verifica tu teléfono' : 'Ingresa el código'}
          </Text>
          <Text style={[s.sub, { color: colors.muted }]}>
            {paso === 'enviar'
              ? `Enviaremos un código SMS a ${telefono || 'tu número'} para confirmar tu cuenta.`
              : `Ingresa el código de 6 dígitos enviado a ${telefono}.`}
          </Text>

          {/* Card */}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {paso === 'enviar' ? (
              <>
                <View style={[s.flagRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[s.flag, { color: colors.text }]}>El Salvador  +503</Text>
                  <Text style={[s.tel, { color: colors.accent }]}>{telefono || '—'}</Text>
                </View>
                <Text style={[s.nota, { color: colors.muted }]}>
                  Recibirás un SMS con tu código de verificación.
                </Text>
              </>
            ) : (
              <>
                <Input
                  label="Código SMS"
                  icon="keypad-outline"
                  value={codigo}
                  onChangeText={setCodigo}
                  keyboardType="number-pad"
                  valid={codigo.length === 6 || undefined}
                  placeholder="000000"
                />
                {codigoEnviado !== '' && (
                  <View style={[s.hintRow, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}30` }]}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.accent} />
                    <Text style={[s.hintTxt, { color: colors.accent }]}>
                      Código de prueba: {codigoEnviado}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Botón principal */}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.accent }]}
            onPress={paso === 'enviar' ? enviarCodigo : verificar}
            disabled={cargando || (paso === 'verificar' && codigo.length < 4)}
            activeOpacity={0.85}
          >
            {cargando
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Text style={s.btnTxt}>
                    {paso === 'enviar' ? 'Enviar código' : 'Verificar'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </>
            }
          </TouchableOpacity>

          {/* Saltar */}
          <TouchableOpacity style={s.skip} onPress={saltar} activeOpacity={0.7} disabled={cargando}>
            <Text style={[s.skipTxt, { color: colors.muted }]}>{t.phone.omitir}</Text>
          </TouchableOpacity>

          {/* Dots de progreso: paso 1 de 2 */}
          <View style={s.dots}>
            {[0, 1].map(i => (
              <View key={i} style={[s.dot, {
                backgroundColor: i === 0 ? colors.accent : colors.border,
                width: i === 0 ? 24 : 8,
              }]} />
            ))}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg },
  iconWrap: {
    width: 88, height: 88, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#4A6D8C', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  titulo: { fontSize: Fonts.heading - 4, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, marginBottom: Spacing.sm },
  sub: { fontSize: Fonts.regular, textAlign: 'center', fontWeight: '500', lineHeight: 22, marginBottom: Spacing.xl, paddingHorizontal: Spacing.sm },
  card: {
    width: '100%', borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1.5, marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  flagRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderWidth: 1.5, marginBottom: Spacing.md,
  },
  flag: { fontWeight: '700', fontSize: Fonts.regular },
  tel: { fontWeight: '800', fontSize: Fonts.regular },
  nota: { fontSize: Fonts.small, textAlign: 'center', lineHeight: 18, fontWeight: '500' },
  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.sm, borderWidth: 1,
    paddingHorizontal: Spacing.sm, paddingVertical: 8, marginTop: Spacing.sm,
  },
  hintTxt: { fontSize: Fonts.small, fontWeight: '700' },
  btn: {
    width: '100%', height: 56, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#4A6D8C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  btnTxt: { fontSize: Fonts.regular + 1, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  skip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  skipTxt: { fontSize: Fonts.small + 1, fontWeight: '600', textDecorationLine: 'underline' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: Spacing.xl },
  dot: { height: 8, borderRadius: 4 },
});
