import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet,
  Alert, RefreshControl, TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { ReporteSoporte } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenScroll from '@/components/ScreenScroll';

interface RespCrear { ok: boolean; error?: string }
interface RespList { ok: boolean; reportes?: ReporteSoporte[] }

const MOCK_TICKETS: ReporteSoporte[] = [
  { id: 1, usuario_id: 1, asunto: 'Pedido no llegó a tiempo', descripcion: 'Mi pedido #1023 debía llegar en 30 min y tardó más de 2 horas', estado: 'en_proceso', respuesta_admin: 'Hola, lamentamos el inconveniente. Estamos investigando con el repartidor. Te compensaremos con $2 de crédito.', created_at: '2026-05-22T14:30:00' },
  { id: 2, usuario_id: 1, asunto: 'Cobro duplicado', descripcion: 'Se me cobró dos veces el pedido #1019 por $8.50', estado: 'cerrado', respuesta_admin: 'El reembolso de $8.50 fue procesado. Aparecerá en 3-5 días hábiles en tu cuenta.', created_at: '2026-05-20T09:15:00' },
  { id: 3, usuario_id: 1, asunto: 'Producto incorrecto', descripcion: 'Pedí pupusas de queso pero me enviaron de loroco', estado: 'abierto', created_at: '2026-05-23T08:00:00' },
];

const ESTADO_CONFIG = {
  abierto:    { color: '#F59E0B', icon: 'time-outline' as const,        label: 'Abierto' },
  en_proceso: { color: '#4A6D8C', icon: 'refresh-outline' as const,     label: 'En proceso' },
  cerrado:    { color: '#22C55E', icon: 'checkmark-circle-outline' as const, label: 'Cerrado' },
};

export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useLang();

  const [asunto, setAsunto]         = useState('');
  const [desc, setDesc]             = useState('');
  const [enviando, setEnviando]     = useState(false);
  const [tickets, setTickets]       = useState<ReporteSoporte[]>(MOCK_TICKETS);
  const [cargando, setCargando]     = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api<RespList>(Endpoints.soporteMis);
      if (r.ok && r.reportes && r.reportes.length > 0) setTickets(r.reportes);
      else setTickets(MOCK_TICKETS);
    } catch { setTickets(MOCK_TICKETS); }
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function enviar() {
    if (!asunto.trim() || !desc.trim()) return Alert.alert('Datos faltantes', 'Completa asunto y descripción');
    setEnviando(true);
    try {
      const r = await api<RespCrear>(Endpoints.soporteCrear, { body: { asunto, descripcion: desc } });
      if (r.ok) {
        setAsunto(''); setDesc('');
        Alert.alert('✅ Enviado', 'Tu ticket fue creado. Te responderemos pronto.');
        await cargar();
      } else Alert.alert('Error', r.error ?? 'Fallo');
    } catch { Alert.alert('Sin conexión', 'Verifica tu red'); }
    setEnviando(false);
  }

  const c = colors;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title={t.support.titulo} tone="accent" />

      <ScreenScroll
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.accent} />}
      >
        {/* Opciones rápidas */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => Alert.alert(t.support.chatVivo, 'Próximamente')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#4ECDC422' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#4ECDC4" />
            </View>
            <Text style={[styles.quickLabel, { color: c.text }]}>{t.support.chatVivo}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => Linking.openURL(`mailto:${t.support.emailSoporte}`)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#A29BFE22' }]}>
              <Ionicons name="mail-outline" size={22} color="#A29BFE" />
            </View>
            <Text style={[styles.quickLabel, { color: c.text }]}>{t.support.email}</Text>
          </TouchableOpacity>
        </View>

        {/* Preguntas frecuentes */}
        <View style={[styles.faqBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text, padding: Spacing.md, paddingBottom: 0 }]}>
            {t.support.preguntasFrecuentes}
          </Text>
          {([
            { q: t.support.pregunta1, a: t.support.respuesta1 },
            { q: t.support.pregunta2, a: t.support.respuesta2 },
            { q: t.support.pregunta3, a: t.support.respuesta3 },
          ]).map((item, idx) => {
            const open = expandedFaq === idx;
            return (
              <View key={idx}>
                <TouchableOpacity
                  style={[styles.faqItem, { borderBottomColor: c.border }]}
                  onPress={() => setExpandedFaq(open ? null : idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqTxt, { color: c.text }]}>{item.q}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
                </TouchableOpacity>
                {open && (
                  <View style={[styles.faqAnswer, { backgroundColor: c.background, borderBottomColor: c.border }]}>
                    <Text style={[styles.faqAnswerTxt, { color: c.muted }]}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Crear ticket */}
        <Text style={[styles.sectionTitle, { color: c.text, marginBottom: Spacing.sm }]}>
          Crear nuevo ticket
        </Text>
        <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Input
            label="Asunto"
            icon="alert-circle-outline"
            value={asunto}
            onChangeText={setAsunto}
            placeholder="Ej. Problema con mi pedido"
          />
          <Input
            label="Descripción detallada"
            icon="document-text-outline"
            value={desc}
            onChangeText={setDesc}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            placeholder="Cuéntanos exactamente qué pasó..."
          />
          <Button label="Enviar ticket" icon="send-outline" loading={enviando} onPress={enviar} />
        </View>

        {/* Mis tickets */}
        <Text style={[styles.sectionTitle, { color: c.text, marginBottom: Spacing.sm }]}>
          Mis tickets ({tickets.length})
        </Text>

        {tickets.map(t => {
          const cfg = ESTADO_CONFIG[t.estado];
          return (
            <View key={t.id} style={[styles.ticketCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.ticketTop}>
                <Text style={[styles.ticketAsunto, { color: c.text }]} numberOfLines={1}>{t.asunto}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: cfg.color + '22' }]}>
                  <Ionicons name={cfg.icon} size={11} color={cfg.color} style={{ marginRight: 3 }} />
                  <Text style={[styles.estadoTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <Text style={[styles.ticketDesc, { color: c.muted }]} numberOfLines={2}>{t.descripcion}</Text>
              {t.respuesta_admin ? (
                <View style={[styles.respuesta, { backgroundColor: c.accentLight, borderColor: c.accent }]}>
                  <View style={styles.respHeader}>
                    <Ionicons name="shield-checkmark" size={14} color={c.accent} style={{ marginRight: 4 }} />
                    <Text style={[styles.respLbl, { color: c.accent }]}>Respuesta del equipo</Text>
                  </View>
                  <Text style={[styles.respTxt, { color: c.text }]}>{t.respuesta_admin}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickBtn: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLabel: { fontSize: Fonts.small, fontWeight: '700', textAlign: 'center' },
  faqBox: {
    borderRadius: Radius.md, borderWidth: 1.5,
    overflow: 'hidden', marginBottom: Spacing.lg,
    paddingBottom: 2,
  },
  sectionTitle: { fontSize: Fonts.regular, fontWeight: '800', letterSpacing: -0.2 },
  faqItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1,
  },
  faqTxt: { flex: 1, fontWeight: '600', fontSize: Fonts.regular - 1 },
  faqAnswer: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  faqAnswerTxt: { fontSize: Fonts.small + 1, fontWeight: '500', lineHeight: 20 },
  formCard: {
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5, marginBottom: Spacing.lg,
  },
  ticketCard: {
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1.5, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1,
  },
  ticketTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ticketAsunto: { flex: 1, fontWeight: '800', fontSize: Fonts.regular, marginRight: 8 },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill,
  },
  estadoTxt: { fontSize: 10, fontWeight: '800' },
  ticketDesc: { fontSize: Fonts.small + 1, fontWeight: '500', lineHeight: 18 },
  respuesta: {
    borderRadius: Radius.sm, padding: Spacing.sm + 2,
    marginTop: Spacing.sm, borderWidth: 1,
  },
  respHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  respLbl: { fontSize: Fonts.small - 1, fontWeight: '800', letterSpacing: 0.3 },
  respTxt: { fontSize: Fonts.small + 1, fontWeight: '500', lineHeight: 18 },
});
