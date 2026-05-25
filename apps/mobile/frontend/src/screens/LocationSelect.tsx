import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Fonts } from '@/theme/colors';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';

const MUNICIPIOS: string[] = [
  'San Salvador', 'Apopa', 'Soyapango', 'Mejicanos', 'Ilopango',
  'Santa Ana', 'San Miguel', 'Santa Tecla', 'Sonsonate', 'Ahuachapan',
  'La Libertad', 'Usulutan', 'San Vicente', 'Cojutepeque', 'La Union'
];

const DEFAULT_REGION: Region = {
  latitude: 13.6929, longitude: -89.2182,
  latitudeDelta: 0.8, longitudeDelta: 0.8,
};

function matchMunicipio(address: Location.LocationGeocodedAddress): string | null {
  const fields = [address.city, address.subregion, address.district, address.name]
    .filter(Boolean).map(f => f!.toLowerCase());
  for (const mun of MUNICIPIOS) {
    const munLower = mun.toLowerCase();
    if (fields.some(f => f.includes(munLower) || munLower.includes(f))) return mun;
  }
  return null;
}

export default function LocationSelect() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapMarker, setMapMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = loc.coords;
          setCoords({ lat: latitude, lng: longitude });
          setMapRegion({ latitude, longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 });
          setMapMarker({ latitude, longitude });
        }
      } catch { /* noop */ }
    })();
  }, []);

  async function onMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMapMarker({ latitude, longitude });
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const matched = matchMunicipio(results[0]);
        if (matched) setSeleccion(matched);
      }
    } catch { /* noop */ }
  }

  const continuar = async (): Promise<void> => {
    if (!seleccion) return;
    setCargando(true);
    await AsyncStorage.setItem('svgo_municipio', seleccion);
    await AsyncStorage.setItem('svgo_first_launch', '1');
    if (coords) await AsyncStorage.setItem('svgo_coords', JSON.stringify(coords));
    setTimeout(() => {
      nav.goBack();
    }, 600);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={40} color={Colors.accent} />
        </View>
        <Text style={styles.titulo}>Selecciona tu ubicación</Text>
        <Text style={styles.sub}>Te mostraremos tiendas y repartidores cerca de ti</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={MUNICIPIOS}
        keyExtractor={(i) => i}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            onPress={onMapPress}
          >
            {mapMarker && <Marker coordinate={mapMarker} />}
          </MapView>
        }
        renderItem={({ item }) => {
          const seleccionado = seleccion === item;
          return (
            <TouchableOpacity
              style={[styles.item, seleccionado && styles.itemActivo]}
              onPress={() => setSeleccion(item)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={seleccionado ? "checkmark-circle" : "ellipse-outline"} 
                size={22} 
                color={seleccionado ? Colors.accent : Colors.muted} 
              />
              <Text style={[styles.itemText, seleccionado && styles.itemTextActivo]}>{item}</Text>
              {seleccionado && <Ionicons name="chevron-forward" size={16} color={Colors.accent} />}
            </TouchableOpacity>
          );
        }}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.btn, !seleccion && styles.btnDisabled]}
          disabled={!seleccion || cargando}
          onPress={continuar}
          activeOpacity={0.8}
        >
          {cargando ? <ActivityIndicator color={Colors.contrast} /> : (
            <>
              <Text style={styles.btnText}>Confirmar Ubicación</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.contrast} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', padding: Spacing.lg, paddingTop: 20, paddingBottom: Spacing.md },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(74, 109, 140, 0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md
  },
  titulo: { fontSize: Fonts.title + 2, color: Colors.text, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: Fonts.regular, color: Colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, paddingHorizontal: Spacing.md, paddingVertical: 16,
    borderRadius: Radius.md, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  itemActivo: { borderColor: Colors.accent, backgroundColor: Colors.card },
  itemText: { flex: 1, marginLeft: Spacing.md, fontSize: Fonts.regular, color: Colors.text, fontWeight: '600' },
  itemTextActivo: { color: Colors.accent, fontWeight: '700' },
  footer: { padding: Spacing.lg, paddingBottom: 16, backgroundColor: Colors.background },
  btn: {
    backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: Radius.pill,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  btnDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6
  },
  btnText: { color: Colors.contrast, fontSize: Fonts.regular, fontWeight: '700', marginRight: Spacing.sm, letterSpacing: 0.2 },
  map: {
    width: '100%', height: 220,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
});
