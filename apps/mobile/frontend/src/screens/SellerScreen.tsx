import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Image, Alert, RefreshControl, ActivityIndicator,
  Animated, Dimensions, Platform, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints, API_URL } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { Tienda, Producto, Pedido, EstadoPedido } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import RepartidorAsignadoCard from '@/components/RepartidorAsignadoCard';

const { width: W } = Dimensions.get('window');
const BANNER_H = 200;
const LOGO_SZ  = 88;

const MUNICIPIOS = [
  'San Salvador','Mejicanos','Soyapango','Apopa','Ilopango','Delgado',
  'Tonacatepeque','San Marcos','Antiguo Cuscatlán','Santa Tecla',
  'Quezaltepeque','Nueva San Salvador','Santa Ana','San Miguel',
  'Zacatecoluca','Ahuachapán','Usulután','Cojutepeque','San Vicente',
];

/* Strings predeterminadas validadas en backend (vendedor_dashboard.php).
   Estos valores se envían tal cual al servidor — son el contrato de API. */
const CATEGORIAS = [
  'comida', 'bebidas', 'panaderia', 'postres', 'frutas', 'verduras', 'general',
];
const CATEGORIA_LABELS: Record<string, string> = {
  comida:    'Comida Rápida',
  bebidas:   'Bebidas',
  panaderia: 'Panadería',
  postres:   'Postres',
  frutas:    'Frutas',
  verduras:  'Verduras',
  general:   'General',
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  preparacion:          { label: 'Preparando',  color: '#F59E0B', icon: 'time-outline' },
  en_camino:            { label: 'En camino',   color: '#3B82F6', icon: 'bicycle-outline' },
  entregado:            { label: 'Entregado',   color: '#10B981', icon: 'checkmark-circle-outline' },
  cancelado:            { label: 'Cancelado',   color: '#EF4444', icon: 'close-circle-outline' },
  rechazado_repartidor: { label: 'Rechazado',   color: '#EF4444', icon: 'ban-outline' },
};

type Tab = 'productos' | 'pedidos';

interface RespTiendas   { ok: boolean; tiendas?: Tienda[] }
interface RespProductos { ok: boolean; productos?: Producto[] }
interface RespVentas    { ok: boolean; pedidos?: Pedido[] }
interface RespGen       { ok: boolean; error?: string; id?: number }

function imgUri(p?: string | null) {
  if (!p) return undefined;
  if (p.startsWith('data:') || p.startsWith('http')) return p;
  const m = p.match(/\/uploads\/(.+)$/);
  return m ? `${API_URL}/uploads/${m[1]}` : `${API_URL}/uploads/${p}`;
}

async function pickB64(aspect?: [number, number]): Promise<string | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return null; }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true, quality: 0.75,
    allowsEditing: true, aspect: aspect ?? [1, 1],
  });
  if (r.canceled || !r.assets[0].base64) return null;
  return `data:image/jpeg;base64,${r.assets[0].base64}`;
}

/** Selecciona un video y devuelve dataURL base64 (data:video/mp4;base64,...) */
async function pickVideoB64(): Promise<string | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return null; }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    base64: true,
    quality: 0.7,
    videoMaxDuration: 60,
  });
  if (r.canceled || !r.assets[0].base64) return null;
  // Detecta el formato del archivo (mp4 / mov / webm)
  const uri = r.assets[0].uri ?? '';
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'mp4';
  const mime = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';
  return `data:${mime};base64,${r.assets[0].base64}`;
}

// ─── Componente: zona de subida de imagen ──────────────────────────────
function ImageUploadZone({
  uri, width, height, aspect, borderRadius = 16, placeholder, sublabel,
  onPick, accentColor,
}: {
  uri?: string | null; width?: number; height: number; aspect: [number, number];
  borderRadius?: number; placeholder: string; sublabel?: string;
  onPick: (b64: string) => void; accentColor: string;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!uri) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    }
  }, [uri]);

  return (
    <TouchableOpacity
      onPress={async () => { const b = await pickB64(aspect); if (b) onPick(b); }}
      activeOpacity={0.85}
      style={{ width: width ?? '100%', height }}
    >
      <Animated.View style={[
        S.uploadZone,
        { height, borderRadius, borderColor: uri ? accentColor : '#334155', transform: [{ scale: uri ? 1 : pulse }] },
      ]}>
        {uri ? (
          <>
            <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius }} resizeMode="cover" />
            <View style={[S.uploadEditOverlay, { borderRadius }]}>
              <View style={S.uploadEditBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
                <Text style={S.uploadEditTxt}>Cambiar</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={S.uploadPlaceholder}>
            <View style={[S.uploadIconCircle, { backgroundColor: `${accentColor}18` }]}>
              <Ionicons name="cloud-upload-outline" size={32} color={accentColor} />
            </View>
            <Text style={[S.uploadLabel, { color: '#F1F5F9' }]}>{placeholder}</Text>
            {sublabel && <Text style={S.uploadSub}>{sublabel}</Text>}
            <View style={[S.uploadDashedBadge, { borderColor: accentColor }]}>
              <Text style={[S.uploadDashedTxt, { color: accentColor }]}>Seleccionar archivo</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Componente: campo premium ─────────────────────────────────────────
function PremiumInput({
  label, icon, value, onChangeText, placeholder = '', multiline = false,
  keyboardType = 'default', colors,
}: {
  label: string; icon: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any; colors: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={S.piWrap}>
      <Text style={[S.piLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[
        S.piRow,
        { backgroundColor: colors.elevated, borderColor: focused ? colors.accent : colors.border },
      ]}>
        <Ionicons name={icon as any} size={18} color={focused ? colors.accent : colors.muted} style={S.piIcon} />
        <TextInput
          style={[S.piInput, { color: colors.text }, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ─── Componente: selector de lista ────────────────────────────────────
function PremiumSelector({
  label, icon, value, options, onSelect, colors,
}: {
  label: string; icon: string; value: string; options: string[];
  onSelect: (v: string) => void; colors: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={S.piWrap}>
      <Text style={[S.piLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[S.piRow, { backgroundColor: colors.elevated, borderColor: open ? colors.accent : colors.border }]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Ionicons name={icon as any} size={18} color={open ? colors.accent : colors.muted} style={S.piIcon} />
        <Text style={[{ flex: 1, fontSize: Fonts.regular, fontWeight: '600', color: value ? colors.text : colors.muted }]}>
          {value || `Seleccionar ${label.toLowerCase()}`}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={[S.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {options.map(o => (
              <TouchableOpacity
                key={o}
                style={[S.dropItem, o === value && { backgroundColor: colors.accentLight }]}
                onPress={() => { onSelect(o); setOpen(false); }}
              >
                {o === value && <Ionicons name="checkmark" size={14} color={colors.accent} style={{ marginRight: 6 }} />}
                <Text style={[S.dropTxt, { color: o === value ? colors.accent : colors.text }]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, colors }: {
  icon: string; label: string; value: string; color: string; colors: any;
}) {
  return (
    <View style={[S.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[S.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[S.statVal, { color: colors.text }]}>{value}</Text>
      <Text style={[S.statLbl, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────
export default function SellerScreen() {
  const { colors } = useTheme();
  const { usuario, cerrarSesion, refrescar } = useAuth();
  const insets = useSafeAreaInsets();
  const [menuPerfil, setMenuPerfil] = useState(false);

  // Refresca el rol cada vez que se abre la pantalla (por si admin lo cambió)
  useEffect(() => { void refrescar(); }, []);

  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await cerrarSesion(); } },
      ]
    );
  };

  const [tab, setTab]           = useState<Tab>('productos');
  const [tienda, setTienda]     = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas]     = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Modales
  const [showCrearTienda, setShowCrearTienda] = useState(false);
  const [showEditTienda,  setShowEditTienda]  = useState(false);
  const [showCrearProd,   setShowCrearProd]   = useState(false);

  // Crear tienda
  const [tNombre, setTNombre] = useState('');
  const [tDesc,   setTDesc]   = useState('');
  const [tMun,    setTMun]    = useState('San Salvador');
  const [tDir,    setTDir]    = useState('');
  const [tLat,    setTLat]    = useState(13.6929);
  const [tLng,    setTLng]    = useState(-89.2182);

  // Editar tienda
  const [eBanner,     setEBanner]     = useState<string | null>(null);
  const [eLogo,       setELogo]       = useState<string | null>(null);
  const [eNombre,     setENombre]     = useState('');
  const [eDesc,       setEDesc]       = useState('');
  const [eMun,        setEMun]        = useState('');
  const [eDir,        setEDir]        = useState('');
  const [eApertura,   setEApertura]   = useState('');
  const [eCierre,     setECierre]     = useState('');
  const [eCategoria,  setECategoria]  = useState('');

  // Nuevo producto
  const [pNombre,  setPNombre]  = useState('');
  const [pDesc,    setPDesc]    = useState('');
  const [pPrecio,  setPPrecio]  = useState('');
  const [pStock,   setPStock]   = useState('10');
  const [pCat,     setPCat]     = useState('');
  const [pImg,     setPImg]     = useState<string | null>(null);
  const [pBanner,  setPBanner]  = useState<string | null>(null);
  const [pReel,    setPReel]    = useState(false);
  const [pVideo,   setPVideo]   = useState<string | null>(null);   // video base64 para reels
  const [subiendoVid, setSubiendoVid] = useState(false);

  // ── Carga de datos ────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [rt, rp, rv] = await Promise.all([
        api<RespTiendas>(Endpoints.vendedorTiendas),
        api<RespProductos>(Endpoints.vendedorProductos),
        api<RespVentas>(Endpoints.vendedorVentas),
      ]);
      setTienda(rt.ok && rt.tiendas?.length ? rt.tiendas[0] : null);
      if (rp.ok && rp.productos) setProductos(rp.productos);
      if (rv.ok && rv.pedidos)   setVentas(rv.pedidos);
    } catch {}
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // ── Acciones tienda ───────────────────────────────────────────────────
  async function crearTienda() {
    if (!tNombre.trim() || !tMun) return Alert.alert('Faltan datos', 'Nombre y municipio requeridos.');
    setGuardando(true);
    const r = await api<RespGen>(Endpoints.vendedorCrearTienda, {
      body: { nombre: tNombre, descripcion: tDesc, municipio: tMun, direccion: tDir, lat: tLat, lng: tLng }
    });
    setGuardando(false);
    if (r.ok) { setShowCrearTienda(false); resetCrearTienda(); await cargar(); }
    else Alert.alert('Error', r.error ?? 'No se pudo crear la tienda.');
  }

  function resetCrearTienda() {
    setTNombre(''); setTDesc(''); setTDir(''); setTMun('San Salvador');
    setTLat(13.6929); setTLng(-89.2182);
  }

  function abrirEditar() {
    if (!tienda) return;
    setENombre(tienda.nombre); setEDesc(tienda.descripcion ?? '');
    setEMun(tienda.municipio); setEDir(tienda.direccion ?? '');
    setEApertura(tienda.hora_apertura ?? ''); setECierre(tienda.hora_cierre ?? '');
    setECategoria(tienda.categoria ?? ''); setEBanner(null); setELogo(null);
    setShowEditTienda(true);
  }

  async function guardarTienda() {
    if (!tienda) return;
    setGuardando(true);
    const body: Record<string, unknown> = {
      tienda_id: tienda.id, nombre: eNombre, descripcion: eDesc,
      municipio: eMun, direccion: eDir,
      hora_apertura: eApertura, hora_cierre: eCierre, categoria: eCategoria,
    };
    if (eBanner) body.portada = eBanner;
    if (eLogo)   body.logo    = eLogo;
    const r = await api<RespGen>(Endpoints.vendedorActualizarTienda, { body });
    setGuardando(false);
    if (r.ok) { setShowEditTienda(false); await cargar(); }
    else Alert.alert('Error', r.error ?? 'No se pudo guardar.');
  }

  // ── Acciones producto ─────────────────────────────────────────────────
  async function crearProducto() {
    if (!pNombre.trim() || !pPrecio || !tienda)
      return Alert.alert('Faltan datos', 'Nombre, precio y tienda son requeridos.');
    setGuardando(true);
    const body: Record<string, unknown> = {
      tienda_id: tienda.id, nombre: pNombre, descripcion: pDesc,
      precio: parseFloat(pPrecio), stock: parseInt(pStock, 10) || 0,
      categoria: pCat || 'general', imagen: pImg, es_reel: pReel ? 1 : 0,
    };
    // Si es reel y hay video subido, lo incluimos
    if (pReel && pVideo) body.video = pVideo;
    const r = await api<RespGen>(Endpoints.vendedorCrearProducto, { body });
    setGuardando(false);
    if (r.ok) { setShowCrearProd(false); resetProd(); await cargar(); }
    else Alert.alert('Error', r.error ?? 'No se pudo crear el producto.');
  }

  function resetProd() {
    setPNombre(''); setPDesc(''); setPPrecio(''); setPStock('10');
    setPCat(''); setPImg(null); setPBanner(null); setPReel(false); setPVideo(null);
  }

  async function eliminarProducto(id: number) {
    Alert.alert('¿Eliminar producto?', 'El producto se desactivará y dejará de mostrarse.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await api<RespGen>(Endpoints.vendedorActualizarProducto, { body: { producto_id: id, activo: 0 } });
        await cargar();
      }},
    ]);
  }

  async function toggleActivo(id: number, activo: number) {
    await api<RespGen>(Endpoints.vendedorActualizarProducto, { body: { producto_id: id, activo: activo ? 0 : 1 } });
    await cargar();
  }

  async function cambiarEstado(pedidoId: number, estado: EstadoPedido) {
    await api<RespGen>(Endpoints.vendedorPreparar, { body: { pedido_id: pedidoId, estado } });
    await cargar();
  }

  async function rechazarPedido(pedidoId: number) {
    Alert.alert(
      'Rechazar pedido',
      '¿Confirmas el rechazo? El pago será devuelto íntegramente al comprador.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            const r = await api<RespGen>(Endpoints.vendedorRechazar, { body: { pedido_id: pedidoId } });
            if (r.ok) {
              Alert.alert('Pedido rechazado', 'El pago ya fue devuelto al comprador.');
              await cargar();
            } else {
              Alert.alert('Error', r.error ?? 'No se pudo rechazar');
            }
          },
        },
      ],
    );
  }

  // ──────────────────────────── RENDER ──────────────────────────────────
  if (cargando && !tienda) return (
    <View style={[S.loadWrap, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );

  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      {/* Botón flotante de perfil/menú — siempre visible arriba a la derecha */}
      <TouchableOpacity
        style={[S.profileFab, { top: insets.top + 12, backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={() => setMenuPerfil(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="person-circle-outline" size={22} color="#FFF" />
      </TouchableOpacity>

      {/* Modal de perfil con cerrar sesión */}
      <Modal visible={menuPerfil} transparent animationType="fade" onRequestClose={() => setMenuPerfil(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setMenuPerfil(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden' }}>
            {/* Header */}
            <View style={{ backgroundColor: colors.accent, padding: 24, alignItems: 'center' }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' }}>
                {usuario?.foto_perfil
                  ? <Image source={{ uri: imgUri(usuario.foto_perfil) }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 28 }}>{(usuario?.nombre || '?').charAt(0).toUpperCase()}</Text>
                }
              </View>
              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 17 }}>{usuario?.nombre || 'Vendedor'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>{usuario?.email || ''}</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 99, marginTop: 8 }}>
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 10, letterSpacing: 1 }}>{(usuario?.rol || 'VENDEDOR').toUpperCase()}</Text>
              </View>
            </View>

            {/* Opciones */}
            <View style={{ padding: 8 }}>
              <TouchableOpacity onPress={() => { setMenuPerfil(false); void refrescar(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12 }}>
                <Ionicons name="refresh-outline" size={20} color={colors.accent} />
                <Text style={{ flex: 1, fontWeight: '700', fontSize: 14, color: colors.text }}>Refrescar mi rol</Text>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14 }} />

              <TouchableOpacity onPress={() => { setMenuPerfil(false); confirmarCerrarSesion(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12 }}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={{ flex: 1, fontWeight: '800', fontSize: 14, color: '#EF4444' }}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colors.accent} />}
      >
        {/* ── Sin tienda ── */}
        {!tienda && (
          <View style={[S.emptyStore, { paddingTop: insets.top + 32 }]}>
            <View style={[S.emptyStoreBg, { backgroundColor: colors.accent }]}>
              <Ionicons name="storefront-outline" size={56} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={[S.emptyTitle, { color: colors.text }]}>Abre tu tienda en [SV]Go</Text>
            <Text style={[S.emptySub, { color: colors.muted }]}>
              Configura tu negocio, sube tus productos y empieza a vender en minutos.
            </Text>
            <TouchableOpacity
              style={[S.primaryBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowCrearTienda(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={S.primaryBtnTxt}>Crear mi tienda</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tienda existente ── */}
        {tienda && (
          <>
            {/* Banner + header */}
            <View style={{ position: 'relative', height: BANNER_H }}>
              {tienda.portada
                ? <Image source={{ uri: imgUri(tienda.portada) }} style={{ width: '100%', height: BANNER_H }} resizeMode="cover" />
                : <View style={{ width: '100%', height: BANNER_H, backgroundColor: colors.accentDark, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="storefront" size={44} color="rgba(255,255,255,0.4)" />
                  </View>
              }
              {/* Overlay oscuro */}
              <View style={S.bannerGradient} />
              {/* Botón editar banner */}
              <TouchableOpacity
                style={S.bannerEditBtn}
                onPress={async () => {
                  const b = await pickB64([16, 6]);
                  if (b && tienda) {
                    await api<RespGen>(Endpoints.vendedorActualizarTienda, { body: { tienda_id: tienda.id, portada: b } });
                    await cargar();
                  }
                }}
              >
                <Ionicons name="camera-outline" size={14} color="#FFF" />
                <Text style={S.bannerEditTxt}>Cambiar banner</Text>
              </TouchableOpacity>
            </View>

            {/* Logo + info */}
            <View style={[S.infoCard, { backgroundColor: colors.card }]}>
              <View style={S.infoRow}>
                <TouchableOpacity
                  style={S.logoWrap}
                  onPress={async () => {
                    const b = await pickB64([1, 1]);
                    if (b && tienda) {
                      await api<RespGen>(Endpoints.vendedorActualizarTienda, { body: { tienda_id: tienda.id, logo: b } });
                      await cargar();
                    }
                  }}
                  activeOpacity={0.85}
                >
                  {tienda.logo
                    ? <Image source={{ uri: imgUri(tienda.logo) }} style={S.logoImg} />
                    : <View style={[S.logoImg, { backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={S.logoInitial}>{tienda.nombre.charAt(0).toUpperCase()}</Text>
                      </View>
                  }
                  <View style={[S.logoEditBadge, { backgroundColor: colors.accent }]}>
                    <Ionicons name="camera" size={9} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[S.storeName, { color: colors.text }]} numberOfLines={1}>{tienda.nombre}</Text>
                  <View style={S.storeMetaRow}>
                    <Ionicons name="location-sharp" size={12} color={colors.accent} />
                    <Text style={[S.storeMeta, { color: colors.muted }]}>
                      {tienda.municipio}{tienda.categoria ? ` · ${tienda.categoria}` : ''}
                    </Text>
                  </View>
                  {tienda.hora_apertura && tienda.hora_cierre && (
                    <View style={S.storeMetaRow}>
                      <Ionicons name="time-outline" size={12} color={colors.muted} />
                      <Text style={[S.storeMeta, { color: colors.muted }]}>{tienda.hora_apertura} – {tienda.hora_cierre}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[S.editStoreBtn, { borderColor: colors.accent }]}
                  onPress={abrirEditar}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color={colors.accent} />
                  <Text style={[S.editStoreTxt, { color: colors.accent }]}>Editar</Text>
                </TouchableOpacity>
              </View>

              {/* Stats */}
              <View style={S.statsRow}>
                <StatCard icon="cube-outline"          label="Productos"  value={String(productos.length)}  color={colors.accent}  colors={colors} />
                <StatCard icon="receipt-outline"       label="Pedidos"    value={String(ventas.length)}      color="#F59E0B"        colors={colors} />
                <StatCard icon="star-outline"          label="Calif."     value={tienda.calificacion_promedio ? `${Number(tienda.calificacion_promedio).toFixed(1)}⭐` : '—'} color="#F59E0B" colors={colors} />
                <StatCard icon="checkmark-done-outline" label="Ventas"    value={String(tienda.ventas_completadas ?? 0)} color="#10B981" colors={colors} />
              </View>
            </View>

            {/* Tabs */}
            <View style={[S.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['productos', 'pedidos'] as Tab[]).map(t => {
                const active = tab === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[S.tabBtn, active && [S.tabBtnActive, { backgroundColor: colors.accent }]]}
                    onPress={() => setTab(t)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={t === 'productos' ? (active ? 'grid' : 'grid-outline') : (active ? 'receipt' : 'receipt-outline')}
                      size={16} color={active ? '#FFF' : colors.muted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[S.tabTxt, { color: active ? '#FFF' : colors.muted }]}>
                      {t === 'productos' ? `Productos (${productos.length})` : `Pedidos (${ventas.length})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Productos ── */}
            {tab === 'productos' && (
              <View style={S.section}>
                {productos.length === 0 ? (
                  <View style={[S.emptyTab, { backgroundColor: colors.elevated }]}>
                    <Ionicons name="cube-outline" size={44} color={colors.muted} />
                    <Text style={[S.emptyTabTitle, { color: colors.text }]}>Sin productos</Text>
                    <Text style={[S.emptyTabSub, { color: colors.muted }]}>Agrega tu primer producto para empezar a vender.</Text>
                    <TouchableOpacity style={[S.emptyTabBtn, { backgroundColor: colors.accent }]} onPress={() => setShowCrearProd(true)}>
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={S.emptyTabBtnTxt}>Agregar producto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={S.prodGrid}>
                    {productos.map(p => (
                      <View key={p.id} style={[S.prodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ position: 'relative', height: 130 }}>
                          {p.imagen
                            ? <Image source={{ uri: imgUri(p.imagen) }} style={{ width: '100%', height: 130 }} resizeMode="cover" />
                            : <View style={{ width: '100%', height: 130, backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="image-outline" size={32} color={colors.muted} />
                              </View>
                          }
                          {/* Badge estado */}
                          <View style={[S.prodBadge, { backgroundColor: p.activo ? '#10B98120' : '#EF444420' }]}>
                            <View style={[S.prodBadgeDot, { backgroundColor: p.activo ? '#10B981' : '#EF4444' }]} />
                            <Text style={[S.prodBadgeTxt, { color: p.activo ? '#10B981' : '#EF4444' }]}>
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </Text>
                          </View>
                        </View>
                        <View style={S.prodInfo}>
                          <Text style={[S.prodName, { color: colors.text }]} numberOfLines={2}>{p.nombre}</Text>
                          <Text style={[S.prodPrice, { color: colors.accent }]}>${Number(p.precio).toFixed(2)}</Text>
                          <View style={S.prodMeta}>
                            <View style={[S.prodCatChip, { backgroundColor: colors.accentLight }]}>
                              <Text style={[S.prodCatTxt, { color: colors.accent }]}>{CATEGORIA_LABELS[p.categoria ?? 'general'] ?? p.categoria}</Text>
                            </View>
                            {p.stock <= 0 ? (
                              <View style={[S.prodCatChip, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={[S.prodCatTxt, { color: '#B91C1C', fontWeight: '900' }]}>AGOTADO</Text>
                              </View>
                            ) : (
                              <Text style={[S.prodStock, { color: colors.muted }]}>Stock: {p.stock}</Text>
                            )}
                          </View>
                          <View style={S.prodActions}>
                            <TouchableOpacity
                              style={[S.prodActionBtn, { backgroundColor: colors.elevated }]}
                              onPress={() => toggleActivo(p.id, p.activo ?? 1)}
                            >
                              <Ionicons name={p.activo ? 'eye-off-outline' : 'eye-outline'} size={14} color={colors.muted} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[S.prodActionBtn, { backgroundColor: '#EF444418' }]}
                              onPress={() => eliminarProducto(p.id)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Pedidos ── */}
            {tab === 'pedidos' && (
              <View style={S.section}>
                {ventas.length === 0 ? (
                  <View style={[S.emptyTab, { backgroundColor: colors.elevated }]}>
                    <Ionicons name="receipt-outline" size={44} color={colors.muted} />
                    <Text style={[S.emptyTabTitle, { color: colors.text }]}>Sin pedidos aún</Text>
                    <Text style={[S.emptyTabSub, { color: colors.muted }]}>Cuando lleguen pedidos aparecerán aquí.</Text>
                  </View>
                ) : ventas.map(v => {
                  const cfg = ESTADO_CONFIG[v.estado] ?? ESTADO_CONFIG.preparacion;
                  return (
                    <View key={v.id} style={[S.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[S.orderHeader, { borderBottomColor: colors.border }]}>
                        <View style={[S.orderStatusDot, { backgroundColor: cfg.color }]} />
                        <Text style={[S.orderId, { color: colors.text }]}>Pedido #{v.id}</Text>
                        <View style={[S.orderBadge, { backgroundColor: `${cfg.color}20` }]}>
                          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} style={{ marginRight: 4 }} />
                          <Text style={[S.orderBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <View style={S.orderBody}>
                        <View>
                          <Text style={[S.orderClient, { color: colors.text }]}>{v.comprador_nombre}</Text>
                          <Text style={[S.orderMeta, { color: colors.muted }]}>
                            Pago: {v.metodo_pago} · {new Date(v.created_at ?? Date.now()).toLocaleDateString('es-SV', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                        <Text style={[S.orderTotal, { color: colors.accent }]}>${Number(v.total).toFixed(2)}</Text>
                      </View>
                      {v.estado === 'preparacion' && (
                        <>
                          <TouchableOpacity
                            style={[S.orderAction, { backgroundColor: colors.accent }]}
                            onPress={() => cambiarEstado(v.id, 'en_camino')}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="checkmark-circle-outline" size={17} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={S.orderActionTxt}>Marcar listo para envío</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[S.orderAction, { backgroundColor: '#EF4444', marginTop: 6 }]}
                            onPress={() => rechazarPedido(v.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="close-circle-outline" size={17} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={S.orderActionTxt}>Rechazar pedido</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {(v.estado === 'en_camino' || v.estado === 'entregado') && (
                        <RepartidorAsignadoCard pedidoId={v.id} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB agregar producto */}
      {tienda && tab === 'productos' && (
        <TouchableOpacity
          style={[S.fab, { bottom: insets.bottom + 20, backgroundColor: colors.accent }]}
          onPress={() => setShowCrearProd(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* ════ MODAL: Crear Tienda ════════════════════════════════════════ */}
      <Modal visible={showCrearTienda} animationType="slide" onRequestClose={() => setShowCrearTienda(false)}>
        <ScrollView
          style={[S.modal, { backgroundColor: colors.background }]}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + 20, paddingBottom: 80 }}
        >
          <View style={S.modalTop}>
            <View>
              <Text style={[S.modalTitle, { color: colors.text }]}>Nueva Tienda</Text>
              <Text style={[S.modalSub, { color: colors.muted }]}>Configura tu espacio en [SV]Go</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCrearTienda(false)} style={[S.closeBtn, { backgroundColor: colors.elevated }]}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <PremiumInput label="Nombre de la tienda" icon="storefront-outline" value={tNombre} onChangeText={setTNombre} placeholder="Ej. Panadería El Trigal" colors={colors} />
          <PremiumInput label="Descripción" icon="document-text-outline" value={tDesc} onChangeText={setTDesc} placeholder="¿Qué vendes y qué te hace especial?" multiline colors={colors} />
          <PremiumSelector label="Municipio" icon="location-outline" value={tMun} options={MUNICIPIOS} onSelect={setTMun} colors={colors} />
          <PremiumInput label="Dirección exacta" icon="map-outline" value={tDir} onChangeText={setTDir} placeholder="Calle y número..." colors={colors} />

          <Text style={[S.piLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>Toca el mapa para marcar tu ubicación</Text>
          <MapView
            style={S.mapView}
            initialRegion={{ latitude: tLat, longitude: tLng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            onPress={(e: MapPressEvent) => { setTLat(e.nativeEvent.coordinate.latitude); setTLng(e.nativeEvent.coordinate.longitude); }}
          >
            <Marker coordinate={{ latitude: tLat, longitude: tLng }} pinColor={colors.accent} />
          </MapView>

          <TouchableOpacity
            style={[S.primaryBtn, { backgroundColor: guardando ? colors.muted : colors.accent, marginTop: Spacing.md }]}
            onPress={crearTienda}
            disabled={guardando}
            activeOpacity={0.88}
          >
            {guardando ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <Ionicons name="storefront-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={S.primaryBtnTxt}>Crear mi tienda</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* ════ MODAL: Editar Tienda ════════════════════════════════════════ */}
      <Modal visible={showEditTienda} animationType="slide" onRequestClose={() => setShowEditTienda(false)}>
        <ScrollView
          style={[S.modal, { backgroundColor: colors.background }]}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + 20, paddingBottom: 80 }}
        >
          <View style={S.modalTop}>
            <View>
              <Text style={[S.modalTitle, { color: colors.text }]}>Editar Tienda</Text>
              <Text style={[S.modalSub, { color: colors.muted }]}>Actualiza la información de tu negocio</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEditTienda(false)} style={[S.closeBtn, { backgroundColor: colors.elevated }]}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Banner upload zone */}
          <Text style={[S.sectionLabel, { color: colors.text }]}>
            <Ionicons name="image-outline" size={15} color={colors.accent} />  Banner de la tienda
          </Text>
          <ImageUploadZone
            uri={eBanner ?? imgUri(tienda?.portada)}
            height={140}
            aspect={[16, 6]}
            borderRadius={16}
            placeholder="Subir banner de tienda"
            sublabel="Proporción 16:6 · Recomendado 1280×480 px"
            onPick={setEBanner}
            accentColor={colors.accent}
          />

          {/* Logo upload zone */}
          <Text style={[S.sectionLabel, { color: colors.text }]}>
            <Ionicons name="storefront-outline" size={15} color={colors.accent} />  Logo / Foto de perfil
          </Text>
          <View style={{ alignItems: 'center' }}>
            <ImageUploadZone
              uri={eLogo ?? imgUri(tienda?.logo)}
              width={110} height={110}
              aspect={[1, 1]}
              borderRadius={55}
              placeholder="Logo"
              onPick={setELogo}
              accentColor={colors.accent}
            />
          </View>

          <PremiumInput label="Nombre de la tienda" icon="storefront-outline" value={eNombre} onChangeText={setENombre} colors={colors} />
          <PremiumInput label="Descripción" icon="document-text-outline" value={eDesc} onChangeText={setEDesc} multiline colors={colors} />
          <PremiumSelector label="Municipio" icon="location-outline" value={eMun} options={MUNICIPIOS} onSelect={setEMun} colors={colors} />
          <PremiumSelector label="Categoría" icon="pricetag-outline" value={eCategoria} options={CATEGORIAS} onSelect={setECategoria} colors={colors} />
          <PremiumInput label="Dirección exacta" icon="map-outline" value={eDir} onChangeText={setEDir} colors={colors} />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <PremiumInput label="Apertura" icon="time-outline" value={eApertura} onChangeText={setEApertura} placeholder="08:00" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <PremiumInput label="Cierre" icon="time-outline" value={eCierre} onChangeText={setECierre} placeholder="20:00" colors={colors} />
            </View>
          </View>

          <TouchableOpacity
            style={[S.primaryBtn, { backgroundColor: guardando ? colors.muted : colors.accent, marginTop: Spacing.md }]}
            onPress={guardarTienda}
            disabled={guardando}
            activeOpacity={0.88}
          >
            {guardando ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={S.primaryBtnTxt}>Guardar cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* ════ MODAL: Nuevo Producto ═══════════════════════════════════════ */}
      <Modal visible={showCrearProd} animationType="slide" onRequestClose={() => setShowCrearProd(false)}>
        <ScrollView
          style={[S.modal, { backgroundColor: colors.background }]}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + 20, paddingBottom: 80 }}
        >
          <View style={S.modalTop}>
            <View>
              <Text style={[S.modalTitle, { color: colors.text }]}>Nuevo Producto</Text>
              <Text style={[S.modalSub, { color: colors.muted }]}>Agrega un producto a tu catálogo</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCrearProd(false)} style={[S.closeBtn, { backgroundColor: colors.elevated }]}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Foto principal */}
          <Text style={[S.sectionLabel, { color: colors.text }]}>
            <Ionicons name="camera-outline" size={15} color={colors.accent} />  Foto del producto
          </Text>
          <ImageUploadZone
            uri={pImg}
            height={180}
            aspect={[4, 3]}
            borderRadius={18}
            placeholder="Subir foto del producto"
            sublabel="Proporción 4:3 · Mínimo 800×600 px"
            onPick={setPImg}
            accentColor={colors.accent}
          />

          {/* Banner promocional */}
          <Text style={[S.sectionLabel, { color: colors.text }]}>
            <Ionicons name="image-outline" size={15} color={colors.accent} />  Banner promocional <Text style={[S.optLabel, { color: colors.muted }]}>(Opcional)</Text>
          </Text>
          <ImageUploadZone
            uri={pBanner}
            height={110}
            aspect={[16, 5]}
            borderRadius={14}
            placeholder="Banner para destacar en Reels"
            sublabel="Proporción 16:5 · Para publicaciones destacadas"
            onPick={setPBanner}
            accentColor={colors.accent}
          />

          <PremiumInput label="Nombre del producto" icon="cube-outline" value={pNombre} onChangeText={setPNombre} placeholder="Ej. Pan artesanal de coco" colors={colors} />
          <PremiumInput label="Descripción" icon="document-text-outline" value={pDesc} onChangeText={setPDesc} placeholder="Describe tu producto…" multiline colors={colors} />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <PremiumInput label="Precio ($)" icon="cash-outline" value={pPrecio} onChangeText={setPPrecio} placeholder="0.00" keyboardType="decimal-pad" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <PremiumInput label="Stock" icon="layers-outline" value={pStock} onChangeText={setPStock} placeholder="10" keyboardType="numeric" colors={colors} />
            </View>
          </View>

          <PremiumSelector label="Categoría" icon="pricetag-outline" value={pCat} options={CATEGORIAS} onSelect={setPCat} colors={colors} />

          {/* Toggle Reel */}
          <TouchableOpacity
            style={[S.reelToggle, { backgroundColor: pReel ? colors.accentLight : colors.elevated, borderColor: pReel ? colors.accent : colors.border }]}
            onPress={() => setPReel(v => !v)}
            activeOpacity={0.8}
          >
            <View style={[S.reelBox, { backgroundColor: pReel ? colors.accent : 'transparent', borderColor: pReel ? colors.accent : colors.border }]}>
              {pReel && <Ionicons name="checkmark" size={13} color="#FFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.reelTitle, { color: colors.text }]}>Publicar como Reel</Text>
              <Text style={[S.reelSub, { color: colors.muted }]}>Aparecerá destacado en la sección de Reels</Text>
            </View>
            <Ionicons name="play-circle-outline" size={24} color={pReel ? colors.accent : colors.muted} />
          </TouchableOpacity>

          {/* Picker de video (solo si es reel) */}
          {pReel && (
            <View style={{ marginTop: 4, marginBottom: Spacing.sm }}>
              <Text style={[S.sectionLabel, { color: colors.text }]}>
                <Ionicons name="videocam-outline" size={15} color={colors.accent} />  Video del reel <Text style={[S.optLabel, { color: colors.muted }]}>(Opcional · si no hay video, se usará la foto)</Text>
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  setSubiendoVid(true);
                  const v = await pickVideoB64();
                  if (v) setPVideo(v);
                  setSubiendoVid(false);
                }}
                disabled={subiendoVid}
                activeOpacity={0.85}
                style={{
                  borderWidth: 2, borderStyle: 'dashed', borderRadius: 18,
                  borderColor: pVideo ? colors.accent : '#334155',
                  height: 140, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: pVideo ? `${colors.accent}10` : 'transparent',
                }}
              >
                {subiendoVid ? (
                  <ActivityIndicator color={colors.accent} />
                ) : pVideo ? (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={40} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontWeight: '800', marginTop: 6 }}>Video listo</Text>
                    <TouchableOpacity onPress={() => setPVideo(null)} style={{ marginTop: 4 }}>
                      <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Quitar video</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', padding: 12 }}>
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${colors.accent}18`, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="cloud-upload-outline" size={28} color={colors.accent} />
                    </View>
                    <Text style={{ color: '#F1F5F9', fontWeight: '800', fontSize: 13 }}>Subir video del reel</Text>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>Hasta 60s · MP4 o MOV</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[S.primaryBtn, { backgroundColor: guardando ? colors.muted : colors.accent, marginTop: Spacing.md }]}
            onPress={crearProducto}
            disabled={guardando}
            activeOpacity={0.88}
          >
            {guardando ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={S.primaryBtnTxt}>Crear producto</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:     { flex: 1 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Empty store
  emptyStore:  { alignItems: 'center', padding: Spacing.xl },
  emptyStoreBg:{ width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyTitle:  { fontSize: Fonts.title, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: -0.4 },
  emptySub:    { fontSize: Fonts.regular, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl, fontWeight: '500', paddingHorizontal: Spacing.md },

  // Buttons
  primaryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: Radius.md + 4, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  primaryBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.regular + 1, letterSpacing: 0.1 },

  // Banner
  bannerGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  bannerEditBtn:  { position: 'absolute', bottom: 12, right: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  bannerEditTxt:  { color: '#FFF', fontSize: Fonts.small - 1, fontWeight: '700' },

  // Logo
  infoCard:   { marginHorizontal: Spacing.md, marginTop: -30, borderRadius: Radius.lg, padding: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginBottom: Spacing.sm },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  logoWrap:   { position: 'relative', marginTop: -LOGO_SZ / 2 - 10 },
  logoImg:    { width: LOGO_SZ, height: LOGO_SZ, borderRadius: LOGO_SZ / 2, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  logoInitial:{ color: '#FFF', fontWeight: '900', fontSize: 30 },
  logoEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  storeName:  { fontSize: Fonts.title - 2, fontWeight: '900', letterSpacing: -0.4, marginBottom: 4 },
  storeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  storeMeta:  { fontSize: Fonts.small + 1, fontWeight: '500' },
  editStoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1.5 },
  editStoreTxt: { fontSize: Fonts.small, fontWeight: '800' },

  // Stats row
  statsRow:  { flexDirection: 'row', gap: Spacing.xs },
  statCard:  { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statIcon:  { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statVal:   { fontSize: Fonts.regular, fontWeight: '900', letterSpacing: -0.3 },
  statLbl:   { fontSize: 9, fontWeight: '700', marginTop: 2 },

  // Tabs
  tabBar:     { flexDirection: 'row', margin: Spacing.md, borderRadius: Radius.pill, padding: 5, borderWidth: 1.5 },
  tabBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: Radius.pill },
  tabBtnActive: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  tabTxt:     { fontWeight: '800', fontSize: Fonts.small },

  // Section
  section: { paddingHorizontal: Spacing.md },
  sectionLabel: { fontSize: Fonts.small + 1, fontWeight: '800', marginTop: Spacing.md, marginBottom: 8 },
  optLabel: { fontWeight: '500' },

  // Empty tab
  emptyTab:    { alignItems: 'center', padding: Spacing.xl, borderRadius: Radius.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  emptyTabTitle: { fontSize: Fonts.title - 4, fontWeight: '900' },
  emptyTabSub:   { fontSize: Fonts.regular, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
  emptyTabBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md },
  emptyTabBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.regular - 1 },

  // Product grid
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  prodCard: {
    width: (W - Spacing.md * 2 - Spacing.sm) / 2,
    borderRadius: Radius.md + 2, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  prodBadge:    { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  prodBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  prodBadgeTxt: { fontSize: 9, fontWeight: '800' },
  prodInfo:     { padding: Spacing.sm },
  prodName:     { fontSize: Fonts.small + 1, fontWeight: '800', marginBottom: 2, letterSpacing: -0.2, lineHeight: 17 },
  prodPrice:    { fontSize: Fonts.regular + 1, fontWeight: '900', marginBottom: 6 },
  prodMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prodCatChip:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.pill },
  prodCatTxt:   { fontSize: 8, fontWeight: '900' },
  prodStock:    { fontSize: 9, fontWeight: '600' },
  prodActions:  { flexDirection: 'row', gap: Spacing.xs },
  prodActionBtn:{ flex: 1, height: 30, borderRadius: Radius.sm + 2, justifyContent: 'center', alignItems: 'center' },

  // Order cards
  orderCard:   { borderRadius: Radius.md + 2, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.sm, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  orderStatusDot: { width: 8, height: 8, borderRadius: 4 },
  orderId:     { flex: 1, fontWeight: '800', fontSize: Fonts.regular - 1 },
  orderBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  orderBadgeTxt: { fontSize: 10, fontWeight: '800' },
  orderBody:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  orderClient: { fontWeight: '700', fontSize: Fonts.regular - 1, marginBottom: 2 },
  orderMeta:   { fontSize: Fonts.small - 1, fontWeight: '500' },
  orderTotal:  { fontSize: Fonts.title - 4, fontWeight: '900' },
  orderAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14 },
  orderActionTxt: { color: '#FFF', fontWeight: '800', fontSize: Fonts.small + 1 },

  // FAB
  fab: {
    position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },

  // Profile FAB (cerrar sesión / refrescar rol)
  profileFab: {
    position: 'absolute', right: 16, zIndex: 100,
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },

  // Modal
  modal:    { flex: 1 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  modalTitle: { fontSize: Fonts.title - 2, fontWeight: '900', letterSpacing: -0.4 },
  modalSub:   { fontSize: Fonts.small + 1, fontWeight: '500', marginTop: 3 },
  closeBtn:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Premium Input
  piWrap:  { marginBottom: Spacing.sm },
  piLabel: { fontSize: Fonts.small + 1, fontWeight: '700', marginBottom: 6 },
  piRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1.5, paddingHorizontal: Spacing.md, minHeight: 50 },
  piIcon:  { marginRight: 10 },
  piInput: { flex: 1, fontSize: Fonts.regular, fontWeight: '500', paddingVertical: Platform.OS === 'ios' ? 12 : 8 },

  // Dropdown
  dropdown:  { borderWidth: 1.5, borderRadius: Radius.md, marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  dropItem:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 11 },
  dropTxt:   { fontSize: Fonts.regular - 1, fontWeight: '600' },

  // Upload zone
  uploadZone:      { borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  uploadEditOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end', alignItems: 'flex-end', padding: 10 },
  uploadEditBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  uploadEditTxt:   { color: '#FFF', fontSize: Fonts.small - 1, fontWeight: '700' },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, padding: Spacing.md },
  uploadIconCircle:  { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  uploadLabel:     { fontSize: Fonts.regular - 1, fontWeight: '700', textAlign: 'center' },
  uploadSub:       { fontSize: Fonts.small - 1, color: '#64748B', fontWeight: '500', textAlign: 'center' },
  uploadDashedBadge: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  uploadDashedTxt:   { fontSize: Fonts.small, fontWeight: '800' },

  // Reel toggle
  reelToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  reelBox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  reelTitle:  { fontWeight: '700', fontSize: Fonts.regular - 1 },
  reelSub:    { fontSize: Fonts.small - 1, fontWeight: '500', marginTop: 2 },

  // Map
  mapView: { width: '100%', height: 220, borderRadius: Radius.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: '#1E293B' },
});
