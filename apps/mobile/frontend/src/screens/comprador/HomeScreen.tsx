import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StorefrontIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { productosApi } from "../../lib/api";
import type { Producto, Tienda } from "../../lib/types";
import { GlowBackground } from "../../components/ui/GlowBackground";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Carousel } from "../../components/ui/Carousel";
import { ScreenReveal } from "../../components/ui/Motion";
import { StoreCard } from "../../components/domain/StoreCard";
import { BentoGrid } from "../../components/domain/BentoGrid";
import { ElSalvadorMap } from "../../components/domain/ElSalvadorMap";
import { Footer } from "../../components/domain/Footer";
import { CATEGORIA_GRUPOS } from "../../lib/categoryIcons";

export function HomeScreen() {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [destacadas, setDestacadas] = useState<Tienda[] | null>(null);
  const [nuevas, setNuevas] = useState<Tienda[] | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [conteoDepartamentos, setConteoDepartamentos] = useState<Record<string, number> | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const cargandoMasRef = useRef(false);

  const municipio = usuario?.municipio ?? undefined;
  const PRODUCTOS_POR_PAGINA = 12;

  useEffect(() => {
    productosApi.tiendasDestacadas({ municipio, limit: 8 }).then((r) => setDestacadas(r.tiendas)).catch(() => setDestacadas([]));
    productosApi.nuevasTiendas({ municipio, limit: 8 }).then((r) => setNuevas(r.tiendas)).catch(() => setNuevas([]));
    pageRef.current = 1;
    setHasMore(true);
    productosApi
      .listar({ municipio, page: 1, limit: PRODUCTOS_POR_PAGINA })
      .then((r) => {
        setProductos(r.productos);
        setHasMore(r.has_more);
      })
      .catch(() => setProductos([]));
  }, [municipio]);

  const cargarMasProductos = useCallback(() => {
    if (cargandoMasRef.current || !hasMore) return;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    const siguiente = pageRef.current + 1;
    productosApi
      .listar({ municipio, page: siguiente, limit: PRODUCTOS_POR_PAGINA })
      .then((r) => {
        pageRef.current = siguiente;
        setProductos((prev) => [...(prev ?? []), ...r.productos]);
        setHasMore(r.has_more);
      })
      .catch(() => setHasMore(false))
      .finally(() => {
        cargandoMasRef.current = false;
        setCargandoMas(false);
      });
  }, [municipio, hasMore]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 500) {
        cargarMasProductos();
      }
    },
    [cargarMasProductos],
  );

  useEffect(() => {
    productosApi.tiendasPorDepartamento().then((r) => setConteoDepartamentos(r.conteo)).catch(() => setConteoDepartamentos({}));
  }, []);

  const irADepartamento = (departamento: string) => {
    navigation.navigate("Tabs", { screen: "Explorar", params: { departamento } });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={200}
    >
      <ScreenReveal style={{ position: "relative", borderRadius: 24, overflow: "hidden", padding: 24, marginBottom: 28 }}>
        <GlowBackground />
        <View style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: tokens.border, borderRadius: 24 }]} />
        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>¿Qué se te antoja pedir hoy?</Text>
        <Text style={{ fontSize: 22, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 6, maxWidth: "85%" }}>
          Comida, mercado, farmacia, moda y envíos a tu puerta
        </Text>
        <Pressable onPress={() => navigation.navigate("Tabs")} style={[styles.cta, { backgroundColor: tokens.cyan }]}>
          <Text style={{ color: tokens.cyanInk, fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13 }}>Explorar tiendas</Text>
        </Pressable>
      </ScreenReveal>

      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Categorías</Text>
      <Carousel
        data={CATEGORIA_GRUPOS}
        keyExtractor={(g) => g.id}
        itemWidth={64}
        gap={14}
        itemsPerPress={4}
        contentPaddingHorizontal={2}
        renderItem={(g) => (
          <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Explorar", params: { grupo: g.id } })} style={{ alignItems: "center", gap: 4 }}>
            <View style={styles.catEmojiWrap}>
              <Text style={{ fontSize: 32 }}>{g.emoji}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: tokens.textSecondary, textAlign: "center" }}>
              {g.label}
            </Text>
          </Pressable>
        )}
      />

      <View style={{ marginTop: 28, marginBottom: 28 }}>
        <ElSalvadorMap counts={conteoDepartamentos} onSelectDepartamento={irADepartamento} />
      </View>

      <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Tiendas destacadas</Text>
      <HorizontalStores tiendas={destacadas} navigation={navigation} />

      <Text style={[styles.sectionTitle, { color: tokens.textPrimary, marginTop: 24 }]}>Nuevas en tu zona</Text>
      <HorizontalStores tiendas={nuevas} navigation={navigation} />

      <Text style={[styles.sectionTitle, { color: tokens.textPrimary, marginTop: 24 }]}>Para ti</Text>
      {productos === null ? (
        <Skeleton height={280} radius={16} />
      ) : productos.length === 0 ? (
        <EmptyState icon={<StorefrontIcon size={22} color={tokens.textMuted} />} title="Aún no hay productos en tu zona" />
      ) : (
        <>
          <BentoGrid productos={productos} />
          {cargandoMas && (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={tokens.cyan} />
            </View>
          )}
        </>
      )}

      <Footer />
    </ScrollView>
  );
}

function HorizontalStores({ tiendas, navigation }: { tiendas: Tienda[] | null; navigation: NativeStackNavigationProp<RootStackParamList> }) {
  if (tiendas === null) {
    return (
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
        <Skeleton width={170} height={140} radius={16} />
        <Skeleton width={170} height={140} radius={16} />
      </View>
    );
  }
  if (tiendas.length === 0) return null;
  return (
    <Carousel
      data={tiendas}
      keyExtractor={(t) => String(t.id)}
      itemWidth={170}
      gap={12}
      itemsPerPress={2}
      contentPaddingHorizontal={2}
      renderItem={(item) => <StoreCard tienda={item} onPress={() => navigation.navigate("StoreDetail", { id: item.id })} />}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 140 },
  cta: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", marginBottom: 12 },
  catEmojiWrap: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
});
