import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CaretDownIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MapTrifoldIcon,
  StarIcon,
  StorefrontIcon,
  XIcon,
} from "phosphor-react-native";
import { WebMapView } from "../../components/ui/WebMapView";
import { Sheet } from "../../components/ui/Sheet";
import { useCurrentPosition } from "@/hooks/use-location-tracking";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { productosApi } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { CATEGORIAS, CATEGORIA_LABEL, categoriaColor, categoriaIcon } from "../../lib/categoryIcons";
import { ProductCard } from "../../components/domain/ProductCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import type { RootStackParamList, TabsParamList } from "../../navigation/types";

const SAN_SALVADOR: [number, number] = [-89.2182, 13.6929];

interface TiendaMarker {
  id: number;
  nombre: string;
  lat: number;
  lng: number;
  producto: Producto;
}

interface MunicipioOpt {
  id: number;
  nombre: string;
  departamento: string;
  cobertura_activa?: number;
}

export function ExplorarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabsParamList, "Explorar">>();
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [departamento, setDepartamento] = useState<string | null>(route.params?.departamento ?? null);
  const [municipio, setMunicipio] = useState<string | null>(usuario?.municipio ?? null);
  const [municipios, setMunicipios] = useState<MunicipioOpt[] | null>(null);
  const [zonaAbierta, setZonaAbierta] = useState(false);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [vista, setVista] = useState<"mapa" | "lista">("mapa");
  const [seleccionada, setSeleccionada] = useState<TiendaMarker | null>(null);
  const miPosicion = useCurrentPosition({ enabled: vista === "mapa" });

  useEffect(() => {
    if (route.params?.departamento) setDepartamento(route.params.departamento);
  }, [route.params?.departamento]);

  useEffect(() => {
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  useEffect(() => {
    const zona = departamento ? undefined : municipio ?? undefined;
    const t = setTimeout(() => {
      const req = q
        ? productosApi.buscar({ q, municipio: zona, departamento: departamento ?? undefined, categoria: categoria ?? undefined, limit: 40 })
        : productosApi.listar({ municipio: zona, departamento: departamento ?? undefined, categoria: categoria ?? undefined, limit: 40 });
      req.then((r) => setProductos(r.productos)).catch(() => setProductos([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, categoria, departamento, municipio]);

  const municipiosPorDepto = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, MunicipioOpt[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  const tiendas = useMemo<TiendaMarker[]>(() => {
    if (!productos) return [];
    const vistas = new Map<number, TiendaMarker>();
    for (const p of productos) {
      if (!p.tienda_id || !p.tienda_lat || !p.tienda_lng || vistas.has(p.tienda_id)) continue;
      vistas.set(p.tienda_id, { id: p.tienda_id, nombre: p.tienda_nombre ?? "Tienda", lat: p.tienda_lat, lng: p.tienda_lng, producto: p });
    }
    return Array.from(vistas.values());
  }, [productos]);

  const centro: [number, number] = tiendas[0] ? [tiendas[0].lng, tiendas[0].lat] : SAN_SALVADOR;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={[styles.searchBox, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            <MagnifyingGlassIcon size={16} color={tokens.textMuted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Pizza, frutería, tacos…" placeholderTextColor={tokens.textMuted} style={{ flex: 1, fontSize: 14, color: tokens.textPrimary, fontFamily: "Inter_400Regular" }} />
            {!!q && (
              <Pressable onPress={() => setQ("")} accessibilityLabel="Limpiar búsqueda" hitSlop={8}>
                <XIcon size={14} color={tokens.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setZonaAbierta(true)} style={[styles.zonaBtn, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            <MapPinIcon size={15} color={tokens.cyan} />
            <CaretDownIcon size={11} color={tokens.textMuted} />
          </Pressable>
        </View>

        {municipio && !departamento && (
          <View style={styles.zonaPill}>
            <MapPinIcon size={11} weight="fill" color={tokens.textMuted} />
            <Text style={{ fontSize: 11.5, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>{municipio}</Text>
          </View>
        )}

        <FlatList
          data={CATEGORIAS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          renderItem={({ item: cat }) => {
            const active = categoria === cat;
            const color = categoriaColor(cat);
            const Icon = categoriaIcon(cat);
            return (
              <Pressable
                onPress={() => setCategoria(active ? null : cat)}
                style={[
                  styles.chip,
                  { borderColor: active ? color : tokens.border, backgroundColor: active ? `${color}29` : tokens.surface1 },
                ]}
              >
                <Icon size={12} weight={active ? "fill" : "regular"} color={active ? color : tokens.textSecondary} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? color : tokens.textSecondary }}>{CATEGORIA_LABEL[cat]}</Text>
              </Pressable>
            );
          }}
        />

        {departamento && (
          <Pressable onPress={() => setDepartamento(null)} style={[styles.deptoChip, { backgroundColor: tokens.cyanBg, borderColor: tokens.cyan }]}>
            <MapPinIcon size={12} weight="fill" color={tokens.cyan} />
            <Text style={{ fontSize: 12, color: tokens.cyan, fontFamily: "Inter_600SemiBold" }}>{departamento}</Text>
            <XIcon size={12} weight="bold" color={tokens.cyan} />
          </Pressable>
        )}

        <View style={styles.viewbar}>
          <Text style={{ fontSize: 11, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>
            {productos === null ? "Buscando…" : `${productos.length} ${productos.length === 1 ? "resultado" : "resultados"}`}
          </Text>
          <View style={[styles.segmented, { borderColor: tokens.border, backgroundColor: tokens.surface1 }]}>
            <Pressable onPress={() => setVista("mapa")} style={[styles.segBtn, vista === "mapa" && { backgroundColor: tokens.cyanBg }]}>
              <MapTrifoldIcon size={13} weight="bold" color={vista === "mapa" ? tokens.cyan : tokens.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: vista === "mapa" ? tokens.cyan : tokens.textSecondary, fontFamily: "Inter_600SemiBold" }}>Mapa</Text>
            </Pressable>
            <Pressable onPress={() => setVista("lista")} style={[styles.segBtn, vista === "lista" && { backgroundColor: tokens.cyanBg }]}>
              <ListBulletsIcon size={13} weight="bold" color={vista === "lista" ? tokens.cyan : tokens.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: vista === "lista" ? tokens.cyan : tokens.textSecondary, fontFamily: "Inter_600SemiBold" }}>Lista</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {productos === null ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: "48%" }}>
              <Skeleton height={180} radius={16} />
            </View>
          ))}
        </View>
      ) : productos.length === 0 ? (
        <EmptyState icon={<StorefrontIcon size={22} color={tokens.textMuted} />} title="Sin resultados" description="Prueba con otra búsqueda o categoría distinta." />
      ) : vista === "mapa" ? (
        tiendas.length === 0 ? (
          <EmptyState icon={<MapTrifoldIcon size={22} color={tokens.textMuted} />} title="Sin ubicaciones" description="Ninguna tienda de estos resultados tiene ubicación registrada." />
        ) : (
          <View style={{ flex: 1 }}>
            <WebMapView
              center={centro}
              zoom={13}
              userLocation={miPosicion?.coordinate ?? null}
              route={
                seleccionada && miPosicion?.coordinate
                  ? { coordinates: [miPosicion.coordinate, [seleccionada.lng, seleccionada.lat]], color: tokens.cyan, width: 3 }
                  : null
              }
              markers={tiendas.map((t) => ({ id: t.id, coordinate: [t.lng, t.lat] as [number, number], color: tokens.warn }))}
              onMarkerPress={(id) => {
                const t = tiendas.find((x) => x.id === id);
                if (t) setSeleccionada(t);
              }}
              onPress={() => setSeleccionada(null)}
            />
            {seleccionada && (
              <Animated.View entering={FadeInDown.duration(280).springify().damping(16)} style={[styles.storeCard, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <Pressable onPress={() => navigation.navigate("StoreDetail", { id: seleccionada.id })} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.storeAvatar, { backgroundColor: tokens.surface2 }]}>
                    {seleccionada.producto.tienda_logo ? (
                      <Image source={{ uri: seleccionada.producto.tienda_logo }} style={StyleSheet.absoluteFill} />
                    ) : (
                      <StorefrontIcon size={18} color={tokens.textMuted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: tokens.textPrimary, fontFamily: "Inter_700Bold", marginBottom: 2 }}>{seleccionada.nombre}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <StarIcon size={11} weight="fill" color={tokens.warn} />
                      <Text style={{ fontSize: 11, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>
                        {seleccionada.producto.tienda_calificacion ? seleccionada.producto.tienda_calificacion.toFixed(1) : "Nuevo"} · {seleccionada.producto.nombre} desde ${seleccionada.producto.precio.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11.5, color: tokens.cyan, fontFamily: "Inter_600SemiBold" }}>Ver →</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        )
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 140 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(360).delay(Math.min(index, 9) * 55).springify().damping(16)} style={{ flex: 1 }}>
              <ProductCard producto={item} height={130} />
            </Animated.View>
          )}
        />
      )}

      <Sheet visible={zonaAbierta} onClose={() => setZonaAbierta(false)} title="Elige tu zona">
        {municipios === null ? (
          <View style={{ gap: 10, paddingBottom: 20 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </View>
        ) : (
          <View style={{ paddingBottom: 24 }}>
            {municipiosPorDepto.map(([depto, ms]) => (
              <View key={depto} style={{ marginBottom: 16 }}>
                <Text style={[styles.deptoLabel, { color: tokens.textMuted }]}>{depto}</Text>
                {ms.map((m) => {
                  const cubierto = m.cobertura_activa !== 0;
                  const activa = municipio === m.nombre && !departamento;
                  return (
                    <Pressable
                      key={m.id}
                      disabled={!cubierto}
                      onPress={() => {
                        setDepartamento(null);
                        setMunicipio(m.nombre);
                        setZonaAbierta(false);
                      }}
                      style={[styles.municipioRow, { borderColor: activa ? tokens.cyan : "transparent", backgroundColor: activa ? tokens.cyanBg : "transparent", opacity: cubierto ? 1 : 0.45 }]}
                    >
                      <Text style={{ fontSize: 13.5, fontFamily: activa ? "Inter_700Bold" : "Inter_500Medium", color: activa ? tokens.cyan : tokens.textPrimary }}>
                        {m.nombre}
                        {!cubierto ? " (próximamente)" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  zonaBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  zonaPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
  viewbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 },
  deptoChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  segmented: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 3, gap: 2 },
  segBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  storeAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  storeCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  deptoLabel: { fontSize: 10.5, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  municipioRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
});
