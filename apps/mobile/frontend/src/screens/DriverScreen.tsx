import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, RefreshControl, Image, TextInput, StyleProp, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { api, Endpoints, traducirError } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { Spacing, FontFamily } from '@/theme/colors';
import { resolveMediaUrl } from '@/utils/media';
import { RootStackParamList } from '@/types';
import ScreenScroll from '@/components/ScreenScroll';

const SOCKET_URL: string = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://192.168.1.63:3001';

interface PedidoMatch {
  id: number;
  total: number;
  estado: string;
  vendedor_nombre: string;
  comprador_nombre: string;
  tienda_nombre?: string;
  tienda_direccion?: string;
  direccion_entrega?: string;
  ganancia_repartidor: number;
  distancia_km?: number | null;
}
interface PedidoEntrega extends PedidoMatch {
  created_at: string;
  total_repartidor?: number;
  repartidor_id?: number | null;
  confirmado_repartidor_recogida?: number;
}
interface WalletResp {
  ok: boolean;
  saldo: number;
  movimientos: Array<{ id: number; tipo: string; monto: number; referencia?: string; pedido_id?: number | null; created_at: string }>;
  stats: { hoy: number; semana: number; entregas_hoy: number };
}
interface Perfil {
  nombre: string;
  foto_perfil: string | null;
  descripcion: string | null;
  repartidor_calificacion_promedio: number;
  repartidor_total_resenas: number;
  entregas_completadas: number;
}
interface Resena {
  id: number;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  comprador_nombre: string;
}

export default function DriverScreen() {
  const { colors } = useTheme();
  const { t, lang } = useLang();
  const { usuario, cerrarSesion, refrescar } = useAuth();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  // Refresca el rol al abrir (por si el admin lo cambió)
  useEffect(() => { void refrescar(); }, []);

  const confirmarLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', style: 'destructive', onPress: async () => { await cerrarSesion(); } },
    ]);
  };

  const [enLinea, setEnLinea]       = useState<boolean>(!!usuario?.en_linea);
  const [pendientes, setPendientes] = useState<PedidoMatch[]>([]);
  const [entregas, setEntregas]     = useState<PedidoEntrega[]>([]);
  const [wallet, setWallet]         = useState<WalletResp | null>(null);
  const [refresh, setRefresh]       = useState(false);
  const [tab, setTab]               = useState<'match' | 'mias' | 'wallet' | 'perfil'>('match');

  // Perfil y reseñas (Fase 2 — Módulo 1)
  const [perfil, setPerfil]         = useState<Perfil | null>(null);
  const [resenas, setResenas]       = useState<Resena[]>([]);
  const [editandoBio, setEditandoBio] = useState(false);
  const [bioDraft, setBioDraft]     = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const cargarPerfil = useCallback(async () => {
    try {
      const [rp, rr] = await Promise.all([
        api<{ ok: boolean; perfil?: Perfil }>(Endpoints.repartidorMiPerfil),
        api<{ ok: boolean; resenas?: Resena[] }>(Endpoints.repartidorMisResenas),
      ]);
      if (rp.ok && rp.perfil) { setPerfil(rp.perfil); setBioDraft(rp.perfil.descripcion || ''); }
      if (rr.ok) setResenas(rr.resenas ?? []);
    } catch { /* offline safe */ }
  }, []);

  useEffect(() => { void cargarPerfil(); }, [cargarPerfil]);

  const subirFotoPerfil = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, quality: 0.75, allowsEditing: true, aspect: [1, 1],
    });
    if (r.canceled || !r.assets[0].base64) return;
    const b64 = `data:image/jpeg;base64,${r.assets[0].base64}`;
    const res = await api<{ ok: boolean; foto_perfil?: string }>(Endpoints.repartidorActualizarPerfil, { body: { foto_perfil: b64 } });
    if (res.ok) setPerfil(prev => prev ? { ...prev, foto_perfil: res.foto_perfil ?? prev.foto_perfil } : prev);
  };

  const guardarBio = async () => {
    setGuardandoPerfil(true);
    try {
      const res = await api<{ ok: boolean }>(Endpoints.repartidorActualizarPerfil, { body: { descripcion: bioDraft } });
      if (res.ok) { setPerfil(prev => prev ? { ...prev, descripcion: bioDraft } : prev); setEditandoBio(false); }
    } finally { setGuardandoPerfil(false); }
  };

  const switchAnim = useRef(new Animated.Value(enLinea ? 1 : 0)).current;
  const socketRef  = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [pd, en, w] = await Promise.all([
        api<{ ok: boolean; pedidos?: PedidoMatch[]; en_linea?: boolean }>(Endpoints.repartidorDisponibles),
        api<{ ok: boolean; pedidos?: PedidoEntrega[] }>(Endpoints.repartidorEntregas),
        api<WalletResp>(Endpoints.repartidorWallet),
      ]);
      setPendientes(pd.pedidos ?? []);
      setEntregas(en.pedidos ?? []);
      setWallet(w);
      if (pd.en_linea !== undefined) {
        setEnLinea(pd.en_linea);
        Animated.timing(switchAnim, { toValue: pd.en_linea ? 1 : 0, duration: 220, useNativeDriver: false }).start();
      }
    } catch { /* offline safe */ }
    finally { setRefresh(false); }
  }, [switchAnim]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => {
    if (!enLinea) return;
    const iv = setInterval(cargar, 8000);
    return () => clearInterval(iv);
  }, [enLinea, cargar]);

  // Mientras está en línea, reporta su posición para las búsquedas de "cercanos"
  // (repartidores_cercanos del vendedor y ordenamiento por distancia en "disponibles").
  useEffect(() => {
    if (!enLinea) return;
    let cancelado = false;
    const enviarUbicacion = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelado) return;
        const loc = await Location.getCurrentPositionAsync({});
        const municipio = (await AsyncStorage.getItem('svgo_municipio')) || 'San Salvador';
        await api(Endpoints.authUbicacion, { body: { municipio, lat: loc.coords.latitude, lng: loc.coords.longitude } });
      } catch { /* silencioso: no crítico si falla una actualización */ }
    };
    void enviarUbicacion();
    const iv = setInterval(enviarUbicacion, 45000);
    return () => { cancelado = true; clearInterval(iv); };
  }, [enLinea]);

  // Mientras hay una entrega "en_camino", reporta la ubicación EXACTA del repartidor
  // para ESE pedido — es lo que la tienda y el comprador ven en vivo en su mapa de rastreo
  // (antes esto solo se enviaba desde MapTrackingScreen, pantalla a la que el repartidor
  // nunca navega durante una entrega real, así que la ubicación nunca se actualizaba).
  const idsEnCamino = entregas.filter(p => p.estado === 'en_camino').map(p => p.id).join(',');
  useEffect(() => {
    if (!idsEnCamino) return;
    const ids = idsEnCamino.split(',').map(Number);
    let cancelado = false;
    const enviarUbicacionPedidos = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelado) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        for (const pid of ids) {
          try {
            const r = await api<{ ok: boolean; tiempo_estimado?: number; trafico?: string }>(
              Endpoints.trackingActualizar, { body: { pedido_id: pid, lat: loc.coords.latitude, lng: loc.coords.longitude } },
            );
            socketRef.current?.emit('pedido-ubicacion', {
              pedidoId: pid, lat: loc.coords.latitude, lng: loc.coords.longitude,
              tiempo_estimado: r.tiempo_estimado, trafico: r.trafico,
            });
          } catch { /* seguimos con el resto de pedidos activos */ }
        }
      } catch { /* silencioso: no crítico si falla una actualización */ }
    };
    void enviarUbicacionPedidos();
    const iv = setInterval(enviarUbicacionPedidos, 10000);
    return () => { cancelado = true; clearInterval(iv); };
  }, [idsEnCamino]);

  const toggleEnLinea = async () => {
    const nuevo = !enLinea;
    setEnLinea(nuevo);
    Animated.timing(switchAnim, { toValue: nuevo ? 1 : 0, duration: 220, useNativeDriver: false }).start();
    try {
      const r = await api<{ ok: boolean; en_linea?: boolean; error?: string }>(
        Endpoints.repartidorToggleEnLinea, { body: { en_linea: nuevo } },
      );
      if (!r.ok) {
        setEnLinea(!nuevo);
        Animated.timing(switchAnim, { toValue: !nuevo ? 1 : 0, duration: 220, useNativeDriver: false }).start();
        Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
      } else { void cargar(); }
    } catch {
      setEnLinea(!nuevo);
    }
  };

  const aceptar = async (p: PedidoMatch) => {
    const r = await api<{ ok: boolean; error?: string }>(Endpoints.repartidorAceptar, { body: { pedido_id: p.id } });
    if (r.ok) {
      Alert.alert('Pedido tomado', `Vas a recoger en ${p.tienda_nombre ?? p.vendedor_nombre}. Confirma la recogida cuando llegues.`);
      socketRef.current?.emit('pedido-estado-cambio', { pedidoId: p.id, estado: 'preparacion' });
      void cargar();
    }
    else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
  };

  const confirmarRecogida = async (p: PedidoEntrega) => {
    const r = await api<{ ok: boolean; en_camino?: boolean; error?: string }>(Endpoints.repartidorConfirmarRecogida, { body: { pedido_id: p.id } });
    if (r.ok) {
      Alert.alert(
        r.en_camino ? '¡En camino!' : 'Recogida confirmada',
        r.en_camino ? 'La tienda ya había confirmado — el pedido ya va hacia el cliente.' : 'Falta que la tienda confirme también la entrega.',
      );
      socketRef.current?.emit('pedido-estado-cambio', { pedidoId: p.id, estado: r.en_camino ? 'en_camino' : 'preparacion' });
      void cargar();
    } else Alert.alert(t.common.error, r.error ?? 'Error');
  };

  const completar = async (p: PedidoEntrega) => {
    const r = await api<{ ok: boolean; ganancia_repartidor?: number; error?: string }>(
      Endpoints.repartidorCompletar, { body: { pedido_id: p.id } },
    );
    if (r.ok) {
      Alert.alert('Entrega registrada', `+US$ ${Number(r.ganancia_repartidor ?? 0).toFixed(2)} a tu wallet`);
      socketRef.current?.emit('pedido-estado-cambio', { pedidoId: p.id, estado: 'entregado' });
      void cargar();
    } else Alert.alert(t.common.error, traducirError(r.error, lang) || 'Error');
  };

  const switchBg = switchAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.success] });
  const switchKnob = switchAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 32] });

  // Mapeo semántico del estado de una entrega -> status-pill (fondo tintado 15% + ícono + color).
  // 'en_camino' usa ctaAccent (naranja) para hacer eco visual con el pin de tracking en vivo
  // del mapa (MapTrackingScreen), que usa el mismo color para el mismo estado real del pedido.
  const ESTADO_ENTREGA_CFG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    preparacion: { label: 'Preparando', color: colors.accent, icon: 'restaurant-outline' },
    en_camino:   { label: 'En camino',  color: colors.ctaAccent, icon: 'bicycle-outline' },
    entregado:   { label: 'Entregado',  color: colors.success, icon: 'checkmark-circle-outline' },
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFF', fontFamily: FontFamily.bodyExtraBold, fontSize: 16 }}>{usuario?.nombre?.[0] ?? 'R'}</Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: FontFamily.bodyExtraBold, fontSize: 16 }}>{usuario?.nombre}</Text>
            <Text style={{ color: enLinea ? colors.success : colors.muted, fontFamily: FontFamily.bodyBold, fontSize: 11 }}>
              {enLinea ? t.driver.enLinea : t.driver.fueraLinea}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={toggleEnLinea}>
            <Animated.View style={[styles.switch, { backgroundColor: switchBg }]}>
              <Animated.View style={[styles.switchKnob, { left: switchKnob }]}>
                <Ionicons name={enLinea ? 'flash' : 'power'} size={14} color={enLinea ? colors.success : colors.muted} />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmarLogout}
            activeOpacity={0.85}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: `${colors.danger}18`, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {([
          { k: 'match', label: 'Disponibles', icon: 'flash-outline' as const },
          { k: 'mias',  label: 'Mis entregas', icon: 'list-outline' as const },
          { k: 'wallet', label: 'Wallet',     icon: 'wallet-outline' as const },
          { k: 'perfil', label: 'Mi Perfil',  icon: 'person-outline' as const },
        ] as const).map(it => {
          const act = tab === it.k;
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => setTab(it.k)}
              activeOpacity={0.85}
              style={[styles.tabBtn, act && { backgroundColor: colors.accent }]}
            >
              <Ionicons name={it.icon} size={15} color={act ? '#FFF' : colors.muted} />
              <Text style={{ color: act ? '#FFF' : colors.text, fontFamily: FontFamily.bodyExtraBold, fontSize: 12 }}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScreenScroll
        bottomExtra={80}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); void cargar(); }} tintColor={colors.accent} />}
      >
        {tab === 'match' && (
          <>
            {!enLinea && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <Ionicons name="power-outline" size={28} color={colors.muted} />
                <Text style={{ color: colors.text, fontFamily: FontFamily.displayBold, fontSize: 15, marginTop: 8 }}>{t.driver.fueraLinea}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                  Activa el interruptor para empezar a recibir pedidos.
                </Text>
              </View>
            )}
            {enLinea && pendientes.length === 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="hourglass-outline" size={28} color={colors.muted} />
                <Text style={{ color: colors.text, fontFamily: FontFamily.displayBold, fontSize: 14, marginTop: 8 }}>Esperando pedidos...</Text>
              </View>
            )}
            {pendientes.map((p, i) => (
              <Reanimated.View
                key={p.id}
                entering={FadeInDown.delay(i * 40).springify()}
                style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.muted, fontFamily: FontFamily.displayBold, fontSize: 11, letterSpacing: 0.5 }}>#SV-{p.id}</Text>
                  <View style={[styles.ganBadge, { backgroundColor: colors.success }]}>
                    <Ionicons name="cash" size={12} color="#FFF" />
                    <Text style={styles.ganTxt}>+US$ {Number(p.ganancia_repartidor).toFixed(2)}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <View style={styles.locRow}>
                    <View style={[styles.locDot, { backgroundColor: colors.accent }]} />
                    <Text style={{ color: colors.text, fontFamily: FontFamily.bodyBold, flex: 1 }} numberOfLines={1}>
                      {p.tienda_nombre ?? p.vendedor_nombre} <Text style={{ color: colors.muted, fontFamily: FontFamily.bodySemiBold }}>· origen</Text>
                    </Text>
                  </View>
                  <View style={styles.locRow}>
                    <View style={[styles.locDot, { backgroundColor: colors.success }]} />
                    <Text style={{ color: colors.text, fontFamily: FontFamily.bodyBold, flex: 1 }} numberOfLines={1}>
                      {p.comprador_nombre} <Text style={{ color: colors.muted, fontFamily: FontFamily.bodySemiBold }}>· destino</Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.muted, fontSize: 11, fontFamily: FontFamily.bodyBold }}>
                    Total pedido{p.distancia_km != null ? ` · ${p.distancia_km} km` : ''}
                  </Text>
                  <Text style={{ color: colors.text, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] }}>US$ {Number(p.total).toFixed(2)}</Text>
                </View>

                <ActionButton onPress={() => aceptar(p)} bg={colors.accent} icon="checkmark-circle" label="Aceptar pedido" />
              </Reanimated.View>
            ))}
          </>
        )}

        {tab === 'mias' && (
          <>
            {entregas.length === 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="cube-outline" size={28} color={colors.muted} />
                <Text style={{ color: colors.text, fontFamily: FontFamily.displayBold, fontSize: 14, marginTop: 8 }}>Sin entregas aún</Text>
              </View>
            )}
            {entregas.map((p, i) => {
              const cfg = ESTADO_ENTREGA_CFG[p.estado] ?? ESTADO_ENTREGA_CFG.preparacion;
              return (
                <Reanimated.View
                  key={p.id}
                  entering={FadeInDown.delay(i * 40).springify()}
                  style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.muted, fontFamily: FontFamily.displayBold, fontSize: 11 }}>#SV-{p.id}</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${cfg.color}26` }]}>
                      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                      <Text style={[styles.statusPillTxt, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.text, fontFamily: FontFamily.bodyExtraBold, marginTop: 6 }}>{p.vendedor_nombre} → {p.comprador_nombre}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(p.created_at).toLocaleString()}</Text>

                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>Tu ganancia</Text>
                    <Text style={{ color: colors.success, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] }}>
                      US$ {Number(p.total_repartidor ?? p.ganancia_repartidor ?? 0).toFixed(2)}
                    </Text>
                  </View>

                  {p.estado === 'preparacion' && !p.confirmado_repartidor_recogida && (
                    <ActionButton onPress={() => confirmarRecogida(p)} bg={colors.accent} icon="checkmark-done-circle" label="Confirmar recogida en tienda" />
                  )}
                  {p.estado === 'preparacion' && !!p.confirmado_repartidor_recogida && (
                    <Text style={{ color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                      Esperando que la tienda confirme la entrega…
                    </Text>
                  )}
                  {p.estado === 'en_camino' && (
                    <>
                      <ActionButton
                        onPress={() => nav.navigate('Tracking' as any, { pedidoId: p.id })}
                        bg={colors.accentLight}
                        textColor={colors.accent}
                        icon="location"
                        label="Ver mi ubicación en el mapa"
                        style={{ shadowOpacity: 0, marginTop: 8 }}
                      />
                      <ActionButton onPress={() => completar(p)} bg={colors.success} icon="checkmark-done-circle" label="Marcar entregado" />
                    </>
                  )}
                </Reanimated.View>
              );
            })}
          </>
        )}

        {tab === 'wallet' && wallet && (
          <>
            <View style={[styles.walletBig, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
              <Ionicons name="wallet" size={24} color="rgba(255,255,255,0.85)" />
              <Text style={styles.walletLabel}>Saldo actual</Text>
              <Text style={styles.walletSaldo}>US$ {Number(wallet.saldo).toFixed(2)}</Text>
              <View style={styles.walletStats}>
                {([
                  { icon: 'cash-outline' as const, val: `US$ ${Number(wallet.stats.hoy).toFixed(2)}`, lab: t.driver.gananciasHoy },
                  { icon: 'calendar-outline' as const, val: `US$ ${Number(wallet.stats.semana).toFixed(2)}`, lab: t.driver.gananciasSemanales },
                  { icon: 'bicycle-outline' as const, val: String(wallet.stats.entregas_hoy), lab: t.driver.entregasHoy },
                ]).map((s, idx) => (
                  <View key={idx} style={styles.walletStat}>
                    <Ionicons name={s.icon} size={13} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.walletStatVal}>{s.val}</Text>
                    <Text style={styles.walletStatLab}>{s.lab}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={{ color: colors.text, fontFamily: FontFamily.displayBold, fontSize: 15, marginTop: 16, marginBottom: 10 }}>Movimientos</Text>
            {wallet.movimientos.map((m, i) => (
              <Reanimated.View
                key={m.id}
                entering={FadeInDown.delay(i * 30).springify()}
                style={[styles.mov, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.movIcon, { backgroundColor: m.monto > 0 ? `${colors.success}26` : `${colors.danger}26` }]}>
                  <Ionicons name={m.monto > 0 ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color={m.monto > 0 ? colors.success : colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: FontFamily.bodyExtraBold, fontSize: 13 }}>{m.referencia ?? m.tipo}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(m.created_at).toLocaleString()}</Text>
                </View>
                <Text style={{ color: m.monto > 0 ? colors.success : colors.danger, fontFamily: FontFamily.displayExtraBold, fontVariant: ['tabular-nums'] }}>
                  {m.monto > 0 ? '+' : ''}{Number(m.monto).toFixed(2)}
                </Text>
              </Reanimated.View>
            ))}
          </>
        )}

        {tab === 'perfil' && (
          <>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={subirFotoPerfil} activeOpacity={0.85} style={{ position: 'relative' }}>
                {perfil?.foto_perfil ? (
                  <Image source={{ uri: resolveMediaUrl(perfil.foto_perfil) }} style={styles.perfilAvatar} />
                ) : (
                  <View style={[styles.perfilAvatar, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#FFF', fontFamily: FontFamily.bodyExtraBold, fontSize: 26 }}>{usuario?.nombre?.[0] ?? 'R'}</Text>
                  </View>
                )}
                <View style={[styles.perfilCamBadge, { backgroundColor: colors.accent, borderColor: colors.background }]}>
                  <Ionicons name="camera" size={13} color="#FFF" />
                </View>
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontFamily: FontFamily.bodyExtraBold, fontSize: 17, marginTop: 10 }}>{perfil?.nombre ?? usuario?.nombre}</Text>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                <View style={styles.statInline}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={[styles.statInlineTxt, { color: colors.text }]}>
                    {perfil?.repartidor_calificacion_promedio ? Number(perfil.repartidor_calificacion_promedio).toFixed(1) : '—'}
                  </Text>
                  <Text style={[styles.statInlineSub, { color: colors.muted }]}>({perfil?.repartidor_total_resenas ?? 0})</Text>
                </View>
                <View style={styles.statInline}>
                  <Ionicons name="bicycle-outline" size={14} color={colors.muted} />
                  <Text style={[styles.statInlineTxt, { color: colors.text }]}>{perfil?.entregas_completadas ?? 0}</Text>
                  <Text style={[styles.statInlineSub, { color: colors.muted }]}>entregas</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'stretch' }]}>
              <Text style={{ color: colors.text, fontFamily: FontFamily.displayBold, fontSize: 13, marginBottom: 8 }}>Descripción</Text>
              {!editandoBio ? (
                <>
                  <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                    {perfil?.descripcion || 'Sin descripción todavía.'}
                  </Text>
                  <TouchableOpacity onPress={() => setEditandoBio(true)} style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.accent, fontFamily: FontFamily.bodyExtraBold, fontSize: 12 }}>Editar descripción</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[styles.bioInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <TextInputBio value={bioDraft} onChangeText={setBioDraft} color={colors.text} placeholderColor={colors.muted} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <ActionButton
                      onPress={guardarBio}
                      disabled={guardandoPerfil}
                      bg={colors.accent}
                      icon={guardandoPerfil ? undefined : 'checkmark'}
                      label={guardandoPerfil ? 'Guardando...' : 'Guardar'}
                      style={{ flex: 1, marginTop: 0 }}
                    />
                    <ActionButton
                      onPress={() => { setEditandoBio(false); setBioDraft(perfil?.descripcion || ''); }}
                      bg={colors.border}
                      textColor={colors.text}
                      icon="close"
                      label="Cancelar"
                      style={{ flex: 1, marginTop: 0, shadowOpacity: 0 }}
                    />
                  </View>
                </>
              )}
            </View>

            <Text style={{ color: colors.text, fontFamily: FontFamily.displayBold, fontSize: 15, marginTop: 16, marginBottom: 10 }}>Reseñas de clientes</Text>
            {resenas.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>Aún no tienes reseñas.</Text>
            ) : resenas.map((r, i) => (
              <Reanimated.View
                key={r.id}
                entering={FadeInDown.delay(i * 40).springify()}
                style={[styles.mov, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontFamily: FontFamily.bodyExtraBold, fontSize: 13 }}>{r.comprador_nombre}</Text>
                    <StarRow count={r.estrellas} color={colors.warning} emptyColor={colors.border} />
                  </View>
                  {!!r.comentario && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{r.comentario}</Text>}
                </View>
              </Reanimated.View>
            ))}
          </>
        )}
      </ScreenScroll>
    </View>
  );
}

function TextInputBio({ value, onChangeText, color, placeholderColor }: { value: string; onChangeText: (v: string) => void; color: string; placeholderColor: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Cuéntale a tus clientes sobre ti..."
      placeholderTextColor={placeholderColor}
      multiline
      numberOfLines={3}
      style={{ color, fontFamily: FontFamily.bodyRegular, fontSize: 13, minHeight: 60, textAlignVertical: 'top', padding: 12 }}
    />
  );
}

/** Fila de 1 a 5 estrellas Ionicons — reemplaza los antiguos caracteres '★' pintados como texto. */
function StarRow({ count, color, emptyColor, size = 12 }: { count: number; color: string; emptyColor: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= count ? 'star' : 'star-outline'} size={size} color={i <= count ? color : emptyColor} />
      ))}
    </View>
  );
}

/** Botón de acción reutilizable con el mismo micro-gesto de tap (spring a 0.96) que src/components/Button.tsx,
 *  pero permitiendo color de texto explícito — evita depender de colors.contrast para casos de texto blanco
 *  sobre fondo sólido (accent/success), que es el contrato de color que pide DESIGN.md para estos botones. */
function ActionButton({
  onPress, bg, textColor = '#FFF', icon, label, shadowColor, style, disabled,
}: {
  onPress: () => void;
  bg: string;
  textColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  shadowColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => { Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 150, friction: 8 }).start(); };
  const onPressOut = () => { Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 8 }).start(); };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.88}
        disabled={disabled}
        style={[styles.acceptBtn, { backgroundColor: bg, shadowColor: shadowColor ?? bg }, disabled && { opacity: 0.6 }, style]}
      >
        {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
        <Text style={[styles.acceptTxt, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: 14, borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  perfilAvatar: { width: 84, height: 84, borderRadius: 42 },
  perfilCamBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  bioInput: { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  switch: { width: 60, height: 32, borderRadius: 18, position: 'relative', justifyContent: 'center' },
  switchKnob: {
    width: 26, height: 26, borderRadius: 13, position: 'absolute',
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 4, elevation: 3,
  },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, margin: 12, borderRadius: 22, borderWidth: 1.5 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 18 },
  card: {
    borderRadius: 20, padding: 18, borderWidth: 1, alignItems: 'center', marginTop: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  matchCard: {
    borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 4,
  },
  ganBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  ganTxt: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 22, marginTop: 12,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5,
  },
  acceptTxt: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, letterSpacing: 0.3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusPillTxt: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  statInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statInlineTxt: { fontFamily: FontFamily.displayBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  statInlineSub: { fontFamily: FontFamily.bodySemiBold, fontSize: 12 },
  walletBig: {
    borderRadius: 24, padding: 22,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 20, elevation: 10,
  },
  walletLabel: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontFamily: FontFamily.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  walletSaldo: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 36, letterSpacing: -1, marginTop: 4, fontVariant: ['tabular-nums'] },
  walletStats: { flexDirection: 'row', gap: 14, marginTop: 18 },
  walletStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12 },
  walletStatVal: { color: '#FFF', fontFamily: FontFamily.displayExtraBold, fontSize: 15, marginTop: 6, fontVariant: ['tabular-nums'] },
  walletStatLab: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontFamily: FontFamily.bodyBold, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  mov: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  movIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
