import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { XIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { CATEGORIAS, CATEGORIA_LABEL } from "../../lib/categoryIcons";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "VendedorProductoForm">;

export function VendedorProductoFormScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const productoId = route.params?.id;
  const [producto, setProducto] = useState<Producto | null | undefined>(productoId ? undefined : null);
  const [tiendaId, setTiendaId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioOferta, setPrecioOferta] = useState("");
  const [stock, setStock] = useState("0");
  const [categoria, setCategoria] = useState("comida");
  const [imagen, setImagen] = useState<string | null>(null);
  const [activo, setActivo] = useState(true);
  const [esReel, setEsReel] = useState(false);
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
          setPrecio(String(p.precio));
          setPrecioOferta(p.precio_oferta ? String(p.precio_oferta) : "");
          setStock(String(p.stock));
          setCategoria(p.categoria);
          setImagen(p.imagen);
          setActivo(p.activo !== 0);
        }
      });
    }
  }, [productoId]);

  const subirImagen = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (res.canceled || !res.assets[0].base64) return;
    const mime = res.assets[0].mimeType ?? "image/jpeg";
    setImagen(`data:${mime};base64,${res.assets[0].base64}`);
  };

  const guardar = async () => {
    if (!nombre.trim() || !precio) return toast.show("Nombre y precio son obligatorios.", "warning");
    setGuardando(true);
    try {
      if (producto) {
        await vendedorApi.actualizarProducto({
          producto_id: producto.id,
          nombre,
          descripcion,
          precio: Number(precio),
          precio_oferta: precioOferta ? Number(precioOferta) : undefined,
          quitar_oferta: !precioOferta,
          stock: Number(stock),
          categoria,
          activo: activo ? 1 : 0,
          imagen: imagen && imagen.startsWith("data:") ? imagen : undefined,
        });
        toast.show("Producto actualizado", "success");
      } else {
        if (!tiendaId) return toast.show("Primero crea tu tienda.", "warning");
        await vendedorApi.crearProducto({ tienda_id: tiendaId, nombre, descripcion, precio: Number(precio), precio_oferta: precioOferta ? Number(precioOferta) : undefined, stock: Number(stock), categoria, imagen: imagen ?? undefined, es_reel: esReel });
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
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }}>
        <Pressable onPress={subirImagen} style={[styles.imagePicker, { backgroundColor: tokens.surface2, borderColor: tokens.borderStrong }]}>
          {imagen ? <Image source={{ uri: imagen }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>Subir foto del producto</Text>}
        </Pressable>
        <Input label="Nombre" value={nombre} onChangeText={setNombre} />
        <Input label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Input label="Precio" value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" style={{ flex: 1 }} />
          <Input label="Precio oferta" value={precioOferta} onChangeText={setPrecioOferta} keyboardType="decimal-pad" style={{ flex: 1 }} />
        </View>
        <Input label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" />
        <View>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>Categoría</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIAS.map((c) => (
              <Pressable key={c} onPress={() => setCategoria(c)} style={[styles.catChip, { borderColor: categoria === c ? tokens.cyan : tokens.border, backgroundColor: categoria === c ? tokens.cyanBg : tokens.surface1 }]}>
                <Text style={{ fontSize: 12, color: categoria === c ? tokens.cyan : tokens.textSecondary }}>{CATEGORIA_LABEL[c]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {producto && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Producto visible en la tienda</Text>
            <Switch value={activo} onValueChange={setActivo} trackColor={{ true: tokens.cyan, false: tokens.border }} />
          </View>
        )}
        {!producto && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Publicar también como Reel</Text>
              <Switch value={esReel} onValueChange={setEsReel} trackColor={{ true: tokens.cyan, false: tokens.border }} />
            </View>
            {esReel && (
              <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 6 }}>
                Se mostrará en Reels usando la foto de arriba (todavía no se sube un video aparte).
              </Text>
            )}
          </View>
        )}
        <Button size="lg" onPress={guardar} loading={guardando}>
          {producto ? "Guardar cambios" : "Crear producto"}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  imagePicker: { height: 140, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
