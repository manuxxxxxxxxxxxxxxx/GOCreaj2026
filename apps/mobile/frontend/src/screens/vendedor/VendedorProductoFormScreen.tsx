import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { InfinityIcon, XIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import { MultiImagePicker } from "../../components/domain/MultiImagePicker";
import { PriceInput } from "../../components/domain/PriceInput";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { WebFormContainer } from "../../components/ui/WebFormContainer";

const WIDE_BREAKPOINT = 860;
const MAX_NOMBRE_PRODUCTO = 80;
const MAX_DESCRIPCION_PRODUCTO = 500;

type Props = NativeStackScreenProps<RootStackParamList, "VendedorProductoForm">;

export function VendedorProductoFormScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const ancha = Platform.OS === "web" && width >= WIDE_BREAKPOINT;
  const productoId = route.params?.id;
  const [producto, setProducto] = useState<Producto | null | undefined>(productoId ? undefined : null);
  const [tiendaId, setTiendaId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState(0);
  const [precioOferta, setPrecioOferta] = useState(0);
  // Oferta como % de descuento -- alternativa al monto fijo. "20% sobre $10 = $8".
  const [ofertaModo, setOfertaModo] = useState<"monto" | "porcentaje">("monto");
  const [ofertaPorcentaje, setOfertaPorcentaje] = useState("");
  const [stockIlimitado, setStockIlimitado] = useState(false);
  const [stock, setStock] = useState("0");
  const [categoria, setCategoria] = useState("comida");
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    vendedorApi.misTiendas().then((r) => setTiendaId(r.tiendas[0]?.id ?? null));
    if (productoId) {
      vendedorApi.misProductos().then((r) => {
        const p = r.productos.find((x) => x.id === productoId) ?? null;
        setProducto(p);
        if (p) {
          setNombre(p.nombre);
          setDescripcion(p.descripcion ?? "");
          setPrecio(p.precio);
          if (p.oferta_tipo === "porcentaje") {
            setOfertaModo("porcentaje");
            setOfertaPorcentaje(String(p.oferta_valor ?? ""));
            setPrecioOferta(0);
          } else {
            setOfertaModo("monto");
            setPrecioOferta(p.precio_oferta ?? 0);
          }
          setStockIlimitado(!!p.stock_ilimitado);
          setStock(String(p.stock));
          setCategoria(p.categoria);
          setImagenes(p.imagenes && p.imagenes.length ? p.imagenes : p.imagen ? [p.imagen] : []);
          setActivo(p.activo !== 0);
        }
      });
    }
  }, [productoId]);

  const porcentajeNum = Math.min(99, Math.max(0, Number(ofertaPorcentaje) || 0));
  const precioOfertaFinal = ofertaModo === "porcentaje" ? Math.round(precio * (1 - porcentajeNum / 100) * 100) / 100 : precioOferta;
  const hayOferta = ofertaModo === "porcentaje" ? porcentajeNum > 0 : precioOferta > 0;

  const guardar = async () => {
    if (!nombre.trim() || !precio) return toast.show("Nombre y precio son obligatorios.", "warning");
    if (nombre.length > MAX_NOMBRE_PRODUCTO) return toast.show(`El nombre no puede pasar de ${MAX_NOMBRE_PRODUCTO} caracteres.`, "warning");
    if (descripcion.length > MAX_DESCRIPCION_PRODUCTO) return toast.show(`La descripción no puede pasar de ${MAX_DESCRIPCION_PRODUCTO} caracteres.`, "warning");
    if (imagenes.length === 0) return toast.show("Agrega al menos una foto.", "warning");
    if (hayOferta && precioOfertaFinal >= precio) return toast.show("El precio de oferta debe ser menor al precio normal.", "warning");
    setGuardando(true);
    try {
      const ofertaPayload = hayOferta
        ? { precio_oferta: precioOfertaFinal, oferta_tipo: ofertaModo, oferta_valor: ofertaModo === "porcentaje" ? porcentajeNum : precioOfertaFinal }
        : {};
      if (producto) {
        await vendedorApi.actualizarProducto({
          producto_id: producto.id,
          nombre,
          descripcion,
          precio,
          ...ofertaPayload,
          quitar_oferta: !hayOferta,
          stock_ilimitado: stockIlimitado,
          stock: stockIlimitado ? 0 : Number(stock),
          categoria,
          activo: activo ? 1 : 0,
          // Siempre se manda la galería completa (URLs existentes + fotos nuevas en base64)
          // -- así una foto que el vendedor quitó de la lista también se quita al guardar.
          imagenes,
        });
        toast.show("Producto actualizado", "success");
      } else {
        if (!tiendaId) return toast.show("Primero crea tu tienda.", "warning");
        await vendedorApi.crearProducto({
          tienda_id: tiendaId,
          nombre,
          descripcion,
          precio,
          ...ofertaPayload,
          stock_ilimitado: stockIlimitado,
          stock: stockIlimitado ? 0 : Number(stock),
          categoria,
          imagenes,
        });
        toast.show("Producto creado", "success");
      }
      navigation.goBack();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  if (producto === undefined) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Skeleton height={200} radius={16} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={{ flex: 1, fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{producto ? "Editar producto" : "Nuevo producto"}</Text>
        <Pressable onPress={navigation.goBack} style={[styles.closeBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <XIcon size={16} color={tokens.textPrimary} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <WebFormContainer maxWidth={960} style={{ padding: 20, gap: 14 }}>
          <View style={ancha ? { flexDirection: "row", gap: 24 } : { gap: 14 }}>
            <View style={ancha ? { width: 260 } : undefined}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>Fotos (hasta 10)</Text>
              <MultiImagePicker imagenes={imagenes} onChange={setImagenes} />
            </View>
            <View style={{ flex: 1, gap: 14 }}>
              <Input label="Nombre" value={nombre} onChangeText={setNombre} maxLength={MAX_NOMBRE_PRODUCTO} hint={`${nombre.length}/${MAX_NOMBRE_PRODUCTO}`} />
              <Input
                label="Descripción"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                maxLength={MAX_DESCRIPCION_PRODUCTO}
                hint={`${descripcion.length}/${MAX_DESCRIPCION_PRODUCTO}`}
              />
              <PriceInput label="Precio" value={precio} onChange={setPrecio} />

              <View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>Precio de oferta (opcional)</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable
                      onPress={() => setOfertaModo("monto")}
                      style={[styles.ofertaChip, { borderColor: ofertaModo === "monto" ? tokens.cyan : tokens.border, backgroundColor: ofertaModo === "monto" ? tokens.cyanBg : tokens.surface1 }]}
                    >
                      <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: ofertaModo === "monto" ? tokens.cyan : tokens.textSecondary }}>Monto fijo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setOfertaModo("porcentaje")}
                      style={[styles.ofertaChip, { borderColor: ofertaModo === "porcentaje" ? tokens.cyan : tokens.border, backgroundColor: ofertaModo === "porcentaje" ? tokens.cyanBg : tokens.surface1 }]}
                    >
                      <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: ofertaModo === "porcentaje" ? tokens.cyan : tokens.textSecondary }}>% descuento</Text>
                    </Pressable>
                  </View>
                </View>
                {ofertaModo === "monto" ? (
                  <PriceInput label="Precio con oferta" value={precioOferta} onChange={setPrecioOferta} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Input label="% de descuento" value={ofertaPorcentaje} onChangeText={setOfertaPorcentaje} keyboardType="number-pad" placeholder="ej. 20" />
                    </View>
                    {porcentajeNum > 0 && (
                      <Text style={{ fontSize: 12.5, color: tokens.textSecondary, paddingTop: 18 }}>
                        Final: <Text style={{ fontFamily: "IBMPlexMono_500Medium", color: tokens.danger }}>{money(precioOfertaFinal)}</Text>
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>Inventario</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setStockIlimitado(false)}
                style={[styles.stockOpcion, { borderColor: !stockIlimitado ? tokens.cyan : tokens.border, backgroundColor: !stockIlimitado ? tokens.cyanBg : tokens.surface1 }]}
              >
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: !stockIlimitado ? tokens.cyan : tokens.textSecondary }}>Cantidad limitada</Text>
              </Pressable>
              <Pressable
                onPress={() => setStockIlimitado(true)}
                style={[styles.stockOpcion, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderColor: stockIlimitado ? tokens.cyan : tokens.border, backgroundColor: stockIlimitado ? tokens.cyanBg : tokens.surface1 }]}
              >
                <InfinityIcon size={14} color={stockIlimitado ? tokens.cyan : tokens.textSecondary} />
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: stockIlimitado ? tokens.cyan : tokens.textSecondary }}>Stock ilimitado</Text>
              </Pressable>
            </View>
            {!stockIlimitado && <Input label="Cantidad disponible" value={stock} onChangeText={setStock} keyboardType="number-pad" style={{ marginTop: 10 }} />}
          </View>

          <View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>Categoría</Text>
            <CategoryPicker value={categoria} onChange={setCategoria} />
          </View>
          {producto && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Producto visible en la tienda</Text>
              <Switch value={activo} onValueChange={setActivo} trackColor={{ true: tokens.cyan, false: tokens.border }} />
            </View>
          )}
          <Button size="lg" onPress={guardar} loading={guardando}>
            {producto ? "Guardar cambios" : "Crear producto"}
          </Button>
        </WebFormContainer>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stockOpcion: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  ofertaChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
});
