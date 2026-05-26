import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const ROL_LABEL: Record<string, string> = {
  comprador:  'Comprador',
  vendedor:   'Vendedor',
  repartidor: 'Repartidor',
  admin:      'Administrador',
};

/**
 * Banner global que aparece cuando el admin cambia el rol del usuario.
 * Se monta en la raíz del navigator y escucha el contexto de Auth.
 */
export default function RoleChangeBanner(): JSX.Element | null {
  const { rolCambio, limpiarNotifRol } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (rolCambio) {
      Animated.timing(slide, {
        toValue: 0, duration: 320,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
      // Auto-cierre después de 9 segundos
      const t = setTimeout(() => cerrar(), 9000);
      return () => clearTimeout(t);
    }
  }, [rolCambio]);

  const cerrar = () => {
    Animated.timing(slide, {
      toValue: -120, duration: 240,
      easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => limpiarNotifRol());
  };

  if (!rolCambio) return null;

  const esAscenso =
    (rolCambio.anterior === 'comprador' && (rolCambio.nuevo === 'vendedor' || rolCambio.nuevo === 'repartidor' || rolCambio.nuevo === 'admin')) ||
    (rolCambio.anterior !== 'admin' && rolCambio.nuevo === 'admin');

  const labelNuevo = ROL_LABEL[rolCambio.nuevo ?? ''] ?? rolCambio.nuevo;
  const icono = esAscenso ? 'trophy' : 'information-circle';
  const colorFondo = esAscenso ? '#15803D' : '#0EA5E9';
  const titulo = esAscenso ? '¡Felicidades! Solicitud aprobada' : 'Tu rol fue actualizado';
  const detalle = esAscenso
    ? `Ahora eres ${labelNuevo}. Cierra y vuelve a abrir la app para ver tus nuevas funciones.`
    : `Tu nuevo rol es ${labelNuevo}.`;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + 8, transform: [{ translateY: slide }] },
      ]}
    >
      <View style={[styles.card, { backgroundColor: colorFondo }]}>
        <View style={styles.iconBox}>
          <Ionicons name={icono as any} size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{titulo}</Text>
          <Text style={styles.subtitle}>{detalle}</Text>
        </View>
        <TouchableOpacity onPress={cerrar} style={styles.closeBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 12, zIndex: 9999,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 12,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  title:    { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: -0.2 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2, lineHeight: 16 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
});
