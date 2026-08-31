import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BookmarkSimpleIcon, CaretLeftIcon, HeartIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { interaccionesApi } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProductGrid } from "../../components/domain/ProductGrid";

type Props = NativeStackScreenProps<RootStackParamList, "MiColeccion">;

const LIMIT = 30;

export function MiColeccionScreen({ route, navigation }: Props) {
  const { tipo } = route.params;
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const cfg =
    tipo === "likes"
      ? { titulo: "Me gusta", icon: <HeartIcon size={22} color={tokens.textMuted} />, vacio: "Los productos y reels que te gusten aparecerán aquí.", fetch: interaccionesApi.misLikes }
      : { titulo: "Guardados", icon: <BookmarkSimpleIcon size={22} color={tokens.textMuted} />, vacio: "Guarda productos y reels desde el ícono de marcador para verlos aquí.", fetch: interaccionesApi.misGuardados };

  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);

  useEffect(() => {
    cfg.fetch(1, LIMIT).then((r) => {
      setProductos(r.productos);
      setTotal(r.total);
    });
  }, [tipo]);

  const cargarMas = () => {
    const siguiente = page + 1;
    setCargandoMas(true);
    cfg.fetch(siguiente, LIMIT).then((r) => {
      setProductos((prev) => [...(prev ?? []), ...r.productos]);
      setPage(siguiente);
      setCargandoMas(false);
    });
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>
          {cfg.titulo} {total > 0 && `(${total})`}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {productos === null ? (
          <Skeleton height={300} />
        ) : productos.length === 0 ? (
          <EmptyState icon={cfg.icon} title={`Sin ${cfg.titulo.toLowerCase()} todavía`} description={cfg.vacio} />
        ) : (
          <>
            <ProductGrid productos={productos} />
            {productos.length < total && (
              <Button variant="secondary" onPress={cargarMas} loading={cargandoMas}>
                Cargar más
              </Button>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
