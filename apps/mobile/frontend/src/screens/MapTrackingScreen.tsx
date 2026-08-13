import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Animated, Easing, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints } from '@/services/api';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { Pedido, RootStackParamList } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { resolveMediaUrl } from '@/utils/media';

const SOCKET_URL: string = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://192.168.1.63:3001';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'Tracking'>;
type Route = RouteProp<RootStackParamList, 'Tracking'>;

interface RespEstado { ok: boolean; pedido?: Pedido }
interface RespUbic   { ok: boolean; tiempo_estimado?: number; trafico?: string }

type Etapa = 'preparando' | 'enCamino' | 'enRuta' | 'entregado';

function etapaDesdeEstado(estado: string): Etapa {
  if (estado === 'preparacion') return 'preparando';
  if (estado === 'en_camino')   return 'enRuta';
  if (estado === 'entregado')   return 'entregado';
  return 'enCamino';
}

const ETAPA_ICONS: Record<Etapa, keyof typeof Ionicons.glyphMap> = {
  preparando: 'restaurant-outline',
  enCamino:   'storefront-outline',
  enRuta:     'bicycle-outline',
  entregado:  'checkmark-circle-outline',
};

const ETAPA_ORDEN: Etapa[] = ['preparando', 'enCamino', 'enRuta', 'entregado'];

export default function MapTrackingScreen() {
  const route   = useRoute<Route>();
  const nav     = useNavigation<Nav>();
  const { usuario }  = useAuth();
  const { colors }   = useTheme();
  const { t }        = useLang();
  const insets       = useSafeAreaInsets();
  const { pedidoId } = route.params;

  const [pedido, setPedido]       = useState<Pedido | null>(null);
  const [cargando, setCargando]   = useState(true);
  const [remaining, setRemaining] = useState<number>(0); // seconds
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const cargar = useCallback(async () => {
    const r = await api<RespEstado>(Endpoints.trackingEstado(pedidoId));
    if (r.ok && r.pedido) {
      setPedido(r.pedido);
      const mins = r.pedido.tiempo_estimado ?? 25;
      setRemaining(mins * 60);
    }
    setCargando(false);
  }, [pedidoId]);

  useEffect(() => {
    void cargar();
    // El poll REST queda como respaldo de baja frecuencia; el socket es la vía principal de refresco
    pollRef.current = setInterval(() => { void cargar(); }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [cargar]);

  // Sync tri-party en tiempo real: usuario, vendedor y repartidor comparten la sala `pedido_<id>`
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-pedido', { pedidoId }));
    socket.on('pedido-estado-cambio', () => { void cargar(); });
    socket.on('pedido-ubicacion', (payload: { lat: number; lng: number; tiempo_estimado?: number; trafico?: string }) => {
      setPedido(prev => prev ? {
        ...prev,
        repartidor_lat: payload.lat,
        repartidor_lng: payload.lng,
        tiempo_estimado: payload.tiempo_estimado ?? prev.tiempo_estimado,
        trafico: payload.trafico ?? prev.trafico,
      } : prev);
    });
    return () => { socket.emit('leave-pedido', { pedidoId }); socket.disconnect(); };
  }, [pedidoId, cargar]);

  // Countdown
  useEffect(() => {
    if (remaining <= 0) return;
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pedido]);

  useEffect(() => {
    async function startGps() {
      if (usuario?.rol !== 'repartidor' || !pedido || pedido.estado !== 'en_camino') return;
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) { Alert.alert('GPS requerido', 'Activa el GPS para enviar tu ubicación'); return; }
      gpsRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const r = await api<RespUbic>(Endpoints.trackingActualizar, { body: { pedido_id: pedidoId, lat: loc.coords.latitude, lng: loc.coords.longitude } });
          socketRef.current?.emit('pedido-ubicacion', {
            pedidoId, lat: loc.coords.latitude, lng: loc.coords.longitude,
            tiempo_estimado: r.tiempo_estimado, trafico: r.trafico,
          });
        } catch { /**/ }
      }, 10000);
    }
    void startGps();
    return () => { if (gpsRef.current) clearInterval(gpsRef.current); };
  }, [pedido, pedidoId, usuario]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (cargando || !pedido) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loaderTxt, { color: colors.text }]}>{t.tracking.cargando}</Text>
      </View>
    );
  }

  const etapaActual = etapaDesdeEstado(pedido.estado);
  const etapaIdx    = ETAPA_ORDEN.indexOf(etapaActual);

  const tiendaLat = pedido.tienda_lat ?? 13.6929;
  const tiendaLng = pedido.tienda_lng ?? -89.2182;
  const clienteLat = pedido.lat_entrega ?? tiendaLat;
  const clienteLng = pedido.lng_entrega ?? tiendaLng;
  const repLat = pedido.repartidor_lat;
  const repLng = pedido.repartidor_lng;

  const ruta = repLat && repLng
    ? [{ latitude: repLat, longitude: repLng }, { latitude: clienteLat, longitude: clienteLng }]
    : [{ latitude: tiendaLat, longitude: tiendaLng }, { latitude: clienteLat, longitude: clienteLng }];

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: (tiendaLat + clienteLat) / 2,
          longitude: (tiendaLng + clienteLng) / 2,
          latitudeDelta: Math.abs(tiendaLat - clienteLat) + 0.05,
          longitudeDelta: Math.abs(tiendaLng - clienteLng) + 0.05,
        }}
      >
        <Marker coordinate={{ latitude: tiendaLat, longitude: tiendaLng }} pinColor={Colors.accent} title="Tienda" />
        <Marker coordinate={{ latitude: clienteLat, longitude: clienteLng }} pinColor={Colors.success} title="Entrega" />
        {repLat && repLng
          ? <Marker coordinate={{ latitude: repLat, longitude: repLng }} pinColor={Colors.warning} title="Repartidor" />
          : null}
        <Polyline coordinates={ruta} strokeColor={Colors.accent} strokeWidth={4} lineDashPattern={[1]} />
      </MapView>

      {/* Top HUD */}
      <View style={[styles.topBar, { top: insets.top + 12, backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={[styles.topBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>{t.tracking.pedido} #{pedido.id}</Text>
        <TouchableOpacity onPress={cargar} style={[styles.topBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="sync-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Bottom Panel */}
      <View style={[styles.panel, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.panelHandle, { backgroundColor: colors.border }]} />

        {/* Ficha flotante del repartidor asignado — foto, nombre, calificación, entregas */}
        {usuario?.rol !== 'repartidor' && pedido.repartidor_nombre && (
          <View style={[styles.driverCard, { backgroundColor: colors.accentLight, borderColor: `${colors.accent}30` }]}>
            {pedido.repartidor_foto
              ? <Image source={{ uri: resolveMediaUrl(pedido.repartidor_foto) }} style={styles.driverAvatar} />
              : <View style={[styles.driverAvatar, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>{pedido.repartidor_nombre[0]}</Text>
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Tu repartidor
              </Text>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }} numberOfLines={1}>{pedido.repartidor_nombre}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {!!pedido.repartidor_calificacion_promedio && (
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                    ★ {Number(pedido.repartidor_calificacion_promedio).toFixed(1)}
                    <Text style={{ color: colors.muted, fontWeight: '600' }}> ({pedido.repartidor_total_resenas ?? 0})</Text>
                  </Text>
                )}
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>
                  {pedido.repartidor_entregas_completadas ?? 0} entregas
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {pedido.repartidor_telefono && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${pedido.repartidor_telefono}`)}
                  style={[styles.driverBtn, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="call-outline" size={16} color={colors.accent} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => nav.navigate('Chat', { otroId: pedido.repartidor_id!, nombre: pedido.repartidor_nombre! })}
                style={[styles.driverBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Countdown */}
        {remaining > 0 && pedido.estado !== 'entregado' && (
          <View style={[styles.countdownBox, { backgroundColor: colors.accentLight, borderColor: `${colors.accent}30` }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="time-outline" size={20} color={colors.accent} />
            </Animated.View>
            <Text style={[styles.countdownTxt, { color: colors.text }]}>
              {t.tracking.llegara}{' '}
              <Text style={[styles.countdownBold, { color: colors.accent }]}>
                {mins} {t.tracking.minutos} {secs < 10 ? `0${secs}` : secs} {t.tracking.segundos}
              </Text>
            </Text>
          </View>
        )}

        {/* Stage progress */}
        <View style={styles.stageRow}>
          {ETAPA_ORDEN.map((etapa, i) => {
            const done = i <= etapaIdx;
            const active = i === etapaIdx;
            return (
              <React.Fragment key={etapa}>
                <View style={styles.stageItem}>
                  <View style={[
                    styles.stageCircle,
                    {
                      backgroundColor: done ? colors.accent : colors.background,
                      borderColor: done ? colors.accent : colors.border,
                    },
                  ]}>
                    <Ionicons name={ETAPA_ICONS[etapa]} size={14} color={done ? '#FFF' : colors.muted} />
                  </View>
                  <Text style={[styles.stageLbl, { color: active ? colors.accent : colors.muted, fontWeight: active ? '700' : '500' }]} numberOfLines={2}>
                    {t.tracking.etapas[etapa]}
                  </Text>
                </View>
                {i < ETAPA_ORDEN.length - 1 && (
                  <View style={[styles.stageLine, { backgroundColor: i < etapaIdx ? colors.accent : colors.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Info cards */}
        <View style={styles.infoRow}>
          {[
            { icon: 'time-outline', label: t.tracking.tiempo, value: `${pedido.tiempo_estimado ?? '--'} min` },
            { icon: 'car-outline',  label: t.tracking.trafico, value: pedido.trafico ?? 'Normal' },
            { icon: 'cash-outline', label: t.tracking.total,   value: `$${Number(pedido.total).toFixed(2)}` },
          ].map(info => (
            <View key={info.label} style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.infoIconBg, { backgroundColor: colors.accentLight }]}>
                <Ionicons name={info.icon as any} size={16} color={colors.accent} />
              </View>
              <Text style={[styles.infoLbl, { color: colors.muted }]}>{info.label}</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>{info.value}</Text>
            </View>
          ))}
        </View>

        {/* Address */}
        <View style={[styles.addrCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {[
            { icon: 'storefront-outline', color: colors.muted, label: `${t.tracking.tienda}: `, value: pedido.vendedor_nombre ?? '--' },
            { icon: 'location-outline',   color: colors.accent, label: `${t.tracking.entrega}: `, value: pedido.direccion_entrega },
            ...(pedido.repartidor_nombre ? [{ icon: 'bicycle-outline', color: colors.success, label: `${t.tracking.repartidor}: `, value: pedido.repartidor_nombre }] : []),
          ].map((row, i, arr) => (
            <React.Fragment key={row.label}>
              <View style={styles.addrRow}>
                <Ionicons name={row.icon as any} size={16} color={row.color} style={{ marginRight: Spacing.sm }} />
                <Text style={[styles.addrTxt, { color: colors.text }]} numberOfLines={1}>
                  <Text style={{ fontWeight: '700' }}>{row.label}</Text>{row.value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.addrDiv, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderTxt: { marginTop: Spacing.md, fontWeight: '600' },
  map: { flex: 1 },
  topBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 5,
  },
  topBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  topTitle: { fontWeight: '800', fontSize: Fonts.regular + 1 },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.md, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  panelHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, marginBottom: Spacing.md,
  },
  driverAvatar: { width: 46, height: 46, borderRadius: 23 },
  driverBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  countdownBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, marginBottom: Spacing.md,
  },
  countdownTxt: { flex: 1, fontSize: Fonts.small + 1, fontWeight: '500', lineHeight: 18 },
  countdownBold: { fontWeight: '900' },
  stageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  stageItem: { alignItems: 'center', width: 60 },
  stageCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 4,
  },
  stageLine: { flex: 1, height: 2, marginTop: 14, marginHorizontal: 2 },
  stageLbl: { fontSize: 9, textAlign: 'center', lineHeight: 12 },
  infoRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  infoCard: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1,
  },
  infoIconBg: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  infoLbl: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 },
  infoVal: { fontWeight: '800', fontSize: Fonts.small, marginTop: 2 },
  addrCard: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  addrRow: { flexDirection: 'row', alignItems: 'center' },
  addrTxt: { flex: 1, fontSize: Fonts.small + 1, fontWeight: '500' },
  addrDiv: { height: 1, marginVertical: 8 },
});
