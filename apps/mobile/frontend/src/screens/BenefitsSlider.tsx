import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
}

const slides: Slide[] = [
  { key: '1', titulo: 'Compra Local en El Salvador', descripcion: 'Productos de tiendas cercanas a tu municipio, frescos y a buen precio.', icono: 'storefront-outline' },
  { key: '2', titulo: 'Entregas a Domicilio', descripcion: 'Repartidores certificados llevan tu pedido directo a tu puerta.', icono: 'bicycle-outline' },
  { key: '3', titulo: 'Ofertas y Reels Exclusivos', descripcion: 'Descubre productos en videos cortos y aprovecha promociones diarias.', icono: 'flash-outline' },
  { key: '4', titulo: 'Tracking en Vivo', descripcion: 'Sigue tu pedido en tiempo real con tiempos de llegada y trafico.', icono: 'navigate-outline' }
];

export default function BenefitsSlider() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState<number>(0);
  const ref = useRef<FlatList<Slide>>(null);

  const continuar = async (): Promise<void> => {
    if (index < slides.length - 1) {
      ref.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      await AsyncStorage.setItem('svgo_first_launch', '1');
      nav.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={ref}
        data={slides}
        keyExtractor={(it) => it.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, paddingTop: insets.top + 20 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icono} size={72} color={Colors.accent} />
            </View>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.desc}>{item.descripcion}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.btnPrimary} onPress={continuar} activeOpacity={0.8}>
          <Text style={styles.btnText}>{index === slides.length - 1 ? 'Comenzar' : 'Siguiente'}</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.contrast} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  iconCircle: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(74, 109, 140, 0.08)', justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 109, 140, 0.15)'
  },
  titulo: { fontSize: Fonts.heading - 2, color: Colors.text, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.md, letterSpacing: -0.5 },
  desc: { fontSize: Fonts.regular, color: Colors.muted, textAlign: 'center', lineHeight: 24, paddingHorizontal: Spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', marginVertical: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border, marginHorizontal: 4, transition: 'all 0.3s' },
  dotActive: { backgroundColor: Colors.accent, width: 22 },
  footer: { padding: Spacing.lg, paddingBottom: 16 },
  btnPrimary: {
    backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: Radius.pill,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  btnText: { color: Colors.contrast, fontSize: Fonts.regular, fontWeight: '700', marginRight: Spacing.sm, letterSpacing: 0.2 }
});
