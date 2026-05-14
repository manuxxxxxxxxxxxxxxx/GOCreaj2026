import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRoute } from '../services/authService';
import Toast from '../components/Toast';
import { Colors, Radius, Shadow } from '../theme/colors';
import { isValidEmail, isStrongPassword } from '../utils/validators';
import type { UserRole } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type Tab = 'login' | 'register';
const ROLES: { key: UserRole; emoji: string; label: string }[] = [
  { key: 'buyer',  emoji: '🛒', label: 'Comprador' },
  { key: 'seller', emoji: '🏪', label: 'Vendedor' },
  { key: 'driver', emoji: '🛵', label: 'Repartidor' },
];

export default function LoginScreen({ navigation }: Props) {
  const { login, register } = useAuth();

  const [tab,       setTab]       = useState<Tab>('login');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState({ visible: false, message: '' });
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [terms,     setTerms]     = useState(false);
  const [role,      setRole]      = useState<UserRole>('buyer');

  const [loginEmail, setLoginEmail]   = useState('');
  const [loginPass,  setLoginPass]    = useState('');
  const [regName,    setRegName]      = useState('');
  const [regEmail,   setRegEmail]     = useState('');
  const [regPass,    setRegPass]      = useState('');

  function showToast(message: string) {
    setToast({ visible: true, message });
  }

  function validate(fields: Record<string, string | boolean>): boolean {
    const errs: Record<string, string> = {};
    if ('email' in fields && !isValidEmail(String(fields.email))) errs.email = 'Ingresa un correo válido.';
    if ('password' in fields && !String(fields.password)) errs.password = 'Ingresa tu contraseña.';
    if ('name' in fields && !String(fields.name).trim()) errs.name = 'Ingresa tu nombre.';
    if ('regPass' in fields && !isStrongPassword(String(fields.regPass))) errs.regPass = 'Mínimo 6 caracteres.';
    if ('terms' in fields && !fields.terms) errs.terms = 'Debes aceptar los Términos.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    if (!validate({ email: loginEmail, password: loginPass })) return;
    setLoading(true);
    const result = await login(loginEmail, loginPass);
    setLoading(false);
    if ('error' in result) {
      setErrors({ general: result.error });
      return;
    }
    showToast('¡Bienvenido de nuevo!');
    setTimeout(() => {
      const route = getDashboardRoute(result.user.role) as keyof RootStackParamList;
      navigation.replace(route as any);
    }, 700);
  }

  async function handleRegister() {
    if (!validate({ name: regName, email: regEmail, regPass: regPass, terms })) return;
    setLoading(true);
    const result = await register(regName, regEmail, regPass, role);
    setLoading(false);
    if ('error' in result) {
      setErrors({ general: result.error });
      return;
    }
    showToast(result.requiresVerification ? '¡Cuenta creada! Revisa tu correo.' : `¡Bienvenido, ${regName}!`);
    setTimeout(() => {
      if (!result.requiresVerification) {
        navigation.replace('Home');
      } else {
        setTab('login');
      }
    }, 1000);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🏪</Text>
            </View>
            <View>
              <Text style={styles.logoName}>LocalMarket</Text>
              <Text style={styles.logoTag}>Tu mercado del barrio</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'login' && styles.tabActive]}
              onPress={() => { setTab('login'); setErrors({}); }}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'register' && styles.tabActive]}
              onPress={() => { setTab('register'); setErrors({}); }}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Registrarse</Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          {tab === 'login' && (
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="correo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholderTextColor={Colors.textMuted}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Tu contraseña"
                  secureTextEntry
                  value={loginPass}
                  onChangeText={setLoginPass}
                  placeholderTextColor={Colors.textMuted}
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {errors.general && <Text style={[styles.errorText, styles.centerText]}>{errors.general}</Text>}

              <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Iniciar Sesión</Text>}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o continúa con</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.googleBtn} onPress={() => showToast('Google OAuth próximamente')}>
                <Text style={styles.googleBtnText}>G  Continuar con Google</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Tu nombre completo"
                  value={regName}
                  onChangeText={setRegName}
                  placeholderTextColor={Colors.textMuted}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="correo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholderTextColor={Colors.textMuted}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={[styles.input, errors.regPass && styles.inputError]}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  value={regPass}
                  onChangeText={setRegPass}
                  placeholderTextColor={Colors.textMuted}
                />
                {errors.regPass && <Text style={styles.errorText}>{errors.regPass}</Text>}
              </View>

              {/* Role Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tipo de cuenta</Text>
                <View style={styles.roleGrid}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                      onPress={() => setRole(r.key)}
                    >
                      <Text style={styles.roleEmoji}>{r.emoji}</Text>
                      <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Terms */}
              <TouchableOpacity style={styles.termsRow} onPress={() => setTerms(!terms)}>
                <View style={[styles.checkbox, terms && styles.checkboxChecked]}>
                  {terms && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  Acepto los{' '}
                  <Text style={styles.link}>Términos y Condiciones</Text>
                  {' '}y la{' '}
                  <Text style={styles.link}>Política de Privacidad</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

              {errors.general && <Text style={[styles.errorText, styles.centerText]}>{errors.general}</Text>}

              <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Crear cuenta</Text>}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o continúa con</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.googleBtn} onPress={() => showToast('Google OAuth próximamente')}>
                <Text style={styles.googleBtnText}>G  Registrarse con Google</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 28,
    ...Shadow.elevated,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji:   { fontSize: 22 },
  logoName:    { fontSize: 17, fontWeight: '700', color: Colors.blue },
  logoTag:     { fontSize: 12, color: Colors.textMuted },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabActive:      { backgroundColor: Colors.white, ...Shadow.card },
  tabText:        { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive:  { color: Colors.blue },
  form:       { gap: 0 },
  fieldGroup: { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.inputBg,
  },
  inputError:  { borderColor: Colors.red },
  errorText:   { fontSize: 11, color: Colors.red, marginTop: 4 },
  centerText:  { textAlign: 'center', marginBottom: 4 },
  btn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted },
  googleBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  googleBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  roleCardActive: {
    borderColor: Colors.blue,
    backgroundColor: '#eef2ff',
  },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  roleLabelActive: { color: Colors.blue },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  checkMark:  { color: Colors.white, fontSize: 12, fontWeight: '700' },
  termsText:  { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  link:       { color: Colors.blue, fontWeight: '600' },
});
