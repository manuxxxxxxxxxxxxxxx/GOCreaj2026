import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { PlayIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { useTheme } from "../../theme/ThemeContext";

export function ProductGrid({ productos }: { productos: Producto[] }) {
  const { tokens } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.grid}>
      {productos.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => (p.es_reel ? navigation.navigate("Tabs", { screen: "Reels", params: { tiendaId: p.tienda_id, productoId: p.id } }) : navigation.navigate("ProductDetail", { id: p.id }))}
          style={[styles.tile, { backgroundColor: tokens.surface2 }]}
        >
          {p.imagen && <Image source={{ uri: p.imagen }} style={StyleSheet.absoluteFill} />}
          {!!p.es_reel && (
            <View style={styles.playBadge}>
              <PlayIcon size={9} weight="fill" color="#fff" />
            </View>
          )}
          <LinearGradient colors={["transparent", "rgba(8,11,20,0.75)"]} style={styles.priceTag}>
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{money(p.precio_oferta || p.precio)}</Text>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  tile: { width: "32.7%", aspectRatio: 1, borderRadius: 8, overflow: "hidden", position: "relative" },
  playBadge: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(8,11,20,0.55)", alignItems: "center", justifyContent: "center" },
  priceTag: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingBottom: 5, paddingTop: 10 },
});
