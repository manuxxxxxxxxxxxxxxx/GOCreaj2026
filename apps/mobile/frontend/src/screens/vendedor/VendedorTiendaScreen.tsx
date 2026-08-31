import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { CaretLeftIcon, CrosshairIcon, StorefrontIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Tienda } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "VendedorTienda">;
const METODOS = ["efectivo", "tarjeta", "paypal"];

export function VendedorTiendaScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tienda, setTienda] = useState<Tienda | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(null);
  const [metodosPago, setMetodosPago] = useState<string[]>(["efectivo"]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    vendedorApi.misTiendas().then((r) => {
      const t = r.tiendas[0] ?? null;
      setTienda(t);
      if (t) {
        setNombre(t.nombre);
        setDescripcion(t.descripcion ?? "");
        setCategoria(t.categoria ?? "");
        setTelefono(t.telefono ?? "");
        setMunicipio(t.municipio);
        setDireccion(t.direccion ?? "");
        setLat(t.lat);
        setLng(t.lng);
        setLogo(t.logo);
        setPortada(t.portada);
        setMetodosPago(t.metodos_pago?.split(",") ?? ["efectivo"]);
      }
    });
  }, []);

  const usarUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return toast.show("Necesitamos permiso de ubicación.", "warning");
    const pos = await Location.getCurrentPositionAsync({});
    setLat(pos.coords.latitude);
    setLng(pos.coords.longitude);
    toast.show("Ubicación capturada", "success");
  };

  const pickImage = async (setter: (v: string) => void) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (res.canceled || !res.assets[0].base64) return;
    setter(`data:${res.assets[0].mimeType ?? "image/jpeg"};base64,${res.assets[0].base64}`);
  };

  const toggleMetodo = (m: string) => setMetodosPago((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const guardar = async () => {
    if (!nombre.trim() || !municipio.trim()) return toast.show("Nombre y municipio son obligatorios.", "warning");
    if (!tienda && (lat === null || lng === null)) return toast.show("Captura la ubicación de tu tienda.", "warning");
    setGuardando(true);
    try {
      if (tienda) {
        await vendedorApi.actualizarTienda({ tienda_id: tienda.id, nombre, descripcion, categoria, telefono, municipio, direccion, lat: lat ?? undefined, lng: lng ?? undefined, logo: logo?.startsWith("data:") ? logo : undefined, portada: portada?.startsWith("data:") ? portada : undefined, metodos_pago: metodosPago });
        toast.show("Tienda actualizada", "success");
      } else {
        await vendedorApi.crearTienda({ nombre, descripcion, categoria, telefono, municipio, direccion, lat: lat!, lng: lng!, logo: logo ?? undefined, portada: portada ?? undefined, metodos_pago: metodosPago });
        toast.show("¡Tienda creada!", "success");
      }
      const r = await vendedorApi.misTiendas();
      setTienda(r.tiendas[0] ?? null);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  if (tienda === undefined) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Skeleton height={200} radius={16} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <StorefrontIcon size={17} color={tokens.textPrimary} />
        <Text style={{ fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{tienda ? "Mi tienda" : "Crea tu tienda"}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={() => pickImage(setPortada)} style={[styles.imgBox, { flex: 1, height: 90, backgroundColor: tokens.surface2, borderColor: tokens.borderStrong }]}>
            {portada ? <Image source={{ uri: portada }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 11, color: tokens.textMuted }}>Portada</Text>}
          </Pressable>
          <Pressable onPress={() => pickImage(setLogo)} style={[styles.imgBox, { width: 90, height: 90, backgroundColor: tokens.surface2, borderColor: tokens.borderStrong }]}>
            {logo ? <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 10.5, color: tokens.textMuted }}>Logo</Text>}
          </Pressable>
        </View>
        <Input label="Nombre de la tienda" value={nombre} onChangeText={setNombre} />
        <Input label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Input label="Categoría" value={categoria} onChangeText={setCategoria} style={{ flex: 1 }} />
          <PhoneInput value={telefono} onChangeText={setTelefono} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Input label="Municipio" value={municipio} onChangeText={setMunicipio} style={{ flex: 1 }} />
          <Input label="Dirección" value={direccion} onChangeText={setDireccion} style={{ flex: 1 }} />
        </View>
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>Ubicación</Text>
            <Button size="sm" variant="secondary" icon={<CrosshairIcon size={13} color={tokens.textPrimary} />} onPress={usarUbicacion}>
              Usar mi ubicación
            </Button>
          </View>
          <Text style={{ fontSize: 12, color: lat ? tokens.ok : tokens.textMuted }}>{lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Sin capturar"}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>Métodos de pago</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {METODOS.map((m) => (
              <Pressable key={m} onPress={() => toggleMetodo(m)} style={[styles.chip, { borderColor: metodosPago.includes(m) ? tokens.cyan : tokens.border, backgroundColor: metodosPago.includes(m) ? tokens.cyanBg : tokens.surface1 }]}>
                <Text style={{ fontSize: 12, color: metodosPago.includes(m) ? tokens.cyan : tokens.textSecondary, textTransform: "capitalize" }}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Button size="lg" onPress={guardar} loading={guardando}>
          {tienda ? "Guardar cambios" : "Crear tienda"}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  imgBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
