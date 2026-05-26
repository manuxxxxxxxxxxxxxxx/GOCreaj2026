import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, Alert, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints, API_URL } from '@/services/api';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
import { SolicitudRol, ReporteSoporte, Pedido, UsuarioAdmin } from '@/types';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AdminArbolControl from '@/components/AdminArbolControl';

const { width: W } = Dimensions.get('window');

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

function rolColor(rol: string): string {
  switch (rol) {
    case 'admin':      return '#7C3AED';
    case 'vendedor':   return Colors.accent;
    case 'repartidor': return '#D97706';
    default:           return Colors.muted;
  }
}

function estadoColor(estado: string): string {
  switch (estado) {
    case 'preparacion': return Colors.warning;
    case 'en_camino':   return '#2563EB';
    case 'entregado':   return Colors.success;
    default:            return Colors.danger;
  }
}

function Chip({
  label, active, onPress, color,
}: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color ?? Colors.accent, borderColor: color ?? Colors.accent }]}
      onPress={onPress}
    >
      <Text style={[styles.chipTxt, active && { color: Colors.contrast }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Avatar({ src, nombre, size = 42 }: { src?: string | null; nombre: string; size?: number }) {
  const [err, setErr] = useState(false);
  const uri = imgUri(src);
  if (uri && !err) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.border }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: Colors.contrast, fontWeight: '800', fontSize: size * 0.38 }}>
        {nombre.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function AdminScreen() {
  const { cerrarSesion, usuario, refrescar } = useAuth();
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

  // ── Render helpers ──────────────────────────────────────────────────────────
  function renderSolicitud(s: SolicitudRol) {
    return (
      <TouchableOpacity key={s.id} style={styles.card} onPress={() => { setVerSol(s); setNotas(''); }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{s.nombre_completo}</Text>
          <Text style={styles.cardSub}>
            {s.rol_solicitado === 'vendedor' ? '🏪' : '🛵'} Quiere ser {s.rol_solicitado}
            {s.nombre_negocio ? ` · ${s.nombre_negocio}` : ''}
          </Text>
          <Text style={styles.cardSub}>DUI {s.dui_numero}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[styles.badge, { backgroundColor: s.estado === 'pendiente' ? Colors.warning : s.estado === 'aprobado' ? Colors.success : Colors.danger }]}>
            <Text style={styles.badgeTxt}>{s.estado.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </View>
      </TouchableOpacity>
    );
  }

  function renderUsuario(u: UsuarioAdmin) {
    return (
      <TouchableOpacity key={u.id} style={styles.card} onPress={() => setVerUsuario(u)}>
        <Avatar src={u.foto_perfil} nombre={u.nombre} size={46} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{u.nombre}</Text>
            {!u.activo && <Ionicons name="ban" size={14} color={Colors.danger} />}
          </View>
          <Text style={styles.cardSub} numberOfLines={1}>{u.username ? `@${u.username}` : u.email ?? u.telefono ?? '-'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: rolColor(u.rol) }]}>
          <Text style={styles.badgeTxt}>{u.rol.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderPedido(p: Pedido) {
    return (
      <TouchableOpacity key={p.id} style={styles.card} onPress={() => setVerPedido(p)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>#SV-{p.id} · ${Number(p.total).toFixed(2)}</Text>
          <Text style={styles.cardSub}>{p.comprador_nombre ?? '-'} → {p.vendedor_nombre ?? '-'}</Text>
          {p.items && p.items.length > 0 && (
            <Text style={styles.cardSub}>{p.items.length} ítem{p.items.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[styles.badge, { backgroundColor: estadoColor(p.estado) }]}>
            <Text style={styles.badgeTxt}>{p.estado.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </View>
      </TouchableOpacity>
    );
  }

  function renderReporte(r: ReporteSoporte) {
    return (
      <TouchableOpacity key={r.id} style={styles.card} onPress={() => { setVerRep(r); setRespuesta(''); }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{r.asunto}</Text>
          <Text style={styles.cardSub} numberOfLines={2}>{r.descripcion}</Text>
          <Text style={styles.cardSub}>{r.usuario_nombre ?? '-'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: r.estado === 'abierto' ? Colors.warning : r.estado === 'en_proceso' ? '#2563EB' : Colors.success }]}>
          <Text style={styles.badgeTxt}>{r.estado.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Ionicons name="shield-checkmark" size={22} color={Colors.contrast} />
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
            <Ionicons name="arrow-back-circle-outline" size={22} color={Colors.contrast} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { void refrescar(); Alert.alert('✓', 'Rol refrescado'); }} style={styles.logoutBtn}>
            <Ionicons name="refresh-outline" size={22} color={Colors.contrast} />
          </TouchableOpacity>
          <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.contrast} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={Colors.accent} />}>
        {/* ── Stats ── */}
        {stats && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            <StatCard icon="people" label="Usuarios"   value={stats.usuarios} />
            <StatCard icon="storefront" label="Vendedores" value={stats.vendedores} color="#2563EB" />
            <StatCard icon="bicycle"   label="Repartidores" value={stats.repartidores} color="#D97706" />
            <StatCard icon="cart"      label="Pedidos hoy" value={stats.pedidos_hoy} color={Colors.success} />
            <StatCard icon="alert-circle" label="Pendientes" value={stats.solicitudes_pendientes} color={Colors.danger} />
            <StatCard icon="headset"   label="Soporte" value={stats.soporte_abiertos} color={Colors.warning} />
          </ScrollView>
        )}

        {/* ── Tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {(['arbol', 'solicitudes', 'usuarios', 'pedidos', 'soporte'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tabPill, tab === t && styles.tabPillAct]} onPress={() => setTab(t)}>
              <Text style={[styles.tabPillTxt, tab === t && styles.tabPillTxtAct]}>{t.toUpperCase()}</Text>
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
              ? <Text style={styles.vacio}>Sin solicitudes {solFiltro !== 'todos' ? solFiltro + 's' : ''}</Text>
              : solicitudes.map(renderSolicitud)}
          </>
        )}

        {/* ── Usuarios ── */}
        {tab === 'usuarios' && (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre, email o @username..."
                placeholderTextColor={Colors.muted}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['todos', 'comprador', 'vendedor', 'repartidor', 'admin'] as RolFiltro[]).map(f => (
                <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={rolFiltro === f} onPress={() => setRolFiltro(f)} color={rolColor(f)} />
              ))}
            </ScrollView>
            {usuarios.length === 0 && !cargando
              ? <Text style={styles.vacio}>Sin usuarios</Text>
              : usuarios.map(renderUsuario)}
          </>
        )}

        {/* ── Pedidos ── */}
        {tab === 'pedidos' && (
          <>
            <View style={styles.pollingRow}>
              <Ionicons name="sync" size={14} color={Colors.success} />
              <Text style={styles.pollingTxt}>Actualizando cada 10s</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['todos', 'preparacion', 'en_camino', 'entregado', 'cancelado'] as EstadoFiltro[]).map(f => (
                <Chip key={f} label={f === 'todos' ? 'Todos' : f.replace('_', ' ')} active={estadoFiltro === f} onPress={() => setEstadoFiltro(f)} color={f !== 'todos' ? estadoColor(f) : undefined} />
              ))}
            </ScrollView>
            {pedidos.length === 0 && !cargando
              ? <Text style={styles.vacio}>Sin pedidos</Text>
              : pedidos.map(renderPedido)}
          </>
        )}

        {/* ── Soporte ── */}
        {tab === 'soporte' && (
          <>
            {reportes.length === 0 && !cargando
              ? <Text style={styles.vacio}>Sin tickets de soporte</Text>
              : reportes.map(renderReporte)}
          </>
        )}

        {cargando && <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing.md }} />}
        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>

      {/* ── MODAL: Solicitud ── */}
      <Modal visible={!!verSol} animationType="slide" onRequestClose={() => setVerSol(null)}>
        {verSol ? (
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
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
                  style={styles.input}
                  value={notas}
                  onChangeText={setNotas}
                  placeholder="Motivo del rechazo o comentario..."
                  placeholderTextColor={Colors.muted}
                  multiline
                />
                <Button label="Aprobar" icon="checkmark-circle-outline" onPress={() => resolver('aprobado')} />
                <View style={{ height: Spacing.sm }} />
                <Button label="Rechazar" icon="close-circle-outline" variant="danger" onPress={() => resolver('rechazado')} />
              </>
            ) : (
              <>
                <KV label="Estado" value={verSol.estado.toUpperCase()} />
                {verSol.notas_admin ? <KV label="Notas admin" value={verSol.notas_admin} /> : null}
              </>
            )}
          </ScrollView>
        ) : null}
      </Modal>

      {/* ── MODAL: Usuario ── */}
      <Modal visible={!!verUsuario} animationType="slide" onRequestClose={() => setVerUsuario(null)}>
        {verUsuario ? (
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
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
              <Text style={styles.modalSectionTitle}>ROL ACTUAL</Text>
              <View style={[styles.badge, { backgroundColor: rolColor(verUsuario.rol), alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6 }]}>
                <Text style={[styles.badgeTxt, { fontSize: 12 }]}>{verUsuario.rol.toUpperCase()}</Text>
              </View>
            </View>

            {/* Cambiar rol */}
            <Text style={styles.modalSectionTitle}>CAMBIAR ROL</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md }}>
              {['comprador', 'vendedor', 'repartidor', 'admin'].filter(r => r !== verUsuario.rol).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolBtn, { borderColor: rolColor(r) }]}
                  onPress={() => cambiarRol(verUsuario, r)}
                >
                  <Text style={[styles.rolBtnTxt, { color: rolColor(r) }]}>{r}</Text>
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
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <ModalHeader title={`Pedido #SV-${verPedido.id}`} onClose={() => setVerPedido(null)} />

            <View style={[styles.badge, { backgroundColor: estadoColor(verPedido.estado), alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, marginBottom: Spacing.md }]}>
              <Text style={[styles.badgeTxt, { fontSize: 12 }]}>{verPedido.estado.replace('_', ' ').toUpperCase()}</Text>
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
                <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>PRODUCTOS</Text>
                {verPedido.items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    {item.imagen ? (
                      <Image source={{ uri: imgUri(item.imagen) }} style={styles.itemImg} />
                    ) : (
                      <View style={[styles.itemImg, { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="image-outline" size={20} color={Colors.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre ?? 'Producto'}</Text>
                      <Text style={styles.cardSub}>x{item.cantidad} · ${Number(item.precio_unitario).toFixed(2)} c/u</Text>
                    </View>
                    <Text style={styles.itemTotal}>${(item.cantidad * item.precio_unitario).toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Cambiar estado */}
            <Text style={[styles.modalSectionTitle, { marginTop: Spacing.lg }]}>CAMBIAR ESTADO</Text>
            <View style={{ gap: Spacing.sm }}>
              {['preparacion', 'en_camino', 'entregado', 'cancelado']
                .filter(e => e !== verPedido.estado)
                .map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.estadoBtn, { borderColor: estadoColor(e) }]}
                    onPress={() => cambiarEstadoPedido(verPedido.id, e)}
                  >
                    <View style={[styles.estadoDot, { backgroundColor: estadoColor(e) }]} />
                    <Text style={[styles.estadoBtnTxt, { color: estadoColor(e) }]}>
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
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <ModalHeader title={verRep.asunto} onClose={() => setVerRep(null)} />
            <KV label="De"      value={verRep.usuario_nombre ?? '-'} />
            <KV label="Estado"  value={verRep.estado} />
            <Text style={styles.modalBody}>{verRep.descripcion}</Text>
            {verRep.respuesta_admin ? (
              <View style={styles.respuestaPrevia}>
                <Text style={styles.respuestaPreviaTxt}>Respuesta anterior: {verRep.respuesta_admin}</Text>
              </View>
            ) : null}
            {verRep.estado !== 'cerrado' && (
              <>
                <SectionLabel>Tu respuesta</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={respuesta}
                  onChangeText={setRespuesta}
                  placeholder="Escribe tu respuesta..."
                  placeholderTextColor={Colors.muted}
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
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={color ?? Colors.accent} />
      <Text style={[styles.statNum, { color: color ?? Colors.accent }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.modalHead, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.modalTitle} numberOfLines={2}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="close" size={22} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Photo({ uri }: { uri?: string }) {
  if (!uri) {
    return (
      <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.border }]}>
        <Ionicons name="image-outline" size={36} color={Colors.muted} />
        <Text style={{ color: Colors.muted, marginTop: 4, fontSize: Fonts.small }}>Sin imagen</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.photo} resizeMode="contain" />;
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.accent,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: Colors.contrast, fontSize: Fonts.title - 2, fontWeight: '800', letterSpacing: -0.2 },
  headerSub:   { color: Colors.contrast, opacity: 0.85, fontSize: Fonts.small, fontWeight: '600', marginTop: 2 },
  logoutBtn:   { padding: 8 },

  statsRow:    { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    width: 88,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  statNum:     { fontSize: Fonts.title, fontWeight: '900', letterSpacing: -0.5 },
  statLbl:     { color: Colors.muted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },

  tabsRow:     { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  tabPill:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border },
  tabPillAct:  { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabPillTxt:  { color: Colors.muted, fontWeight: '700', fontSize: Fonts.small },
  tabPillTxtAct: { color: Colors.contrast },

  filterRow:   { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  chipTxt:     { color: Colors.muted, fontWeight: '700', fontSize: Fonts.small },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: Fonts.regular, fontWeight: '500' },

  pollingRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingBottom: 4 },
  pollingTxt:  { color: Colors.success, fontSize: Fonts.small, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  cardTitle:   { color: Colors.text, fontWeight: '800', fontSize: Fonts.regular, letterSpacing: -0.2 },
  cardSub:     { color: Colors.muted, fontSize: Fonts.small + 1, marginTop: 2, fontWeight: '500' },

  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  badgeTxt:    { color: Colors.contrast, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  avatarFallback: { backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  vacio:       { textAlign: 'center', color: Colors.muted, padding: Spacing.lg, fontWeight: '600' },

  modal:       { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: Spacing.md, paddingBottom: Spacing.xl * 2 },
  modalHead:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm },
  modalTitle:  { flex: 1, fontSize: Fonts.title - 2, fontWeight: '800', color: Colors.text, letterSpacing: -0.2 },
  closeBtn:    { padding: 4 },
  modalSectionTitle: { color: Colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  modalBody:   { color: Colors.text, fontSize: Fonts.regular, lineHeight: 22, marginVertical: Spacing.sm, fontWeight: '500' },

  kvRow:       { flexDirection: 'row', marginBottom: 8, gap: Spacing.sm, alignItems: 'flex-start' },
  kvLabel:     { color: Colors.muted, fontWeight: '700', fontSize: Fonts.small + 1, minWidth: 90 },
  kvValue:     { color: Colors.text, fontWeight: '600', fontSize: Fonts.small + 1, flex: 1 },

  sectionLabel: { color: Colors.text, fontWeight: '800', marginTop: Spacing.md, marginBottom: 6, fontSize: Fonts.regular - 1 },
  photo:       { width: '100%', height: 200, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.sm },

  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.text,
    minHeight: 90,
    marginBottom: Spacing.sm,
    textAlignVertical: 'top',
    fontSize: Fonts.regular,
    fontWeight: '500',
  },

  rolBtn:      { borderWidth: 1.5, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  rolBtnTxt:   { fontWeight: '700', fontSize: Fonts.small + 1 },

  itemRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  itemImg:     { width: 54, height: 54, borderRadius: Radius.sm, backgroundColor: Colors.border },
  itemTotal:   { color: Colors.text, fontWeight: '800', fontSize: Fonts.regular },

  estadoBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12 },
  estadoDot:   { width: 10, height: 10, borderRadius: 5 },
  estadoBtnTxt: { fontWeight: '800', fontSize: Fonts.small + 1 },

  respuestaPrevia: { backgroundColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.sm, marginVertical: Spacing.sm },
  respuestaPreviaTxt: { color: Colors.muted, fontStyle: 'italic', fontSize: Fonts.small + 1 },
});
