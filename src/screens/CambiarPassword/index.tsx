// src/screens/CambiarPassword/index.tsx
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
import { api } from '../../services/api';
import { s } from './styles';

export default function CambiarPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [actual, setActual]   = useState('');
  const [nueva,  setNueva]    = useState('');
  const [conf,   setConf]     = useState('');

  const [showActual, setShowActual] = useState(false);
  const [showNueva,  setShowNueva]  = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  const [guardando, setGuardando] = useState(false);

  const valido =
    actual.length > 0 &&
    nueva.length >= 6 &&
    conf.length  >= 6 &&
    nueva === conf &&
    nueva !== actual;

  const guardar = async () => {
    if (!user) return;
    if (!actual)            return Alert.alert('Falta dato', 'Ingresa tu contraseña actual.');
    if (nueva.length < 6)   return Alert.alert('Contraseña corta', 'La nueva debe tener al menos 6 caracteres.');
    if (nueva !== conf)     return Alert.alert('No coinciden', 'La confirmación no coincide con la nueva contraseña.');
    if (nueva === actual)   return Alert.alert('Sin cambios', 'La nueva contraseña debe ser distinta de la actual.');

    try {
      setGuardando(true);
      const res = await api.cambiarPassword(user.id, actual, nueva);
      if (!res.ok) throw new Error(res.error || 'No se pudo cambiar la contraseña');

      Alert.alert(
        '✅ Listo',
        'Tu contraseña fue actualizada. La próxima vez que inicies sesión usa la nueva.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={s.headerBtn}>
          <Text style={s.headerBtnTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cambiar contraseña</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.iconWrap}>
          <Text style={s.bigIcon}>🔒</Text>
          <Text style={s.tagline}>
            Tu nueva contraseña debe tener al menos 6 caracteres.
          </Text>
        </View>

        <View style={s.card}>
          {/* Actual */}
          <Text style={s.label}>Contraseña actual</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🔑</Text>
            <TextInput
              style={s.input}
              value={actual}
              onChangeText={setActual}
              placeholder="••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showActual}
              editable={!guardando}
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowActual(v => !v)} hitSlop={10}>
              <Text style={s.eye}>{showActual ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Nueva */}
          <Text style={[s.label, { marginTop: 16 }]}>Nueva contraseña</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>✨</Text>
            <TextInput
              style={s.input}
              value={nueva}
              onChangeText={setNueva}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showNueva}
              editable={!guardando}
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowNueva(v => !v)} hitSlop={10}>
              <Text style={s.eye}>{showNueva ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirmar */}
          <Text style={[s.label, { marginTop: 16 }]}>Confirmar nueva contraseña</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>✅</Text>
            <TextInput
              style={s.input}
              value={conf}
              onChangeText={setConf}
              placeholder="Repítela"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConf}
              editable={!guardando}
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={guardar}
            />
            <TouchableOpacity onPress={() => setShowConf(v => !v)} hitSlop={10}>
              <Text style={s.eye}>{showConf ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Pista de match */}
          {nueva.length > 0 && conf.length > 0 && nueva !== conf && (
            <Text style={s.errorHint}>⚠️ Las contraseñas no coinciden.</Text>
          )}
          {nueva.length > 0 && nueva.length < 6 && (
            <Text style={s.errorHint}>⚠️ Demasiado corta (mínimo 6).</Text>
          )}
        </View>

        <TouchableOpacity
          style={[s.btn, (!valido || guardando) && s.btnDisabled]}
          onPress={guardar}
          disabled={!valido || guardando}
          activeOpacity={0.85}
        >
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Actualizar contraseña</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
