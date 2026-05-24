import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Image, Alert, RefreshControl, ActivityIndicator,
  FlatList, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints, API_URL } from '@/services/api';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { Tienda, Producto, Pedido, EstadoPedido } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAuth } from '@/context/AuthContext';

const { width: W } = Dimensions.get('window');

type Tab = 'productos' | 'pedidos';

interface RespTiendas  { ok: boolean; tiendas?: Tienda[] }
interface RespProductos { ok: boolean; productos?: Producto[] }
interface RespVentas   { ok: boolean; pedidos?: Pedido[] }
interface RespGen      { ok: boolean; error?: string }

const MUNICIPIOS = [
  'San Salvador','Santa Ana','Mejicanos','Soyapango','San Miguel',
  'Apopa','Nueva San Salvador','Zacatecoluca','Ahuachapán','San Vicente',
  'La Unión','Chalatenango','Antiguo Cuscatlán','Ilopango','Tonacatepeque',
  'Quezaltepeque','San Marcos','Aguilares','Suchitoto',
];

const CATEGORIAS = [
  'Comida','Bebidas','Panadería','Artesanías','Ropa','Electrónica',
  'Mascotas','Salud','Hogar','Deportes','Otro',
];

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
}

async function pickB64(aspect?: [number, number]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true, quality: 0.65,
    allowsEditing: true,
    aspect: aspect ?? [1, 1],
  });
  if (r.canceled || !r.assets[0].base64) return null;
  return `data:image/jpeg;base64,${r.assets[0].base64}`;
}

const ESTADO_COLOR: Record<string, string> = {
  preparacion: '#F59E0B',
  en_camino:   '#3B82F6',
  entregado:   '#10B981',
  cancelado:   '#EF4444',
  rechazado_repartidor: '#EF4444',
};

// ─── Sub-componentes ──────────────────────────────────────

function StoreHeader({
  tienda, onEditBanner, onEditLogo, onEdit,
}: { tienda: Tienda; onEditBanner: () => void; onEditLogo: () => void; onEdit: () => void }) {
  const rating = tienda.calificacion_promedio ?? 0;
  const stars  = Math.round(rating);
  return (
    <View>
      {/* Banner */}
      <TouchableOpacity onPress={onEditBanner} activeOpacity={0.85} style={styles.bannerWrap}>
        {tienda.portada
          ? <Image source={{ uri: imgUri(tienda.portada) }} style={styles.banner} />
          : <View style={[styles.banner, styles.bannerPlaceholder]}>
              <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.5)" />
              <Text style={styles.bannerPlaceholderTxt}>Toca para agregar banner</Text>
            </View>
        }
        <View style={styles.bannerOverlay} />
        <View style={styles.bannerEditBtn}>
          <Ionicons name="camera-outline" size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Logo + Info row */}
      <View style={styles.infoRow}>
        <TouchableOpacity onPress={onEditLogo} style={styles.logoWrap} activeOpacity={0.85}>
          {tienda.logo
            ? <Image source={{ uri: imgUri(tienda.logo) }} style={styles.logo} />
            : <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={styles.logoInitial}>{tienda.nombre.charAt(0).toUpperCase()}</Text>
              </View>
          }
          <View style={styles.logoEditBadge}>
            <Ionicons name="camera" size={10} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.storeName} numberOfLines={1}>{tienda.nombre}</Text>
          <Text style={styles.storeLoc}>
            <Ionicons name="location-sharp" size={12} color={Colors.accent} /> {tienda.municipio}
            {tienda.categoria ? ` · ${tienda.categoria}` : ''}
          </Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(i => (
              <Ionicons
                key={i}
                name={i <= stars ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
                size={13}
                color="#F59E0B"
                style={{ marginRight: 1 }}
              />
            ))}
            <Text style={styles.ratingTxt}>
              {' '}{rating > 0 ? rating.toFixed(1) : 'Sin calificaciones'}{tienda.total_resenas ? ` (${tienda.total_resenas})` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onEdit} style={styles.editBtn} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={18} color={Colors.accent} />
          <Text style={styles.editBtnTxt}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        {[
          { label: 'Productos',  value: tienda.total_resenas !== undefined ? '—' : '—' },
          { label: 'Ventas',     value: String(tienda.ventas_completadas ?? 0) },
          { label: 'Calific.',   value: rating > 0 ? `${rating.toFixed(1)}⭐` : '—' },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {tienda.hora_apertura && tienda.hora_cierre && (
        <Text style={styles.horario}>
          <Ionicons name="time-outline" size={12} color={Colors.muted} /> {tienda.hora_apertura} — {tienda.hora_cierre}
        </Text>
      )}
    </View>
  );
}

function ProductCard({ p, onDelete }: { p: Producto; onDelete: () => void }) {
  return (
    <View style={styles.prodCard}>
      <View style={styles.prodImgWrap}>
        {p.imagen
          ? <Image source={{ uri: imgUri(p.imagen) }} style={styles.prodImg} />
          : <View style={[styles.prodImg, { backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="cube-outline" size={28} color={Colors.muted} />
            </View>
        }
        {!p.activo && (
          <View style={styles.inactiveBadge}><Text style={styles.inactiveTxt}>INACTIVO</Text></View>
        )}
      </View>
      <View style={styles.prodInfo}>
        <Text style={styles.prodName} numberOfLines={2}>{p.nombre}</Text>
        <Text style={styles.prodPrice}>${Number(p.precio).toFixed(2)}</Text>
        <View style={styles.prodMeta}>
          <Text style={styles.prodMetaTxt}>{p.categoria}</Text>
          <Text style={styles.prodMetaTxt}>Stock: {p.stock}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
          <Text style={styles.deleteTxt}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────

export default function SellerScreen() {
  const { colors } = useTheme();
  const { t }      = useLang();
  const { usuario } = useAuth();
  const insets     = useSafeAreaInsets();

  const [tab, setTab]           = useState<Tab>('productos');
  const [tienda, setTienda]     = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas]     = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);

  // modals
  const [modalCrearTienda, setModalCrearTienda] = useState(false);
  const [modalEditTienda, setModalEditTienda]   = useState(false);
  const [modalProd, setModalProd]               = useState(false);

  // campos nueva tienda
  const [tNombre, setTNombre] = useState('');
  const [tDesc, setTDesc]     = useState('');
  const [tMun, setTMun]       = useState('San Salvador');
  const [tDir, setTDir]       = useState('');
  const [tLat, setTLat]       = useState(13.6929);
  const [tLng, setTLng]       = useState(-89.2182);

  // campos edición tienda
  const [ePortada, setEPortada]     = useState<string | null>(null);
  const [eLogo, setELogo]           = useState<string | null>(null);
  const [eNombre, setENombre]       = useState('');
  const [eDesc, setEDesc]           = useState('');
  const [eMun, setEMun]             = useState('');
  const [eDir, setEDir]             = useState('');
  const [eApertura, setEApertura]   = useState('');
  const [eCierre, setECierre]       = useState('');
  const [eCategoria, setECategoria] = useState('');
  const [eShowMunicipios, setEShowMunicipios] = useState(false);
  const [eShowCategorias, setEShowCategorias] = useState(false);

  // campos nuevo producto
  const [pNombre, setPNombre]   = useState('');
  const [pDesc, setPDesc]       = useState('');
  const [pPrecio, setPPrecio]   = useState('');
  const [pStock, setPStock]     = useState('10');
  const [pCat, setPCat]         = useState('General');
  const [pImg, setPImg]         = useState<string | null>(null);
  const [pReel, setPReel]       = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const rt = await api<RespTiendas>(Endpoints.vendedorTiendas);
      if (rt.ok && rt.tiendas && rt.tiendas.length > 0) setTienda(rt.tiendas[0]);
      else setTienda(null);

      const rp = await api<RespProductos>(Endpoints.vendedorProductos);
      if (rp.ok && rp.productos) setProductos(rp.productos);

      const rv = await api<RespVentas>(Endpoints.vendedorVentas);
      if (rv.ok && rv.pedidos) setVentas(rv.pedidos);
    } catch {}
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // ── Tienda actions ──
  async function crearTienda() {
    if (!tNombre || !tMun) return Alert.alert('Faltan datos', 'Nombre y municipio son requeridos');
    const r = await api<RespGen>(Endpoints.vendedorCrearTienda, {
      body: { nombre: tNombre, descripcion: tDesc, municipio: tMun, direccion: tDir, lat: tLat, lng: tLng }
    });
    if (r.ok) { setModalCrearTienda(false); setTNombre(''); setTDesc(''); setTDir(''); await cargar(); }
    else Alert.alert('Error', r.error ?? 'No se pudo crear');
  }

  function abrirEditarTienda() {
    if (!tienda) return;
    setENombre(tienda.nombre);
    setEDesc(tienda.descripcion ?? '');
    setEMun(tienda.municipio);
    setEDir(tienda.direccion ?? '');
    setEApertura(tienda.hora_apertura ?? '');
    setECierre(tienda.hora_cierre ?? '');
    setECategoria(tienda.categoria ?? '');
    setEPortada(null);
    setELogo(null);
    setModalEditTienda(true);
  }

  async function guardarTienda() {
    if (!tienda) return;
    const body: Record<string, unknown> = {
      tienda_id: tienda.id,
      nombre:       eNombre   || null,
      descripcion:  eDesc     || null,
      municipio:    eMun      || null,
      direccion:    eDir      || null,
      hora_apertura: eApertura || null,
      hora_cierre:   eCierre  || null,
      categoria:    eCategoria || null,
    };
    if (ePortada) body.portada = ePortada;
    if (eLogo)    body.logo    = eLogo;
    const r = await api<RespGen>(Endpoints.vendedorActualizarTienda, { body });
    if (r.ok) { setModalEditTienda(false); await cargar(); }
    else Alert.alert('Error', r.error ?? 'No se pudo guardar');
  }

  async function editarBanner() {
    const img = await pickB64([16, 6]);
    if (!img || !tienda) return;
    await api<RespGen>(Endpoints.vendedorActualizarTienda, {
      body: { tienda_id: tienda.id, portada: img }
    });
    await cargar();
  }

  async function editarLogo() {
    const img = await pickB64([1, 1]);
    if (!img || !tienda) return;
    await api<RespGen>(Endpoints.vendedorActualizarTienda, {
      body: { tienda_id: tienda.id, logo: img }
    });
    await cargar();
  }

  // ── Producto actions ──
  async function crearProducto() {
    if (!pNombre || !pPrecio || !tienda) return Alert.alert('Faltan datos');
    const r = await api<RespGen>(Endpoints.vendedorCrearProducto, {
      body: {
        tienda_id: tienda.id,
        nombre: pNombre, descripcion: pDesc,
        precio: parseFloat(pPrecio),
        stock: parseInt(pStock, 10) || 0,
        categoria: pCat,
        imagen: pImg,
        es_reel: pReel ? 1 : 0,
      }
    });
    if (r.ok) {
      setModalProd(false);
      setPNombre(''); setPDesc(''); setPPrecio(''); setPStock('10'); setPImg(null); setPReel(false);
      await cargar();
    } else Alert.alert('Error', r.error ?? 'No se pudo crear');
  }

  async function eliminarProducto(id: number) {
    Alert.alert('Eliminar', '¿Desactivar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await api<RespGen>(Endpoints.vendedorActualizarProducto, {
          body: { producto_id: id, activo: 0 }
        });
        await cargar();
      }},
    ]);
  }

  async function cambiarEstadoPedido(pedidoId: number, estado: EstadoPedido) {
    await api<RespGen>(Endpoints.vendedorPreparar, { body: { pedido_id: pedidoId, estado } });
    await cargar();
  }

  // ─────────────── RENDER ───────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sin tienda ── */}
        {!tienda && !cargando && (
          <View style={[styles.emptyStoreWrap, { paddingTop: insets.top + 20 }]}>
            <View style={[styles.emptyStoreIcon, { backgroundColor: colors.accentLight }]}>
              <Text style={{ fontSize: 48 }}>🏪</Text>
            </View>
            <Text style={[styles.emptyStoreTitle, { color: colors.text }]}>
              Crea tu primera tienda
            </Text>
            <Text style={[styles.emptyStoreSub, { color: colors.muted }]}>
              Configura tu negocio en [SV]Go y empieza a vender en minutos
            </Text>
            <Button
              label="Crear mi tienda"
              icon="add-circle-outline"
              onPress={() => setModalCrearTienda(true)}
            />
          </View>
        )}

        {/* ── Header de tienda ── */}
        {tienda && (
          <>
            <StoreHeader
              tienda={tienda}
              onEditBanner={editarBanner}
              onEditLogo={editarLogo}
              onEdit={abrirEditarTienda}
            />

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['productos', 'pedidos'] as Tab[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && styles.tabBtnAct]}
                  onPress={() => setTab(t)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={t === 'productos'
                      ? (tab === t ? 'grid' : 'grid-outline')
                      : (tab === t ? 'receipt' : 'receipt-outline')}
                    size={16}
                    color={tab === t ? Colors.contrast : colors.muted}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.tabBtnTxt, { color: tab === t ? Colors.contrast : colors.muted }]}>
                    {t === 'productos' ? 'Productos' : 'Pedidos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Productos ── */}
            {tab === 'productos' && (
              <View style={styles.sectionWrap}>
                {productos.length === 0 && !cargando
                  ? <View style={styles.emptyTab}>
                      <Ionicons name="cube-outline" size={40} color={Colors.muted} />
                      <Text style={[styles.emptyTabTxt, { color: colors.muted }]}>Sin productos aún</Text>
                    </View>
                  : (
                    <View style={styles.prodGrid}>
                      {productos.map(p => (
                        <ProductCard key={p.id} p={p} onDelete={() => eliminarProducto(p.id)} />
                      ))}
                    </View>
                  )
                }
              </View>
            )}

            {/* ── Pedidos ── */}
            {tab === 'pedidos' && (
              <View style={styles.sectionWrap}>
                {ventas.length === 0 && !cargando
                  ? <View style={styles.emptyTab}>
                      <Ionicons name="receipt-outline" size={40} color={Colors.muted} />
                      <Text style={[styles.emptyTabTxt, { color: colors.muted }]}>Sin pedidos por ahora</Text>
                    </View>
                  : ventas.map(v => (
                    <View key={v.id} style={[styles.pedidoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.pedidoHead}>
                        <View>
                          <Text style={[styles.pedidoId, { color: colors.text }]}>Pedido #{v.id}</Text>
                          <Text style={[styles.pedidoSub, { color: colors.muted }]}>{v.comprador_nombre}</Text>
                        </View>
                        <View>
                          <Text style={[styles.pedidoTotal, { color: Colors.accent }]}>${Number(v.total).toFixed(2)}</Text>
                          <View style={[styles.estadoBadge, { backgroundColor: ESTADO_COLOR[v.estado] ?? Colors.muted }]}>
                            <Text style={styles.estadoTxt}>{v.estado.replace('_', ' ').toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={[styles.pedidoMeta, { color: colors.muted }]}>Pago: {v.metodo_pago}</Text>
                      {v.estado === 'preparacion' && (
                        <TouchableOpacity
                          style={styles.marcarListoBtn}
                          onPress={() => cambiarEstadoPedido(v.id, 'en_camino')}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.marcarListoTxt}>Listo para envío</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                }
              </View>
            )}
          </>
        )}

        {cargando && <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.lg }} />}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB agregar producto */}
      {tienda && tab === 'productos' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => setModalProd(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ═══════════════════ MODAL: Crear Tienda ═══════════════════ */}
      <Modal visible={modalCrearTienda} animationType="slide" onRequestClose={() => setModalCrearTienda(false)}>
        <ScrollView style={[styles.modal, { backgroundColor: colors.background }]}
          contentContainerStyle={{ padding: Spacing.md, paddingTop: insets.top + 16, paddingBottom: 60 }}>
          <View style={styles.modalHead}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Tienda</Text>
            <TouchableOpacity onPress={() => setModalCrearTienda(false)}>
              <Ionicons name="close" size={28} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <Input label="Nombre de la tienda" icon="storefront-outline" value={tNombre} onChangeText={setTNombre} placeholder="Ej. Panadería El Trigal" />
          <Input label="Descripción" icon="document-text-outline" value={tDesc} onChangeText={setTDesc} multiline placeholder="¿Qué vendes?" />
          <Input label="Municipio" icon="location-outline" value={tMun} onChangeText={setTMun} placeholder="San Salvador" />
          <Input label="Dirección exacta" icon="map-outline" value={tDir} onChangeText={setTDir} placeholder="Calle, número..." />
          <Text style={[styles.mapLbl, { color: colors.muted }]}>Toca el mapa para fijar tu ubicación</Text>
          <MapView
            style={styles.map}
            initialRegion={{ latitude: tLat, longitude: tLng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            onPress={(e: MapPressEvent) => { setTLat(e.nativeEvent.coordinate.latitude); setTLng(e.nativeEvent.coordinate.longitude); }}
          >
            <Marker coordinate={{ latitude: tLat, longitude: tLng }} />
          </MapView>
          <Button label="Crear tienda" icon="storefront-outline" onPress={crearTienda} />
        </ScrollView>
      </Modal>

      {/* ═══════════════════ MODAL: Editar Tienda ═══════════════════ */}
      <Modal visible={modalEditTienda} animationType="slide" transparent onRequestClose={() => setModalEditTienda(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>
              <View style={styles.modalHead}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Tienda</Text>
                <TouchableOpacity onPress={() => setModalEditTienda(false)}>
                  <Ionicons name="close" size={26} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Banner preview */}
              <Text style={[styles.fieldLbl, { color: colors.text }]}>Banner</Text>
              <TouchableOpacity
                style={[styles.bannerPickWrap, { borderColor: ePortada ? Colors.accent : colors.border }]}
                onPress={async () => { const r = await pickB64([16, 6]); if (r) setEPortada(r); }}
                activeOpacity={0.8}
              >
                {ePortada
                  ? <Image source={{ uri: ePortada }} style={styles.bannerPickPreview} />
                  : <View style={styles.bannerPickPlaceholder}>
                      <Ionicons name="image-outline" size={28} color={ePortada ? Colors.accent : colors.muted} />
                      <Text style={[styles.pickTxt, { color: colors.muted }]}>Cambiar banner (16:6)</Text>
                    </View>
                }
              </TouchableOpacity>

              {/* Logo preview */}
              <Text style={[styles.fieldLbl, { color: colors.text }]}>Logo / Foto de perfil</Text>
              <TouchableOpacity
                style={[styles.logoPickWrap, { borderColor: eLogo ? Colors.accent : colors.border }]}
                onPress={async () => { const r = await pickB64([1, 1]); if (r) setELogo(r); }}
                activeOpacity={0.8}
              >
                {eLogo
                  ? <Image source={{ uri: eLogo }} style={styles.logoPickPreview} />
                  : <View style={styles.bannerPickPlaceholder}>
                      <Ionicons name="storefront-outline" size={28} color={colors.muted} />
                      <Text style={[styles.pickTxt, { color: colors.muted }]}>Cambiar logo (1:1)</Text>
                    </View>
                }
              </TouchableOpacity>

              <Input label="Nombre" icon="storefront-outline" value={eNombre} onChangeText={setENombre} />
              <Input label="Descripción" icon="document-text-outline" value={eDesc} onChangeText={setEDesc} multiline />
              <Input label="Dirección" icon="map-outline" value={eDir} onChangeText={setEDir} />

              {/* Municipio selector */}
              <Text style={[styles.fieldLbl, { color: colors.text }]}>Municipio</Text>
              <TouchableOpacity
                style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setEShowMunicipios(!eShowMunicipios)}
              >
                <Text style={[styles.selectorTxt, { color: colors.text }]}>{eMun || 'Seleccionar municipio'}</Text>
                <Ionicons name={eShowMunicipios ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </TouchableOpacity>
              {eShowMunicipios && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {MUNICIPIOS.map(m => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => { setEMun(m); setEShowMunicipios(false); }}
                      style={[styles.dropdownItem, eMun === m && { backgroundColor: colors.accentLight }]}
                    >
                      <Text style={[styles.dropdownTxt, { color: eMun === m ? Colors.accent : colors.text }]}>
                        {eMun === m ? '✓ ' : ''}{m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Categoría */}
              <Text style={[styles.fieldLbl, { color: colors.text }]}>Categoría</Text>
              <TouchableOpacity
                style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setEShowCategorias(!eShowCategorias)}
              >
                <Text style={[styles.selectorTxt, { color: colors.text }]}>{eCategoria || 'Seleccionar categoría'}</Text>
                <Ionicons name={eShowCategorias ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </TouchableOpacity>
              {eShowCategorias && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {CATEGORIAS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => { setECategoria(c); setEShowCategorias(false); }}
                      style={[styles.dropdownItem, eCategoria === c && { backgroundColor: colors.accentLight }]}
                    >
                      <Text style={[styles.dropdownTxt, { color: eCategoria === c ? Colors.accent : colors.text }]}>
                        {eCategoria === c ? '✓ ' : ''}{c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Horario */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input label="Apertura" icon="time-outline" value={eApertura} onChangeText={setEApertura} placeholder="08:00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Cierre" icon="time-outline" value={eCierre} onChangeText={setECierre} placeholder="18:00" />
                </View>
              </View>

              <Button label="Guardar cambios" icon="save-outline" onPress={guardarTienda} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════ MODAL: Nuevo Producto ═══════════════════ */}
      <Modal visible={modalProd} animationType="slide" onRequestClose={() => setModalProd(false)}>
        <ScrollView style={[styles.modal, { backgroundColor: colors.background }]}
          contentContainerStyle={{ padding: Spacing.md, paddingTop: insets.top + 16, paddingBottom: 60 }}>
          <View style={styles.modalHead}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Producto</Text>
            <TouchableOpacity onPress={() => setModalProd(false)}>
              <Ionicons name="close" size={28} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Imagen producto */}
          <Text style={[styles.fieldLbl, { color: colors.text }]}>Foto del producto</Text>
          <TouchableOpacity
            style={[styles.prodImgPicker, { borderColor: pImg ? Colors.accent : colors.border, backgroundColor: colors.background }]}
            onPress={async () => { const r = await pickB64([4, 3]); if (r) setPImg(r); }}
            activeOpacity={0.8}
          >
            {pImg
              ? <Image source={{ uri: pImg }} style={styles.prodImgPickerPreview} />
              : <View style={styles.bannerPickPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={pImg ? Colors.accent : colors.muted} />
                  <Text style={[styles.pickTxt, { color: colors.muted }]}>Subir foto (4:3)</Text>
                </View>
            }
          </TouchableOpacity>

          <Input label="Nombre del producto" icon="cube-outline"       value={pNombre}  onChangeText={setPNombre} placeholder="Ej. Pan de Coco" />
          <Input label="Descripción"          icon="document-text-outline" value={pDesc}    onChangeText={setPDesc}   multiline />
          <Input label="Precio ($)"           icon="cash-outline"       value={pPrecio}  onChangeText={setPPrecio} keyboardType="decimal-pad" />
          <Input label="Stock disponible"     icon="layers-outline"     value={pStock}   onChangeText={setPStock}  keyboardType="numeric" />
          <Input label="Categoría"            icon="pricetag-outline"   value={pCat}     onChangeText={setPCat} />

          <TouchableOpacity style={styles.reelToggle} onPress={() => setPReel(!pReel)} activeOpacity={0.8}>
            <View style={[styles.reelToggleBox, { borderColor: Colors.accent, backgroundColor: pReel ? Colors.accent : 'transparent' }]}>
              {pReel && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.reelToggleTxt, { color: colors.text }]}>Publicar como Reel</Text>
          </TouchableOpacity>

          <Button label="Crear producto" icon="save-outline" onPress={crearProducto} />
        </ScrollView>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────

const BANNER_H = 180;
const LOGO_SIZE = 80;

const styles = StyleSheet.create({
  container:    { flex: 1 },
  // Empty store state
  emptyStoreWrap: { alignItems: 'center', padding: Spacing.xl, paddingTop: Spacing.xl },
  emptyStoreIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  emptyStoreTitle: { fontSize: Fonts.title, fontWeight: '900', marginBottom: Spacing.sm, letterSpacing: -0.5 },
  emptyStoreSub:  { fontSize: Fonts.small + 1, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl, fontWeight: '500' },
  // Banner
  bannerWrap:   { height: BANNER_H, position: 'relative' },
  banner:       { width: '100%', height: BANNER_H },
  bannerPlaceholder: { backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', gap: 8 },
  bannerPlaceholderTxt: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: Fonts.small },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, background: 'transparent' },
  bannerEditBtn: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  // Logo
  infoRow:  { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, paddingTop: Spacing.sm },
  logoWrap: { position: 'relative' },
  logo:     { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  logoPlaceholder: { backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  logoInitial: { color: '#fff', fontWeight: '900', fontSize: 28 },
  logoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.accent, borderRadius: 12, width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  storeName: { fontSize: Fonts.title - 2, fontWeight: '900', color: Colors.text, letterSpacing: -0.4 },
  storeLoc:  { fontSize: Fonts.small + 1, color: Colors.muted, marginTop: 2, fontWeight: '500' },
  starsRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingTxt: { fontSize: Fonts.small, color: Colors.muted, fontWeight: '600' },
  editBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.accent },
  editBtnTxt:{ fontSize: Fonts.small, fontWeight: '800', color: Colors.accent },
  // Stats
  statsBar:  { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statItem:  { flex: 1, alignItems: 'center' },
  statVal:   { fontSize: Fonts.title - 4, fontWeight: '900', color: Colors.accent },
  statLbl:   { fontSize: Fonts.small - 1, color: Colors.muted, fontWeight: '700', marginTop: 2 },
  horario:   { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, fontSize: Fonts.small, color: Colors.muted, fontWeight: '500' },
  // Tabs
  tabBar:    { flexDirection: 'row', margin: Spacing.md, borderRadius: Radius.pill, padding: 5, borderWidth: 1.5 },
  tabBtn:    { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  tabBtnAct: { backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  tabBtnTxt: { fontWeight: '800', fontSize: Fonts.small },
  // Content section
  sectionWrap: { paddingHorizontal: Spacing.md },
  emptyTab:    { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyTabTxt: { fontWeight: '600', fontSize: Fonts.regular },
  // Productos grid
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  prodCard: {
    width: (W - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  prodImgWrap:  { position: 'relative', height: 110 },
  prodImg:      { width: '100%', height: 110 },
  inactiveBadge:{ position: 'absolute', top: 6, left: 6, backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveTxt:  { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  prodInfo:     { padding: Spacing.sm },
  prodName:     { fontSize: Fonts.small + 1, fontWeight: '800', color: Colors.text, marginBottom: 2, letterSpacing: -0.2 },
  prodPrice:    { fontSize: Fonts.regular, fontWeight: '900', color: Colors.accent, marginBottom: 4 },
  prodMeta:     { flexDirection: 'row', justifyContent: 'space-between' },
  prodMetaTxt:  { fontSize: Fonts.small - 1, color: Colors.muted, fontWeight: '600' },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  deleteTxt:    { fontSize: Fonts.small - 1, color: '#EF4444', fontWeight: '700' },
  // Pedidos
  pedidoCard:  { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  pedidoHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  pedidoId:    { fontSize: Fonts.regular, fontWeight: '800', letterSpacing: -0.2 },
  pedidoSub:   { fontSize: Fonts.small, fontWeight: '500', marginTop: 2 },
  pedidoTotal: { fontSize: Fonts.regular, fontWeight: '900', textAlign: 'right' },
  pedidoMeta:  { fontSize: Fonts.small, fontWeight: '500', marginTop: 2 },
  estadoBadge: { alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  estadoTxt:   { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  marcarListoBtn: {
    marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#10B981', borderRadius: Radius.md, paddingVertical: 10,
  },
  marcarListoTxt: { color: '#fff', fontWeight: '800', fontSize: Fonts.small },
  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  // Modals
  modal:       { flex: 1 },
  modalHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle:  { fontSize: Fonts.title - 2, fontWeight: '900', letterSpacing: -0.3 },
  sheetOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  // Field
  fieldLbl:    { fontWeight: '800', fontSize: Fonts.small + 1, marginBottom: 8, marginTop: Spacing.md },
  pickTxt:     { fontSize: Fonts.small, fontWeight: '600', marginTop: 6 },
  // Banner/Logo pickers
  bannerPickWrap:    { height: 100, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', marginBottom: Spacing.sm },
  bannerPickPreview: { width: '100%', height: '100%' },
  bannerPickPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  logoPickWrap:    { width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', alignSelf: 'center', marginBottom: Spacing.sm },
  logoPickPreview: { width: '100%', height: '100%' },
  // Selector dropdown
  selector:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  selectorTxt: { fontSize: Fonts.regular, fontWeight: '600' },
  dropdownList:{ borderWidth: 1.5, borderRadius: Radius.md, marginBottom: Spacing.sm, maxHeight: 200, overflow: 'hidden' },
  dropdownItem:{ paddingHorizontal: 14, paddingVertical: 10 },
  dropdownTxt: { fontSize: Fonts.small + 1, fontWeight: '600' },
  // Prod img picker
  prodImgPicker:       { height: 140, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', marginBottom: Spacing.sm },
  prodImgPickerPreview:{ width: '100%', height: '100%' },
  // Reel toggle
  reelToggle:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, marginTop: Spacing.xs },
  reelToggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  reelToggleTxt: { fontWeight: '700', fontSize: Fonts.regular - 1 },
  // Map
  map:    { width: '100%', height: 200, borderRadius: Radius.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  mapLbl: { fontSize: Fonts.small, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
});
