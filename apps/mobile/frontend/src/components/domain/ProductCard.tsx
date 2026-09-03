import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeartIcon, PencilSimpleIcon, PlusIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { carritoApi, interaccionesApi, ApiError } from "../../lib/api";
import { triggerFly } from "../../lib/cartFly";
import { glowShadow } from "../../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  producto: Producto;
  height?: DimensionValue;
  /** Shows a floating wishlist heart in the top-right corner (store-profile grids). */
  showWishlist?: boolean;
  /** El dueño de la tienda ve un lápiz para editar el producto en vez de agregarlo al carrito. */
  isOwner?: boolean;
}

export function ProductCard({ producto, height = 150, showWishlist, isOwner }: Props) {
  const { tokens } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useAuth();
  const { refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const addBtnRef = useRef<View>(null);
  const cardScale = useSharedValue(1);
  const addScale = useSharedValue(1);
  const [guardado, setGuardado] = useState(!!producto.yo_guardado);

  const toggleGuardar = async () => {
    if (!usuario) return;
    setGuardado((g) => !g);
    try {
      const r = await interaccionesApi.toggleGuardar(producto.id);
      setGuardado(r.accion === "guardar");
    } catch {
      setGuardado((g) => !g);
    }
  };

  // Stock ilimitado nunca se muestra como agotado -- el backend guarda `stock = 0` para esos
  // productos (no hay cantidad real que llevar), así que sin este guard aparecían "AGOTADO" por error.
  const agotado = !producto.stock_ilimitado && (producto.estado_stock === "agotado" || producto.stock <= 0);
  const enOferta = !!producto.precio_oferta && producto.precio_oferta > 0;

  const agregar = async () => {
    if (!usuario) return;
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
    addScale.value = withSequence(withTiming(0.75, { duration: 90 }), withTiming(1.15, { duration: 130 }), withTiming(1, { duration: 120 }));
    addBtnRef.current?.measureInWindow((x, y, width, height2) => {
      if (width > 0) triggerFly(x + width / 2, y + height2 / 2);
    });
    try {
      await carritoApi.agregar(producto.id, 1);
      await refrescar();
      celebrarAgregado();
      toast.show(`${producto.nombre} agregado al carrito`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar.", "error");
    }
  };

  const cardAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const addAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));

  const abrir = () =>
    producto.es_reel
      ? navigation.navigate("Tabs", { screen: "Reels", params: { tiendaId: producto.tienda_id, productoId: producto.id } })
      : navigation.navigate("ProductDetail", { id: producto.id });

  const editar = () => navigation.navigate("VendedorProductoForm", { id: producto.id });

  return (
    <AnimatedPressable
      onPress={abrir}
      onPressIn={() => (cardScale.value = withTiming(0.97, { duration: 90 }))}
      onPressOut={() => (cardScale.value = withTiming(1, { duration: 160 }))}
      style={[cardAnimStyle, styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
    >
      <View style={{ height, backgroundColor: tokens.surface2 }}>
        {producto.imagen && <Image source={{ uri: producto.imagen }} style={[StyleSheet.absoluteFill, { opacity: agotado ? 0.5 : 1 }]} />}
        {enOferta && !agotado && (
          <View style={[styles.badge, { backgroundColor: tokens.danger }]}>
            <Text style={styles.badgeText}>OFERTA</Text>
          </View>
        )}
        {agotado && (
          <View style={[StyleSheet.absoluteFill, styles.agotadoOverlay]}>
            <Text style={styles.badgeText}>AGOTADO</Text>
          </View>
        )}
        {isOwner ? (
          <View style={styles.addBtnWrap}>
            <Pressable onPress={editar} accessibilityLabel={`Editar ${producto.nombre}`} style={[styles.addBtn, { backgroundColor: tokens.cyan }, glowShadow(tokens.cyanGlow, "sm")]}>
              <PencilSimpleIcon size={13} weight="bold" color={tokens.cyanInk} />
            </Pressable>
          </View>
        ) : (
          !agotado && (
            <View ref={addBtnRef} collapsable={false} style={styles.addBtnWrap}>
              <AnimatedPressable
                onPress={agregar}
                accessibilityLabel={`Agregar ${producto.nombre}`}
                style={[addAnimStyle, styles.addBtn, { backgroundColor: tokens.cyan }, glowShadow(tokens.cyanGlow, "sm")]}
              >
                <PlusIcon size={15} weight="bold" color={tokens.cyanInk} />
              </AnimatedPressable>
            </View>
          )
        )}
        {showWishlist && (
          <Pressable onPress={toggleGuardar} accessibilityLabel={guardado ? "Quitar de guardados" : "Guardar en mi lista"} style={styles.wishlistBtn}>
            <HeartIcon size={13} weight={guardado ? "fill" : "regular"} color={guardado ? tokens.coral : "#fff"} />
          </Pressable>
        )}
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={1} style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13, color: tokens.textPrimary }}>
          {producto.nombre}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 10.5, color: tokens.textMuted, marginVertical: 3 }}>
          {producto.tienda_nombre}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 13, fontWeight: "700", color: enOferta ? tokens.danger : tokens.textPrimary }}>{money(enOferta ? producto.precio_oferta! : producto.precio)}</Text>
          {/* Mismo tamaño que el precio activo -- solo se diferencia por el tachado y el color apagado. */}
          {enOferta && <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 13, color: tokens.textMuted, textDecorationLine: "line-through" }}>{money(producto.precio)}</Text>}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  badge: { position: "absolute", top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  agotadoOverlay: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,11,20,0.4)" },
  addBtnWrap: { position: "absolute", right: 8, bottom: 8 },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  wishlistBtn: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,11,20,0.45)" },
});
