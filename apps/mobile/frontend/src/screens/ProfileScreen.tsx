import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, Image, RefreshControl, Alert, Modal, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { api, Endpoints, API_URL } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { Producto, RootStackParamList } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';

type Nav = NavigationProp<RootStackParamList>;
type Tab = 'likes' | 'guardados' | 'compartidos';

const CARD_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#A29BFE', '#FF9FF3'];

const MOCK_ITEMS: Producto[] = [
  { id: 1, tienda_id: 1, nombre: 'Pupusas de Queso', precio: 0.75, stock: 50, es_reel: 0, activo: 1, tienda_nombre: 'Comedor Doña Rosa', descripcion: 'Ricas pupusas artesanales', categoria: 'comida', municipio: 'San Salvador', likes_count: 45, vendedor_id: 1 },
  { id: 2, tienda_id: 2, nombre: 'Café Molido Premium', precio: 3.50, stock: 200, es_reel: 0, activo: 1, tienda_nombre: 'Finca El Cafetal', descripcion: 'Café de altura 100%', categoria: 'bebidas', municipio: 'Ahuachapán', likes_count: 123, vendedor_id: 4 },
  { id: 3, tienda_id: 3, nombre: 'Pan de Yema Artesanal', precio: 0.50, stock: 80, es_reel: 0, activo: 1, tienda_nombre: 'Panadería La Hermosa', descripcion: 'Pan tradicional', categoria: 'panaderia', municipio: 'Santa Ana', likes_count: 67, vendedor_id: 3 },
  { id: 4, tienda_id: 1, nombre: 'Tamales de Elote', precio: 1.00, stock: 30, es_reel: 0, activo: 1, tienda_nombre: 'Comedor Doña Rosa', descripcion: 'Tamales artesanales dulces', categoria: 'comida', municipio: 'San Salvador', likes_count: 89, vendedor_id: 1 },
  { id: 5, tienda_id: 4, nombre: 'Quesillo con Curtido', precio: 2.00, stock: 40, es_reel: 0, activo: 1, tienda_nombre: 'Antojitos El Salvador', descripcion: 'Quesillo fresco con loroco', categoria: 'comida', municipio: 'Santa Ana', likes_count: 78, vendedor_id: 5 },
  { id: 6, tienda_id: 5, nombre: 'Horchata Natural', precio: 1.25, stock: 100, es_reel: 0, activo: 1, tienda_nombre: 'Bebidas El Chele', descripcion: 'Horchata de arroz con canela', categoria: 'bebidas', municipio: 'San Miguel', likes_count: 32, vendedor_id: 6 },
];

function imgUri(path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_URL.replace('/backend', '')}/backend/${path}`;
}

export default function ProfileScreen() {
  const { usuario, cerrarSesion, refrescar } = useAuth();
  const nav = useNavigation<Nav>();
  const { lang, cambiarIdioma, t } = useLang();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('likes');
  const [items, setItems] = useState<Producto[]>(MOCK_ITEMS);
  const [cargando, setCargando] = useState(false);

  // Edit profile modal state
  const [modalEditar, setModalEditar] = useState(false);
  const [editNombre, setEditNombre]     = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail]       = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editFoto, setEditFoto]         = useState<string | null>(null);
  const [editPassActual, setEditPassActual] = useState('');
  const [editPassNueva, setEditPassNueva]   = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const ep = tab === 'likes' ? Endpoints.misLikes
        : tab === 'guardados' ? Endpoints.misGuardados
        : Endpoints.misCompartidos;
      const r = await api<{ ok: boolean; productos?: Producto[] }>(ep);
      if (r.ok && r.productos && r.productos.length > 0) setItems(r.productos);
      else setItems(MOCK_ITEMS);
    } catch {
      setItems(MOCK_ITEMS);
    } finally { setCargando(false); }
  }, [tab]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Cooldown de 10 días para cambiar username
  const diasRestantesUsername = (() => {
    if (!usuario?.username_changed_at) return 0;
    const changed = new Date(usuario.username_changed_at).getTime();
    const daysPassed = Math.floor((Date.now() - changed) / (1000 * 60 * 60 * 24));
    return Math.max(0, 10 - daysPassed);
  })();
  const usernameBloqueado = diasRestantesUsername > 0;

  function abrirEditar() {
    setEditNombre(usuario?.nombre ?? '');
    setEditUsername(usuario?.username ?? '');
    setEditEmail(usuario?.email ?? '');
    setEditTelefono(usuario?.telefono ?? '');
    setEditFoto(null);
    setEditPassActual('');
    setEditPassNueva('');
    setModalEditar(true);
  }

  async function pickFoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0].base64) {
      setEditFoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function guardarPerfil() {
    setGuardando(true);
    try {
      const body: Record<string, unknown> = {};
      if (editNombre !== usuario?.nombre) body.nombre = editNombre;
      if (editUsername !== (usuario?.username ?? '')) body.username = editUsername;
      if (editEmail !== (usuario?.email ?? '')) body.email = editEmail;
      if (editTelefono !== (usuario?.telefono ?? '')) body.telefono = editTelefono;
      if (editFoto) body.foto_perfil = editFoto;
      if (editPassNueva) { body.password_actual = editPassActual; body.password_nueva = editPassNueva; }

      const r = await api<{ ok: boolean; error?: string }>(Endpoints.authActualizarPerfil, { body });
      if (r.ok) {
        await refrescar();
        setModalEditar(false);
      } else {
        const msg = r.error === 'username_taken'    ? t.auth.usernameOcupado
                  : r.error === 'cooldown_username' ? t.profile.usuarioBloqueado
                  : (r.error ?? t.common.error);
        Alert.alert(t.common.error, msg);
      }
    } catch {
      Alert.alert(t.common.error, t.auth.sinConexion);
    }
    setGuardando(false);
  }

  const c = colors;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
    {/* Edit profile modal */}
    <Modal visible={modalEditar} animationType="slide" transparent onRequestClose={() => setModalEditar(false)}>
      <View style={modal.backdrop}>
        <View style={[modal.sheet, { backgroundColor: c.card }]}>
          <View style={[modal.handle, { backgroundColor: c.border }]} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
            <Text style={[modal.title, { color: c.text }]}>{t.profile.editarPerfil}</Text>

            {/* Photo picker */}
            <TouchableOpacity style={modal.photoWrap} onPress={pickFoto} activeOpacity={0.8}>
              <View style={[modal.photoCircle, { backgroundColor: c.accent }]}>
                {editFoto
                  ? <Image source={{ uri: editFoto }} style={{ width: '100%', height: '100%', borderRadius: 44 }} />
                  : <Ionicons name="camera-outline" size={32} color="#FFF" />}
              </View>
              <Text style={[modal.photoLbl, { color: c.accent }]}>{t.profile.foto}</Text>
            </TouchableOpacity>

            <Input label={t.auth.nombreCompleto} icon="person-outline" value={editNombre} onChangeText={setEditNombre} />

            <Input
              label={t.auth.username}
              icon="at-outline"
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
              editable={!usernameBloqueado}
            />
            {usernameBloqueado && (
              <View style={[modal.cooldownRow, { backgroundColor: `${c.warning}14`, borderColor: `${c.warning}40` }]}>
                <Ionicons name="time-outline" size={14} color={c.warning} />
                <Text style={[modal.cooldownTxt, { color: c.warning }]}>
                  {diasRestantesUsername} {t.profile.diasParaCambiar}
                </Text>
              </View>
            )}
            <Input label={t.auth.email} icon="mail-outline" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label={t.auth.telefonoLabel} icon="call-outline" value={editTelefono} onChangeText={setEditTelefono} inputType="phone" />
            <Input label={t.profile.contrasenaActual} icon="lock-closed-outline" value={editPassActual} onChangeText={setEditPassActual} secureTextEntry />
            <Input label={t.profile.contrasenaNueva} icon="lock-open-outline" value={editPassNueva} onChangeText={setEditPassNueva} secureTextEntry />

            <Button label={t.profile.guardarCambios} icon="checkmark-outline" onPress={guardarPerfil} loading={guardando} />
            <TouchableOpacity style={[modal.cancelBtn, { borderColor: c.border }]} onPress={() => setModalEditar(false)} activeOpacity={0.7}>
              <Text style={[modal.cancelTxt, { color: c.muted }]}>{t.common.cancelar}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>

    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header con gradiente accent ── */}
      <View style={[hdr.root, { backgroundColor: c.accent, paddingTop: insets.top + 24 }]}>
        <View style={hdr.avatarRing}>
          <View style={hdr.avatarInner}>
            <Ionicons name="person" size={44} color="#FFF" />
          </View>
        </View>
        <Text style={hdr.nombre}>{usuario?.nombre ?? 'Usuario'}</Text>
        <Text style={hdr.sub}>{usuario?.email ?? usuario?.telefono ?? '—'}</Text>
        <View style={hdr.badge}>
          <Text style={hdr.badgeTxt}>{(usuario?.rol ?? 'comprador').toUpperCase()}</Text>
        </View>
        {/* Stats */}
        <View style={hdr.stats}>
          {[['24', 'Pedidos'], ['8', 'Guardados'], ['47', 'Me gusta']].map(([n, l]) => (
            <React.Fragment key={l}>
              <View style={hdr.statItem}>
                <Text style={hdr.statNum}>{n}</Text>
                <Text style={hdr.statLbl}>{l}</Text>
              </View>
              {l !== 'Me gusta' && <View style={hdr.statDiv} />}
            </React.Fragment>
          ))}
        </View>
        {/* Editar Perfil pill */}
        <TouchableOpacity
          style={hdr.editBtn}
          onPress={abrirEditar}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={13} color={c.accent} style={{ marginRight: 4 }} />
          <Text style={[hdr.editBtnTxt, { color: c.accent }]}>{t.profile.editarPerfil}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: Spacing.md }}>

        {/* ── Menú principal ── */}
        <SectionLabel label="Mi cuenta" color={c.text} />
        <Card bg={c.card} border={c.border}>
          {usuario?.rol === 'comprador' && (
            <MenuItem
              icon="briefcase" iconBg="rgba(74,109,140,0.12)" iconColor={c.accent}
              title="Convertirse en Socio" sub="Vendedor o Repartidor"
              color={c.text} subColor={c.muted} border={c.border}
              onPress={() => nav.navigate('BecomeSeller')}
            />
          )}
          <MenuItem
            icon="receipt-outline" iconBg="rgba(74,109,140,0.12)" iconColor={c.accent}
            title="Mis Pedidos" sub="Historial de compras"
            color={c.text} subColor={c.muted} border={c.border}
            onPress={() => Alert.alert('Pedidos', 'Próximamente')}
          />
          <MenuItem
            icon="help-circle" iconBg="rgba(74,109,140,0.12)" iconColor={c.accent}
            title="Soporte y Ayuda" sub="Tickets y reportes"
            color={c.text} subColor={c.muted} border={c.border}
            onPress={() => nav.navigate('Support')}
            last
          />
        </Card>

        {/* ── Configuración ── */}
        <SectionLabel label="Configuración" color={c.text} />
        <Card bg={c.card} border={c.border}>

          {/* Modo oscuro */}
          <View style={[row.wrap, { borderBottomColor: c.border }]}>
            <View style={[row.iconBg, { backgroundColor: isDark ? c.accentLight : 'rgba(251,191,36,0.12)' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? c.accent : '#F59E0B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[row.title, { color: c.text }]}>Modo {isDark ? 'Oscuro' : 'Claro'}</Text>
              <Text style={[row.sub, { color: c.muted }]}>{isDark ? 'Activado' : 'Desactivado'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: c.border, true: c.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Idioma */}
          <TouchableOpacity style={[row.wrap, { borderBottomColor: c.border }]} onPress={cambiarIdioma} activeOpacity={0.7}>
            <View style={[row.iconBg, { backgroundColor: c.accentLight }]}>
              <Ionicons name="globe-outline" size={20} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[row.title, { color: c.text }]}>Idioma</Text>
              <Text style={[row.sub, { color: c.muted }]}>{lang === 'es' ? 'Español' : 'English'}</Text>
            </View>
            <View style={[chip.wrap, { borderColor: c.accent }]}>
              <Text style={[chip.txt, { color: c.accent }]}>{lang.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>

          {/* Notificaciones */}
          <MenuItem
            icon="notifications-outline" iconBg={c.accentLight} iconColor={c.accent}
            title="Notificaciones" sub="Pedidos, promos y mensajes"
            color={c.text} subColor={c.muted} border={c.border}
            onPress={() => Alert.alert('Notificaciones', 'Próximamente')}
          />

          {/* Privacidad */}
          <MenuItem
            icon="shield-checkmark-outline" iconBg={c.accentLight} iconColor={c.accent}
            title="Privacidad y Seguridad" sub="Datos y permisos"
            color={c.text} subColor={c.muted} border={c.border}
            onPress={() => Alert.alert('Privacidad', 'Próximamente')}
            last
          />
        </Card>

        {/* Versión */}
        <Text style={{ textAlign: 'center', color: c.muted, fontSize: Fonts.small, marginBottom: Spacing.md, fontWeight: '500' }}>
          Versión 1.0.0 · [SV]Go © 2026
        </Text>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={[btnLogout.wrap, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }]}
          onPress={cerrarSesion}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={c.danger} />
          <Text style={[btnLogout.txt, { color: c.danger }]}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* ── Actividad (tabs) ── */}
        <SectionLabel label="Mi actividad" color={c.text} />
        <View style={[tabRow.wrap, { borderBottomColor: c.border }]}>
          {(['likes', 'guardados', 'compartidos'] as Tab[]).map(tb => (
            <TouchableOpacity
              key={tb}
              style={[tabRow.btn, tab === tb && { borderBottomColor: c.accent }]}
              onPress={() => setTab(tb)}
            >
              <Ionicons
                name={tb === 'likes' ? 'heart' : tb === 'guardados' ? 'bookmark' : 'share-social'}
                size={14}
                color={tab === tb ? c.accent : c.muted}
                style={{ marginRight: 4 }}
              />
              <Text style={[tabRow.txt, { color: tab === tb ? c.accent : c.muted }]}>
                {tb === 'likes' ? 'Me gusta' : tb === 'guardados' ? 'Guardados' : 'Compartidos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid de productos */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md, paddingBottom: Spacing.xl }}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[itemCard.wrap, { backgroundColor: c.card, borderColor: c.border }]}
              activeOpacity={0.9}
              onPress={() => nav.navigate('Product', { productoId: item.id })}
            >
              <View style={[itemCard.img, { backgroundColor: CARD_COLORS[idx % CARD_COLORS.length] }]}>
                {item.imagen
                  ? <Image source={{ uri: imgUri(item.imagen) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <Ionicons name="fast-food-outline" size={28} color="#FFF" />}
              </View>
              <View style={{ padding: 10 }}>
                <Text style={[itemCard.nombre, { color: c.text }]} numberOfLines={1}>{item.nombre}</Text>
                <Text style={[itemCard.tienda, { color: c.muted }]} numberOfLines={1}>{item.tienda_nombre}</Text>
                <Text style={[itemCard.precio, { color: c.accent }]}>${Number(item.precio).toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </ScrollView>
    </View>
  );
}

/* ── Sub-componentes ── */
function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={{
      fontSize: Fonts.small - 1, fontWeight: '800',
      textTransform: 'uppercase', letterSpacing: 1.2,
      color, marginBottom: 8, marginTop: 4,
    }}>{label}</Text>
  );
}

function Card({ bg, border, children }: { bg: string; border: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: bg, borderRadius: Radius.lg,
      borderWidth: 1.5, borderColor: border,
      overflow: 'hidden', marginBottom: Spacing.md,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 5, elevation: 2,
    }}>{children}</View>
  );
}

function MenuItem({
  icon, iconBg, iconColor, title, sub, color, subColor, border, onPress, last
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
  title: string; sub?: string;
  color: string; subColor: string; border: string;
  onPress: () => void; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[row.wrap, !last && { borderBottomColor: border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[row.iconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[row.title, { color }]}>{title}</Text>
        {sub && <Text style={[row.sub, { color: subColor }]}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={subColor} />
    </TouchableOpacity>
  );
}

/* ── Estilos utilitarios ── */
const hdr = {
  root: { alignItems: 'center' as const, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.md },
  avatarRing: {
    width: 106, height: 106, borderRadius: 53,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: Spacing.sm,
  },
  avatarInner: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  nombre: { fontSize: Fonts.title, color: '#FFF', fontWeight: '900' as const, letterSpacing: -0.3 },
  sub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: Fonts.small + 1, fontWeight: '500' as const },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: Radius.pill, marginTop: 8,
  },
  badgeTxt: { color: '#FFF', fontSize: Fonts.small - 1, fontWeight: '800' as const, letterSpacing: 1 },
  stats: {
    flexDirection: 'row' as const, marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md, padding: Spacing.md, width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' as const },
  statNum: { color: '#FFF', fontSize: Fonts.title - 2, fontWeight: '900' as const },
  statLbl: { color: 'rgba(255,255,255,0.8)', fontSize: Fonts.small - 1, fontWeight: '600' as const, marginTop: 2 },
  statDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  editBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.pill, marginTop: Spacing.md,
  },
  editBtnTxt: { fontSize: Fonts.small, fontWeight: '800' as const },
};

const row = {
  wrap: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    padding: Spacing.md, borderBottomWidth: 1,
  },
  iconBg: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center' as const, alignItems: 'center' as const, marginRight: Spacing.md,
  },
  title: { fontSize: Fonts.regular, fontWeight: '700' as const },
  sub: { fontSize: Fonts.small, fontWeight: '500' as const, marginTop: 1 },
};

const chip = {
  wrap: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.pill, borderWidth: 1.5,
  },
  txt: { fontSize: Fonts.small - 1, fontWeight: '800' as const },
};

const btnLogout = {
  wrap: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5,
    gap: 10, marginBottom: Spacing.xl,
  },
  txt: { fontWeight: '700' as const, fontSize: Fonts.regular },
};

const tabRow = {
  wrap: { flexDirection: 'row' as const, borderBottomWidth: 1.5 },
  btn: {
    flex: 1, flexDirection: 'row' as const, paddingVertical: 12,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  txt: { fontWeight: '700' as const, fontSize: Fonts.small },
};

const itemCard = {
  wrap: {
    width: '47.5%' as any,
    borderRadius: Radius.md, borderWidth: 1.5,
    overflow: 'hidden' as const,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  img: { height: 110, justifyContent: 'center' as const, alignItems: 'center' as const },
  nombre: { fontWeight: '700' as const, fontSize: Fonts.regular - 1, letterSpacing: -0.1 },
  tienda: { fontSize: Fonts.small - 1, fontWeight: '500' as const, marginTop: 1 },
  precio: { fontWeight: '800' as const, marginTop: 4, fontSize: Fonts.small + 1 },
};

const modal = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  title: { fontSize: Fonts.title - 2, fontWeight: '800', letterSpacing: -0.3, marginBottom: Spacing.lg },
  photoWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  photoCircle: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoLbl: { fontSize: Fonts.small, fontWeight: '700' },
  cancelBtn: {
    borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center', paddingVertical: 14, marginTop: Spacing.sm,
  },
  cancelTxt: { fontWeight: '700', fontSize: Fonts.regular },
  cooldownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.sm, borderWidth: 1,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    marginTop: -Spacing.sm, marginBottom: Spacing.md,
  },
  cooldownTxt: { fontSize: Fonts.small, fontWeight: '600', flex: 1 },
});
