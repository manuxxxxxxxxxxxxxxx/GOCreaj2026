// src/screens/EditarPerfil/index.tsx
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { api, CambiosPerfil } from '../../services/api';
import { s } from './styles';

const AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

// ---------- VALIDACIÓN DE EMAIL ----------
// Estructura: usuario válido @ dominio.tld con TLD de 2+ letras
const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

// Typos comunes en dominios populares (lo que el usuario escribió → lo correcto)
const TYPOS_DOMINIO: Record<string, string> = {
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.cmo': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlok.com': 'outlook.com',
  'icloud.co': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icould.com': 'icloud.com',
  'live.co': 'live.com',
  'live.con': 'live.com',
};

function validarEmail(emailRaw: string):
  | { ok: true }
  | { ok: false; mensaje: string; sugerencia?: string } {
  const e = emailRaw.trim().toLowerCase();
  if (!e) return { ok: false, mensaje: 'El correo no puede estar vacío' };
  if (e.includes(' ')) return { ok: false, mensaje: 'El correo no puede contener espacios' };
  if ((e.match(/@/g) || []).length !== 1) return { ok: false, mensaje: 'El correo debe tener un solo @' };
  if (!EMAIL_REGEX.test(e)) {
    return { ok: false, mensaje: 'Formato inválido. Ejemplo: tu@dominio.com' };
  }

  const dominio = e.split('@')[1];
  if (TYPOS_DOMINIO[dominio]) {
    return {
      ok: false,
      mensaje: `Parece un error. ¿Quisiste decir "${TYPOS_DOMINIO[dominio]}"?`,
      sugerencia: e.replace(dominio, TYPOS_DOMINIO[dominio]),
    };
  }

  // TLD muy corto o sospechoso
  const tld = dominio.split('.').pop() || '';
  if (tld.length < 2) return { ok: false, mensaje: 'El dominio parece incompleto' };

  return { ok: true };
}

const isTelefono = (t: string) => /^[\d\s\+\-\(\)]{4,20}$/.test(t);

// ---------- ESTADO DEL AVATAR PENDIENTE ----------
type AvatarPendiente =
  | { tipo: 'sin_cambio' }
  | { tipo: 'nuevo'; asset: ImagePicker.ImagePickerAsset }
  | { tipo: 'quitar' };

export default function EditarPerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Valores originales (referencia para detectar cambios)
  const orig = useMemo(() => ({
    nombre:   user?.nombre   ?? '',
    email:    user?.email    ?? '',
    telefono: user?.telefono ?? '',
    avatar:   user?.avatar   ?? null,
  }), [user]);

  const [nombre,   setNombre]   = useState(orig.nombre);
  const [email,    setEmail]    = useState(orig.email);
  const [telefono, setTelefono] = useState(orig.telefono ?? '');
  const [avatarPend, setAvatarPend] = useState<AvatarPendiente>({ tipo: 'sin_cambio' });

  const [guardando, setGuardando] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);

  // ¿Qué uri mostrar en el preview del avatar?
  const avatarPreviewUri =
    avatarPend.tipo === 'nuevo'   ? avatarPend.asset.uri
    : avatarPend.tipo === 'quitar' ? null
    : orig.avatar;

  // ¿Hay algún cambio? (texto o foto)
  const hayCambios =
    nombre.trim()                          !== orig.nombre.trim() ||
    email.trim().toLowerCase()             !== orig.email.trim().toLowerCase() ||
    telefono.trim()                        !== (orig.telefono ?? '').trim() ||
    avatarPend.tipo                        !== 'sin_cambio';

  // ---------- FOTO: elegir / tomar / quitar (solo marca pendiente) ----------

  const elegirDeGaleria = async () => {
    setModalFoto(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para que puedas elegir una imagen.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      setAvatarPend({ tipo: 'nuevo', asset: res.assets[0] });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo abrir la galería');
    }
  };

  const tomarFoto = async () => {
    setModalFoto(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para tomar la foto.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      setAvatarPend({ tipo: 'nuevo', asset: res.assets[0] });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo abrir la cámara');
    }
  };

  const marcarParaQuitar = () => {
    setModalFoto(false);
    if (!orig.avatar && avatarPend.tipo !== 'nuevo') {
      Alert.alert('Sin foto', 'Aún no tienes foto de perfil.');
      return;
    }
    // Si era una foto nueva pendiente, basta con descartarla.
    // Si ya tenía foto guardada, marcamos "quitar".
    if (avatarPend.tipo === 'nuevo' && !orig.avatar) {
      setAvatarPend({ tipo: 'sin_cambio' });
    } else {
      setAvatarPend({ tipo: 'quitar' });
    }
  };

  // ---------- GUARDAR TODO ----------

  const guardar = async () => {
    if (!user) return;

    // Validar campos de texto
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim().toLowerCase();
    const telLimpio = telefono.trim();

    const cambios: CambiosPerfil = {};

    if (nombreLimpio !== orig.nombre.trim()) {
      if (nombreLimpio.length < 2)   return Alert.alert('Nombre muy corto', 'Usa al menos 2 caracteres.');
      if (nombreLimpio.length > 120) return Alert.alert('Nombre muy largo', 'Máximo 120 caracteres.');
      cambios.nombre = nombreLimpio;
    }

    if (emailLimpio !== orig.email.trim().toLowerCase()) {
      const v = validarEmail(emailLimpio);
      if (!v.ok) {
        if (v.sugerencia) {
          Alert.alert(
            'Correo con posible error',
            v.mensaje,
            [
              { text: 'Corregir', style: 'cancel' },
              { text: 'Usar sugerencia', onPress: () => setEmail(v.sugerencia!) },
            ]
          );
        } else {
          Alert.alert('Email inválido', v.mensaje);
        }
        return;
      }
      cambios.email = emailLimpio;
    }

    if (telLimpio !== (orig.telefono ?? '').trim()) {
      if (telLimpio === '') cambios.telefono = '';
      else {
        if (!isTelefono(telLimpio)) {
          return Alert.alert('Teléfono inválido', 'Usa dígitos, espacios, +, -, ( ). Entre 4 y 20 caracteres.');
        }
        cambios.telefono = telLimpio;
      }
    }

    try {
      setGuardando(true);

      // 1) Subir foto / eliminar foto si hubo cambio
      let nuevoAvatarUrl: string | null | undefined = undefined; // undefined = sin tocar
      if (avatarPend.tipo === 'nuevo') {
        const resAv = await api.subirAvatar(user.id, {
          uri: avatarPend.asset.uri,
          mimeType: avatarPend.asset.mimeType,
          fileName: avatarPend.asset.fileName,
        });
        if (!resAv.ok || !resAv.usuario) throw new Error(resAv.error || 'No se pudo subir la foto');
        nuevoAvatarUrl = resAv.usuario.avatar ?? null;
      } else if (avatarPend.tipo === 'quitar') {
        const resAv = await api.eliminarAvatar(user.id);
        if (!resAv.ok) throw new Error(resAv.error || 'No se pudo eliminar la foto');
        nuevoAvatarUrl = null;
      }

      // 2) Actualizar campos de texto si hubo cambios
      let usuarioActualizado = null;
      if (Object.keys(cambios).length > 0) {
        const res = await api.actualizarPerfil(user.id, cambios);
        if (!res.ok || !res.usuario) throw new Error(res.error || 'No se pudo actualizar');
        usuarioActualizado = res.usuario;
      }

      // 3) Reflejar todos los cambios en el AuthContext
      const updates: any = {};
      if (usuarioActualizado) {
        updates.nombre   = usuarioActualizado.nombre;
        updates.email    = usuarioActualizado.email;
        updates.telefono = usuarioActualizado.telefono ?? null;
      }
      if (nuevoAvatarUrl !== undefined) updates.avatar = nuevoAvatarUrl;
      if (Object.keys(updates).length > 0) await updateUser(updates);

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  // Confirmar salida si hay cambios sin guardar
  const intentarCerrar = () => {
    if (!hayCambios) { router.back(); return; }
    Alert.alert(
      '¿Descartar cambios?',
      'Tienes cambios sin guardar. ¿Quieres salir sin guardar?',
      [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  // ¿Tenemos foto para mostrar el "Quitar"? (la actual o una nueva pendiente)
  const hayFotoParaQuitar = avatarPend.tipo === 'nuevo' || (!!orig.avatar && avatarPend.tipo !== 'quitar');

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={intentarCerrar} hitSlop={10} style={s.headerBtn}>
          <Text style={s.headerBtnTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar perfil</Text>
        <TouchableOpacity
          onPress={guardar}
          disabled={!hayCambios || guardando}
          hitSlop={10}
          style={s.headerBtnRight}
        >
          {guardando ? (
            <ActivityIndicator color="#059669" />
          ) : (
            <Text style={[s.saveTxt, !hayCambios && s.saveTxtDisabled]}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={s.avatarWrap}>
          <Pressable
            onPress={() => setModalFoto(true)}
            disabled={guardando}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <Image
              source={{ uri: avatarPreviewUri || AVATAR_PLACEHOLDER }}
              style={s.avatar}
            />
            <View style={s.avatarEditBadge}><Text style={s.avatarEditBadgeTxt}>📷</Text></View>
          </Pressable>

          <Pressable
            onPress={() => setModalFoto(true)}
            disabled={guardando}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={s.cambiarFotoLink}>Cambiar foto de perfil</Text>
          </Pressable>

          {avatarPend.tipo !== 'sin_cambio' && (
            <Text style={s.pendingHint}>
              {avatarPend.tipo === 'nuevo'
                ? '⏳ Foto nueva pendiente · toca "Guardar" para aplicar'
                : '⏳ La foto se eliminará al guardar'}
            </Text>
          )}
        </View>

        {/* Datos personales */}
        <View style={s.card}>
          <Text style={s.label}>Nombre</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>👤</Text>
            <TextInput
              style={s.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre completo"
              placeholderTextColor="#9ca3af"
              maxLength={120}
              editable={!guardando}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Correo electrónico</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>📧</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              editable={!guardando}
              returnKeyType="next"
            />
          </View>
          <Text style={s.hint}>Lo usarás para iniciar sesión.</Text>

          <Text style={[s.label, { marginTop: 16 }]}>Teléfono</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>📱</Text>
            <TextInput
              style={s.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="+503 7000-0000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={20}
              editable={!guardando}
              returnKeyType="done"
              onSubmitEditing={guardar}
            />
          </View>
          <Text style={s.hint}>Déjalo vacío para borrarlo.</Text>
        </View>

        {/* Seguridad */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Seguridad</Text>
          <Pressable
            onPress={() => router.push('/cambiar-password')}
            disabled={guardando}
            style={({ pressed }) => [s.linkRow, pressed && s.linkRowPressed]}
          >
            <Text style={s.linkIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.linkLabel}>Cambiar contraseña</Text>
              <Text style={s.linkSub}>Actualiza tu contraseña actual por una nueva</Text>
            </View>
            <Text style={s.linkChevron}>›</Text>
          </Pressable>
        </View>

        {/* Botón guardar grande */}
        <Pressable
          onPress={guardar}
          disabled={!hayCambios || guardando}
          style={({ pressed }) => [
            s.btn,
            (!hayCambios || guardando) && s.btnDisabled,
            pressed && hayCambios && !guardando && s.btnPressed,
          ]}
        >
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Guardar cambios</Text>}
        </Pressable>
      </ScrollView>

      {/* ----- MODAL personalizado para foto ----- */}
      <Modal
        visible={modalFoto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalFoto(false)}
        statusBarTranslucent
      >
        <Pressable style={s.modalBackdrop} onPress={() => setModalFoto(false)}>
          {/* Pressable interior para que tocar adentro NO cierre */}
          <Pressable
            style={[s.modalSheet, { paddingBottom: insets.bottom + 12 }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Foto de perfil</Text>

            <Pressable
              onPress={tomarFoto}
              style={({ pressed }) => [s.modalOption, pressed && s.modalOptionPressed]}
            >
              <Text style={s.modalOptionIcon}>📸</Text>
              <Text style={s.modalOptionTxt}>Tomar foto</Text>
            </Pressable>

            <Pressable
              onPress={elegirDeGaleria}
              style={({ pressed }) => [s.modalOption, pressed && s.modalOptionPressed]}
            >
              <Text style={s.modalOptionIcon}>🖼️</Text>
              <Text style={s.modalOptionTxt}>Elegir de galería</Text>
            </Pressable>

            {hayFotoParaQuitar && (
              <Pressable
                onPress={marcarParaQuitar}
                style={({ pressed }) => [s.modalOption, pressed && s.modalOptionPressed]}
              >
                <Text style={s.modalOptionIcon}>🗑️</Text>
                <Text style={[s.modalOptionTxt, { color: '#ef4444' }]}>Quitar foto actual</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setModalFoto(false)}
              style={({ pressed }) => [s.modalCancel, pressed && s.modalCancelPressed]}
            >
              <Text style={s.modalCancelTxt}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
