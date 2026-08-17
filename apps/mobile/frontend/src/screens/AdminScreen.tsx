import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, Alert, RefreshControl, ActivityIndicator, Dimensions,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api, Endpoints, API_URL } from '@/services/api';
import { Spacing, Radius, Fonts, FontFamily } from '@/theme/colors';
import { useTheme, ColorPalette } from '@/context/ThemeContext';
import { SolicitudRol, ReporteSoporte, Pedido, UsuarioAdmin } from '@/types';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AdminArbolControl from '@/components/AdminArbolControl';

const { width: W } = Dimensions.get('window');

// Texto siempre blanco sobre superficies sólidas de color (header, badges rellenos) —
// coherente con ambos temas ya que esas superficies mantienen saturación en light y dark.
const ON_COLOR = '#FFFFFF';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = 'arbol' | 'solicitudes' | 'usuarios' | 'pedidos' | 'soporte';
type SolFiltro = 'pendiente' | 'aprobado' | 'rechazado' | 'todos';
type EstadoFiltro = 'todos' | 'preparacion' | 'en_camino' | 'entregado' | 'cancelado';
type RolFiltro = 'todos' | 'comprador' | 'vendedor' | 'repartidor' | 'admin';

interface RespStats {
  ok: boolean;
  stats?: {
    usuarios: number; compradores: number; vendedores: number; repartidores: number;
    pedidos: number; pedidos_hoy: number; ingresos_total: number;
    solicitudes_pendientes: number; soporte_abiertos: number;
    productos_activos: number; tiendas_activas: number;
  };
}
interface RespSolicitudes { ok: boolean; solicitudes?: SolicitudRol[] }
interface RespUsuarios { ok: boolean; usuarios?: UsuarioAdmin[] }
interface RespPedidos { ok: boolean; pedidos?: Pedido[] }
interface RespSoporte { ok: boolean; reportes?: ReporteSoporte[] }
interface RespOk { ok: boolean; error?: string }

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  // Extract relative path after /uploads/ and rebuild with current API_URL
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
}

function rolColor(rol: string, colors: ColorPalette): string {
  switch (rol) {
    case 'admin':      return '#7C3AED';
    case 'vendedor':   return colors.accent;
    case 'repartidor': return colors.warning;
    default:           return colors.muted;
  }
}

function rolIcon(rol: string): keyof typeof Ionicons.glyphMap {
  switch (rol) {
    case 'admin':      return 'shield-checkmark';
    case 'vendedor':   return 'storefront';
    case 'repartidor': return 'bicycle';
    default:           return 'person';
  }
}

function estadoColor(estado: string, colors: ColorPalette): string {
  switch (estado) {
    case 'preparacion': return colors.warning;
    case 'en_camino':   return colors.accent;
    case 'entregado':   return colors.success;
    default:            return colors.danger;
  }
}

function estadoIcon(estado: string): keyof typeof Ionicons.glyphMap {
  switch (estado) {
    case 'preparacion': return 'time-outline';
    case 'en_camino':   return 'bicycle-outline';
    case 'entregado':   return 'checkmark-circle';
    default:            return 'close-circle';
  }
}

function solicitudIcon(estado: string): keyof typeof Ionicons.glyphMap {
  switch (estado) {
    case 'aprobado':  return 'checkmark-circle';
    case 'rechazado': return 'close-circle';
    default:          return 'time-outline';
  }
}

function soporteColor(estado: string, colors: ColorPalette): string {
  switch (estado) {
    case 'abierto':    return colors.warning;
    case 'en_proceso': return colors.accent;
    default:           return colors.success;
  }
}

function soporteIcon(estado: string): keyof typeof Ionicons.glyphMap {
  switch (estado) {
    case 'abierto':    return 'alert-circle-outline';
    case 'en_proceso': return 'sync-outline';
    default:           return 'checkmark-circle';
  }
}

/** Status pill: fondo tintado ~15% del color semántico + ícono + texto en color pleno (patrón DESIGN.md). */
function StatusPill({ icon, label, color, big }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string; big?: boolean;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}26` }, big && styles.pillBig]}>
      <Ionicons name={icon} size={big ? 14 : 12} color={color} />
      <Text style={[styles.pillTxt, { color }, big && { fontSize: 13 }]}>{label}</Text>
    </View>
  );
}

function Chip({
  label, active, onPress, color,
}: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: colors.card, borderColor: colors.border },
        active && { backgroundColor: color ?? colors.accent, borderColor: color ?? colors.accent },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipTxt, { color: colors.muted }, active && { color: ON_COLOR }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Avatar({ src, nombre, size = 42 }: { src?: string | null; nombre: string; size?: number }) {
  const { colors } = useTheme();
  const [err, setErr] = useState(false);
  const uri = imgUri(src);
  if (uri && !err) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }]}>
      <Text style={{ color: ON_COLOR, fontFamily: FontFamily.displayExtraBold, fontSize: size * 0.38 }}>
        {nombre.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function AdminScreen() {
  const { cerrarSesion, usuario, refrescar } = useAuth();
  const { colors } = useTheme();
  // Refrescar rol al abrir
  useEffect(() => { void refrescar(); }, []);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [tab, setTab]           = useState<Tab>('solicitudes');
  const [stats, setStats]       = useState<RespStats['stats']>();
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [pedidos, setPedidos]   = useState<Pedido[]>([]);
  const [reportes, setReportes] = useState<ReporteSoporte[]>([]);
  const [cargando, setCargando] = useState(false);

  // Filtros
  const [solFiltro, setSolFiltro]       = useState<SolFiltro>('pendiente');
  const [rolFiltro, setRolFiltro]       = useState<RolFiltro>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [busqueda, setBusqueda]         = useState('');

  // Modales
  const [verSol, setVerSol]         = useState<SolicitudRol | null>(null);
  const [verUsuario, setVerUsuario] = useState<UsuarioAdmin | null>(null);
  const [verPedido, setVerPedido]   = useState<Pedido | null>(null);
  const [verRep, setVerRep]         = useState<ReporteSoporte | null>(null);
  const [notas, setNotas]           = useState('');
  const [respuesta, setRespuesta]   = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargarStats = useCallback(async () => {
    const r = await api<RespStats>(Endpoints.adminStats);
    if (r.ok) setStats(r.stats);
  }, []);

  const cargarSolicitudes = useCallback(async () => {
    const r = await api<RespSolicitudes>(Endpoints.adminSolicitudes(solFiltro));
    if (r.ok && r.solicitudes) setSolicitudes(r.solicitudes);
  }, [solFiltro]);

  const cargarUsuarios = useCallback(async (q: string, rol: RolFiltro) => {
    const r = await api<RespUsuarios>(Endpoints.adminUsuarios(q, rol));
    if (r.ok && r.usuarios) setUsuarios(r.usuarios);
  }, []);

  const cargarPedidos = useCallback(async () => {
    const r = await api<RespPedidos>(Endpoints.adminPedidos(estadoFiltro));
    if (r.ok && r.pedidos) setPedidos(r.pedidos);
  }, [estadoFiltro]);

  const cargarReportes = useCallback(async () => {
    const r = await api<RespSoporte>(Endpoints.adminSoporte);
    if (r.ok && r.reportes) setReportes(r.reportes);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    await cargarStats();
    switch (tab) {
      case 'solicitudes': await cargarSolicitudes(); break;
      case 'usuarios':    await cargarUsuarios(busqueda, rolFiltro); break;
      case 'pedidos':     await cargarPedidos(); break;
      case 'soporte':     await cargarReportes(); break;
    }
    setCargando(false);
  }, [tab, solFiltro, estadoFiltro, busqueda, rolFiltro, cargarStats, cargarSolicitudes, cargarUsuarios, cargarPedidos, cargarReportes]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Polling 10s para pedidos
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (tab === 'pedidos') {
      pollingRef.current = setInterval(() => { void cargarPedidos(); }, 10000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [tab, cargarPedidos]);

  // Debounce búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void cargarUsuarios(busqueda, rolFiltro); }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busqueda, rolFiltro, cargarUsuarios]);

  // ── Acciones ────────────────────────────────────────────────────────────────
  async function resolver(decision: 'aprobado' | 'rechazado'): Promise<void> {
    if (!verSol) return;
    const r = await api<RespOk>(Endpoints.adminResolver, {
      body: { solicitud_id: verSol.id, decision, notas },
    });
    if (r.ok) {
      Alert.alert('Listo', `Solicitud ${decision}`);
      setVerSol(null); setNotas('');
      await cargarSolicitudes();
    } else Alert.alert('Error', r.error ?? 'Falló');
  }

  async function toggleActivo(u: UsuarioAdmin): Promise<void> {
    const r = await api<RespOk>(Endpoints.adminActualizarUsuario, {
      body: { usuario_id: u.id, activo: u.activo ? 0 : 1 },
    });
    if (r.ok) {
      setVerUsuario(prev => prev ? { ...prev, activo: prev.activo ? 0 : 1 } : null);
      await cargarUsuarios(busqueda, rolFiltro);
    } else Alert.alert('Error', r.error ?? 'Falló');
  }

  async function cambiarRol(u: UsuarioAdmin, nuevoRol: string): Promise<void> {
    Alert.alert('Cambiar rol', `¿Cambiar a ${nuevoRol}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          const r = await api<RespOk>(Endpoints.adminActualizarUsuario, {
            body: { usuario_id: u.id, rol: nuevoRol },
          });
          if (r.ok) {
            setVerUsuario(prev => prev ? { ...prev, rol: nuevoRol } : null);
            await cargarUsuarios(busqueda, rolFiltro);
          } else Alert.alert('Error', r.error ?? 'Falló');
        },
      },
    ]);
  }

  async function cambiarEstadoPedido(pedidoId: number, estado: string): Promise<void> {
    const r = await api<RespOk>(Endpoints.adminActualizarPedido, {
      body: { pedido_id: pedidoId, estado },
    });
    if (r.ok) {
      setVerPedido(null);
      await cargarPedidos();
    } else Alert.alert('Error', r.error ?? 'Falló');
  }

  async function responderSoporte(): Promise<void> {
    if (!verRep || !respuesta) return;
    const r = await api<RespOk>(Endpoints.adminResponderSoporte, {
      body: { reporte_id: verRep.id, respuesta, estado: 'cerrado' },
    });
    if (r.ok) {
      Alert.alert('Listo', 'Respuesta enviada');
      setVerRep(null); setRespuesta('');
      await cargarReportes();
    } else Alert.alert('Error', r.error ?? 'Falló');
  }

  function cambiarTab(t: Tab): void {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(t);
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  function renderSolicitud(s: SolicitudRol, index: number) {
    return (
      <Animated.View key={s.id} entering={FadeInDown.delay(index * 40).springify()}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { setVerSol(s); setNotas(''); }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{s.nombre_completo}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Ionicons name={s.rol_solicitado === 'vendedor' ? 'storefront-outline' : 'bicycle-outline'} size={13} color={colors.muted} />
              <Text style={[styles.cardSub, { color: colors.muted, marginTop: 0 }]}>
                Quiere ser {s.rol_solicitado}{s.nombre_negocio ? ` · ${s.nombre_negocio}` : ''}
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.muted }]}>DUI {s.dui_numero}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <StatusPill
              icon={solicitudIcon(s.estado)}
              label={s.estado.toUpperCase()}
              color={s.estado === 'pendiente' ? colors.warning : s.estado === 'aprobado' ? colors.success : colors.danger}
            />
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderUsuario(u: UsuarioAdmin, index: number) {
    return (
      <Animated.View key={u.id} entering={FadeInDown.delay(index * 40).springify()}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setVerUsuario(u)}
          activeOpacity={0.8}
        >
          <Avatar src={u.foto_perfil} nombre={u.nombre} size={46} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{u.nombre}</Text>
              {!u.activo && <Ionicons name="ban" size={14} color={colors.danger} />}
            </View>
            <Text style={[styles.cardSub, { color: colors.muted }]} numberOfLines={1}>{u.username ? `@${u.username}` : u.email ?? u.telefono ?? '-'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: rolColor(u.rol, colors), flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name={rolIcon(u.rol)} size={11} color={ON_COLOR} />
            <Text style={[styles.badgeTxt, { color: ON_COLOR }]}>{u.rol.toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderPedido(p: Pedido, index: number) {
    return (
      <Animated.View key={p.id} entering={FadeInDown.delay(index * 40).springify()}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setVerPedido(p)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>#SV-{p.id} · ${Number(p.total).toFixed(2)}</Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>{p.comprador_nombre ?? '-'} → {p.vendedor_nombre ?? '-'}</Text>
            {p.items && p.items.length > 0 && (
              <Text style={[styles.cardSub, { color: colors.muted }]}>{p.items.length} ítem{p.items.length !== 1 ? 's' : ''}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <StatusPill icon={estadoIcon(p.estado)} label={p.estado.replace('_', ' ').toUpperCase()} color={estadoColor(p.estado, colors)} />
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  function renderReporte(r: ReporteSoporte, index: number) {
    return (
      <Animated.View key={r.id} entering={FadeInDown.delay(index * 40).springify()}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { setVerRep(r); setRespuesta(''); }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{r.asunto}</Text>
            <Text style={[styles.cardSub, { color: colors.muted }]} numberOfLines={2}>{r.descripcion}</Text>
            <Text style={[styles.cardSub, { color: colors.muted }]}>{r.usuario_nombre ?? '-'}</Text>
          </View>
          <StatusPill icon={soporteIcon(r.estado)} label={r.estado.toUpperCase()} color={soporteColor(r.estado, colors)} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.accent, paddingTop: insets.top + 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Ionicons name="shield-checkmark" size={22} color={ON_COLOR} />
          <View>
            <Text style={styles.headerTitle}>Panel Admin</Text>
            <Text style={styles.headerSub}>{usuario?.nombre}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              // Restablece la pila de navegación a Main → Home sin corromper la sesión
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Main', state: { index: 0, routes: [{ name: 'Home' }] } }],
                }),
              );
            }}
            style={styles.logoutBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back-circle-outline" size={22} color={ON_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { void refrescar(); Alert.alert('Listo', 'Rol refrescado'); }} style={styles.logoutBtn}>
            <Ionicons name="refresh-outline" size={22} color={ON_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={ON_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={colors.accent} />}>
        {/* ── Stats: KPI tiles (ícono+label → número Sora tabular) ── */}
        {stats && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            <Animated.View entering={FadeInDown.delay(0).springify()}>
              <StatCard icon="people" label="Usuarios" value={stats.usuarios} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(40).springify()}>
              <StatCard icon="storefront" label="Vendedores" value={stats.vendedores} color={colors.accent} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <StatCard icon="bicycle" label="Repartidores" value={stats.repartidores} color={colors.warning} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(120).springify()}>
              <StatCard icon="cart" label="Pedidos hoy" value={stats.pedidos_hoy} color={colors.success} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <StatCard icon="alert-circle" label="Pendientes" value={stats.solicitudes_pendientes} color={colors.ctaAccent} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <StatCard icon="headset" label="Soporte" value={stats.soporte_abiertos} color={colors.warning} />
            </Animated.View>
          </ScrollView>
        )}

        {/* ── Tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {(['arbol', 'solicitudes', 'usuarios', 'pedidos', 'soporte'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tabPill,
                { backgroundColor: colors.card, borderColor: colors.border },
                tab === t && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => cambiarTab(t)}
            >
              <Text style={[styles.tabPillTxt, { color: colors.muted }, tab === t && { color: ON_COLOR }]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── ÁRBOL DE CONTROL ── */}
        {tab === 'arbol' && <AdminArbolControl />}

        {/* ── Solicitudes ── */}
        {tab === 'solicitudes' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['pendiente', 'aprobado', 'rechazado', 'todos'] as SolFiltro[]).map(f => (
                <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={solFiltro === f} onPress={() => setSolFiltro(f)} />
              ))}
            </ScrollView>
            {solicitudes.length === 0 && !cargando
              ? <Text style={[styles.vacio, { color: colors.muted }]}>Sin solicitudes {solFiltro !== 'todos' ? solFiltro + 's' : ''}</Text>
              : solicitudes.map((s, i) => renderSolicitud(s, i))}
          </>
        )}

        {/* ── Usuarios ── */}
        {tab === 'usuarios' && (
          <>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre, email o @username..."
                placeholderTextColor={colors.muted}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['todos', 'comprador', 'vendedor', 'repartidor', 'admin'] as RolFiltro[]).map(f => (
                <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={rolFiltro === f} onPress={() => setRolFiltro(f)} color={rolColor(f, colors)} />
              ))}
            </ScrollView>
            {usuarios.length === 0 && !cargando
              ? <Text style={[styles.vacio, { color: colors.muted }]}>Sin usuarios</Text>
              : usuarios.map((u, i) => renderUsuario(u, i))}
          </>
        )}

        {/* ── Pedidos ── */}
        {tab === 'pedidos' && (
          <>
            <View style={styles.pollingRow}>
              <Ionicons name="sync" size={14} color={colors.success} />
              <Text style={[styles.pollingTxt, { color: colors.success }]}>Actualizando cada 10s</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['todos', 'preparacion', 'en_camino', 'entregado', 'cancelado'] as EstadoFiltro[]).map(f => (
                <Chip key={f} label={f === 'todos' ? 'Todos' : f.replace('_', ' ')} active={estadoFiltro === f} onPress={() => setEstadoFiltro(f)} color={f !== 'todos' ? estadoColor(f, colors) : undefined} />
              ))}
            </ScrollView>
            {pedidos.length === 0 && !cargando
              ? <Text style={[styles.vacio, { color: colors.muted }]}>Sin pedidos</Text>
              : pedidos.map((p, i) => renderPedido(p, i))}
          </>
        )}

        {/* ── Soporte ── */}
        {tab === 'soporte' && (
          <>
            {reportes.length === 0 && !cargando
              ? <Text style={[styles.vacio, { color: colors.muted }]}>Sin tickets de soporte</Text>
              : reportes.map((r, i) => renderReporte(r, i))}
          </>
        )}

        {cargando && <ActivityIndicator color={colors.accent} style={{ marginVertical: Spacing.md }} />}
        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>

      {/* ── MODAL: Solicitud ── */}
      <Modal visible={!!verSol} animationType="slide" onRequestClose={() => setVerSol(null)}>
        {verSol ? (
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} contentContainerStyle={styles.modalContent}>
            <ModalHeader title={verSol.nombre_completo} onClose={() => setVerSol(null)} />

            <KV label="Solicita" value={verSol.rol_solicitado} />
            <KV label="DUI" value={verSol.dui_numero} />
            {verSol.email && <KV label="Email" value={verSol.email} />}
            {verSol.telefono && <KV label="Tel" value={verSol.telefono} />}
            {verSol.credenciales ? <KV label="Credenciales" value={verSol.credenciales} /> : null}

            {/* Fotos DUI */}
            <SectionLabel>DUI Frente</SectionLabel>
            <Photo uri={imgUri(verSol.dui_frente)} />
            <SectionLabel>DUI Reverso</SectionLabel>
            <Photo uri={imgUri(verSol.dui_reverso)} />

            {/* Extra vendedor */}
            {verSol.rol_solicitado === 'vendedor' && (
              <>
                {verSol.nombre_negocio && <KV label="Nombre del negocio" value={verSol.nombre_negocio} />}
                {verSol.foto_negocio && (
                  <>
                    <SectionLabel>Foto del negocio</SectionLabel>
                    <Photo uri={imgUri(verSol.foto_negocio)} />
                  </>
                )}
              </>
            )}

            {/* Extra repartidor */}
            {verSol.rol_solicitado === 'repartidor' && (
              <>
                {verSol.tipo_vehiculo && <KV label="Vehículo" value={verSol.tipo_vehiculo} />}
                {verSol.licencia_frente && (
                  <>
                    <SectionLabel>Licencia Frente</SectionLabel>
                    <Photo uri={imgUri(verSol.licencia_frente)} />
                  </>
                )}
                {verSol.licencia_reverso && (
                  <>
                    <SectionLabel>Licencia Reverso</SectionLabel>
                    <Photo uri={imgUri(verSol.licencia_reverso)} />
                  </>
                )}
              </>
            )}

            {verSol.estado === 'pendiente' ? (
              <>
                <SectionLabel>Notas (opcional)</SectionLabel>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={notas}
                  onChangeText={setNotas}
                  placeholder="Motivo del rechazo o comentario..."
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <Button label="Aprobar" icon="checkmark-circle-outline" onPress={() => resolver('aprobado')} />
                <View style={{ height: Spacing.sm }} />
                <Button label="Rechazar" icon="close-circle-outline" variant="danger" onPress={() => resolver('rechazado')} />
              </>
            ) : (
              <>
                <SectionLabel>Estado</SectionLabel>
                <View style={{ alignSelf: 'flex-start', marginBottom: Spacing.sm }}>
                  <StatusPill
                    icon={solicitudIcon(verSol.estado)}
                    label={verSol.estado.toUpperCase()}
                    color={verSol.estado === 'aprobado' ? colors.success : colors.danger}
                    big
                  />
                </View>
                {verSol.notas_admin ? <KV label="Notas admin" value={verSol.notas_admin} /> : null}
              </>
            )}
          </ScrollView>
        ) : null}
      </Modal>

      {/* ── MODAL: Usuario ── */}
      <Modal visible={!!verUsuario} animationType="slide" onRequestClose={() => setVerUsuario(null)}>
        {verUsuario ? (
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} contentContainerStyle={styles.modalContent}>
            <ModalHeader title="Detalle de usuario" onClose={() => setVerUsuario(null)} />

            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
              <Avatar src={verUsuario.foto_perfil} nombre={verUsuario.nombre} size={72} />
            </View>

            <KV label="Nombre"    value={verUsuario.nombre} />
            {verUsuario.username  && <KV label="Username" value={`@${verUsuario.username}`} />}
            {verUsuario.email     && <KV label="Email"    value={verUsuario.email} />}
            {verUsuario.telefono  && <KV label="Tel"      value={verUsuario.telefono} />}
            {verUsuario.municipio && <KV label="Municipio" value={verUsuario.municipio} />}
            <KV label="Miembro desde" value={new Date(verUsuario.created_at).toLocaleDateString('es-SV')} />

            {/* Rol badge */}
            <View style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}>
              <Text style={[styles.modalSectionTitle, { color: colors.muted }]}>ROL ACTUAL</Text>
              <View style={[styles.badge, { backgroundColor: rolColor(verUsuario.rol, colors), alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Ionicons name={rolIcon(verUsuario.rol)} size={13} color={ON_COLOR} />
                <Text style={[styles.badgeTxt, { fontSize: 12, color: ON_COLOR }]}>{verUsuario.rol.toUpperCase()}</Text>
              </View>
            </View>

            {/* Cambiar rol */}
            <Text style={[styles.modalSectionTitle, { color: colors.muted }]}>CAMBIAR ROL</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md }}>
              {['comprador', 'vendedor', 'repartidor', 'admin'].filter(r => r !== verUsuario.rol).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolBtn, { borderColor: rolColor(r, colors) }]}
                  onPress={() => cambiarRol(verUsuario, r)}
                >
                  <Text style={[styles.rolBtnTxt, { color: rolColor(r, colors) }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Suspender / Reactivar */}
            <Button
              label={verUsuario.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}
              icon={verUsuario.activo ? 'ban-outline' : 'checkmark-circle-outline'}
              variant={verUsuario.activo ? 'danger' : undefined}
              onPress={() => toggleActivo(verUsuario)}
            />
          </ScrollView>
        ) : null}
      </Modal>

      {/* ── MODAL: Pedido ── */}
      <Modal visible={!!verPedido} animationType="slide" onRequestClose={() => setVerPedido(null)}>
        {verPedido ? (
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} contentContainerStyle={styles.modalContent}>
            <ModalHeader title={`Pedido #SV-${verPedido.id}`} onClose={() => setVerPedido(null)} />

            <View style={{ alignSelf: 'flex-start', marginBottom: Spacing.md }}>
              <StatusPill icon={estadoIcon(verPedido.estado)} label={verPedido.estado.replace('_', ' ').toUpperCase()} color={estadoColor(verPedido.estado, colors)} big />
            </View>

            <KV label="Total"      value={`$${Number(verPedido.total).toFixed(2)}`} />
            <KV label="Comprador"  value={verPedido.comprador_nombre ?? '-'} />
            <KV label="Vendedor"   value={verPedido.vendedor_nombre ?? '-'} />
            {verPedido.repartidor_nombre && <KV label="Repartidor" value={verPedido.repartidor_nombre} />}
            <KV label="Pago"       value={verPedido.metodo_pago} />
            <KV label="Dirección"  value={verPedido.direccion_entrega} />

            {/* Items */}
            {verPedido.items && verPedido.items.length > 0 && (
              <>
                <Text style={[styles.modalSectionTitle, { color: colors.muted, marginTop: Spacing.md }]}>PRODUCTOS</Text>
                {verPedido.items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    {item.imagen ? (
                      <Image source={{ uri: imgUri(item.imagen) }} style={[styles.itemImg, { backgroundColor: colors.border }]} />
                    ) : (
                      <View style={[styles.itemImg, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="image-outline" size={20} color={colors.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.nombre ?? 'Producto'}</Text>
                      <Text style={[styles.cardSub, { color: colors.muted }]}>x{item.cantidad} · ${Number(item.precio_unitario).toFixed(2)} c/u</Text>
                    </View>
                    <Text style={[styles.itemTotal, { color: colors.text }]}>${(item.cantidad * item.precio_unitario).toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Cambiar estado */}
            <Text style={[styles.modalSectionTitle, { color: colors.muted, marginTop: Spacing.lg }]}>CAMBIAR ESTADO</Text>
            <View style={{ gap: Spacing.sm }}>
              {['preparacion', 'en_camino', 'entregado', 'cancelado']
                .filter(e => e !== verPedido.estado)
                .map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.estadoBtn, { borderColor: estadoColor(e, colors) }]}
                    onPress={() => cambiarEstadoPedido(verPedido.id, e)}
                  >
                    <Ionicons name={estadoIcon(e)} size={16} color={estadoColor(e, colors)} />
                    <Text style={[styles.estadoBtnTxt, { color: estadoColor(e, colors) }]}>
                      {e.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        ) : null}
      </Modal>

      {/* ── MODAL: Soporte ── */}
      <Modal visible={!!verRep} animationType="slide" onRequestClose={() => setVerRep(null)}>
        {verRep ? (
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} contentContainerStyle={styles.modalContent}>
            <ModalHeader title={verRep.asunto} onClose={() => setVerRep(null)} />
            <KV label="De"      value={verRep.usuario_nombre ?? '-'} />
            <KV label="Estado"  value={verRep.estado} />
            <Text style={[styles.modalBody, { color: colors.text }]}>{verRep.descripcion}</Text>
            {verRep.respuesta_admin ? (
              <View style={[styles.respuestaPrevia, { backgroundColor: colors.border }]}>
                <Text style={[styles.respuestaPreviaTxt, { color: colors.muted }]}>Respuesta anterior: {verRep.respuesta_admin}</Text>
              </View>
            ) : null}
            {verRep.estado !== 'cerrado' && (
              <>
                <SectionLabel>Tu respuesta</SectionLabel>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={respuesta}
                  onChangeText={setRespuesta}
                  placeholder="Escribe tu respuesta..."
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <Button label="Responder y cerrar" icon="send-outline" onPress={responderSoporte} />
              </>
            )}
          </ScrollView>
        ) : null}
      </Modal>
    </View>
  );
}

// ── Helper sub-components ───────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: number | string; color?: string;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.accent;
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.statTop}>
        <Ionicons name={icon} size={15} color={c} />
        <Text style={[styles.statLbl, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.statNum, { color: c }]}>{value}</Text>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.modalHead, { paddingTop: insets.top + 8 }]}>
      <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="close" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.kvLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.text }]}>{children}</Text>;
}

function Photo({ uri }: { uri?: string }) {
  const { colors } = useTheme();
  if (!uri) {
    return (
      <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border, borderColor: colors.border }]}>
        <Ionicons name="image-outline" size={36} color={colors.muted} />
        <Text style={{ color: colors.muted, marginTop: 4, fontSize: Fonts.small, fontFamily: FontFamily.bodyRegular }}>Sin imagen</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={[styles.photo, { borderColor: colors.border }]} resizeMode="contain" />;
}

// ── Styles (solo layout/tipografía — el color se aplica inline vía useTheme) ─
const styles = StyleSheet.create({
  container:  { flex: 1 },
  header: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: ON_COLOR, fontSize: Fonts.title - 2, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.2 },
  headerSub:   { color: ON_COLOR, opacity: 0.85, fontSize: Fonts.small, fontFamily: FontFamily.bodySemiBold, marginTop: 2 },
  logoutBtn:   { padding: 8, minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center' },

  statsRow:    { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm },
  statCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: 108,
    minHeight: 78,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  statTop:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  statNum:     { fontSize: Fonts.heading - 4, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLbl:     { flex: 1, fontSize: 9.5, fontFamily: FontFamily.bodyBold, textTransform: 'uppercase', letterSpacing: 0.4 },

  tabsRow:     { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  tabPill:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1.5, minHeight: 40, justifyContent: 'center' },
  tabPillTxt:  { fontFamily: FontFamily.bodyBold, fontSize: Fonts.small, letterSpacing: 0.3 },

  filterRow:   { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1.5, minHeight: 36, justifyContent: 'center' },
  chipTxt:     { fontFamily: FontFamily.bodyBold, fontSize: Fonts.small },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: Fonts.regular, fontFamily: FontFamily.bodyRegular },

  pollingRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingBottom: 4 },
  pollingTxt:  { fontSize: Fonts.small, fontFamily: FontFamily.bodySemiBold },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  cardTitle:   { fontFamily: FontFamily.displayBold, fontSize: Fonts.regular, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  cardSub:     { fontSize: Fonts.small + 1, marginTop: 2, fontFamily: FontFamily.bodyRegular },

  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  badgeTxt:    { fontSize: 9, fontFamily: FontFamily.bodyExtraBold, letterSpacing: 0.3 },

  pill:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  pillBig:     { paddingHorizontal: 14, paddingVertical: 6 },
  pillTxt:     { fontSize: 10, fontFamily: FontFamily.bodyExtraBold, letterSpacing: 0.3 },

  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  vacio:       { textAlign: 'center', padding: Spacing.lg, fontFamily: FontFamily.bodySemiBold },

  modal:       { flex: 1 },
  modalContent: { padding: Spacing.md, paddingBottom: Spacing.xl * 2 },
  modalHead:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm },
  modalTitle:  { flex: 1, fontSize: Fonts.title - 2, fontFamily: FontFamily.displayExtraBold, letterSpacing: -0.2 },
  closeBtn:    { padding: 4, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  modalSectionTitle: { fontSize: 10, fontFamily: FontFamily.bodyExtraBold, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  modalBody:   { fontSize: Fonts.regular, lineHeight: 22, marginVertical: Spacing.sm, fontFamily: FontFamily.bodyRegular },

  kvRow:       { flexDirection: 'row', marginBottom: 8, gap: Spacing.sm, alignItems: 'flex-start' },
  kvLabel:     { fontFamily: FontFamily.bodyBold, fontSize: Fonts.small + 1, minWidth: 90 },
  kvValue:     { fontFamily: FontFamily.bodySemiBold, fontSize: Fonts.small + 1, flex: 1, fontVariant: ['tabular-nums'] },

  sectionLabel: { fontFamily: FontFamily.bodyExtraBold, marginTop: Spacing.md, marginBottom: 6, fontSize: Fonts.regular - 1 },
  photo:       { width: '100%', height: 200, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: Spacing.sm },

  input: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    minHeight: 90,
    marginBottom: Spacing.sm,
    textAlignVertical: 'top',
    fontSize: Fonts.regular,
    fontFamily: FontFamily.bodyRegular,
  },

  rolBtn:      { borderWidth: 1.5, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, justifyContent: 'center' },
  rolBtnTxt:   { fontFamily: FontFamily.bodyBold, fontSize: Fonts.small + 1 },

  itemRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  itemImg:     { width: 54, height: 54, borderRadius: Radius.sm },
  itemTotal:   { fontFamily: FontFamily.displayBold, fontSize: Fonts.regular, fontVariant: ['tabular-nums'] },

  estadoBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
  estadoBtnTxt: { fontFamily: FontFamily.bodyExtraBold, fontSize: Fonts.small + 1 },

  respuestaPrevia: { borderRadius: Radius.sm, padding: Spacing.sm, marginVertical: Spacing.sm },
  respuestaPreviaTxt: { fontStyle: 'italic', fontSize: Fonts.small + 1, fontFamily: FontFamily.bodyRegular },
});
