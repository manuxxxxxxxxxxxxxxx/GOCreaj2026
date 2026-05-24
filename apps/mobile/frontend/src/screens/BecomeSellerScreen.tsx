import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/Button';
import Input from '@/components/Input';

type RolSol = 'vendedor' | 'repartidor';
interface RespCrear { ok: boolean; error?: string; solicitud_id?: number }

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitas dar acceso a la galería'); return null; }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.65, allowsEditing: true, aspect: [16, 10] });
  if (r.canceled || !r.assets[0].base64) return null;
  return `data:image/jpeg;base64,${r.assets[0].base64}`;
}

const ROL_INFO = {
  vendedor: {
    icon: 'storefront-outline' as const,
    title: 'Vendedor',
    desc: 'Publica y vende tus productos a clientes cercanos',
    emoji: '🏪',
    color: '#4ECDC4',
  },
  repartidor: {
    icon: 'bicycle-outline' as const,
    title: 'Repartidor',
    desc: 'Entrega pedidos y gana por cada delivery',
    emoji: '🚴',
    color: '#45B7D1',
  },
};

export default function BecomeSellerScreen() {
  const nav = useNavigation();
  const { refrescar } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [rol, setRol]       = useState<RolSol>('vendedor');
  const [nombre, setNombre] = useState('');
  const [dui, setDui]       = useState('');
  const [frente, setFrente] = useState<string | null>(null);
  const [reverso, setReverso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!nombre || !dui || !frente || !reverso)
      return Alert.alert('Datos faltantes', 'Completa nombre, DUI y sube ambas fotos del DUI');
    if (dui.replace(/\D/g, '').length < 9)
      return Alert.alert('DUI inválido', 'El DUI debe tener 9 dígitos');
    setEnviando(true);
    const r = await api<RespCrear>(Endpoints.solicitudCrear, {
      body: { rol_solicitado: rol, nombre_completo: nombre, dui_numero: dui, dui_frente: frente, dui_reverso: reverso },
    });
    setEnviando(false);
    if (r.ok) {
      Alert.alert('✅ Solicitud enviada', 'Tu solicitud está en revisión. Te notificaremos pronto.');
      await refrescar();
      nav.goBack();
    } else {
      Alert.alert('Error', r.error ?? 'No se pudo enviar');
    }
  }

  const c = colors;
  const info = ROL_INFO[rol];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header con volver */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: c.accent }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Únete como Socio</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroBox, { backgroundColor: c.accentLight, borderColor: c.border }]}>
          <Text style={styles.heroEmoji}>{info.emoji}</Text>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.heroTitle, { color: c.text }]}>{info.title}</Text>
            <Text style={[styles.heroDesc, { color: c.muted }]}>{info.desc}</Text>
          </View>
        </View>

        {/* Selector de rol */}
        <Text style={[styles.label, { color: c.text }]}>¿Cómo quieres unirte?</Text>
        <View style={styles.rolRow}>
          {(['vendedor', 'repartidor'] as RolSol[]).map(r => {
            const active = rol === r;
            const ri = ROL_INFO[r];
            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.rolBtn,
                  { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : c.card },
                ]}
                onPress={() => setRol(r)}
                activeOpacity={0.85}
              >
                <Text style={styles.rolEmoji}>{ri.emoji}</Text>
                <Ionicons name={ri.icon} size={22} color={active ? '#FFF' : c.accent} />
                <Text style={[styles.rolTxt, { color: active ? '#FFF' : c.text }]}>{ri.title}</Text>
                <Text style={[styles.rolSub, { color: active ? 'rgba(255,255,255,0.8)' : c.muted }]}>
                  {active ? '✓ Seleccionado' : 'Seleccionar'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Pasos */}
        <View style={[styles.stepsBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.stepsTitle, { color: c.text }]}>Proceso de verificación</Text>
          {[
            { num: '1', txt: 'Completa el formulario con tu información' },
            { num: '2', txt: 'Sube las fotos del frente y reverso de tu DUI' },
            { num: '3', txt: 'El administrador revisará tu solicitud (1-2 días hábiles)' },
            { num: '4', txt: 'Recibirás acceso a tu panel cuando sea aprobada' },
          ].map(s => (
            <View key={s.num} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: c.accent }]}>
                <Text style={styles.stepNumTxt}>{s.num}</Text>
              </View>
              <Text style={[styles.stepTxt, { color: c.muted }]}>{s.txt}</Text>
            </View>
          ))}
        </View>

        {/* Formulario */}
        <Text style={[styles.label, { color: c.text }]}>Datos personales</Text>

        <Input
          label="Nombre completo (como en el DUI)"
          icon="person-outline"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre completo"
        />
        <Input
          label="Número de DUI"
          icon="card-outline"
          value={dui}
          onChangeText={setDui}
          inputType="dui"
        />

        {/* Fotos DUI */}
        <Text style={[styles.label, { color: c.text }]}>Foto del DUI</Text>
        <View style={styles.dualPhoto}>
          {/* Frente */}
          <TouchableOpacity
            style={[
              styles.photoBox,
              { backgroundColor: c.card, borderColor: frente ? c.success : c.accent },
            ]}
            onPress={async () => { const r = await pickImage(); if (r) setFrente(r); }}
            activeOpacity={0.85}
          >
            {frente ? (
              <>
                <Image source={{ uri: frente }} style={styles.photoPreview} />
                <View style={[styles.photoOk, { backgroundColor: c.success }]}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              </>
            ) : (
              <View style={styles.photoInner}>
                <Ionicons name="camera-outline" size={32} color={c.accent} />
                <Text style={[styles.photoLabel, { color: c.accent }]}>Frente</Text>
                <Text style={[styles.photoSub, { color: c.muted }]}>Toca para subir</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Reverso */}
          <TouchableOpacity
            style={[
              styles.photoBox,
              { backgroundColor: c.card, borderColor: reverso ? c.success : c.border },
            ]}
            onPress={async () => { const r = await pickImage(); if (r) setReverso(r); }}
            activeOpacity={0.85}
          >
            {reverso ? (
              <>
                <Image source={{ uri: reverso }} style={styles.photoPreview} />
                <View style={[styles.photoOk, { backgroundColor: c.success }]}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              </>
            ) : (
              <View style={styles.photoInner}>
                <Ionicons name="camera-reverse-outline" size={32} color={c.muted} />
                <Text style={[styles.photoLabel, { color: c.muted }]}>Reverso</Text>
                <Text style={[styles.photoSub, { color: c.muted }]}>Toca para subir</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.lg }} />
        <Button label="Enviar solicitud" icon="paper-plane-outline" loading={enviando} onPress={enviar} />

        <Text style={[styles.disclaimer, { color: c.muted }]}>
          Al enviar, aceptas que tus datos serán revisados por el equipo de [SV]Go para verificación.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: Fonts.regular + 1, fontWeight: '800' },
  content: { padding: Spacing.md },
  heroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: Fonts.title - 2, fontWeight: '800' },
  heroDesc: { fontSize: Fonts.small, fontWeight: '500', marginTop: 2, lineHeight: 18 },
  label: { fontSize: Fonts.small - 1, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  rolRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  rolBtn: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 2,
    gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  rolEmoji: { fontSize: 24, marginBottom: 4 },
  rolTxt: { fontWeight: '800', fontSize: Fonts.regular, textAlign: 'center' },
  rolSub: { fontSize: Fonts.small - 1, fontWeight: '600', textAlign: 'center' },
  stepsBox: {
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5, marginBottom: Spacing.lg,
  },
  stepsTitle: { fontWeight: '800', fontSize: Fonts.regular, marginBottom: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.small - 1 },
  stepTxt: { flex: 1, fontSize: Fonts.small + 1, fontWeight: '500', lineHeight: 20 },
  dualPhoto: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  photoBox: {
    flex: 1, height: 140,
    borderRadius: Radius.md, borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  photoPreview: { width: '100%', height: '100%', position: 'absolute' },
  photoOk: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  photoInner: { alignItems: 'center', gap: 4 },
  photoLabel: { fontWeight: '800', fontSize: Fonts.small },
  photoSub: { fontSize: Fonts.small - 1, fontWeight: '500' },
  disclaimer: {
    textAlign: 'center', fontSize: Fonts.small - 1,
    marginTop: Spacing.md, lineHeight: 17,
  },
});
