import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { ArrowLeftIcon, CameraIcon, CaretDownIcon, CheckCircleIcon, IdentificationCardIcon, MapPinIcon, ShieldCheckIcon } from "phosphor-react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi, municipiosApi, ApiError } from "../../lib/api";
import type { Municipio } from "../../lib/types";
import { useTheme } from "../../theme/ThemeContext";
import { AmbientPageBackground } from "../../components/ui/AmbientPageBackground";
import { Avatar } from "../../components/ui/Avatar";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const STEPS_CON_USUARIO = ["Usuario", "Permisos", "Ubicación"] as const;
const STEPS_SIN_USUARIO = ["Permisos", "Ubicación"] as const;

// Municipios más buscados -- para acceso rápido con un toque, arriba del resto que se
// confirma expandiendo su departamento. No hay ninguna columna de "popularidad" en el
// catálogo, así que esta lista va fija en el cliente.
const POPULARES = ["San Salvador", "Soyapango", "Santa Ana", "Santa Tecla", "Mejicanos", "Apopa"];
const DEPTO_PRIORITARIO = "San Salvador";

/** Distancia en línea recta (km) -- mismo cálculo que usa la versión web para encontrar
 * el municipio más cercano a las coordenadas del GPS, sin llamada extra al servidor. */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Onboarding post-registro: username + foto (solo cuentas nuevas sin username), permiso de
 * ubicación y confirmar municipio. */
export function OnboardingScreen() {
  const { usuario, usernameSugerido, actualizarUsuarioLocal, cerrarOnboarding } = useAuth();
  const toast = useToast();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const necesitaUsuario = !usuario?.username;
  const STEPS = necesitaUsuario ? STEPS_CON_USUARIO : STEPS_SIN_USUARIO;
  const offset = necesitaUsuario ? 1 : 0;

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(usernameSugerido ?? "");
  const [foto, setFoto] = useState<string | null>(null);
  const [subiendoUsuario, setSubiendoUsuario] = useState(false);

  const [permisoEstado, setPermisoEstado] = useState<"idle" | "pidiendo" | "concedido" | "denegado">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [municipio, setMunicipio] = useState(usuario?.municipio ?? "");
  const [deptoAbierto, setDeptoAbierto] = useState<string | null>(null);
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);

  useEffect(() => {
    municipiosApi.catalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  const municipiosPorDepto = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    // El departamento de San Salvador va primero (es el más conocido/poblado); el resto
    // queda alfabético, igual que antes.
    return Array.from(grupos.entries()).sort((a, b) => {
      if (a[0] === DEPTO_PRIORITARIO) return -1;
      if (b[0] === DEPTO_PRIORITARIO) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [municipios]);

  const municipioObj = useMemo(() => municipios?.find((m) => m.nombre === municipio) ?? null, [municipios, municipio]);

  const irA = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));

  const elegirFoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled || !res.assets[0].base64) return;
    setFoto(`data:${res.assets[0].mimeType ?? "image/jpeg"};base64,${res.assets[0].base64}`);
  };

  const guardarUsuario = async (saltar: boolean) => {
    setSubiendoUsuario(true);
    try {
      const data: { username?: string; foto_perfil?: string } = {};
      if (!saltar && username.trim()) data.username = username.trim();
      if (foto) data.foto_perfil = foto;
      if (Object.keys(data).length > 0) {
        const r = await authApi.actualizarPerfil(data);
        actualizarUsuarioLocal(r.usuario);
      }
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar tu usuario.", "error");
      setSubiendoUsuario(false);
      return;
    }
    setSubiendoUsuario(false);
    irA(1);
  };

  const elegirMunicipio = (m: Municipio) => {
    setMunicipio(m.nombre);
    setDeptoAbierto(m.departamento);
  };

  const elegirPopular = (nombre: string) => {
    const m = municipios?.find((x) => x.nombre === nombre);
    if (m) elegirMunicipio(m);
    else setMunicipio(nombre);
  };

  const pedirPermiso = async () => {
    setPermisoEstado("pidiendo");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermisoEstado("denegado");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      if (municipios && municipios.length > 0) {
        const masCercano = municipios.reduce((mejor, m) => (distanciaKm(c.lat, c.lng, m.lat, m.lng) < distanciaKm(c.lat, c.lng, mejor.lat, mejor.lng) ? m : mejor));
        elegirMunicipio(masCercano);
      }
      setPermisoEstado("concedido");
      setTimeout(() => irA(offset + 1), 700);
    } catch {
      setPermisoEstado("denegado");
    }
  };

  const finalizar = async () => {
    if (!municipio) return;
    setGuardandoUbicacion(true);
    try {
      await authApi.actualizarUbicacion({ municipio, lat: coords?.lat, lng: coords?.lng });
      toast.show("¡Todo listo!", "success");
      cerrarOnboarding();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar tu ubicación.", "error");
    } finally {
      setGuardandoUbicacion(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <AmbientPageBackground />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: insets.top + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={() => irA(step - 1)}
            disabled={step === 0}
            accessibilityLabel="Volver al paso anterior"
            style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border, opacity: step === 0 ? 0 : 1 }]}
          >
            <ArrowLeftIcon size={16} color={tokens.textSecondary} />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 6, flex: 1 }}>
            {STEPS.map((s, i) => (
              <View key={s} style={{ flex: 1 }}>
                <View style={[styles.progressTrack, { backgroundColor: tokens.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: tokens.cyan, width: i < step ? "100%" : i === step ? "50%" : "0%" }]} />
                </View>
                <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: i <= step ? tokens.cyan : tokens.textMuted, marginTop: 4, textAlign: "center" }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          {necesitaUsuario && step === 0 && (
            <Animated.View key="usuario" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
              <View style={[styles.iconBadge, { backgroundColor: tokens.cyanBg }]}>
                <IdentificationCardIcon size={22} color={tokens.cyan} weight="bold" />
              </View>
              <Text style={[styles.title, { color: tokens.textPrimary }]}>Elige tu usuario</Text>
              <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>Así te van a encontrar los demás en SV[Go]. Te sugerimos uno, pero puedes cambiarlo.</Text>

              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <View>
                  <Avatar nombre={usuario?.nombre ?? ""} foto={foto ?? usuario?.foto_perfil ?? null} size={76} />
                  <Pressable onPress={elegirFoto} style={[styles.camBtn, { backgroundColor: tokens.cyan, borderColor: tokens.surface1 }]}>
                    <CameraIcon size={14} weight="bold" color={tokens.cyanInk} />
                  </Pressable>
                </View>
              </View>

              <Input
                label="Nombre de usuario"
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="usuario123"
                hint="Solo letras, números y guion bajo."
                autoCapitalize="none"
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                <Button variant="secondary" style={{ flex: 1 }} onPress={() => guardarUsuario(true)} disabled={subiendoUsuario}>
                  Omitir
                </Button>
                <Button style={{ flex: 1 }} loading={subiendoUsuario} onPress={() => guardarUsuario(false)}>
                  Continuar
                </Button>
              </View>
            </Animated.View>
          )}

          {step === offset + 0 && (
            <Animated.View key="perm" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
              <View style={[styles.iconBadge, { backgroundColor: tokens.cyanBg }]}>
                <ShieldCheckIcon size={22} color={tokens.cyan} weight="bold" />
              </View>
              <Text style={[styles.title, { color: tokens.textPrimary }]}>Permite tu ubicación</Text>
              <Text style={[styles.subtitle, { color: tokens.textSecondary, marginBottom: 24 }]}>Así te mostramos tiendas cercanas y calculamos tiempos de entrega más precisos.</Text>

              <View style={{ alignItems: "center", gap: 14, paddingVertical: 20 }}>
                {permisoEstado === "concedido" ? (
                  <PermisoConcedido />
                ) : permisoEstado === "pidiendo" ? (
                  <View style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}>
                    <ActivityRing />
                  </View>
                ) : (
                  <MapPinIcon size={56} color={tokens.textMuted} />
                )}
                {permisoEstado === "denegado" && (
                  <Text style={{ fontSize: 12, color: tokens.warn, textAlign: "center" }}>No se pudo obtener tu ubicación. Puedes elegirla manualmente en el siguiente paso.</Text>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Button variant="secondary" style={{ flex: 1 }} onPress={() => irA(offset + 1)}>
                  Ahora no
                </Button>
                <Button style={{ flex: 1 }} loading={permisoEstado === "pidiendo"} onPress={pedirPermiso}>
                  Permitir ubicación
                </Button>
              </View>
            </Animated.View>
          )}

          {step === offset + 1 && (
            <Animated.View key="ubi" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
              <View style={[styles.iconBadge, { backgroundColor: tokens.cyanBg }]}>
                <MapPinIcon size={22} color={tokens.cyan} weight="bold" />
              </View>
              <Text style={[styles.title, { color: tokens.textPrimary }]}>Confirma tu zona</Text>
              <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>Usamos tu municipio para mostrarte tiendas y calcular envíos.</Text>

              {municipio && (
                <View style={[styles.detected, { backgroundColor: tokens.okBg }]}>
                  <CheckCircleIcon size={18} weight="fill" color={tokens.ok} />
                  <View>
                    <Text style={{ fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{municipio}</Text>
                    {municipioObj && <Text style={{ fontSize: 11.5, color: tokens.textSecondary }}>{municipioObj.departamento}</Text>}
                  </View>
                </View>
              )}

              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Más buscadas</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                {POPULARES.map((nombre) => {
                  const activo = municipio === nombre;
                  return (
                    <Pressable key={nombre} onPress={() => elegirPopular(nombre)} style={[styles.muniChip, { borderColor: activo ? tokens.cyan : tokens.border, backgroundColor: activo ? tokens.cyanBg : tokens.surface2 }]}>
                      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: activo ? tokens.cyan : tokens.textPrimary }}>{nombre}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>O confirma tu ubicación</Text>
              <View style={{ gap: 8, marginBottom: 20 }}>
                {municipiosPorDepto.map(([depto, ms]) => {
                  const abierto = deptoAbierto === depto;
                  return (
                    <View key={depto} style={[styles.deptoCard, { borderColor: tokens.border, backgroundColor: tokens.surface2 }]}>
                      <Pressable onPress={() => setDeptoAbierto(abierto ? null : depto)} style={styles.deptoHeader}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{depto}</Text>
                        <CaretDownIcon size={14} color={tokens.textMuted} style={{ transform: [{ rotate: abierto ? "180deg" : "0deg" }] }} />
                      </Pressable>
                      {abierto && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingBottom: 12 }}>
                          {ms.map((m) => {
                            const activo = municipio === m.nombre;
                            return (
                              <Pressable key={m.id} onPress={() => elegirMunicipio(m)} style={[styles.muniChip, { borderColor: activo ? tokens.cyan : tokens.border, backgroundColor: activo ? tokens.cyanBg : tokens.surface1 }]}>
                                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: activo ? tokens.cyan : tokens.textSecondary }}>{m.nombre}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {municipio ? (
                <Button fullWidth size="lg" loading={guardandoUbicacion} onPress={finalizar}>
                  Empezar a explorar
                </Button>
              ) : (
                <Button variant="secondary" fullWidth size="lg" onPress={cerrarOnboarding}>
                  Omitir
                </Button>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PermisoConcedido() {
  const { tokens } = useTheme();
  const scale = useSharedValue(0.5);
  scale.value = withTiming(1, { duration: 350 });
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <CheckCircleIcon size={56} weight="fill" color={tokens.ok} />
    </Animated.View>
  );
}

function ActivityRing() {
  const { tokens } = useTheme();
  const rotate = useSharedValue(0);
  rotate.value = withRepeat(withSequence(withTiming(360, { duration: 900 })), -1, false);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  return <Animated.View style={[{ width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: tokens.border, borderTopColor: tokens.cyan }, style]} />;
}

const styles = StyleSheet.create({
  backBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 4, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, minHeight: 340 },
  iconBadge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", marginBottom: 6 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 20 },
  camBtn: { position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  muniChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  detected: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18, padding: 12, borderRadius: 12 },
  deptoCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  deptoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
});
