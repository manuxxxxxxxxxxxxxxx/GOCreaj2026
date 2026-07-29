import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { RootStackParamList } from '@/types';
import Input from '@/components/Input';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Status = 'idle' | 'checking' | 'ok' | 'taken';

export default function UsernameSetupScreen() {
  const { colors } = useTheme();
  const { t } = useLang();
  const { usuario, refrescar } = useAuth();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [status, setStatus]     = useState<Status>('idle');
  const [guardando, setGuardando] = useState(false);
  const [foto, setFoto]         = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function pickFoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true, quality: 0.6, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0].base64) {
      setFoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  const c = colors;

  function onChangeUsername(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setUsername(clean);
    setStatus('idle');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length < 3) return;

    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api<{ ok: boolean; disponible?: boolean }>(
          Endpoints.authCheckUsername,
          { body: { username: clean, exclude_id: usuario?.id } }
        );
        setStatus(r.disponible ? 'ok' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 500);
  }

  async function confirmar() {
    if (status !== 'ok') return;
    setGuardando(true);
    try {
      const body: Record<string, unknown> = { username };
      if (foto) body.foto_perfil = foto;
      const r = await api<{ ok: boolean; error?: string }>(
        Endpoints.authActualizarPerfil,
        { body }
      );
      if (r.ok) {
        await refrescar();
        const rol = usuario?.rol;
        if (rol === 'admin')      nav.replace('Admin');
        else if (rol === 'vendedor')   nav.replace('Seller');
        else if (rol === 'repartidor') nav.replace('Driver');
        else nav.replace('Main');
      } else {
        Alert.alert(t.common.error, r.error === 'username_taken' ? t.auth.usernameOcupado : (r.error ?? t.common.error));
      }
    } catch {
      Alert.alert(t.common.error, t.auth.sinConexion);
    }
    setGuardando(false);
  }

  const canConfirm = status === 'ok' && !guardando;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>

        {/* Icono */}
        <View style={[styles.iconRing, { borderColor: c.accentLight }]}>
          <View style={[styles.iconInner, { backgroundColor: c.accent }]}>
            <Text style={styles.atSign}>@</Text>
          </View>
        </View>

        <Text style={[styles.titulo, { color: c.text }]}>{t.usernameSetup.titulo}</Text>
        <Text style={[styles.subtitulo, { color: c.muted }]}>{t.usernameSetup.subtitulo}</Text>

        {/* Foto de perfil */}
        <TouchableOpacity style={styles.photoWrap} onPress={pickFoto} activeOpacity={0.8}>
          <View style={[styles.photoCircle, { backgroundColor: c.accent }]}>
            {foto
              ? <Image source={{ uri: foto }} style={{ width: '100%', height: '100%', borderRadius: 44 }} />
              : <Ionicons name="camera-outline" size={30} color="#FFF" />}
          </View>
          <Text style={[styles.photoLbl, { color: c.accent }]}>{t.profile.foto}</Text>
        </TouchableOpacity>

        {/* Input */}
        <View style={styles.inputWrap}>
          <Input
            label={t.auth.username}
            icon="at-outline"
            value={username}
            onChangeText={onChangeUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t.usernameSetup.placeholder}
            valid={status === 'ok' ? true : undefined}
            error={status === 'taken' ? t.auth.usernameOcupado : undefined}
          />

          {/* Indicador de estado */}
          {status === 'checking' && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={c.muted} />
              <Text style={[styles.statusTxt, { color: c.muted }]}>Verificando...</Text>
            </View>
          )}
          {status === 'ok' && (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={16} color={c.success} />
              <Text style={[styles.statusTxt, { color: c.success }]}>{t.auth.usernameDisponible}</Text>
            </View>
          )}
          {status === 'taken' && (
            <View style={styles.statusRow}>
              <Ionicons name="close-circle" size={16} color={c.danger} />
              <Text style={[styles.statusTxt, { color: c.danger }]}>{t.auth.usernameOcupado}</Text>
            </View>
          )}
          {status === 'idle' && username.length > 0 && username.length < 3 && (
            <View style={styles.statusRow}>
              <Ionicons name="information-circle-outline" size={16} color={c.muted} />
              <Text style={[styles.statusTxt, { color: c.muted }]}>{t.usernameSetup.minCaracteres}</Text>
            </View>
          )}
        </View>

        {/* Reglas */}
        <View style={[styles.rulesBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.ruleRow}>
            <Ionicons name="checkmark-outline" size={14} color={c.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.ruleTxt, { color: c.muted }]}>{t.usernameSetup.soloLetras}</Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons name="checkmark-outline" size={14} color={c.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.ruleTxt, { color: c.muted }]}>{t.usernameSetup.minCaracteres}, máx. 30</Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons name="time-outline" size={14} color={c.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.ruleTxt, { color: c.muted }]}>Cambio disponible cada 14 días</Text>
          </View>
        </View>

        {/* Botón confirmar */}
        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: canConfirm ? c.accent : c.border },
          ]}
          onPress={confirmar}
          disabled={!canConfirm}
          activeOpacity={0.85}
        >
          {guardando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={[styles.btnTxt, { color: canConfirm ? '#FFF' : c.muted }]}>
                {t.usernameSetup.confirmar}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={canConfirm ? '#FFF' : c.muted}
                style={{ marginLeft: 8 }}
              />
            </>
          )}
        </TouchableOpacity>

      </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2.5, justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconInner: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4A6D8C', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  atSign: { color: '#FFF', fontSize: 42, fontWeight: '900' },
  titulo: { fontSize: Fonts.heading - 2, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 },
  subtitulo: {
    fontSize: Fonts.regular, fontWeight: '500', textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  photoWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  photoCircle: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  photoLbl: { fontSize: Fonts.small, fontWeight: '700' },
  inputWrap: { width: '100%', marginBottom: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: -Spacing.sm, marginBottom: Spacing.sm, gap: 6 },
  statusTxt: { fontSize: Fonts.small, fontWeight: '600' },
  rulesBox: {
    width: '100%', borderRadius: Radius.md, borderWidth: 1.5,
    padding: Spacing.md, marginBottom: Spacing.xl,
    gap: 8,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center' },
  ruleTxt: { fontSize: Fonts.small, fontWeight: '500' },
  btn: {
    width: '100%', height: 56, borderRadius: Radius.pill,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
  },
  btnTxt: { fontSize: Fonts.regular + 1, fontWeight: '800', letterSpacing: 0.2 },
});
