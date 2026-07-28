import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function StoreBlockModal({ visible, onCancel, onConfirm }: Props) {
  const { colors } = useTheme();
  const { t } = useLang();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={32} color="#D97706" />
          </View>

          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 14, textAlign: 'center' }}>
            {t.cart2.bloqueoTiendaTitulo}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
            {t.cart2.bloqueoTiendaMsg}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, { backgroundColor: colors.border }]} activeOpacity={0.85}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{t.common.cancelar}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.btn, { backgroundColor: colors.danger, shadowColor: colors.danger }]}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFF', fontWeight: '900' }}>{t.cart2.vaciar}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  sheet: {
    borderRadius: 24, padding: 22, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.30, shadowRadius: 22, elevation: 16,
  },
  iconWrap: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  btn: {
    flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
});
