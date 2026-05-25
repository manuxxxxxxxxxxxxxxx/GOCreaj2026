import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export interface CategoryOption {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/* Strings predeterminadas, jamás se envía texto libre al servidor. */
export const CATEGORIAS: CategoryOption[] = [
  { value: 'comida',    label: 'Comida Rápida', icon: 'restaurant-outline' },
  { value: 'bebidas',   label: 'Bebidas',       icon: 'cafe-outline' },
  { value: 'panaderia', label: 'Panadería',     icon: 'nutrition-outline' },
  { value: 'postres',   label: 'Postres',       icon: 'ice-cream-outline' },
  { value: 'frutas',    label: 'Frutas',        icon: 'leaf-outline' },
  { value: 'verduras',  label: 'Verduras',      icon: 'flower-outline' },
  { value: 'general',   label: 'General',       icon: 'storefront-outline' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export default function CategoryDropdown({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const { colors, isDark } = useTheme();
  const selected = CATEGORIAS.find(c => c.value === value) ?? CATEGORIAS[CATEGORIAS.length - 1];

  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>{label}</Text>}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={[
          styles.box,
          { backgroundColor: colors.inputBg, borderColor: colors.border, shadowColor: colors.shadow },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.accentLight }]}>
          <Ionicons name={selected.icon ?? 'pricetag-outline'} size={18} color={colors.accent} />
        </View>
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1, fontSize: 15 }}>{selected.label}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18, paddingHorizontal: 20, paddingBottom: 12 }}>
              Selecciona la categoría
            </Text>
            <ScrollView>
              {CATEGORIAS.map(c => {
                const active = c.value === value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => { onChange(c.value); setOpen(false); }}
                    activeOpacity={0.85}
                    style={[
                      styles.row,
                      { backgroundColor: active ? colors.accentLight : 'transparent' },
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: active ? colors.accent : colors.accentLight }]}>
                      <Ionicons name={c.icon ?? 'pricetag-outline'} size={20} color={active ? '#FFF' : colors.accent} />
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{c.label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ height: 10 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, paddingVertical: 14, maxHeight: '75%',
    shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.20, shadowRadius: 18, elevation: 16,
  },
  handle: { width: 50, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginHorizontal: 12, marginVertical: 2,
    borderRadius: 14,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
