import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BellIcon, PackageIcon, ShoppingCartIcon } from "phosphor-react-native";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../theme/ThemeContext";
import { pedidosApi, notificacionesApi } from "../lib/api";
import { IconButton } from "../components/ui/IconButton";
import { setCartTarget } from "../lib/cartFly";
import type { RootStackParamList } from "./types";

export function TopBar() {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { count } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hayPedidoActivo, setHayPedidoActivo] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const cartRef = useRef<View>(null);

  const registerCartTarget = () => {
    cartRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) setCartTarget(x + width / 2, y + height / 2);
    });
  };

  useEffect(() => {
    if (!usuario || usuario.rol !== "comprador") return;
    const check = () => {
      pedidosApi
        .misPedidos()
        .then((r) => setHayPedidoActivo(r.pedidos.some((p) => p.estado === "en_camino")))
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    const check = () => {
      notificacionesApi
        .contador()
        .then((r) => setNoLeidas(r.no_leidas))
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [usuario]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, backgroundColor: tokens.bg, borderBottomColor: tokens.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.greeting, { color: tokens.textMuted }]}>{saludo}{usuario ? `, ${usuario.nombre.split(" ")[0]}` : ""}</Text>
        <Image
          source={isDark ? require("../../assets/branding/logo-dark.png") : require("../../assets/branding/logo-light.png")}
          style={styles.brand}
          resizeMode="contain"
        />
      </View>
      <View style={styles.icons}>
        <IconButton icon={<BellIcon size={18} color={tokens.textPrimary} weight="regular" />} label="Notificaciones" badge={noLeidas} onPress={() => navigation.navigate("Notifications")} />
        <IconButton icon={<PackageIcon size={18} color={tokens.textPrimary} weight="regular" />} label="Pedidos" pulse={hayPedidoActivo} onPress={() => navigation.navigate("Orders")} />
        {usuario?.rol === "comprador" && (
          <View ref={cartRef} onLayout={registerCartTarget} collapsable={false}>
            <IconButton icon={<ShoppingCartIcon size={18} color={tokens.textPrimary} weight="regular" />} label="Carrito" badge={count} onPress={() => navigation.navigate("Cart")} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  greeting: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
  brand: { height: 24, width: 63, marginTop: 2, alignSelf: "flex-start" },
  icons: { flexDirection: "row", gap: 8 },
});
