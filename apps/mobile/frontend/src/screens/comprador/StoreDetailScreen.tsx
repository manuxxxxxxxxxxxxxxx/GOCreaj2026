import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, ClockIcon, MapPinIcon, PlayIcon, StarIcon, StorefrontIcon, UsersThreeIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemeTokens } from "../../theme/tokens";
import { productosApi, interaccionesApi } from "../../lib/api";
import type { Producto, Tienda } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProductCard } from "../../components/domain/ProductCard";
import { AnimatedListItem } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "StoreDetail">;

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  respuesta_vendedor: string | null;
  created_at: string;
  comprador_nombre: string;
}

export function StoreDetailScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [tab, setTab] = useState<"productos" | "reels" | "resenas">("productos");

  useEffect(() => {
    const tid = route.params.id;
    productosApi.tiendaDetalle(tid).then((r) => setTienda(r.tienda)).catch(() => setTienda(null));
    productosApi.listar({ tienda_id: tid, limit: 40 }).then((r) => setProductos(r.productos)).catch(() => setProductos([]));
    productosApi.reels({ tienda_id: tid }).then((r) => setReels(r.reels)).catch(() => setReels([]));
    productosApi.tiendaResenas(tid).then((r) => setResenas(r.resenas)).catch(() => setResenas([]));
  }, [route.params.id]);

  const toggleSeguir = async () => {
    if (!tienda) return;
    const r = await interaccionesApi.seguirTienda(tienda.id);
    setTienda({ ...tienda, yo_sigo: r.accion === "follow" ? 1 : 0, seguidores_count: r.total_seguidores });
  };

  if (!tienda) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Skeleton height={200} radius={20} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={tab === "productos" ? productos ?? [] : tab === "reels" ? reels ?? [] : []}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 140, gap: 12 }}
        ListHeaderComponent={
          <View>
            <View style={{ height: 170, backgroundColor: tokens.surface2 }}>
              {tienda.portada && <Image source={{ uri: tienda.portada }} style={StyleSheet.absoluteFill} />}
              <Pressable onPress={navigation.goBack} style={[styles.backBtn, { top: insets.top + 8, backgroundColor: "rgba(0,0,0,0.4)" }]}>
                <CaretLeftIcon size={16} color="#fff" />
              </Pressable>
            </View>
            <View style={{ padding: 20, backgroundColor: tokens.surface1, marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: -46 }}>
                <View style={[styles.logo, { borderColor: tokens.surface1, backgroundColor: tokens.surface2 }]}>
                  {tienda.logo ? <Image source={{ uri: tienda.logo }} style={StyleSheet.absoluteFill} /> : <StorefrontIcon size={24} color={tokens.textMuted} style={{ alignSelf: "center", marginTop: 26 }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 19, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{tienda.nombre}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Meta icon={<StarIcon size={13} weight="fill" color={tokens.warn} />} text={`${tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"} (${tienda.total_resenas})`} tokens={tokens} />
                <Meta icon={<MapPinIcon size={13} color={tokens.textSecondary} />} text={tienda.municipio} tokens={tokens} />
                {tienda.hora_apertura && <Meta icon={<ClockIcon size={13} color={tokens.textSecondary} />} text={`${tienda.hora_apertura} – ${tienda.hora_cierre}`} tokens={tokens} />}
                <Meta icon={<UsersThreeIcon size={13} color={tokens.textSecondary} />} text={`${tienda.seguidores_count ?? 0} seguidores`} tokens={tokens} />
              </View>
              {tienda.descripcion ? <Text style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 10 }}>{tienda.descripcion}</Text> : null}
              <Button variant={tienda.yo_sigo ? "secondary" : "primary"} onPress={toggleSeguir} style={{ marginTop: 14, alignSelf: "flex-start" }}>
                {tienda.yo_sigo ? "Siguiendo" : "Seguir"}
              </Button>
              <View style={styles.tabs}>
                {(["productos", "reels", "resenas"] as const).map((t) => (
                  <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, { backgroundColor: tab === t ? tokens.surface2 : "transparent" }]}>
                    <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tab === t ? tokens.textPrimary : tokens.textMuted }}>
                      {t === "productos" ? "Productos" : t === "reels" ? "Reels" : "Reseñas"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {tab === "resenas" &&
              (resenas.length === 0 ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <EmptyState icon={<StarIcon size={22} color={tokens.textMuted} />} title="Aún no hay reseñas" />
                </View>
              ) : (
                <View style={{ paddingHorizontal: 20, gap: 10 }}>
                  {resenas.map((r) => (
                    <View key={r.id} style={[styles.resena, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>{r.comprador_nombre}</Text>
                        <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatDate(r.created_at)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 2, marginVertical: 4 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon key={i} size={12} weight={i < r.estrellas ? "fill" : "regular"} color={tokens.warn} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{r.comentario}</Text>
                    </View>
                  ))}
                </View>
              ))}
            {tab === "productos" && productos === null && (
              <View style={{ paddingHorizontal: 20 }}>
                <Skeleton height={200} radius={16} />
              </View>
            )}
            {tab === "productos" && productos?.length === 0 && (
              <View style={{ paddingHorizontal: 20 }}>
                <EmptyState icon={<StorefrontIcon size={22} color={tokens.textMuted} />} title="Sin productos todavía" />
              </View>
            )}
            {tab === "reels" && reels === null && (
              <View style={{ paddingHorizontal: 20 }}>
                <Skeleton height={200} radius={16} />
              </View>
            )}
            {tab === "reels" && reels?.length === 0 && (
              <View style={{ paddingHorizontal: 20 }}>
                <EmptyState icon={<PlayIcon size={22} color={tokens.textMuted} />} title="Sin reels todavía" />
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index} style={{ flex: 1 }}>
            {tab === "reels" ? (
              <Pressable
                onPress={() => navigation.navigate("Tabs", { screen: "Reels", params: { tiendaId: tienda.id, productoId: item.id } })}
                style={[styles.reelTile, { backgroundColor: tokens.surface2 }]}
              >
                {item.imagen && <Image source={{ uri: item.imagen }} style={StyleSheet.absoluteFill} />}
                <View style={styles.reelGradient} />
                <View style={styles.reelPlayBadge}>
                  <PlayIcon size={11} weight="fill" color="#fff" />
                </View>
                <Text numberOfLines={1} style={styles.reelTitle}>
                  {item.nombre}
                </Text>
              </Pressable>
            ) : (
              <ProductCard producto={item} height={130} />
            )}
          </AnimatedListItem>
        )}
      />
    </View>
  );
}

function Meta({ icon, text, tokens }: { icon: React.ReactNode; text: string; tokens: ThemeTokens }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon}
      <Text style={{ fontSize: 11.5, color: tokens.textSecondary }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { position: "absolute", left: 20, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 18, borderWidth: 3, overflow: "hidden" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  tabs: { flexDirection: "row", gap: 6, marginTop: 16 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  resena: { borderRadius: 14, borderWidth: 1, padding: 14 },
  reelTile: { flex: 1, aspectRatio: 9 / 16, borderRadius: 14, overflow: "hidden", position: "relative" },
  reelGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(0,0,0,0.55)" },
  reelPlayBadge: { position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  reelTitle: { position: "absolute", left: 8, right: 8, bottom: 8, color: "#fff", fontSize: 11.5, fontFamily: "Inter_700Bold" },
});
