// src/screens/Login/index.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { s } from './styles';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      Alert.alert('Faltan datos', 'Ingresa email y contraseña.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      Alert.alert('Email inválido', 'Revisa el formato del correo.');
      return;
    }
    try {
      setLoading(true);
      await signIn(e, password);
      // El _layout principal nos redirige automáticamente al ver que hay user
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / branding */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Text style={s.logoEmoji}>🛒</Text>
          </View>
          <Text style={s.brand}>MercaLocal</Text>
          <Text style={s.tagline}>Tu mercado local en un toque</Text>
        </View>

        {/* Formulario */}
        <View style={s.card}>
          <Text style={s.title}>Bienvenido de vuelta 👋</Text>
          <Text style={s.subtitle}>Inicia sesión para continuar</Text>

          {/* Email */}
          <Text style={s.label}>Correo electrónico</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>📧</Text>
            <TextInput
              style={s.input}
              placeholder="tu@email.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <Text style={s.label}>Contraseña</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🔒</Text>
            <TextInput
              style={s.input}
              placeholder="••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} hitSlop={10}>
              <Text style={s.eye}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.forgot}>
            <Text style={s.forgotTxt}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón principal */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnTxt}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Demo hint */}
          <View style={s.demoBox}>
            <Text style={s.demoTitle}>💡 Cuenta de prueba</Text>
            <Text style={s.demoLine}>📧 carlos@mercalocal.sv</Text>
            <Text style={s.demoLine}>🔑 123456</Text>
          </View>
        </View>

        {/* Separador */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerTxt}>o</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Ir a registro */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
            <Text style={s.footerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}