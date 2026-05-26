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

// ── Tipos para el panel admin ────────────────────────────────
type EstadoDB = 'preparacion' | 'en_camino' | 'entregado' | 'cancelado' | 'rechazado_repartidor';
type EstadoFiltro = EstadoDB | 'todos';

interface PedidoItem {
  id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  nombre?: string;
  imagen?: string | null;
}

interface Pedido {
  id: number;
  comprador_nombre: string;
  vendedor_nombre: string;
  repartidor_nombre?: string | null;
  total: number;
  estado: EstadoDB;
  metodo_pago: string;
  direccion_entrega: string;
  created_at: string;
  items?: PedidoItem[];
}

const ESTADOS: { id: EstadoDB; label: string; bg: string; color: string; emoji: string }[] = [
  { id: 'preparacion',          label: 'Preparando',  bg: '#fef3c7', color: '#92400e', emoji: '🕐' },
  { id: 'en_camino',            label: 'En camino',   bg: '#dbeafe', color: '#1e40af', emoji: '🚚' },
  { id: 'entregado',            label: 'Entregado',   bg: '#d1fae5', color: '#065f46', emoji: '✅' },
  { id: 'cancelado',            label: 'Cancelado',   bg: '#fee2e2', color: '#991b1b', emoji: '✕' },
  { id: 'rechazado_repartidor', label: 'Rechazado',   bg: '#fee2e2', color: '#991b1b', emoji: '✕' },
];

function estadoConfig(estado: string) {
  return ESTADOS.find(e => e.id === estado) ?? { id: estado, label: estado, bg: '#f3f4f6', color: '#374151', emoji: '?' };
}
// ─────────────────────────────────────────────────────────────

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

  const isAdmin = usuario?.rol === 'admin';

  const [tab, setTab] = useState<Tab>('likes');
  const [items, setItems] = useState<Producto[]>([]);
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

  // ── Admin panel state ────────────────────────────────────
  const [modalAdmin, setModalAdmin]         = useState(false);
  const [pedidos, setPedidos]               = useState<Pedido[]>([]);
  const [filtroEstado, setFiltroEstado]     = useState<EstadoFiltro>('todos');
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [verPedido, setVerPedido]           = useState<Pedido | null>(null);
  const [lastRefresh, setLastRefresh]       = useState(new Date());
  // ────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const ep = tab === 'likes' ? Endpoints.misLikes
        : tab === 'guardados' ? Endpoints.misGuardados
        : Endpoints.misCompartidos;
      const r = await api<{ ok: boolean; productos?: Producto[] }>(ep);
      if (r.ok && r.productos) setItems(r.productos);
      else setItems([]);
    } catch {
      setItems([]);
    } finally { setCargando(false); }
  }, [tab]);

  useEffect(() => { void cargar(); }, [cargar]);

  // ── Cargar pedidos para el panel admin ──────────────────
  const cargarPedidos = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingPedidos(true);
    try {
      const url = filtroEstado !== 'todos'
        ? `/admin_dashboard.php?action=pedidos&estado=${filtroEstado}`
        : '/admin_dashboard.php?action=pedidos';
      const r = await api<{ ok: boolean; pedidos?: Pedido[] }>(url);
      if (r.ok) { setPedidos(r.pedidos ?? []); setLastRefresh(new Date()); }
    } catch { /* silencioso */ }
    finally { setLoadingPedidos(false); }
  }, [isAdmin, filtroEstado]);

  useEffect(() => {
    if (modalAdmin) void cargarPedidos();
  }, [modalAdmin, cargarPedidos]);

  // Polling cada 10s mientras el modal admin está abierto
  useEffect(() => {
    if (!modalAdmin) return;
    const id = setInterval(() => { void cargarPedidos(); }, 10000);
    return () => clearInterval(id);
  }, [modalAdmin, cargarPedidos]);

  const actualizarEstado = async (pedidoId: number, nuevoEstado: EstadoDB) => {
    try {
      const r = await api<{ ok: boolean }>('/admin_dashboard.php?action=actualizar_pedido', {
        body: { pedido_id: pedidoId, estado: nuevoEstado },
      });
      if (r.ok) {
        setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
        if (verPedido?.id === pedidoId) setVerPedido(prev => prev ? { ...prev, estado: nuevoEstado } : null);
      }
    } catch { Alert.alert('Error', 'No se pudo actualizar el estado'); }
  };
  // ────────────────────────────────────────────────────────

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
  const contarEstado = (e: EstadoDB) => pedidos.filter(p => p.estado === e).length;
  const pedidosFiltrados = filtroEstado === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtroEstado);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>

    {/* ══════════════════════════════════════════
        MODAL: Editar Perfil
    ══════════════════════════════════════════ */}
    <Modal visible={modalEditar} animationType="slide" transparent onRequestClose={() => setModalEditar(false)}>
      <View style={modal.backdrop}>
        <View style={[modal.sheet, { backgroundColor: c.card }]}>
          <View style={[modal.handle, { backgroundColor: c.border }]} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
            <Text style={[modal.title, { color: c.text }]}>{t.profile.editarPerfil}</Text>

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

    {/* ══════════════════════════════════════════
        MODAL: Panel de Administración (solo admin)
    ══════════════════════════════════════════ */}
    {isAdmin && (
      <Modal visible={modalAdmin} animationType="slide" onRequestClose={() => setModalAdmin(false)}>
        <View style={{ flex: 1, backgroundColor: c.background }}>

          {/* Header del panel admin */}
          <View style={[adminPanel.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setModalAdmin(false)} style={adminPanel.backBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={adminPanel.headerTitle}>Panel de Administración</Text>
              <Text style={adminPanel.headerSub}>
                Actualizado {lastRefresh.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                {loadingPedidos ? ' · Actualizando...' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => void cargarPedidos()} style={adminPanel.refreshBtn} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loadingPedidos} onRefresh={cargarPedidos} tintColor={c.accent} />}
          >
            {/* ── Tarjetas de resumen ── */}
            <View style={{ padding: Spacing.md, paddingBottom: 0 }}>
              <Text style={[adminPanel.sectionLabel, { color: c.muted }]}>Resumen</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {ESTADOS.filter(e => e.id !== 'rechazado_repartidor').map(e => (
                    <TouchableOpacity
                      key={e.id}
                      style={[
                        adminPanel.statCard,
                        { backgroundColor: c.card, borderColor: filtroEstado === e.id ? e.color : c.border },
                        filtroEstado === e.id && { shadowColor: e.color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
                      ]}
                      onPress={() => setFiltroEstado(prev => prev === e.id ? 'todos' : e.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[adminPanel.statIcon, { backgroundColor: e.bg }]}>
                        <Text style={{ fontSize: 18 }}>{e.emoji}</Text>
                      </View>
                      <Text style={[adminPanel.statNum, { color: e.color }]}>{contarEstado(e.id)}</Text>
                      <Text style={[adminPanel.statLabel, { color: c.muted }]}>{e.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Filtros de estado (chips) */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={[adminPanel.sectionLabel, { color: c.muted }]}>
                  Pedidos {filtroEstado !== 'todos' ? `· ${estadoConfig(filtroEstado).label}` : '· Todos'} ({pedidosFiltrados.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([{ id: 'todos', label: 'Todos', color: c.accent, bg: `${c.accent}15` }, ...ESTADOS.filter(e => e.id !== 'rechazado_repartidor')] as any[]).map(e => (
                      <TouchableOpacity
                        key={e.id}
                        style={[adminPanel.chip, { borderColor: filtroEstado === e.id ? e.color : c.border, backgroundColor: filtroEstado === e.id ? e.bg ?? `${e.color}15` : 'transparent' }]}
                        onPress={() => setFiltroEstado(e.id as EstadoFiltro)}
                        activeOpacity={0.7}
                      >
                        <Text style={[adminPanel.chipTxt, { color: filtroEstado === e.id ? e.color : c.muted }]}>{e.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* ── Lista de pedidos ── */}
            <View style={{ paddingHorizontal: Spacing.md, paddingBottom: insets.bottom + 24 }}>
              {loadingPedidos && pedidosFiltrados.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ color: c.muted, fontWeight: '600' }}>Cargando pedidos...</Text>
                </View>
              ) : pedidosFiltrados.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                  <Text style={{ color: c.muted, fontWeight: '600' }}>No hay pedidos aquí</Text>
                </View>
              ) : (
                pedidosFiltrados.map(p => {
                  const ec = estadoConfig(p.estado);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[adminPanel.pedidoCard, { backgroundColor: c.card, borderColor: c.border }]}
                      onPress={() => setVerPedido(p)}
                      activeOpacity={0.8}
                    >
                      {/* Fila superior */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={[adminPanel.pedidoId, { color: c.accent }]}>#SV-{p.id}</Text>
                        <View style={[adminPanel.estadoBadge, { backgroundColor: ec.bg }]}>
                          <Text style={[adminPanel.estadoTxt, { color: ec.color }]}>{ec.label}</Text>
                        </View>
                      </View>
                      {/* Info */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[adminPanel.pedidoNombre, { color: c.text }]} numberOfLines={1}>{p.comprador_nombre}</Text>
                          <Text style={[adminPanel.pedidoVendedor, { color: c.muted }]} numberOfLines={1}>Vendedor: {p.vendedor_nombre}</Text>
                          <Text style={[adminPanel.pedidoFecha, { color: c.muted }]}>
                            {new Date(p.created_at).toLocaleDateString('es-SV')}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[adminPanel.pedidoTotal, { color: c.text }]}>${Number(p.total).toFixed(2)}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Text style={[adminPanel.verTxt, { color: c.accent }]}>Ver detalle</Text>
                            <Ionicons name="chevron-forward" size={14} color={c.accent} />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        {/* ── Modal detalle de pedido (anidado dentro del panel admin) ── */}
        <Modal visible={!!verPedido} animationType="slide" transparent onRequestClose={() => setVerPedido(null)}>
          {verPedido && (
            <View style={detalle.backdrop}>
              <View style={[detalle.sheet, { backgroundColor: c.background }]}>
                {/* Header del detalle */}
                <View style={detalle.header}>
                  <View>
                    <Text style={detalle.title}>Pedido #SV-{verPedido.id}</Text>
                    <Text style={detalle.sub}>{new Date(verPedido.created_at).toLocaleString('es-SV')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setVerPedido(null)} style={detalle.closeBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
                  {/* Info del pedido */}
                  {([
                    ['Cliente', verPedido.comprador_nombre],
                    ['Vendedor', verPedido.vendedor_nombre],
                    ['Repartidor', verPedido.repartidor_nombre ?? 'Sin asignar'],
                    ['Total', `$${Number(verPedido.total).toFixed(2)}`],
                    ['Método de pago', verPedido.metodo_pago],
                    ['Dirección', verPedido.direccion_entrega],
                  ] as [string, string][]).map(([label, value]) => (
                    <View key={label} style={[detalle.infoRow, { borderBottomColor: c.border }]}>
                      <Text style={[detalle.infoLabel, { color: c.muted }]}>{label}</Text>
                      <Text style={[detalle.infoValue, { color: c.text }]} numberOfLines={2}>{value}</Text>
                    </View>
                  ))}

                  {/* Productos del pedido */}
                  {verPedido.items && verPedido.items.length > 0 && (
                    <View style={{ marginTop: Spacing.md }}>
                      <Text style={[adminPanel.sectionLabel, { color: c.muted, marginBottom: Spacing.sm }]}>Productos</Text>
                      {verPedido.items.map(item => (
                        <View key={item.id} style={[detalle.itemRow, { backgroundColor: c.card, borderColor: c.border }]}>
                          <View style={[detalle.itemImg, { backgroundColor: c.border }]}>
                            {item.imagen
                              ? <Image source={{ uri: imgUri(item.imagen) }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
                              : <Text style={{ fontSize: 20 }}>🛍️</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[detalle.itemNombre, { color: c.text }]} numberOfLines={1}>{item.nombre ?? `Producto #${item.producto_id}`}</Text>
                            <Text style={[detalle.itemSub, { color: c.muted }]}>x{item.cantidad} · ${Number(item.precio_unitario).toFixed(2)} c/u</Text>
                          </View>
                          <Text style={[detalle.itemTotal, { color: c.text }]}>${(item.cantidad * Number(item.precio_unitario)).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Estado actual */}
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={[adminPanel.sectionLabel, { color: c.muted, marginBottom: 8 }]}>Estado actual</Text>
                    {(() => {
                      const ec = estadoConfig(verPedido.estado);
                      return (
                        <View style={[adminPanel.estadoBadge, { backgroundColor: ec.bg, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, marginBottom: Spacing.md }]}>
                          <Text style={[adminPanel.estadoTxt, { color: ec.color, fontSize: 14 }]}>{ec.label}</Text>
                        </View>
                      );
                    })()}

                    <Text style={[adminPanel.sectionLabel, { color: c.muted, marginBottom: 10 }]}>Cambiar a</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {ESTADOS.filter(e => e.id !== verPedido.estado && e.id !== 'rechazado_repartidor').map(e => (
                        <TouchableOpacity
                          key={e.id}
                          style={[detalle.cambiarBtn, { borderColor: e.color, backgroundColor: e.bg }]}
                          onPress={() => actualizarEstado(verPedido.id, e.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[detalle.cambiarTxt, { color: e.color }]}>{e.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <View style={[detalle.footer, { borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
                  <TouchableOpacity style={[detalle.closeFooterBtn, { backgroundColor: c.accent }]} onPress={() => setVerPedido(null)} activeOpacity={0.8}>
                    <Text style={detalle.closeFooterTxt}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>
      </Modal>
    )}

    {/* ══════════════════════════════════════════
        PANTALLA PRINCIPAL DE PERFIL
    ══════════════════════════════════════════ */}
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header con gradiente accent ── */}
      <View style={[hdr.root, { backgroundColor: c.accent, paddingTop: insets.top + 24 }]}>
        <View style={hdr.avatarRing}>
          <View style={hdr.avatarInner}>
            {usuario?.foto_perfil
              ? <Image source={{ uri: imgUri(usuario.foto_perfil) }} style={{ width: '100%', height: '100%', borderRadius: 44 }} resizeMode="cover" />
              : <Ionicons name="person" size={44} color="#FFF" />}
          </View>
        </View>
        <Text style={hdr.nombre}>{usuario?.nombre ?? 'Usuario'}</Text>
        {usuario?.username && (
          <Text style={[hdr.sub, { marginTop: 1 }]}>@{usuario.username}</Text>
        )}
        <Text style={hdr.sub}>{usuario?.email ?? usuario?.telefono ?? '—'}</Text>

        {/* Badge de rol — admin tiene estilo especial dorado */}
        <View style={[hdr.badge, isAdmin && { backgroundColor: 'rgba(251,191,36,0.25)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' }]}>
          <Text style={[hdr.badgeTxt, isAdmin && { color: '#FDE68A' }]}>
            {isAdmin ? '★ ADMIN' : (usuario?.rol ?? 'comprador').toUpperCase()}
          </Text>
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

        {/* Botones de acción */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Editar Perfil */}
          <TouchableOpacity style={hdr.editBtn} onPress={abrirEditar} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={13} color={c.accent} style={{ marginRight: 4 }} />
            <Text style={[hdr.editBtnTxt, { color: c.accent }]}>{t.profile.editarPerfil}</Text>
          </TouchableOpacity>

          {/* Botón Panel Admin — solo visible si es admin */}
          {isAdmin && (
            <TouchableOpacity
              style={hdr.adminBtn}
              onPress={() => setModalAdmin(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="grid-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={hdr.adminBtnTxt}>Panel Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ padding: Spacing.md }}>

        {/* ── Acceso de administrador (tarjeta especial, solo admin) ── */}
        {isAdmin && (
          <>
            <SectionLabel label="Administración" color={c.text} />
            <TouchableOpacity
              style={adminPanel.accessCard}
              onPress={() => setModalAdmin(true)}
              activeOpacity={0.85}
            >
              {/* Decoración */}
              <View style={adminPanel.accessDeco1} />
              <View style={adminPanel.accessDeco2} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={adminPanel.accessIcon}>
                  <Ionicons name="grid-outline" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={adminPanel.accessTitle}>Panel de Administración</Text>
                    <View style={adminPanel.accessBadge}>
                      <Text style={adminPanel.accessBadgeTxt}>ADMIN</Text>
                    </View>
                  </View>
                  <Text style={adminPanel.accessSub}>Gestiona usuarios, pedidos y productos</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── Mi cuenta ── */}
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

          <MenuItem
            icon="notifications-outline" iconBg={c.accentLight} iconColor={c.accent}
            title="Notificaciones" sub="Pedidos, promos y mensajes"
            color={c.text} subColor={c.muted} border={c.border}
            onPress={() => Alert.alert('Notificaciones', 'Próximamente')}
          />
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

        {/* Refrescar rol — útil cuando admin acepta solicitud */}
        <TouchableOpacity
          style={[btnLogout.wrap, { backgroundColor: c.accentLight, borderColor: c.accent, marginBottom: 10 }]}
          onPress={async () => {
            await refrescar();
            Alert.alert('✓', 'Tu rol fue actualizado desde el servidor.');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle-outline" size={20} color={c.accent} />
          <Text style={[btnLogout.txt, { color: c.accent }]}>Refrescar mi rol</Text>
        </TouchableOpacity>

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

/* ── Estilos ── */
const hdr = StyleSheet.create({
  root: { alignItems: 'center', paddingBottom: Spacing.xl, paddingHorizontal: Spacing.md },
  avatarRing: {
    width: 106, height: 106, borderRadius: 53,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  avatarInner: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  nombre: { fontSize: Fonts.title, color: '#FFF', fontWeight: '900', letterSpacing: -0.3 },
  sub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: Fonts.small + 1, fontWeight: '500' },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: Radius.pill, marginTop: 8,
  },
  badgeTxt: { color: '#FFF', fontSize: Fonts.small - 1, fontWeight: '800', letterSpacing: 1 },
  stats: {
    flexDirection: 'row', marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md, padding: Spacing.md, width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#FFF', fontSize: Fonts.title - 2, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.8)', fontSize: Fonts.small - 1, fontWeight: '600', marginTop: 2 },
  statDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  editBtnTxt: { fontSize: Fonts.small, fontWeight: '800' },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.85)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.pill,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  adminBtnTxt: { fontSize: Fonts.small, fontWeight: '800', color: '#fff' },
} as any);

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1,
  },
  iconBg: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  title: { fontSize: Fonts.regular, fontWeight: '700' },
  sub: { fontSize: Fonts.small, fontWeight: '500', marginTop: 1 },
});

const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1.5 },
  txt: { fontSize: Fonts.small - 1, fontWeight: '800' },
});

const btnLogout = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5,
    gap: 10, marginBottom: Spacing.xl,
  },
  txt: { fontWeight: '700', fontSize: Fonts.regular },
});

const tabRow = StyleSheet.create({
  wrap: { flexDirection: 'row', borderBottomWidth: 1.5 },
  btn: {
    flex: 1, flexDirection: 'row', paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  txt: { fontWeight: '700', fontSize: Fonts.small },
});

const itemCard = StyleSheet.create({
  wrap: {
    width: '47.5%' as any,
    borderRadius: Radius.md, borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  img: { height: 110, justifyContent: 'center', alignItems: 'center' },
  nombre: { fontWeight: '700', fontSize: Fonts.regular - 1, letterSpacing: -0.1 },
  tienda: { fontSize: Fonts.small - 1, fontWeight: '500', marginTop: 1 },
  precio: { fontWeight: '800', marginTop: 4, fontSize: Fonts.small + 1 },
});

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
  photoCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8 },
  photoLbl: { fontSize: Fonts.small, fontWeight: '700' },
  cancelBtn: { borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', paddingVertical: 14, marginTop: Spacing.sm },
  cancelTxt: { fontWeight: '700', fontSize: Fonts.regular },
  cooldownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.sm, borderWidth: 1,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    marginTop: -Spacing.sm, marginBottom: Spacing.md,
  },
  cooldownTxt: { fontSize: Fonts.small, fontWeight: '600', flex: 1 },
});

// Estilos del panel admin
const adminPanel = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e3a5f',
    paddingHorizontal: Spacing.md, paddingBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: Fonts.regular + 2 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: Fonts.small - 1, marginTop: 1 },
  sectionLabel: { fontSize: Fonts.small - 1, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  statCard: {
    width: 110, borderRadius: 14, borderWidth: 1.5,
    padding: Spacing.md, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNum: { fontSize: Fonts.title - 2, fontWeight: '900', lineHeight: Fonts.title },
  statLabel: { fontSize: Fonts.small - 2, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1.5 },
  chipTxt: { fontSize: Fonts.small - 1, fontWeight: '700' },
  pedidoCard: {
    borderRadius: 14, borderWidth: 1.5, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  pedidoId: { fontSize: Fonts.small, fontWeight: '800' },
  pedidoNombre: { fontSize: Fonts.regular - 1, fontWeight: '700', marginBottom: 2 },
  pedidoVendedor: { fontSize: Fonts.small - 1, fontWeight: '500' },
  pedidoFecha: { fontSize: Fonts.small - 2, fontWeight: '500', marginTop: 2 },
  pedidoTotal: { fontSize: Fonts.regular, fontWeight: '900' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  estadoTxt: { fontSize: Fonts.small - 2, fontWeight: '700' },
  verTxt: { fontSize: Fonts.small - 1, fontWeight: '700' },
  // Tarjeta de acceso rápido al admin en el perfil
  accessCard: {
    borderRadius: 16, padding: 20, marginBottom: Spacing.md,
    backgroundColor: '#1e3a5f',
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    overflow: 'hidden', position: 'relative',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  accessDeco1: {
    position: 'absolute', top: -20, right: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  accessDeco2: {
    position: 'absolute', bottom: -30, right: 60,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  accessIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  accessTitle: { color: '#fff', fontWeight: '800', fontSize: Fonts.regular },
  accessBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  accessBadgeTxt: { color: '#FDE68A', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  accessSub: { color: 'rgba(255,255,255,0.6)', fontSize: Fonts.small - 1, fontWeight: '500' },
} as any);

// Estilos del modal de detalle de pedido
const detalle = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    background: 'linear-gradient(135deg, #355068, #4A6D8C)',
    backgroundColor: '#355068',
    padding: Spacing.lg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  title: { color: '#fff', fontWeight: '800', fontSize: Fonts.regular + 2 },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: Fonts.small - 1, marginTop: 4 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingBottom: 12, borderBottomWidth: 1, marginBottom: 12,
  },
  infoLabel: { fontSize: Fonts.small, fontWeight: '600' },
  infoValue: { fontSize: Fonts.small + 1, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 16 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  itemImg: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemNombre: { fontWeight: '700', fontSize: Fonts.small + 1 },
  itemSub: { fontSize: Fonts.small - 1, fontWeight: '500', marginTop: 2 },
  itemTotal: { fontWeight: '900', fontSize: Fonts.regular - 1 },
  cambiarBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 2 },
  cambiarTxt: { fontSize: Fonts.small, fontWeight: '700' },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  closeFooterBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  closeFooterTxt: { color: '#fff', fontWeight: '700', fontSize: Fonts.regular },
} as any);