import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, FilmSlateIcon, PencilIcon, PlusIcon, StorefrontIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { vendedorApi } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "VendedorProductos">;

export function VendedorProductosScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [productos, setProductos] = useState<Producto[] | null>(null);

  const cargar = () => {
    vendedorApi.misProductos().then((r) => setProductos(r.productos)).catch(() => setProductos([]));
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", cargar);
    cargar();
    return unsub;
  }, [navigation]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Productos</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button size="sm" variant="secondary" icon={<FilmSlateIcon size={14} color={tokens.violet} />} onPress={() => navigation.navigate("VendedorReelForm")}>
            Reel
          </Button>
          <Button size="sm" variant="secondary" icon={<PlusIcon size={14} color={tokens.cyan} />} onPress={() => navigation.navigate("VendedorProductoForm", {})}>
            Producto
          </Button>
        </View>
      </View>

      {productos === null ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={160} radius={16} />
        </View>
      ) : productos.length === 0 ? (
        <EmptyState icon={<StorefrontIcon size={22} color={tokens.textMuted} />} title="Sin productos todavía" actionLabel="Crear producto" onAction={() => navigation.navigate("VendedorProductoForm", {})} />
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 60 }}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index} style={{ flex: 1 }}>
              <Pressable onPress={() => navigation.navigate("VendedorProductoForm", { id: item.id })} style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <View style={{ height: 100, backgroundColor: tokens.surface2 }}>
                  {item.imagen && <Image source={{ uri: item.imagen }} style={[StyleSheet.absoluteFill, { opacity: item.activo ? 1 : 0.5 }]} />}
                  <View style={[styles.editBadge, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
                    <PencilIcon size={11} color="#fff" />
                  </View>
                </View>
                <View style={{ padding: 10 }}>
                  <Text numberOfLines={1} style={{ fontFamily: "Inter_600SemiBold", fontSize: 12.5, color: tokens.textPrimary }}>{item.nombre}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 12, fontWeight: "700", color: tokens.textPrimary }}>{money(item.precio_oferta || item.precio)}</Text>
                    <Text style={{ fontSize: 11, color: tokens.textMuted }}>{item.stock_ilimitado ? "Ilimitado" : `Stock: ${item.stock}`}</Text>
                  </View>
                </View>
              </Pressable>
            </AnimatedListItem>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  editBadge: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
