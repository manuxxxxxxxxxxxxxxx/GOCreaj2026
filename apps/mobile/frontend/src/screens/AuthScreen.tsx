/**
 * AuthScreen.tsx — CON GOOGLE REAL + APPLE REAL
 *
 * Cambios vs versión anterior:
 *  • onSocial() reemplazado por loginConGoogle() y loginConApple()
 *  • Google usa expo-auth-session/providers/google (OAuth2 real)
 *  • Apple usa expo-apple-authentication (solo iOS)
 *  • Todo lo demás (UI, animaciones, forms) intacto
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { api, Endpoints } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Usuario } from '@/types';

// ── OAuth ─────────────────────────────────────────────────────────────────────
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Apple Sign In solo en iOS
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (_) {
    // No instalado — el botón de Apple no aparecerá
  }
}

// Necesario para que la sesión OAuth se cierre correctamente en Expo Go
WebBrowser.maybeCompleteAuthSession();
// ─────────────────────────────────────────────────────────────────────────────

type Modo = 'login' | 'registro';
interface AuthResp { ok: boolean; usuario?: Usuario; token?: string; error?: string }

// ── IDs de Google — ponlos en tu .env ────────────────────────────────────────
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      → Web client ID (requerido para el token)
// EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      → iOS client ID
// EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  → Android client ID
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { iniciar } = useAuth();
  const { cambiarIdioma, langLabel, t } = useLang();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [modo, setModo] = useState<Modo>('login');
  const [cargando, setCargando] = useState(false);
  const [identificador, setIdentificador] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [passwordRegistro, setPasswordRegistro] = useState('');

  const logoFloat = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formSlide  = useRef(new Animated.Value(20)).current;

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const [_request, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) fetchGoogleUser(token);
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google', 'No se pudo completar el inicio de sesión con Google.');
    }
  }, [googleResponse]);

  const fetchGoogleUser = async (accessToken: string) => {
    setCargando(true);
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const perfil = await res.json() as {
        id: string; name: string; email: string;
      };
      if (!perfil.id) throw new Error('Google no devolvió usuario');

      const r = await api<AuthResp>(Endpoints.authSocial, {
        body: {
          provider: 'google',
          provider_uid: perfil.id,
          nombre: perfil.name,
          email: perfil.email,
        },
      });
      if (r?.ok && r.usuario && r.token) {
        await iniciar(r.usuario, r.token);
      } else {
        Alert.alert(t.common.error, r?.error ?? t.common.falloRed);
      }
    } catch (err) {
      Alert.alert(t.common.error, 'Error al obtener datos de Google. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  // ── Apple Sign In (solo iOS) ────────────────────────────────────────────────
  const loginConApple = async () => {
    if (!AppleAuthentication) {
      Alert.alert('Apple', 'Apple Sign In no está disponible en este dispositivo.');
      return;
    }
    setCargando(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const nombreApple =
        credential.fullName?.givenName || credential.fullName?.familyName
          ? `${credential.fullName?.givenName ?? ''} ${credential.fullName?.familyName ?? ''}`.trim()
          : 'Usuario Apple';

      // Apple solo devuelve el email la primera vez; las siguientes es null
      const emailApple =
        credential.email ?? `apple_${credential.user}@privaterelay.appleid.com`;

      const r = await api<AuthResp>(Endpoints.authSocial, {
        body: {
          provider: 'apple',
          provider_uid: credential.user,   // ID estable de Apple
          nombre: nombreApple,
          email: emailApple,
        },
      });
      if (r?.ok && r.usuario && r.token) {
        await iniciar(r.usuario, r.token);
      } else {
        Alert.alert(t.common.error, r?.error ?? t.common.falloRed);
      }
    } catch (err: unknown) {
      // ERR_REQUEST_CANCELED = usuario canceló manualmente, no es error real
      if ((err as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t.common.error, 'No se pudo completar el inicio de sesión con Apple.');
      }
    } finally {
      setCargando(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  // ── Animaciones ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0,  duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [logoFloat]);

  useEffect(() => {
    formOpacity.setValue(0);
    formSlide.setValue(20);
    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(formSlide,  { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [modo, formOpacity, formSlide]);
  // ───────────────────────────────────────────────────────────────────────────

  const onLogin = async () => {
    if (!identificador || !passwordLogin) return Alert.alert(t.auth.datosRequeridos, t.auth.ingresaCredenciales);
    setCargando(true);
    try {
      const r = await api<AuthResp>(Endpoints.authLogin, { body: { identificador, password: passwordLogin } });
      if (r?.ok && r.usuario && r.token) await iniciar(r.usuario, r.token);
      else Alert.alert(t.common.error, r?.error ?? t.auth.ingresaCredenciales);
    } catch {
      Alert.alert(t.common.error, t.auth.sinConexion);
    } finally { setCargando(false); }
  };

  const onRegistro = async () => {
    if (!nombre || !passwordRegistro || (!email && !telefono))
      return Alert.alert(t.auth.datosRequeridos, t.auth.completaCampos);
    setCargando(true);
    try {
      const municipio = await AsyncStorage.getItem('svgo_municipio');
      const r = await api<AuthResp>(Endpoints.authRegister, { body: { nombre, email, telefono, password: passwordRegistro, municipio } });
      if (r.ok && r.usuario && r.token) await iniciar(r.usuario, r.token);
      else Alert.alert(t.common.error, r.error ?? t.auth.completaCampos);
    } catch {
      Alert.alert(t.common.error, t.auth.sinConexion);
    } finally { setCargando(false); }
  };

  // Verifica que los Client IDs estén configurados antes de abrir Google
  const loginConGoogle = () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Configuración', 'Agrega EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en tu .env');
      return;
    }
    promptGoogleAsync();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.topBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={cambiarIdioma}
          >
            <Ionicons name="globe-outline" size={16} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.topBtnTxt, { color: colors.accent }]}>{langLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Logo animado */}
        <Animated.View style={[styles.brand, { transform: [{ translateY: logoFloat }] }]}>
          <View style={[styles.logoRing, { borderColor: colors.accentLight }]}>
            <View style={[styles.logo, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
              <Text style={styles.logoText}>SV</Text>
            </View>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>[SV]Go</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>{t.auth.tagline}</Text>
        </Animated.View>

        {/* Tabs login / registro */}
        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['login', 'registro'] as Modo[]).map(m => {
            const active = modo === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.tab, active && [styles.tabActive, { backgroundColor: colors.accent }]]}
                onPress={() => setModo(m)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={m === 'login' ? 'log-in-outline' : 'person-add-outline'}
                  size={15}
                  color={active ? '#FFF' : colors.muted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabTxt, { color: active ? '#FFF' : colors.muted }]}>
                  {m === 'login' ? t.auth.iniciar : t.auth.registro}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Formulario animado */}
        <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>

          {modo === 'login' && (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>{t.auth.bienvenido}</Text>
              <Text style={[styles.formSub, { color: colors.muted }]}>{t.auth.subtLogin}</Text>
              <Input
                label={t.auth.usuarioEmailTelefono}
                icon="person-circle-outline"
                value={identificador}
                onChangeText={setIdentificador}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label={t.auth.contrasena}
                icon="lock-closed-outline"
                value={passwordLogin}
                onChangeText={setPasswordLogin}
                secureTextEntry
              />
              <Button label={t.auth.iniciarSesion} icon="log-in-outline" onPress={onLogin} loading={cargando} />
            </View>
          )}

          {modo === 'registro' && (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>{t.auth.unete}</Text>
              <Text style={[styles.formSub, { color: colors.muted }]}>{t.auth.subtRegister}</Text>

              <Input
                label={t.auth.nombreCompleto}
                icon="person-outline"
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tu nombre real"
              />

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t.auth.email}
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="correo@email.com"
                  />
                </View>
                <View style={{ width: Spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label={t.auth.telefonoLabel}
                    icon="call-outline"
                    value={telefono}
                    onChangeText={setTelefono}
                    inputType="phone"
                  />
                </View>
              </View>

              <Input
                label={t.auth.contrasena}
                icon="lock-closed-outline"
                value={passwordRegistro}
                onChangeText={setPasswordRegistro}
                secureTextEntry
                placeholder="Mínimo 6 caracteres"
              />

              <Button label={t.auth.crearCuenta} icon="person-add-outline" onPress={onRegistro} loading={cargando} />

              <Text style={[styles.terms, { color: colors.muted }]}>{t.auth.terminos}</Text>
            </View>
          )}
        </Animated.View>

        {/* Divisor */}
        <View style={styles.divRow}>
          <View style={[styles.divLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.divTxt, { color: colors.muted }]}>{t.auth.oContinuaCon}</Text>
          <View style={[styles.divLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Botones sociales ── */}
        <View style={styles.socialRow}>
          {/* GOOGLE */}
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={loginConGoogle}
            activeOpacity={0.85}
            disabled={cargando}
          >
            <Ionicons name="logo-google" size={22} color="#EA4335" />
            <Text style={[styles.socialTxt, { color: colors.text }]}>{t.auth.continuarGoogle}</Text>
          </TouchableOpacity>

          {/* APPLE — solo se muestra en iOS */}
          {Platform.OS === 'ios' && AppleAuthentication?.isAvailableAsync && (
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={loginConApple}
              activeOpacity={0.85}
              disabled={cargando}
            >
              <Ionicons name="logo-apple" size={22} color={colors.text} />
              <Text style={[styles.socialTxt, { color: colors.text }]}>{t.auth.continuarApple}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  topBtnTxt: { fontSize: Fonts.small, fontWeight: '800', letterSpacing: 0.5 },
  brand: { alignItems: 'center', marginBottom: Spacing.xl },
  logoRing: {
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center',
  },
  logo: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)',
  },
  logoText: { color: '#FFF', fontWeight: '900', fontSize: 28, letterSpacing: 2 },
  appName: { fontSize: 36, fontWeight: '900', marginTop: Spacing.md, letterSpacing: -1 },
  tagline: { fontSize: Fonts.small, marginTop: 4, fontWeight: '600', letterSpacing: 0.3 },
  tabs: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 5,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  tabActive: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  tabTxt: { fontWeight: '800', fontSize: Fonts.small },
  formCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  formTitle: { fontSize: Fonts.title, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  formSub: { fontSize: Fonts.small + 1, fontWeight: '500', marginBottom: Spacing.lg, lineHeight: 20 },
  row2: { flexDirection: 'row' },
  terms: {
    fontSize: Fonts.small - 1,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 17,
  },
  divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  divLine: { flex: 1, height: 1.5 },
  divTxt: { marginHorizontal: Spacing.md, fontSize: Fonts.small, fontWeight: '700' },
  socialRow: { flexDirection: 'row', gap: Spacing.md },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  socialTxt: { fontWeight: '700', fontSize: Fonts.regular },
});
