import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, Endpoints, traducirError } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

interface Props {
  visible: boolean;
  pedidoId: number;
  onClose: () => void;
  onSent?: () => void;
}

export default function RatingModal({ visible, pedidoId, onClose, onSent }: Props) {
  const { colors } = useTheme();
  const { t, lang } = useLang();
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const reset = () => {
    setEstrellas(0); setComentario(''); setEnviado(false); setEnviando(false);
  };

  const enviar = async () => {
    if (estrellas === 0) return;
    setEnviando(true);
    try {
      const r = await api<{ ok: boolean; promedio?: number; error?: string }>(
        Endpoints.carritoCalificar,
        { body: { pedido_id: pedidoId, estrellas, comentario } },
      );
      if (r.ok) {
        setEnviado(true);
        onSent?.();
        setTimeout(() => { reset(); onClose(); }, 1800);
      } else {
        setEnviando(false);
        alert(traducirError(r.error, lang) || 'No se pudo calificar');
      }
    } catch {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {enviado ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <View style={[styles.tickCircle, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark" size={42} color="#FFF" />
              </View>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: 19, marginTop: 16 }}>
                {t.pago.gracias}
              </Text>
            </View>
          ) : (
            <>
              <View style={{ alignItems: 'center', marginBottom: 18 }}>
                <View style={[styles.iconRing, { backgroundColor: colors.accentLight }]}>
                  <Ionicons name="star" size={28} color="#D97706" />
                </View>
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 14, textAlign: 'center' }}>
                  {t.pago.califica}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setEstrellas(n)} activeOpacity={0.7}>
                    <Ionicons
                      name={n <= estrellas ? 'star' : 'star-outline'}
                      size={40}
                      color={n <= estrellas ? '#D97706' : colors.muted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                value={comentario}
                onChangeText={setComentario}
                placeholder={t.pago.comentario}
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                maxLength={300}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[styles.btn, { backgroundColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{t.common.cancelar}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={estrellas === 0 || enviando}
                  onPress={enviar}
                  style={[styles.btn, { backgroundColor: estrellas ? colors.accent : colors.muted, shadowColor: colors.accent }]}
                >
                  {enviando
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={{ color: '#FFF', fontWeight: '900' }}>Enviar</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  sheet: {
    borderRadius: 24, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 20,
  },
  iconRing: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1.5, borderRadius: 14, padding: 12, minHeight: 80,
    fontSize: 14, fontWeight: '500', textAlignVertical: 'top',
  },
  btn: {
    flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  tickCircle: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
});
