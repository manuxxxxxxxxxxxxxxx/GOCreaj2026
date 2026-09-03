import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BookmarkSimpleIcon, CaretLeftIcon, ChatCircleIcon, FlagIcon, HeartIcon, ShareNetworkIcon, ShoppingCartSimpleIcon, StorefrontIcon, TimerIcon } from "phosphor-react-native";
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
import { ReportSheet } from "../../components/domain/ReportSheet";
import { ScreenReveal } from "../../components/ui/Motion";
import { BrandMosaic } from "../../components/ui/BrandMosaic";

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { items: itemsCarrito, refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [reportando, setReportando] = useState(false);
  const [fotoActiva, setFotoActiva] = useState(0);

  useEffect(() => {
    setFotoActiva(0);
    productosApi.detalle(route.params.id).then((r) => {
      if (r.producto.es_reel) {
        navigation.replace("Tabs", { screen: "Reels", params: { tiendaId: r.producto.tienda_id, productoId: r.producto.id } });
        return;
      }
      setProducto(r.producto);
    }).catch(() => setProducto(null));
    interaccionesApi.registrarVista(route.params.id).catch(() => {});
  }, [route.params.id]);

  const fotos = useMemo(() => {
    if (!producto) return [] as string[];
    if (producto.imagenes && producto.imagenes.length > 0) return producto.imagenes;
    return producto.imagen ? [producto.imagen] : [];
  }, [producto]);

  // Stock ilimitado nunca se muestra como agotado -- ver misma nota en ProductCard.tsx.
  const agotado = producto ? !producto.stock_ilimitado && (producto.estado_stock === "agotado" || producto.stock <= 0) : false;
  const enOferta = !!producto?.precio_oferta && producto.precio_oferta > 0;
  const precio = producto ? (enOferta ? producto.precio_oferta! : producto.precio) : 0;
  // Un vendedor no se contacta ni le da like a sus propios productos.
  const esPropio = !!usuario && !!producto && usuario.rol === "vendedor" && producto.vendedor_id === usuario.id;

  // Cuántas unidades de ESTE producto ya están en el carrito -- el tope del stepper debe
  // descontarlas, si no el backend rechaza "agregar" justo al llegar al máximo mostrado
  // (ver misma nota en ProductDetail.tsx web).
  const yaEnCarrito = producto ? itemsCarrito.find((it) => it.producto_id === producto.id)?.cantidad ?? 0 : 0;
  const disponibleParaAgregar = producto ? (producto.stock_ilimitado ? 99 : Math.max(0, producto.stock - yaEnCarrito)) : 0;

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

  const comprarAhora = async () => {
    if (!producto || !usuario) return;
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
    setComprando(true);
    try {
      await carritoApi.agregar(producto.id, cantidad);
      await refrescar();
      navigation.navigate("Checkout", undefined);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo iniciar la compra.", "error");
      setComprando(false);
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
          <View style={{ marginBottom: 18 }}>
            <ScreenReveal style={{ aspectRatio: 1, borderRadius: 20, overflow: "hidden", backgroundColor: tokens.surface2 }}>
              {fotos.length > 0 ? (
                <Image key={fotos[fotoActiva]} source={{ uri: fotos[fotoActiva] }} style={[StyleSheet.absoluteFill, { opacity: agotado ? 0.5 : 1 }]} />
              ) : (
                <BrandMosaic seed={producto.id} />
              )}
              {agotado && (
                <View style={[styles.agotadoTag, { backgroundColor: tokens.danger }]}>
                  <Text style={styles.agotadoText}>AGOTADO</Text>
                </View>
              )}
            </ScreenReveal>

            {fotos.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                {fotos.map((f, i) => (
                  <Pressable
                    key={f + i}
                    onPress={() => setFotoActiva(i)}
                    accessibilityLabel={`Ver foto ${i + 1}`}
                    style={[styles.thumb, { backgroundColor: tokens.surface2, borderColor: i === fotoActiva ? tokens.cyan : tokens.border }]}
                  >
                    <Image source={{ uri: f }} style={StyleSheet.absoluteFill} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          <Pressable onPress={() => navigation.navigate("StoreDetail", { id: producto.tienda_id })} style={styles.storeLink}>
            <StorefrontIcon size={13} color={tokens.cyan} />
            <Text style={{ color: tokens.cyan, fontFamily: "Inter_700Bold", fontSize: 12 }}>{producto.tienda_nombre}</Text>
          </Pressable>
          <Text style={{ fontSize: 24, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>{producto.nombre}</Text>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
            <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 22, fontWeight: "700", color: enOferta ? tokens.danger : tokens.textPrimary }}>{money(precio)}</Text>
            {/* Mismo tamaño que el precio activo -- solo se diferencia por el tachado y el color apagado. */}
            {enOferta && <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 22, color: tokens.textMuted, textDecorationLine: "line-through" }}>{money(producto.precio)}</Text>}
          </View>

          {producto.descripcion ? <Text style={{ fontSize: 14, color: tokens.textSecondary, lineHeight: 21, marginBottom: 14 }}>{producto.descripcion}</Text> : null}

          {producto.tiempo_preparacion && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <TimerIcon size={15} color={tokens.textSecondary} />
              <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>{producto.tiempo_preparacion}</Text>
            </View>
          )}

          {!agotado && (
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <View style={[styles.stepper, { borderColor: tokens.border }]}>
                  <Pressable onPress={() => setCantidad((c) => Math.max(1, c - 1))} style={styles.stepBtn}>
                    <Text style={{ fontSize: 18, color: tokens.textPrimary }}>−</Text>
                  </Pressable>
                  <Text style={{ width: 30, textAlign: "center", fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary }}>{cantidad}</Text>
                  <Pressable
                    onPress={() => setCantidad((c) => Math.min(Math.max(1, disponibleParaAgregar), c + 1))}
                    disabled={disponibleParaAgregar <= 0 || cantidad >= disponibleParaAgregar}
                    style={[styles.stepBtn, (disponibleParaAgregar <= 0 || cantidad >= disponibleParaAgregar) && { opacity: 0.4 }]}
                  >
                    <Text style={{ fontSize: 18, color: tokens.textPrimary }}>+</Text>
                  </Pressable>
                </View>
                {yaEnCarrito > 0 && disponibleParaAgregar > 0 && (
                  <Text style={{ fontSize: 11.5, color: tokens.textMuted, flex: 1 }}>Ya tienes {yaEnCarrito} en tu carrito</Text>
                )}
              </View>

              {disponibleParaAgregar > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Button size="lg" hero onPress={comprarAhora} loading={comprando}>
                      {`Comprar ahora · ${money(precio * cantidad)}`}
                    </Button>
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Button size="lg" variant="secondary" onPress={agregarCarrito} loading={agregando} icon={<ShoppingCartSimpleIcon size={17} weight="bold" color={tokens.textPrimary} />}>
                      Agregar
                    </Button>
                  </View>
                </View>
              ) : (
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.warnInk, backgroundColor: tokens.warnBg, borderRadius: 10, padding: 10 }}>
                  Ya tienes todo el stock disponible de este producto en tu carrito.
                </Text>
              )}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {!esPropio && (
              <IconButton icon={<HeartIcon size={18} weight={producto.yo_like ? "fill" : "regular"} color={producto.yo_like ? tokens.danger : tokens.textPrimary} />} label="Me gusta" active={!!producto.yo_like} badge={producto.likes_count} onPress={toggleLike} />
            )}
            <IconButton icon={<BookmarkSimpleIcon size={18} weight={producto.yo_guardado ? "fill" : "regular"} color={tokens.textPrimary} />} label="Guardar" active={!!producto.yo_guardado} onPress={toggleGuardar} />
            {!esPropio && <IconButton icon={<ChatCircleIcon size={18} color={tokens.textPrimary} />} label="Preguntar" onPress={preguntar} />}
            <IconButton
              icon={<ShareNetworkIcon size={18} color={tokens.textPrimary} />}
              label="Compartir"
              onPress={() => {
                interaccionesApi.compartir(producto.id).catch(() => {});
                toast.show("¡Compartido!", "success");
              }}
            />
            {!esPropio && <IconButton icon={<FlagIcon size={18} color={tokens.textPrimary} />} label="Reportar" onPress={() => setReportando(true)} />}
          </View>
        </ScrollView>
      )}

      {reportando && producto && <ReportSheet tipo="producto" entidadId={producto.id} entidadNombre={producto.nombre} onClose={() => setReportando(false)} />}
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
  thumbRow: { flexDirection: "row", gap: 8, marginTop: 10, paddingBottom: 2 },
  thumb: { width: 60, height: 60, borderRadius: 10, overflow: "hidden", borderWidth: 2 },
});
