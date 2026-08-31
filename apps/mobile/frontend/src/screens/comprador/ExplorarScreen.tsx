import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CaretDownIcon,
  CaretLeftIcon,
  GlobeIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MapTrifoldIcon,
  SquaresFourIcon,
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
import type { Producto, Tienda } from "../../lib/types";
import { CATEGORIA_GRUPOS, CATEGORIA_LABEL, type Categoria, type CategoriaGrupo, categoriaColor, categoriaEmoji } from "../../lib/categoryIcons";
import { ProductCard } from "../../components/domain/ProductCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import type { RootStackParamList, TabsParamList } from "../../navigation/types";

const SAN_SALVADOR: [number, number] = [-89.2182, 13.6929];

/** null cuando la tienda no publicó horario -- no mostramos un badge inventado. */
function estaAbierta(apertura?: string | null, cierre?: string | null): boolean | null {
  if (!apertura || !cierre) return null;
  const toMinutos = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const ahora = new Date();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const apeMin = toMinutos(apertura);
  const cieMin = toMinutos(cierre);
  if (cieMin <= apeMin) return minutos >= apeMin || minutos < cieMin; // cruza medianoche
  return minutos >= apeMin && minutos < cieMin;
}

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
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<string | null>(route.params?.categoria ?? null);
  const [grupo, setGrupo] = useState<string | null>(route.params?.grupo ?? null);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(route.params?.grupo ?? null);
  const [categoriaAbierta, setCategoriaAbierta] = useState(false);
  const [busquedaCategoria, setBusquedaCategoria] = useState("");
  const [verGrupo, setVerGrupo] = useState<string | null>(null);
  const [departamento, setDepartamento] = useState<string | null>(route.params?.departamento ?? null);
  // null = "todas las tiendas" (sin acotar por municipio), a menos que el usuario tenga
  // una zona guardada en su perfil, que se respeta como preferencia inicial.
  const [municipio, setMunicipio] = useState<string | null>(usuario?.municipio ?? null);
  const [municipios, setMunicipios] = useState<MunicipioOpt[] | null>(null);
  const [zonaAbierta, setZonaAbierta] = useState(false);
  const [busquedaZona, setBusquedaZona] = useState("");
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [vista, setVista] = useState<"mapa" | "lista">("mapa");
  const [seleccionada, setSeleccionada] = useState<TiendaMarker | null>(null);
  const [tiendaSel, setTiendaSel] = useState<Tienda | null>(null);
  const miPosicion = useCurrentPosition({ enabled: vista === "mapa" });

  useEffect(() => {
    if (!seleccionada) {
      setTiendaSel(null);
      return;
    }
    let cancelado = false;
    productosApi
      .tiendaDetalle(seleccionada.id)
      .then((r) => !cancelado && setTiendaSel(r.tienda))
      .catch(() => !cancelado && setTiendaSel(null));
    return () => {
      cancelado = true;
    };
  }, [seleccionada?.id]);

  useEffect(() => {
    if (route.params?.departamento) setDepartamento(route.params.departamento);
    if (route.params?.grupo) {
      setGrupo(route.params.grupo);
      setGrupoAbierto(route.params.grupo);
      setCategoria(null);
    }
    if (route.params?.categoria) setCategoria(route.params.categoria);
  }, [route.params?.departamento, route.params?.grupo, route.params?.categoria]);

  // Mantiene la segunda fila de chips (categorías específicas de una familia) en
  // sincronía cuando cambia el grupo o categoría activa, sin importar el origen.
  useEffect(() => {
    if (grupo) {
      setGrupoAbierto(grupo);
      return;
    }
    if (categoria) {
      const g = CATEGORIA_GRUPOS.find((gr) => gr.categorias.includes(categoria as Categoria));
      setGrupoAbierto(g ? g.id : null);
      return;
    }
    setGrupoAbierto(null);
  }, [grupo, categoria]);

  useEffect(() => {
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  useEffect(() => {
    const zona = departamento ? undefined : municipio ?? undefined;
    const catFiltro = categoria ?? undefined;
    const grupoActivo = !catFiltro && grupo ? CATEGORIA_GRUPOS.find((g) => g.id === grupo) : undefined;
    const t = setTimeout(() => {
      const req = q
        ? productosApi.buscar({ q, municipio: zona, departamento: departamento ?? undefined, categoria: catFiltro, limit: 40 })
        : productosApi.listar({ municipio: zona, departamento: departamento ?? undefined, categoria: catFiltro, limit: 40 });
      req
        .then((r) => setProductos(grupoActivo ? r.productos.filter((p) => grupoActivo.categorias.includes(((p.categoria ?? "general").toLowerCase()) as Categoria)) : r.productos))
        .catch(() => setProductos([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, categoria, grupo, departamento, municipio]);

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
  const grupoActual = grupoAbierto ? CATEGORIA_GRUPOS.find((g) => g.id === grupoAbierto) : undefined;

  const abrirCategorias = () => {
    setVerGrupo(grupoAbierto);
    setBusquedaCategoria("");
    setCategoriaAbierta(true);
  };

  const cerrarCategorias = () => {
    setCategoriaAbierta(false);
    setBusquedaCategoria("");
  };

  const limpiarCategoria = () => {
    setGrupo(null);
    setCategoria(null);
    setGrupoAbierto(null);
    cerrarCategorias();
  };

  const elegirTodoGrupo = (g: CategoriaGrupo) => {
    setGrupo(g.id);
    setCategoria(null);
    setGrupoAbierto(g.id);
    cerrarCategorias();
  };

  const elegirHijo = (cat: Categoria, grupoId: string) => {
    setCategoria(cat);
    setGrupo(grupoId);
    setGrupoAbierto(grupoId);
    cerrarCategorias();
  };

  const municipiosFiltrados = useMemo(() => {
    const qz = busquedaZona.trim().toLowerCase();
    if (!qz) return municipiosPorDepto;
    return municipiosPorDepto
      .map(([depto, ms]) => [depto, ms.filter((m) => m.nombre.toLowerCase().includes(qz))] as const)
      .filter(([, ms]) => ms.length > 0);
  }, [municipiosPorDepto, busquedaZona]);

  const categoriasFiltradas = useMemo(() => {
    const q2 = busquedaCategoria.trim().toLowerCase();
    if (!q2) return [];
    const out: { cat: Categoria; grupo: CategoriaGrupo }[] = [];
    for (const g of CATEGORIA_GRUPOS) {
      for (const c of g.categorias) {
        if (CATEGORIA_LABEL[c].toLowerCase().includes(q2)) out.push({ cat: c, grupo: g });
      }
    }
    return out;
  }, [busquedaCategoria]);

  const grupoVisto = verGrupo ? CATEGORIA_GRUPOS.find((g) => g.id === verGrupo) : undefined;
  const categoriaBtnLabel = categoria ? CATEGORIA_LABEL[categoria as Categoria] : grupoActual ? `Todo ${grupoActual.label}` : "Todas las categorías";
  const categoriaBtnEmoji = categoria ? categoriaEmoji(categoria) : grupoActual ? grupoActual.emoji : null;
  const zonaLabel = municipio && !departamento ? municipio : "Todas las tiendas";

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

        {!departamento && (
          <Pressable onPress={() => setZonaAbierta(true)} style={styles.zonaPill}>
            {municipio ? <MapPinIcon size={11} weight="fill" color={tokens.textMuted} /> : <GlobeIcon size={11} color={tokens.textMuted} />}
            <Text style={{ fontSize: 11.5, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>{zonaLabel}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={abrirCategorias}
          style={[styles.categoriaBtn, { backgroundColor: tokens.surface1, borderColor: categoria || grupo ? tokens.cyan : tokens.border }]}
        >
          {categoriaBtnEmoji ? (
            <Text style={{ fontSize: 18 }}>{categoriaBtnEmoji}</Text>
          ) : (
            <SquaresFourIcon size={17} weight={categoria || grupo ? "fill" : "regular"} color={categoria || grupo ? tokens.cyan : tokens.textPrimary} />
          )}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: categoria || grupo ? tokens.cyan : tokens.textPrimary }}>
            {categoriaBtnLabel}
          </Text>
          <CaretDownIcon size={12} color={tokens.textMuted} />
        </Pressable>

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
              route={null}
              markers={tiendas.map((t) => ({
                id: t.id,
                coordinate: [t.lng, t.lat] as [number, number],
                color: categoriaColor(t.producto.categoria),
                category: t.producto.categoria,
              }))}
              onMarkerPress={(id) => {
                const t = tiendas.find((x) => x.id === id);
                if (t) setSeleccionada(t);
              }}
              onPress={() => setSeleccionada(null)}
              layersControl
            />
            {seleccionada && (
              <Animated.View
                entering={FadeInDown.duration(280).springify().damping(16)}
                style={[styles.storeCard, { backgroundColor: tokens.surface1, borderColor: tokens.border, bottom: insets.bottom + 80 }]}
              >
                <Pressable onPress={() => navigation.navigate("StoreDetail", { id: seleccionada.id })}>
                  <View style={[styles.storeBanner, { backgroundColor: tokens.surface2 }]}>
                    {tiendaSel?.portada && <Image source={{ uri: tiendaSel.portada }} style={StyleSheet.absoluteFill} />}
                    {(() => {
                      const abierta = tiendaSel ? estaAbierta(tiendaSel.hora_apertura, tiendaSel.hora_cierre) : null;
                      if (abierta === null) return null;
                      return (
                        <View style={[styles.estadoBadge, { backgroundColor: abierta ? "rgba(16,185,129,0.92)" : "rgba(100,116,139,0.9)" }]}>
                          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" }}>{abierta ? "Abierto ahora" : "Cerrado"}</Text>
                        </View>
                      );
                    })()}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
                    <View style={[styles.storeAvatar, { backgroundColor: tokens.surface2, borderColor: tokens.surface1 }]}>
                      {seleccionada.producto.tienda_logo ? (
                        <Image source={{ uri: seleccionada.producto.tienda_logo }} style={StyleSheet.absoluteFill} />
                      ) : (
                        <StorefrontIcon size={18} color={tokens.textMuted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "700", color: tokens.textPrimary, fontFamily: "Inter_700Bold", marginBottom: 2 }}>
                        {seleccionada.nombre}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <StarIcon size={11} weight="fill" color={tokens.warn} />
                        <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted, fontFamily: "Inter_500Medium", flexShrink: 1 }}>
                          {seleccionada.producto.tienda_calificacion ? seleccionada.producto.tienda_calificacion.toFixed(1) : "Nuevo"}
                          {seleccionada.producto.tienda_total_resenas ? ` (${seleccionada.producto.tienda_total_resenas})` : ""} · {seleccionada.producto.nombre} desde ${seleccionada.producto.precio.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11.5, color: tokens.cyan, fontFamily: "Inter_600SemiBold", textAlign: "right", paddingHorizontal: 14, paddingBottom: 12 }}>Ver tienda →</Text>
                </Pressable>
                <Pressable onPress={() => setSeleccionada(null)} hitSlop={8} style={styles.storeCloseBtn}>
                  <XIcon size={13} weight="bold" color="#fff" />
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

      <Sheet visible={categoriaAbierta} onClose={cerrarCategorias} title={grupoVisto && !busquedaCategoria ? grupoVisto.label : "Elige una categoría"}>
        <View style={{ paddingBottom: 24 }}>
          <View style={[styles.zonaSearchBox, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
            <MagnifyingGlassIcon size={14} color={tokens.textMuted} />
            <TextInput
              value={busquedaCategoria}
              onChangeText={(t) => { setBusquedaCategoria(t); setVerGrupo(null); }}
              placeholder="Buscar categoría…"
              placeholderTextColor={tokens.textMuted}
              style={{ flex: 1, fontSize: 13.5, color: tokens.textPrimary, fontFamily: "Inter_400Regular" }}
            />
            {!!busquedaCategoria && (
              <Pressable onPress={() => setBusquedaCategoria("")} hitSlop={8}>
                <XIcon size={13} color={tokens.textMuted} />
              </Pressable>
            )}
          </View>

          {busquedaCategoria ? (
            <View style={{ gap: 4 }}>
              {categoriasFiltradas.length === 0 ? (
                <Text style={{ fontSize: 12.5, color: tokens.textMuted, textAlign: "center", paddingVertical: 16 }}>Sin resultados</Text>
              ) : (
                categoriasFiltradas.map(({ cat, grupo: g }) => {
                  const active = categoria === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => elegirHijo(cat, g.id)}
                      style={[styles.municipioRow, { flexDirection: "row", alignItems: "center", gap: 10, borderColor: active ? tokens.cyan : "transparent", backgroundColor: active ? tokens.cyanBg : "transparent" }]}
                    >
                      <Text style={{ fontSize: 18 }}>{categoriaEmoji(cat)}</Text>
                      <Text style={{ fontSize: 13.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? tokens.cyan : tokens.textPrimary }}>{CATEGORIA_LABEL[cat]}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : grupoVisto ? (
            <View>
              <Pressable onPress={() => setVerGrupo(null)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 }}>
                <CaretLeftIcon size={13} color={tokens.textSecondary} />
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>Todas las categorías</Text>
              </Pressable>
              <Pressable
                onPress={() => elegirTodoGrupo(grupoVisto)}
                style={[
                  styles.municipioRow,
                  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, borderColor: grupo === grupoVisto.id && !categoria ? tokens.cyan : tokens.border, backgroundColor: grupo === grupoVisto.id && !categoria ? tokens.cyanBg : "transparent" },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{grupoVisto.emoji}</Text>
                <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: grupo === grupoVisto.id && !categoria ? tokens.cyan : tokens.textPrimary }}>Todo {grupoVisto.label}</Text>
              </Pressable>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {grupoVisto.categorias
                  .filter((c) => c !== grupoVisto.id)
                  .map((c) => {
                    const active = categoria === c;
                    return (
                      <Pressable key={c} onPress={() => elegirHijo(c, grupoVisto.id)} style={[styles.chip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}>
                        <Text style={{ fontSize: 13 }}>{categoriaEmoji(c)}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? tokens.cyan : tokens.textSecondary }}>{CATEGORIA_LABEL[c]}</Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          ) : (
            <View>
              <Pressable
                onPress={limpiarCategoria}
                style={[
                  styles.municipioRow,
                  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, borderColor: !categoria && !grupo ? tokens.cyan : "transparent", backgroundColor: !categoria && !grupo ? tokens.cyanBg : "transparent" },
                ]}
              >
                <SquaresFourIcon size={16} color={!categoria && !grupo ? tokens.cyan : tokens.textSecondary} />
                <Text style={{ fontSize: 13.5, fontFamily: !categoria && !grupo ? "Inter_700Bold" : "Inter_500Medium", color: !categoria && !grupo ? tokens.cyan : tokens.textPrimary }}>
                  Todas las categorías
                </Text>
              </Pressable>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {CATEGORIA_GRUPOS.map((g) => {
                  const activo = grupoAbierto === g.id;
                  return (
                    <Pressable key={g.id} onPress={() => setVerGrupo(g.id)} style={[styles.grupoCard, { borderColor: activo ? tokens.cyan : tokens.border, backgroundColor: activo ? tokens.cyanBg : tokens.surface1 }]}>
                      <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
                      <Text numberOfLines={2} style={{ fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: activo ? tokens.cyan : tokens.textSecondary, textAlign: "center", marginTop: 4 }}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </Sheet>

      <Sheet visible={zonaAbierta} onClose={() => { setZonaAbierta(false); setBusquedaZona(""); }} title="Elige tu zona">
        {municipios === null ? (
          <View style={{ gap: 10, paddingBottom: 20 }}>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </View>
        ) : (
          <View style={{ paddingBottom: 24 }}>
            <View style={[styles.zonaSearchBox, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <MagnifyingGlassIcon size={14} color={tokens.textMuted} />
              <TextInput
                value={busquedaZona}
                onChangeText={setBusquedaZona}
                placeholder="Buscar municipio…"
                placeholderTextColor={tokens.textMuted}
                style={{ flex: 1, fontSize: 13.5, color: tokens.textPrimary, fontFamily: "Inter_400Regular" }}
              />
              {!!busquedaZona && (
                <Pressable onPress={() => setBusquedaZona("")} hitSlop={8}>
                  <XIcon size={13} color={tokens.textMuted} />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => {
                setDepartamento(null);
                setMunicipio(null);
                setZonaAbierta(false);
                setBusquedaZona("");
              }}
              style={[styles.municipioRow, { borderColor: !municipio && !departamento ? tokens.cyan : "transparent", backgroundColor: !municipio && !departamento ? tokens.cyanBg : "transparent", marginBottom: 4 }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <GlobeIcon size={14} color={!municipio && !departamento ? tokens.cyan : tokens.textSecondary} />
                <Text style={{ fontSize: 13.5, fontFamily: !municipio && !departamento ? "Inter_700Bold" : "Inter_500Medium", color: !municipio && !departamento ? tokens.cyan : tokens.textPrimary }}>
                  Todas las tiendas
                </Text>
              </View>
            </Pressable>

            {municipiosFiltrados.map(([depto, ms]) => (
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
                        setBusquedaZona("");
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
            {municipiosFiltrados.length === 0 && (
              <Text style={{ fontSize: 12.5, color: tokens.textMuted, textAlign: "center", paddingVertical: 16 }}>Sin resultados</Text>
            )}
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
  categoriaBtn: { flexDirection: "row", alignItems: "center", gap: 8, height: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginTop: 10 },
  grupoCard: { width: "31%", aspectRatio: 1, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
  viewbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 },
  deptoChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  segmented: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 3, gap: 2 },
  segBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  storeAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2 },
  storeBanner: { height: 76, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
  estadoBadge: { position: "absolute", top: 8, right: 40, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  storeCloseBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  storeCard: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  deptoLabel: { fontSize: 10.5, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  municipioRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  zonaSearchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12 },
});
