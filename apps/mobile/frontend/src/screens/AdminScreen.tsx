import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Endpoints, API_URL } from '@/services/api';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
import { SolicitudRol, ReporteSoporte } from '@/types';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';

type Tab = 'pendientes' | 'historial' | 'soporte';

interface RespStats { ok: boolean; stats?: { usuarios: number; vendedores: number; repartidores: number; pedidos: number; pendientes: number } }
interface RespSolicitudes { ok: boolean; solicitudes?: SolicitudRol[] }
interface RespResolver { ok: boolean; error?: string }
interface RespSoporte { ok: boolean; reportes?: ReporteSoporte[] }

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path;
  return `${API_URL.replace('/backend', '')}/backend/${path}`;
}

export default function AdminScreen() {
  const { cerrarSesion, usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('pendientes');
  const [stats, setStats] = useState<RespStats['stats']>();
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[]>([]);
  const [reportes, setReportes] = useState<ReporteSoporte[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [verSol, setVerSol] = useState<SolicitudRol | null>(null);
  const [verRep, setVerRep] = useState<ReporteSoporte | null>(null);
  const [notas, setNotas] = useState<string>('');
  const [respuesta, setRespuesta] = useState<string>('');

  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    const s = await api<RespStats>(Endpoints.adminStats);
    if (s.ok) setStats(s.stats);
    if (tab === 'soporte') {
      const r = await api<RespSoporte>(Endpoints.adminSoporte);
      if (r.ok && r.reportes) setReportes(r.reportes);
    } else {
      const estado = tab === 'pendientes' ? 'pendiente' : 'todos';
      const r = await api<RespSolicitudes>(Endpoints.adminSolicitudes(estado));
      if (r.ok && r.solicitudes) setSolicitudes(r.solicitudes);
    }
    setCargando(false);
  }, [tab]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function resolver(decision: 'aprobado' | 'rechazado'): Promise<void> {
    if (!verSol) return;
    const r = await api<RespResolver>(Endpoints.adminResolver, {
      body: { solicitud_id: verSol.id, decision, notas }
    });
    if (r.ok) {
      Alert.alert('Listo', `Solicitud ${decision}`);
      setVerSol(null); setNotas('');
      await cargar();
    } else Alert.alert('Error', r.error ?? 'Fallo');
  }

  async function responderSoporte(): Promise<void> {
    if (!verRep || !respuesta) return;
    const r = await api<RespResolver>(Endpoints.adminResponderSoporte, {
      body: { reporte_id: verRep.id, respuesta, estado: 'cerrado' }
    });
    if (r.ok) { Alert.alert('Listo', 'Respuesta enviada'); setVerRep(null); setRespuesta(''); await cargar(); }
    else Alert.alert('Error', r.error ?? 'Fallo');
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={styles.headerTitle}>Panel Admin 🛡️</Text>
          <Text style={styles.headerSub}>{usuario?.nombre}</Text>
        </View>
        <TouchableOpacity onPress={cerrarSesion}><Ionicons name="log-out-outline" size={26} color={Colors.contrast} /></TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={Colors.accent} />}>
        {stats ? (
          <View style={styles.statsGrid}>
            <View style={styles.stat}><Text style={styles.statNum}>{stats.usuarios}</Text><Text style={styles.statLbl}>Usuarios</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{stats.vendedores}</Text><Text style={styles.statLbl}>Vendedores</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{stats.repartidores}</Text><Text style={styles.statLbl}>Repartidores</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{stats.pedidos}</Text><Text style={styles.statLbl}>Pedidos</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{stats.pendientes}</Text><Text style={styles.statLbl}>Pendientes</Text></View>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {(['pendientes', 'historial', 'soporte'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabAct]} onPress={() => setTab(t)}>
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtAct]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab !== 'soporte' ? (
          solicitudes.length === 0 && !cargando ? <Text style={styles.vacio}>Sin solicitudes</Text> :
          solicitudes.map(s => (
            <TouchableOpacity key={s.id} style={styles.item} onPress={() => setVerSol(s)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNombre}>{s.nombre_completo}</Text>
                <Text style={styles.itemSub}>Quiere ser {s.rol_solicitado} · DUI {s.dui_numero}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: s.estado === 'pendiente' ? Colors.warning : s.estado === 'aprobado' ? Colors.success : Colors.danger }]}>
                  <Text style={styles.estadoTxt}>{s.estado.toUpperCase()}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.muted} />
            </TouchableOpacity>
          ))
        ) : (
          reportes.length === 0 && !cargando ? <Text style={styles.vacio}>Sin tickets</Text> :
          reportes.map(r => (
            <TouchableOpacity key={r.id} style={styles.item} onPress={() => setVerRep(r)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNombre}>{r.asunto}</Text>
                <Text style={styles.itemSub} numberOfLines={2}>{r.descripcion}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: r.estado === 'abierto' ? Colors.warning : Colors.success }]}>
                  <Text style={styles.estadoTxt}>{r.estado.toUpperCase()}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.muted} />
            </TouchableOpacity>
          ))
        )}
        {cargando ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.md }} /> : null}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <Modal visible={!!verSol} animationType="slide" onRequestClose={() => setVerSol(null)}>
        {verSol ? (
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: Spacing.md }}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{verSol.nombre_completo}</Text>
              <TouchableOpacity onPress={() => setVerSol(null)}><Ionicons name="close" size={28} color={Colors.text} /></TouchableOpacity>
            </View>
            <Text style={styles.kv}>Solicita: {verSol.rol_solicitado}</Text>
            <Text style={styles.kv}>DUI: {verSol.dui_numero}</Text>
            <Text style={styles.kv}>Email: {verSol.email ?? '-'}</Text>
            <Text style={styles.kv}>Tel: {verSol.telefono ?? '-'}</Text>
            <Text style={styles.kv}>Credenciales: {verSol.credenciales ?? '-'}</Text>

            <Text style={styles.lbl}>DUI Frente</Text>
            <Image source={{ uri: imgUri(verSol.dui_frente) }} style={styles.dui} />
            <Text style={styles.lbl}>DUI Reverso</Text>
            <Image source={{ uri: imgUri(verSol.dui_reverso) }} style={styles.dui} />

            {verSol.estado === 'pendiente' ? (
              <>
                <Text style={styles.lbl}>Notas</Text>
                <TextInput style={styles.input} value={notas} onChangeText={setNotas} placeholder="Notas (opcional)" placeholderTextColor={Colors.muted} multiline />
                <View style={{ height: Spacing.sm }} />
                <Button label="Aprobar" icon="checkmark-circle-outline" onPress={() => resolver('aprobado')} />
                <View style={{ height: Spacing.sm }} />
                <Button label="Rechazar" icon="close-circle-outline" variant="danger" onPress={() => resolver('rechazado')} />
              </>
            ) : (
              <Text style={[styles.kv, { marginTop: Spacing.md }]}>Estado: {verSol.estado.toUpperCase()}</Text>
            )}
          </ScrollView>
        ) : null}
      </Modal>

      <Modal visible={!!verRep} animationType="slide" onRequestClose={() => setVerRep(null)}>
        {verRep ? (
          <ScrollView style={styles.modal} contentContainerStyle={{ padding: Spacing.md }}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{verRep.asunto}</Text>
              <TouchableOpacity onPress={() => setVerRep(null)}><Ionicons name="close" size={28} color={Colors.text} /></TouchableOpacity>
            </View>
            <Text style={styles.kv}>De: {verRep.usuario_nombre ?? '-'}</Text>
            <Text style={styles.kv}>Estado: {verRep.estado}</Text>
            <Text style={[styles.kv, { marginTop: Spacing.sm }]}>{verRep.descripcion}</Text>
            {verRep.respuesta_admin ? <Text style={[styles.kv, { marginTop: Spacing.md, fontStyle: 'italic' }]}>Respuesta previa: {verRep.respuesta_admin}</Text> : null}
            {verRep.estado !== 'cerrado' ? (
              <>
                <Text style={styles.lbl}>Respuesta</Text>
                <TextInput style={styles.input} value={respuesta} onChangeText={setRespuesta} placeholder="Tu respuesta" placeholderTextColor={Colors.muted} multiline />
                <Button label="Responder y cerrar" icon="send-outline" onPress={responderSoporte} />
              </>
            ) : null}
          </ScrollView>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.accent,
    paddingTop: 16,
    paddingBottom: Spacing.md, 
    paddingHorizontal: Spacing.md, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 4
  },
  headerTitle: { color: Colors.contrast, fontSize: Fonts.title - 2, fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { color: Colors.contrast, opacity: 0.9, marginTop: 2, fontSize: Fonts.small, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: Spacing.sm },
  stat: { 
    flexBasis: '30%', 
    flexGrow: 1, 
    backgroundColor: Colors.card, 
    borderRadius: Radius.md, 
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 3, elevation: 1
  },
  statNum: { fontSize: Fonts.heading - 2, color: Colors.accent, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: { color: Colors.muted, fontSize: Fonts.small - 1, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 },
  tabs: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(74, 109, 140, 0.05)', 
    borderRadius: Radius.pill, 
    padding: 6, 
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md, 
    borderWidth: 1, 
    borderColor: 'rgba(74, 109, 140, 0.08)' 
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.pill },
  tabAct: { 
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2
  },
  tabTxt: { color: Colors.muted, fontWeight: '700', fontSize: Fonts.small },
  tabTxtAct: { color: Colors.contrast },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    marginHorizontal: Spacing.md, 
    marginTop: Spacing.sm, 
    padding: Spacing.md, 
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 3, elevation: 1
  },
  itemNombre: { color: Colors.text, fontWeight: '800', fontSize: Fonts.regular, letterSpacing: -0.2 },
  itemSub: { color: Colors.muted, marginTop: 2, fontSize: Fonts.small + 1, fontWeight: '500' },
  estadoBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  estadoTxt: { color: Colors.contrast, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  vacio: { textAlign: 'center', color: Colors.muted, padding: Spacing.lg, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: Colors.background, paddingTop: 40 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.title - 2, color: Colors.text, fontWeight: '800', flex: 1, letterSpacing: -0.2 },
  kv: { color: Colors.text, marginBottom: 6, fontSize: Fonts.regular, fontWeight: '500' },
  lbl: { color: Colors.text, fontWeight: '800', marginTop: Spacing.md, marginBottom: 6, fontSize: Fonts.regular - 1 },
  dui: { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.border, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.sm },
  input: { 
    backgroundColor: Colors.card, 
    borderRadius: Radius.md, 
    borderWidth: 1.5, 
    borderColor: Colors.border, 
    padding: Spacing.md, 
    color: Colors.text, 
    minHeight: 80, 
    marginBottom: Spacing.sm, 
    textAlignVertical: 'top',
    fontSize: Fonts.regular,
    fontWeight: '500'
  }
});
