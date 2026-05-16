// src/screens/Register/index.tsx
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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const n = nombre.trim();
    const e = email.trim().toLowerCase();

    if (!n || !e || !password || !confirm) {
      Alert.alert('Faltan datos', 'Completa todos los campos obligatorios.');
      return;
    }
    if (n.length < 3) {
      Alert.alert('Nombre muy corto', 'Mínimo 3 caracteres.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      Alert.alert('Email inválido', 'Revisa el formato del correo.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña débil', 'Debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Las contraseñas no coinciden');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Términos', 'Debes aceptar los términos y condiciones.');
      return;
    }

    try {
      setLoading(true);
      await signUp({
        nombre: n,
        email: e,
        password,
        telefono: telefono.trim() || undefined,
      });
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo crear la cuenta');
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
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header con botón de volver */}
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={s.heroWrap}>
          <Text style={s.heroEmoji}>🎉</Text>
          <Text style={s.brand}>Crear cuenta</Text>
          <Text style={s.tagline}>Únete a la comunidad MercaLocal</Text>
        </View>

        <View style={s.card}>
          {/* Nombre */}
          <Text style={s.label}>Nombre completo *</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>👤</Text>
            <TextInput
              style={s.input}
              placeholder="Juan Pérez"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              value={nombre}
              onChangeText={setNombre}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <Text style={s.label}>Correo electrónico *</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>📧</Text>
            <TextInput
              style={s.input}
              placeholder="tu@email.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Teléfono opcional */}
          <Text style={s.label}>Teléfono (opcional)</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>📱</Text>
            <TextInput
              style={s.input}
              placeholder="+503 7000-0000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <Text style={s.label}>Contraseña * <Text style={s.hint}>(mín. 6)</Text></Text>
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

          {/* Confirmar */}
          <Text style={s.label}>Confirmar contraseña *</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🔐</Text>
            <TextInput
              style={s.input}
              placeholder="••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPass}
              value={confirm}
              onChangeText={setConfirm}
              editable={!loading}
            />
          </View>

          {/* Términos */}
          <TouchableOpacity
            style={s.terms}
            onPress={() => setAcceptTerms(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, acceptTerms && s.checkboxOn]}>
              {acceptTerms && <Text style={s.check}>✓</Text>}
            </View>
            <Text style={s.termsTxt}>
              Acepto los <Text style={s.termsLink}>términos y condiciones</Text> y la{' '}
              <Text style={s.termsLink}>política de privacidad</Text>
            </Text>
          </TouchableOpacity>

          {/* Botón */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnTxt}>Crear mi cuenta</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading}>
            <Text style={s.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}