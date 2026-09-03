import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { CaretLeftIcon, CaretRightIcon, CheckIcon, CreditCardIcon, CrosshairIcon, EyeIcon, MagnifyingGlassIcon, MapPinLineIcon, MoneyIcon, PaypalLogoIcon, StorefrontIcon, XIcon, type IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import type { Tienda } from "../../lib/types";
import { geocodificarInverso, buscarDireccion, type ResultadoBusquedaDireccion } from "../../lib/geocoding";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Skeleton } from "../../components/ui/Skeleton";
import { WebMapView } from "../../components/ui/WebMapView";
import { LoadingOverlay } from "../../components/ui/LoadingOverlay";
import { WebFormContainer } from "../../components/ui/WebFormContainer";
import { ScreenReveal } from "../../components/ui/Motion";
import { MultiCategoryPicker } from "../../components/domain/MultiCategoryPicker";
import { MunicipioPicker } from "../../components/domain/MunicipioPicker";
import { CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";

type Props = NativeStackScreenProps<RootStackParamList, "VendedorTienda">;
const METODOS: { key: string; label: string; icon: ComponentType<IconProps> }[] = [
  { key: "efectivo", label: "Efectivo", icon: MoneyIcon },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCardIcon },
  { key: "paypal", label: "PayPal", icon: PaypalLogoIcon },
];
const SAN_SALVADOR: [number, number] = [-89.2182, 13.6929];
const MAX_NOMBRE_TIENDA = 50;
const MAX_DESCRIPCION_TIENDA = 400;
const SUGERENCIAS_DIRECCION_BASE = ["Colonia Centro", "Barrio El Centro", "Residencial Las Flores", "Zona Rosa", "Reparto San José"];

const STEPS = [
  { label: "Tienda", subtitle: "Fotos y datos básicos" },
  { label: "Categorías", subtitle: "¿Qué vende tu tienda?" },
  { label: "Ubicación", subtitle: "¿Dónde te encuentran?" },
  { label: "Revisión", subtitle: "Pago y confirmación" },
];

export function VendedorTiendaScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tienda, setTienda] = useState<Tienda | null | undefined>(undefined);
  const [step, setStep] = useState(0);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [portada, setPortada] = useState<string | null>(null);
  const [metodosPago, setMetodosPago] = useState<string[]>(["efectivo"]);
  const [guardando, setGuardando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [busquedaMapa, setBusquedaMapa] = useState("");
  const [resultadosMapa, setResultadosMapa] = useState<ResultadoBusquedaDireccion[] | null>(null);
  const [buscandoMapa, setBuscandoMapa] = useState(false);

  useEffect(() => {
    vendedorApi.misTiendas().then((r) => {
      const t = r.tiendas[0] ?? null;
      setTienda(t);
      if (t) {
        setNombre(t.nombre);
        setDescripcion(t.descripcion ?? "");
        setCategorias(t.categoria ? t.categoria.split(",").filter(Boolean) : []);
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

  // Búsqueda de dirección con debounce -- espera a que el usuario pare de teclear antes
  // de golpear Nominatim, para no mandar una consulta por cada letra. Se sesga con el
  // municipio elegido para que las sugerencias caigan dentro de la zona correcta.
  useEffect(() => {
    if (busquedaMapa.trim().length < 3) {
      setResultadosMapa(null);
      return;
    }
    setBuscandoMapa(true);
    const consulta = municipio ? `${busquedaMapa}, ${municipio}, El Salvador` : busquedaMapa;
    const t = setTimeout(() => {
      buscarDireccion(consulta)
        .then(setResultadosMapa)
        .catch(() => setResultadosMapa([]))
        .finally(() => setBuscandoMapa(false));
    }, 500);
    return () => clearTimeout(t);
  }, [busquedaMapa, municipio]);

  // Sugerencias de dirección formateadas en base al municipio elegido -- fallback simple
  // (colonia/barrio genérico + municipio) para cuando el vendedor todavía no ha buscado nada.
  const sugerenciasDireccion = useMemo(() => {
    if (!municipio) return [];
    return SUGERENCIAS_DIRECCION_BASE.map((s) => `${s}, ${municipio}`);
  }, [municipio]);

  const aplicarUbicacion = async (coordenada: [number, number], datos?: { direccion?: string; municipio?: string }) => {
    setLat(coordenada[1]);
    setLng(coordenada[0]);
    if (datos?.direccion || datos?.municipio) {
      if (datos.direccion) setDireccion(datos.direccion);
      if (datos.municipio) setMunicipio(datos.municipio);
      return;
    }
    setUbicando(true);
    try {
      const r = await geocodificarInverso(coordenada[1], coordenada[0]);
      if (r.direccion) setDireccion(r.direccion);
      if (r.municipio) setMunicipio(r.municipio);
      toast.show("Ubicación detectada", "success");
    } catch {
      toast.show("No se pudo detectar la calle — puedes escribirla manualmente.", "warning");
    } finally {
      setUbicando(false);
    }
  };

  const elegirResultadoBusqueda = (r: ResultadoBusquedaDireccion) => {
    aplicarUbicacion([r.lng, r.lat], { direccion: r.direccion, municipio: r.municipio });
    setBusquedaMapa("");
    setResultadosMapa(null);
  };

  const usarUbicacion = async () => {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return toast.show("Necesitamos permiso de ubicación.", "warning");
      const pos = await Location.getCurrentPositionAsync({});
      await aplicarUbicacion([pos.coords.longitude, pos.coords.latitude]);
    } catch {
      toast.show("No se pudo obtener tu ubicación.", "error");
    } finally {
      setLocalizando(false);
    }
  };

  const pickImage = async (setter: (v: string) => void) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (res.canceled || !res.assets[0].base64) return;
    setter(`data:${res.assets[0].mimeType ?? "image/jpeg"};base64,${res.assets[0].base64}`);
  };

  const toggleMetodo = (m: string) => setMetodosPago((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const validarPaso = (s: number): string | null => {
    if (s === 0 && !nombre.trim()) return "Ponle un nombre a tu tienda.";
    if (s === 1 && categorias.length === 0) return "Elige al menos una categoría.";
    if (s === 2) {
      if (!municipio.trim() || !direccion.trim()) return "Completa municipio y dirección.";
      if (!tienda && (lat === null || lng === null)) return "Ubica tu tienda en el mapa.";
    }
    return null;
  };

  const irSiguiente = () => {
    const error = validarPaso(step);
    if (error) return toast.show(error, "warning");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const guardar = async () => {
    for (let s = 0; s <= 2; s++) {
      const error = validarPaso(s);
      if (error) {
        setStep(s);
        return toast.show(error, "warning");
      }
    }
    const categoria = categorias.join(",");
    setGuardando(true);
    try {
      if (tienda) {
        await vendedorApi.actualizarTienda({
          tienda_id: tienda.id,
          nombre,
          descripcion,
          categoria,
          telefono,
          municipio,
          direccion,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          logo: logo?.startsWith("data:") ? logo : undefined,
          portada: portada?.startsWith("data:") ? portada : undefined,
          metodos_pago: metodosPago,
        });
        toast.show("Tienda actualizada", "success");
      } else {
        await vendedorApi.crearTienda({ nombre, descripcion, categoria, telefono, municipio, direccion, lat: lat!, lng: lng!, logo: logo ?? undefined, portada: portada ?? undefined, metodos_pago: metodosPago });
        toast.show("¡Tienda creada!", "success");
      }
      const r = await vendedorApi.misTiendas();
      setTienda(r.tiendas[0] ?? null);
      navigation.goBack();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const loadingMessages = useMemo(
    () =>
      tienda
        ? ["Guardando los cambios...", "Actualizando tu catálogo...", "Ya casi..."]
        : ["Creando tu tienda...", "Configurando tu ubicación...", "Preparando tu catálogo...", "¡Ya casi está lista!"],
    [tienda]
  );

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
        <Pressable onPress={() => (step === 0 ? navigation.goBack() : setStep((s) => s - 1))} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{tienda ? "Mi tienda" : "Crea tu tienda"}</Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>{STEPS[step].subtitle}</Text>
        </View>
        {tienda && (
          <Pressable
            onPress={() => navigation.navigate("StoreDetail", { id: tienda.id })}
            accessibilityLabel="Vista previa de mi tienda"
            style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}
          >
            <EyeIcon size={16} color={tokens.textPrimary} />
          </Pressable>
        )}
      </View>

      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <View key={s.label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={{ flex: i === 0 ? 0 : 1, height: 2, backgroundColor: i <= step ? tokens.cyan : tokens.border }} />
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: i < step ? tokens.cyan : i === step ? tokens.cyanBg : tokens.surface2, borderColor: i <= step ? tokens.cyan : tokens.border },
                ]}
              >
                {i < step ? <CheckIcon size={11} weight="bold" color={tokens.cyanInk} /> : <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: i === step ? tokens.cyan : tokens.textMuted }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: i === STEPS.length - 1 ? 0 : 1, height: 2, backgroundColor: i < step ? tokens.cyan : tokens.border }} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: i === step ? tokens.textPrimary : tokens.textMuted }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <WebFormContainer maxWidth={760} style={{ padding: 20, gap: 14 }}>
          <ScreenReveal key={step} style={{ gap: 14 }}>
            {step === 0 && (
              <>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Pressable onPress={() => pickImage(setPortada)} style={[styles.imgBox, { height: 90, backgroundColor: tokens.surface2, borderColor: tokens.borderStrong }]}>
                      {portada ? <Image source={{ uri: portada }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 11, color: tokens.textMuted }}>Portada</Text>}
                    </Pressable>
                    {portada && (
                      <Pressable onPress={() => setPortada(null)} accessibilityLabel="Eliminar portada" style={[styles.removeImgBtn, { backgroundColor: tokens.danger }]}>
                        <XIcon size={11} weight="bold" color="#fff" />
                      </Pressable>
                    )}
                  </View>
                  <View style={{ width: 90 }}>
                    <Pressable onPress={() => pickImage(setLogo)} style={[styles.imgBox, { width: 90, height: 90, backgroundColor: tokens.surface2, borderColor: tokens.borderStrong }]}>
                      {logo ? <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 10.5, color: tokens.textMuted }}>Logo</Text>}
                    </Pressable>
                    {logo && (
                      <Pressable onPress={() => setLogo(null)} accessibilityLabel="Eliminar logo" style={[styles.removeImgBtn, { backgroundColor: tokens.danger }]}>
                        <XIcon size={11} weight="bold" color="#fff" />
                      </Pressable>
                    )}
                  </View>
                </View>
                <Input label="Nombre de la tienda" value={nombre} onChangeText={setNombre} maxLength={MAX_NOMBRE_TIENDA} hint={`${nombre.length}/${MAX_NOMBRE_TIENDA}`} />
                <Input label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline maxLength={MAX_DESCRIPCION_TIENDA} hint={`${descripcion.length}/${MAX_DESCRIPCION_TIENDA}`} />
                <PhoneInput value={telefono} onChangeText={setTelefono} />
              </>
            )}

            {step === 1 && <MultiCategoryPicker value={categorias} onChange={setCategorias} />}

            {step === 2 && (
              <>
                <View>
                  <Input
                    label="Buscar dirección"
                    value={busquedaMapa}
                    onChangeText={setBusquedaMapa}
                    placeholder="Escribe una calle, colonia o municipio..."
                    icon={<MagnifyingGlassIcon size={16} color={tokens.textMuted} />}
                  />
                  {resultadosMapa && resultadosMapa.length > 0 && (
                    <View style={[styles.resultados, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                      {resultadosMapa.map((r, i) => (
                        <Pressable
                          key={`${r.lat}-${r.lng}`}
                          onPress={() => elegirResultadoBusqueda(r)}
                          style={[styles.resultadoRow, i < resultadosMapa.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
                        >
                          <MapPinLineIcon size={14} color={tokens.textMuted} />
                          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: tokens.textSecondary }}>{r.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {buscandoMapa && <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 6 }}>Buscando...</Text>}
                </View>

                <View>
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>O toca el mapa para ubicar tu tienda</Text>
                  <View style={{ height: 220, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" }}>
                    <WebMapView
                      center={lat !== null && lng !== null ? [lng, lat] : SAN_SALVADOR}
                      zoom={lat !== null ? 16 : 12}
                      onPress={(c) => aplicarUbicacion(c)}
                      markers={lat !== null && lng !== null ? [{ id: "tienda", coordinate: [lng!, lat!], color: tokens.cyan }] : []}
                    />
                    <Pressable
                      onPress={usarUbicacion}
                      style={[styles.crosshairBtn, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
                    >
                      <CrosshairIcon size={16} color={localizando ? tokens.textMuted : tokens.cyan} />
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>
                    {ubicando ? "Detectando la calle…" : "El municipio y la dirección se llenan solos — puedes corregirlos abajo."}
                  </Text>
                </View>

                <MunicipioPicker value={municipio} onChange={setMunicipio} />
                <Input label="Dirección" value={direccion} onChangeText={setDireccion} placeholder={municipio ? `ej. Colonia Centro, ${municipio}` : "Elige un municipio primero"} />
                {sugerenciasDireccion.length > 0 && !direccion && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -6 }}>
                    {sugerenciasDireccion.map((s) => (
                      <Pressable key={s} onPress={() => setDireccion(s)} style={[styles.sugerenciaChip, { borderColor: tokens.border, backgroundColor: tokens.surface2 }]}>
                        <Text style={{ fontSize: 11, color: tokens.textSecondary }}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <View>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 10 }}>Métodos de pago</Text>
                  <View style={{ flexDirection: "row", gap: 18 }}>
                    {METODOS.map(({ key, label, icon: MetodoIcon }) => {
                      const active = metodosPago.includes(key);
                      return (
                        <Pressable key={key} onPress={() => toggleMetodo(key)} style={{ alignItems: "center", gap: 7 }}>
                          <View style={[styles.metodoCirculo, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface2 }]}>
                            <MetodoIcon size={22} weight={active ? "fill" : "regular"} color={active ? tokens.cyan : tokens.textMuted} />
                          </View>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: active ? tokens.cyan : tokens.textSecondary }}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={[styles.resumen, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                  <View style={styles.resumenPortada}>
                    {portada ? <Image source={{ uri: portada }} style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.surface2 }]} />}
                    <View style={[styles.resumenLogo, { borderColor: tokens.surface1, backgroundColor: tokens.surface2 }]}>
                      {logo ? <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} /> : <StorefrontIcon size={18} color={tokens.textMuted} />}
                    </View>
                  </View>
                  <View style={{ alignItems: "center", paddingTop: 30, paddingHorizontal: 14, paddingBottom: 16 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{nombre || "Nombre de tu tienda"}</Text>
                    {(municipio || direccion) && (
                      <Text numberOfLines={1} style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 3 }}>{[direccion, municipio].filter(Boolean).join(", ")}</Text>
                    )}
                    {!!descripcion && (
                      <Text numberOfLines={3} style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 8, textAlign: "center", lineHeight: 17 }}>{descripcion}</Text>
                    )}
                    {categorias.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 10, justifyContent: "center" }}>
                        {categorias.slice(0, 4).map((c) => {
                          const color = categoriaColor(c);
                          const CatIcon = categoriaIcon(c);
                          return (
                            <View key={c} style={[styles.categoriaPill, { backgroundColor: `${color}29` }]}>
                              <CatIcon size={10} weight="fill" color={color} />
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color }}>{CATEGORIA_LABEL[c as Categoria] ?? c}</Text>
                            </View>
                          );
                        })}
                        {categorias.length > 4 && <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: tokens.textMuted, alignSelf: "center" }}>+{categorias.length - 4}</Text>}
                      </View>
                    )}
                    {metodosPago.length > 0 && (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        {METODOS.filter((m) => metodosPago.includes(m.key)).map(({ key, label, icon: MetodoIcon }) => (
                          <View key={key} accessibilityLabel={label} style={[styles.metodoResumenCirculo, { backgroundColor: tokens.cyanBg }]}>
                            <MetodoIcon size={13} weight="fill" color={tokens.cyan} />
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScreenReveal>
        </WebFormContainer>
      </ScrollView>

      <WebFormContainer maxWidth={760} style={[styles.footer, { backgroundColor: tokens.bg, borderTopColor: tokens.border }]}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {step > 0 && (
            <Button variant="secondary" size="lg" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
              Atrás
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button size="lg" icon={<CaretRightIcon size={15} color={tokens.cyanInk} />} onPress={irSiguiente} style={{ flex: 1 }}>
              Siguiente
            </Button>
          ) : (
            <Button size="lg" onPress={guardar} loading={guardando} style={{ flex: 1 }}>
              {tienda ? "Guardar cambios" : "Crear tienda"}
            </Button>
          )}
        </View>
      </WebFormContainer>

      {guardando && <LoadingOverlay messages={loadingMessages} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 14, gap: 4 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  imgBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  removeImgBtn: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  sugerenciaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  metodoCirculo: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  crosshairBtn: { position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  resultados: { marginTop: 6, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  resultadoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  resumen: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  resumenPortada: { height: 80, position: "relative" },
  resumenLogo: { position: "absolute", left: "50%", bottom: -26, marginLeft: -28, width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  categoriaPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metodoResumenCirculo: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  footer: { padding: 16, paddingBottom: 20, borderTopWidth: 1 },
});
