import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BookmarkSimpleIcon, CaretLeftIcon, ChatCircleIcon, HeartIcon, ShareNetworkIcon, StorefrontIcon, TimerIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { productosApi, carritoApi, interaccionesApi, chatApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { IconButton } from "../../components/ui/IconButton";
import { ScreenReveal } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    productosApi.detalle(route.params.id).then((r) => {
      if (r.producto.es_reel) {
        navigation.replace("Tabs", { screen: "Reels", params: { tiendaId: r.producto.tienda_id, productoId: r.producto.id } });
        return;
      }
      setProducto(r.producto);
    }).catch(() => setProducto(null));
    interaccionesApi.registrarVista(route.params.id).catch(() => {});
  }, [route.params.id]);

  const agotado = producto ? producto.estado_stock === "agotado" || producto.stock <= 0 : false;
  const enOferta = !!producto?.precio_oferta && producto.precio_oferta > 0;
  const precio = producto ? (enOferta ? producto.precio_oferta! : producto.precio) : 0;

  const agregarCarrito = async () => {
    if (!producto || !usuario) return;
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
    setAgregando(true);
    try {
      await carritoApi.agregar(producto.id, cantidad);
      await refrescar();
      celebrarAgregado();
      toast.show(`${producto.nombre} agregado al carrito`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar al carrito.", "error");
    } finally {
      setAgregando(false);
    }
  };

  const toggleLike = async () => {
    if (!producto) return;
    const r = await interaccionesApi.toggleLike(producto.id);
    setProducto({ ...producto, yo_like: r.accion === "like" ? 1 : 0, likes_count: r.contadores.likes });
  };

  const toggleGuardar = async () => {
    if (!producto) return;
    const r = await interaccionesApi.toggleGuardar(producto.id);
    setProducto({ ...producto, yo_guardado: r.accion === "guardar" ? 1 : 0 });
    toast.show(r.accion === "guardar" ? "Guardado" : "Quitado de guardados", "info");
  };

  const preguntar = async () => {
    if (!producto) return;
    try {
      const r = await chatApi.desdeProducto(producto.id);
      navigation.navigate("ChatThread", { otroId: r.otro_id });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo abrir el chat.", "error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
      </View>

      {!producto ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={320} radius={20} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
          <ScreenReveal style={{ aspectRatio: 1, borderRadius: 20, overflow: "hidden", backgroundColor: tokens.surface2, marginBottom: 18 }}>
            {producto.imagen && <Image source={{ uri: producto.imagen }} style={[StyleSheet.absoluteFill, { opacity: agotado ? 0.5 : 1 }]} />}
            {agotado && (
              <View style={[styles.agotadoTag, { backgroundColor: tokens.danger }]}>
                <Text style={styles.agotadoText}>AGOTADO</Text>
              </View>
            )}
          </ScreenReveal>

          <Pressable onPress={() => navigation.navigate("StoreDetail", { id: producto.tienda_id })} style={styles.storeLink}>
            <StorefrontIcon size={13} color={tokens.cyan} />
            <Text style={{ color: tokens.cyan, fontFamily: "Inter_700Bold", fontSize: 12 }}>{producto.tienda_nombre}</Text>
          </Pressable>
          <Text style={{ fontSize: 24, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>{producto.nombre}</Text>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
            <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 22, fontWeight: "700", color: enOferta ? tokens.danger : tokens.textPrimary }}>{money(precio)}</Text>
            {enOferta && <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 14, color: tokens.textMuted, textDecorationLine: "line-through" }}>{money(producto.precio)}</Text>}
          </View>

          {producto.descripcion ? <Text style={{ fontSize: 14, color: tokens.textSecondary, lineHeight: 21, marginBottom: 14 }}>{producto.descripcion}</Text> : null}

          {producto.tiempo_preparacion && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <TimerIcon size={15} color={tokens.textSecondary} />
              <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>{producto.tiempo_preparacion}</Text>
            </View>
          )}

          {!agotado && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <View style={[styles.stepper, { borderColor: tokens.border }]}>
                <Pressable onPress={() => setCantidad((c) => Math.max(1, c - 1))} style={styles.stepBtn}>
                  <Text style={{ fontSize: 18, color: tokens.textPrimary }}>−</Text>
                </Pressable>
                <Text style={{ width: 30, textAlign: "center", fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{cantidad}</Text>
                <Pressable onPress={() => setCantidad((c) => Math.min(producto.stock, c + 1))} style={styles.stepBtn}>
                  <Text style={{ fontSize: 18, color: tokens.textPrimary }}>+</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Button size="lg" hero onPress={agregarCarrito} loading={agregando}>
                  {`Agregar · ${money(precio * cantidad)}`}
                </Button>
              </View>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton icon={<HeartIcon size={18} weight={producto.yo_like ? "fill" : "regular"} color={producto.yo_like ? tokens.danger : tokens.textPrimary} />} label="Me gusta" active={!!producto.yo_like} badge={producto.likes_count} onPress={toggleLike} />
            <IconButton icon={<BookmarkSimpleIcon size={18} weight={producto.yo_guardado ? "fill" : "regular"} color={tokens.textPrimary} />} label="Guardar" active={!!producto.yo_guardado} onPress={toggleGuardar} />
            <IconButton icon={<ChatCircleIcon size={18} color={tokens.textPrimary} />} label="Preguntar" onPress={preguntar} />
            <IconButton
              icon={<ShareNetworkIcon size={18} color={tokens.textPrimary} />}
              label="Compartir"
              onPress={() => {
                interaccionesApi.compartir(producto.id).catch(() => {});
                toast.show("¡Compartido!", "success");
              }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  agotadoTag: { position: "absolute", top: 16, left: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  agotadoText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  storeLink: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10 },
  stepBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
