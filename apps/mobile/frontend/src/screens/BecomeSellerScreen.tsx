import React, { useState } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts, FontFamily } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenScroll from '@/components/ScreenScroll';

type RolSol = 'vendedor' | 'repartidor';
type Vehiculo = 'bicicleta' | 'moto' | 'carro' | 'pickup';
interface RespCrear { ok: boolean; error?: string; solicitud_id?: number }

async function pickImage(aspect: [number, number] = [16, 10]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitas dar acceso a la galería'); return null; }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.65,
    allowsEditing: true,
    aspect,
  });
  if (r.canceled || !r.assets[0].base64) return null;
  return `data:image/jpeg;base64,${r.assets[0].base64}`;
}

const ROL_INFO = {
  vendedor: {
    icon: 'storefront-outline' as const,
    title: 'Vendedor',
    desc: 'Publica y vende tus productos a clientes cercanos',
  },
  repartidor: {
    icon: 'bicycle-outline' as const,
    title: 'Repartidor',
    desc: 'Entrega pedidos y gana por cada delivery',
  },
};

const MUNICIPIOS = [
  'San Salvador', 'Mejicanos', 'Soyapango', 'Apopa', 'Ilopango', 'Delgado',
  'Santa Tecla', 'Antiguo Cuscatlán', 'San Miguel', 'Santa Ana', 'Ahuachapán',
  'Sonsonate', 'Usulután', 'Cojutepeque', 'La Unión',
];

/* `icon` es puramente decorativo (mapea a Ionicons); el valor enviado al backend
   sigue siendo `id` vía tipo_vehiculo, sin cambios. */
const VEHICULOS: { id: Vehiculo; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'bicicleta', label: 'Bicicleta', icon: 'bicycle-outline' },
  { id: 'moto',      label: 'Moto',      icon: 'speedometer-outline' },
  { id: 'carro',     label: 'Carro',     icon: 'car-outline' },
  { id: 'pickup',    label: 'Pickup',    icon: 'car-sport-outline' },
];

function PhotoBox({
  value, onPress, label, subLabel, accent, card, success, muted, border,
}: {
  value: string | null; onPress: () => void; label: string; subLabel?: string;
  accent: string; card: string; success: string; muted: string; border: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.photoBox, { backgroundColor: card, borderColor: value ? success : border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {value ? (
        <>
          <Image source={{ uri: value }} style={styles.photoPreview} />
          <View style={[styles.photoOk, { backgroundColor: success }]}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
          </View>
        </>
      ) : (
        <View style={styles.photoInner}>
          <Ionicons name="camera-outline" size={30} color={muted} />
          <Text style={[styles.photoLabel, { color: muted }]}>{label}</Text>
          {subLabel && <Text style={[styles.photoSub, { color: muted }]}>{subLabel}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function BecomeSellerScreen() {
  const nav        = useNavigation();
  const route      = useRoute<RouteProp<RootStackParamList, 'BecomeSeller'>>();
  const { refrescar } = useAuth();
  const { colors } = useTheme();
  const c          = colors;

  const [rol, setRol]               = useState<RolSol>(route.params?.rol ?? 'vendedor');
  const [nombre, setNombre]         = useState('');
  const [municipio, setMunicipio]   = useState('');
  const [dui, setDui]               = useState('');
  const [frente, setFrente]         = useState<string | null>(null);
  const [reverso, setReverso]       = useState<string | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [enviando, setEnviando]     = useState(false);

  // Vendedor
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [fotoNegocio, setFotoNegocio]     = useState<string | null>(null);

  // Repartidor
  const [vehiculo, setVehiculo]     = useState<Vehiculo>('moto');
  const [licFrente, setLicFrente]   = useState<string | null>(null);
  const [licReverso, setLicReverso] = useState<string | null>(null);

  async function enviar() {
    if (!nombre.trim()) return Alert.alert('Datos faltantes', 'Ingresa tu nombre completo');
    if (!municipio) return Alert.alert('Datos faltantes', 'Selecciona tu municipio');
    if (!dui || dui.replace(/\D/g, '').length < 9) return Alert.alert('DUI inválido', 'El DUI debe tener 9 dígitos');
    if (!frente || !reverso) return Alert.alert('Fotos DUI', 'Sube el frente y reverso de tu DUI');
    if (!aceptaTerminos) return Alert.alert('Términos y condiciones', 'Debes aceptar los términos y condiciones para continuar');

    const body: Record<string, unknown> = {
      rol_solicitado: rol,
      nombre_completo: nombre.trim(),
      municipio,
      dui_numero: dui,
      dui_frente: frente,
      dui_reverso: reverso,
    };

    if (rol === 'vendedor') {
      if (nombreNegocio.trim()) body.nombre_negocio = nombreNegocio.trim();
      if (fotoNegocio)           body.foto_negocio  = fotoNegocio;
    } else {
      body.tipo_vehiculo = vehiculo;
      if (licFrente)  body.licencia_frente  = licFrente;
      if (licReverso) body.licencia_reverso = licReverso;
    }

    setEnviando(true);
    const r = await api<RespCrear>(Endpoints.solicitudCrear, { body });
    setEnviando(false);

    if (r.ok) {
      Alert.alert('Solicitud enviada', 'Tu solicitud está en revisión. El admin te notificará pronto.');
      await refrescar();
      nav.goBack();
    } else {
      Alert.alert('Error', r.error ?? 'No se pudo enviar la solicitud');
    }
  }

  const info = ROL_INFO[rol];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title="Únete como Socio" tone="accent" />

      <ScreenScroll>
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.heroBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.heroIconBadge, { backgroundColor: c.accentLight }]}>
            <Ionicons name={info.icon} size={30} color={c.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.heroTitle, { color: c.text }]}>{info.title}</Text>
            <Text style={[styles.heroDesc, { color: c.muted }]}>{info.desc}</Text>
          </View>
        </Animated.View>

        {/* Selector de rol */}
        <Text style={[styles.label, { color: c.text }]}>¿Cómo quieres unirte?</Text>
        <View style={styles.rolRow}>
          {(['vendedor', 'repartidor'] as RolSol[]).map((r, idx) => {
            const active = rol === r;
            const ri = ROL_INFO[r];
            return (
              <Animated.View key={r} entering={FadeInDown.delay(80 + idx * 60).duration(400).springify()} style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[styles.rolBtn, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : c.card }]}
                  onPress={() => setRol(r)}
                  activeOpacity={0.85}
                >
                  {active && (
                    <View style={styles.rolCheckBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    </View>
                  )}
                  <View style={[styles.rolIconBadge, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : c.accentLight }]}>
                    <Ionicons name={ri.icon} size={24} color={active ? '#FFF' : c.accent} />
                  </View>
                  <Text style={[styles.rolTxt, { color: active ? '#FFF' : c.text }]}>{ri.title}</Text>
                  <Text style={[styles.rolSub, { color: active ? 'rgba(255,255,255,0.85)' : c.muted }]}>
                    {active ? 'Seleccionado' : 'Seleccionar'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Pasos */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={[styles.stepsBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.stepsTitle, { color: c.text }]}>Proceso de verificación</Text>
          {[
            { num: '1', txt: 'Completa el formulario con tu información' },
            { num: '2', txt: 'Sube las fotos del frente y reverso de tu DUI' },
            ...(rol === 'vendedor'
              ? [{ num: '3', txt: 'Opcionalmente sube una foto de tu negocio' }]
              : [{ num: '3', txt: 'Sube tu licencia de conducir (frente y reverso)' }]
            ),
            { num: '4', txt: 'El admin revisará tu solicitud (1–2 días hábiles)' },
          ].map(s => (
            <View key={s.num} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: c.accent }]}>
                <Text style={styles.stepNumTxt}>{s.num}</Text>
              </View>
              <Text style={[styles.stepTxt, { color: c.muted }]}>{s.txt}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── Datos personales ── */}
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

        <Text style={[styles.subLabel, { color: c.muted }]}>Municipio</Text>
        <View style={styles.vehiculoRow}>
          {MUNICIPIOS.map(m => {
            const active = municipio === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.vehiculoBtn, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : c.card, minWidth: undefined, paddingHorizontal: 12 }]}
                onPress={() => setMunicipio(m)}
                activeOpacity={0.85}
              >
                <Text style={[styles.vehiculoTxt, { color: active ? '#FFF' : c.text }]}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Fotos DUI ── */}
        <Text style={[styles.label, { color: c.text }]}>Foto del DUI</Text>
        <View style={styles.dualPhoto}>
          <PhotoBox
            value={frente} onPress={async () => { const v = await pickImage([16, 10]); if (v) setFrente(v); }}
            label="Frente" subLabel="Toca para subir"
            accent={c.accent} card={c.card} success={c.success} muted={c.muted} border={c.border}
          />
          <PhotoBox
            value={reverso} onPress={async () => { const v = await pickImage([16, 10]); if (v) setReverso(v); }}
            label="Reverso" subLabel="Toca para subir"
            accent={c.accent} card={c.card} success={c.success} muted={c.muted} border={c.border}
          />
        </View>

        {/* ── Vendedor: nombre negocio + foto negocio ── */}
        {rol === 'vendedor' && (
          <>
            <Text style={[styles.label, { color: c.text }]}>Información del negocio</Text>
            <Input
              label="Nombre del negocio (opcional)"
              icon="storefront-outline"
              value={nombreNegocio}
              onChangeText={setNombreNegocio}
              placeholder="Ej: Pupusería La Abuela"
            />
            <Text style={[styles.subLabel, { color: c.muted }]}>Foto del negocio (opcional)</Text>
            <TouchableOpacity
              style={[styles.photoBoxWide, { backgroundColor: c.card, borderColor: fotoNegocio ? c.success : c.border }]}
              onPress={async () => { const v = await pickImage([4, 3]); if (v) setFotoNegocio(v); }}
              activeOpacity={0.85}
            >
              {fotoNegocio ? (
                <>
                  <Image source={{ uri: fotoNegocio }} style={styles.photoPreviewWide} />
                  <View style={[styles.photoOk, { backgroundColor: c.success }]}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                </>
              ) : (
                <View style={styles.photoInner}>
                  <Ionicons name="storefront-outline" size={36} color={c.muted} />
                  <Text style={[styles.photoLabel, { color: c.muted }]}>Foto de tu negocio o local</Text>
                  <Text style={[styles.photoSub, { color: c.muted }]}>Toca para subir (opcional)</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── Repartidor: tipo vehículo + licencia ── */}
        {rol === 'repartidor' && (
          <>
            <Text style={[styles.label, { color: c.text }]}>Tipo de vehículo</Text>
            <View style={styles.vehiculoRow}>
              {VEHICULOS.map((v, idx) => {
                const active = vehiculo === v.id;
                return (
                  <Animated.View key={v.id} entering={FadeInDown.delay(idx * 50).duration(350).springify()}>
                    <TouchableOpacity
                      style={[styles.vehiculoBtn, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : c.card }]}
                      onPress={() => setVehiculo(v.id)}
                      activeOpacity={0.85}
                    >
                      {active && (
                        <View style={styles.vehiculoCheckBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                        </View>
                      )}
                      <Ionicons name={v.icon} size={24} color={active ? '#FFF' : c.accent} style={{ marginBottom: 4 }} />
                      <Text style={[styles.vehiculoTxt, { color: active ? '#FFF' : c.text }]}>{v.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            <Text style={[styles.label, { color: c.text }]}>Licencia de conducir (opcional)</Text>
            <View style={styles.dualPhoto}>
              <PhotoBox
                value={licFrente} onPress={async () => { const v = await pickImage([16, 10]); if (v) setLicFrente(v); }}
                label="Lic. Frente" subLabel="Toca para subir"
                accent={c.accent} card={c.card} success={c.success} muted={c.muted} border={c.border}
              />
              <PhotoBox
                value={licReverso} onPress={async () => { const v = await pickImage([16, 10]); if (v) setLicReverso(v); }}
                label="Lic. Reverso" subLabel="Toca para subir"
                accent={c.accent} card={c.card} success={c.success} muted={c.muted} border={c.border}
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.termsRow, { borderColor: aceptaTerminos ? c.accent : c.border, backgroundColor: aceptaTerminos ? `${c.accent}10` : c.card }]}
          onPress={() => setAceptaTerminos(v => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, { borderColor: aceptaTerminos ? c.accent : c.border, backgroundColor: aceptaTerminos ? c.accent : 'transparent' }]}>
            {aceptaTerminos && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={[styles.termsTxt, { color: c.text }]}>
            He leído y acepto los <Text style={{ fontFamily: FontFamily.bodyExtraBold, color: c.accent }}>términos y condiciones</Text> de [SV]Go para socios.
          </Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.lg }} />
        <Button label="Enviar solicitud" icon="paper-plane-outline" loading={enviando} onPress={enviar} />

        <Text style={[styles.disclaimer, { color: c.muted }]}>
          Al enviar, aceptas que tus datos serán revisados por el equipo de [SV]Go para verificación de identidad.
        </Text>
        <View style={{ height: Spacing.xl }} />
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({

  heroBox: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: Spacing.lg,
  },
  heroIconBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: Fonts.title - 2, fontFamily: FontFamily.displayExtraBold },
  heroDesc:  { fontSize: Fonts.small, fontFamily: FontFamily.bodyRegular, marginTop: 2, lineHeight: 18 },

  label:    { fontSize: Fonts.small - 1, fontFamily: FontFamily.bodyExtraBold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  subLabel: { fontSize: Fonts.small, fontFamily: FontFamily.bodyBold, marginBottom: Spacing.sm, marginTop: Spacing.xs },

  rolRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  rolBtn: {
    flex: 1, alignItems: 'center', padding: Spacing.md, minHeight: 128,
    borderRadius: Radius.lg, borderWidth: 2, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  rolIconBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  rolCheckBadge: { position: 'absolute', top: 10, right: 10 },
  rolTxt:   { fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.regular, textAlign: 'center' },
  rolSub:   { fontSize: Fonts.small - 1, fontFamily: FontFamily.bodySemiBold, textAlign: 'center' },

  stepsBox: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5, marginBottom: Spacing.lg },
  stepsTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.regular, marginBottom: Spacing.md },
  stepRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  stepNum:  { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  stepNumTxt: { color: '#FFF', fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.small - 1 },
  stepTxt:  { flex: 1, fontSize: Fonts.small + 1, fontFamily: FontFamily.bodyRegular, lineHeight: 20 },

  dualPhoto: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  photoBox: {
    flex: 1, height: 130,
    borderRadius: Radius.md, borderWidth: 2, borderStyle: 'dashed',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  photoBoxWide: {
    height: 150, width: '100%',
    borderRadius: Radius.md, borderWidth: 2, borderStyle: 'dashed',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoPreview:     { width: '100%', height: '100%', position: 'absolute' },
  photoPreviewWide: { width: '100%', height: '100%', position: 'absolute' },
  photoOk: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  photoInner: { alignItems: 'center', gap: 4 },
  photoLabel: { fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.small },
  photoSub:   { fontSize: Fonts.small - 1, fontFamily: FontFamily.bodyRegular },

  vehiculoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  vehiculoBtn: {
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 68,
    borderRadius: Radius.md, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', minWidth: 76,
  },
  vehiculoCheckBadge: { position: 'absolute', top: 6, right: 6 },
  vehiculoTxt:   { fontFamily: FontFamily.bodyBold, fontSize: Fonts.small },

  disclaimer: { textAlign: 'center', fontSize: Fonts.small - 1, marginTop: Spacing.md, lineHeight: 17, fontFamily: FontFamily.bodyRegular },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, marginTop: Spacing.md },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  termsTxt: { flex: 1, fontSize: Fonts.small, lineHeight: 18, fontFamily: FontFamily.bodyRegular },
});
