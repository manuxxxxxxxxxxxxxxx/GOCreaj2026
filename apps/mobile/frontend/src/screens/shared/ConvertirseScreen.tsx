import { cloneElement, isValidElement, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { BicycleIcon, CaretLeftIcon, CarIcon, CheckCircleIcon, ClockIcon, StorefrontIcon, UploadSimpleIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemeTokens } from "../../theme/tokens";
import { useToast } from "../../context/ToastContext";
import { solicitudesApi, ApiError } from "../../lib/api";
import type { SolicitudRol } from "../../lib/types";
import { formatDui } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { MunicipioPicker } from "../../components/domain/MunicipioPicker";
import { useAuth } from "../../context/AuthContext";

const VEHICULOS: { key: string; label: string; Icon: typeof BicycleIcon }[] = [
  { key: "moto", label: "Moto", Icon: BicycleIcon },
  { key: "carro", label: "Carro", Icon: CarIcon },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ROLE_META: Record<"vendedor" | "repartidor", { accent: (t: ThemeTokens) => string; bg: (t: ThemeTokens) => string }> = {
  vendedor: { accent: (t) => t.violet, bg: (t) => t.violetBg },
  repartidor: { accent: (t) => t.coral, bg: (t) => t.coralBg },
};

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const { tokens } = useTheme();
  const steps = ["Elegir rol", "Tus datos", "Enviado"];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", flex: i < steps.length - 1 ? 0 : undefined, gap: 8 }}>
            <View style={[styles.stepDot, { backgroundColor: done || active ? tokens.cyan : tokens.surface2 }]}>
              {done ? <CheckCircleIcon size={13} weight="fill" color={tokens.cyanInk} /> : <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: done || active ? tokens.cyanInk : tokens.textMuted }}>{n}</Text>}
            </View>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: active ? tokens.textPrimary : tokens.textMuted }}>{label}</Text>
            {i < steps.length - 1 && <View style={{ width: 18, height: 1, backgroundColor: tokens.border, marginLeft: 4 }} />}
          </View>
        );
      })}
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Convertirse">;

async function pickBase64(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, base64: true });
  if (res.canceled || !res.assets[0].base64) return null;
  const mime = res.assets[0].mimeType ?? "image/jpeg";
  return `data:${mime};base64,${res.assets[0].base64}`;
}

export function ConvertirseScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const [rol, setRol] = useState<"vendedor" | "repartidor" | null>(null);

  useEffect(() => {
    solicitudesApi.misSolicitudes().then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  }, []);

  // Un usuario que ya es vendedor/repartidor no debería poder "convertirse" de nuevo --
  // por si llega aquí por deep-link en vez de por el menú (que ya oculta la entrada).
  useEffect(() => {
    if (usuario && usuario.rol !== "comprador") navigation.goBack();
  }, [usuario, navigation]);

  if (usuario && usuario.rol !== "comprador") return null;

  const Header = (
    <View style={styles.header}>
      <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
        <CaretLeftIcon size={16} color={tokens.textPrimary} />
      </Pressable>
      <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Convertirse en socio</Text>
    </View>
  );

  if (solicitudes === null) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {Header}
        <View style={{ paddingHorizontal: 20 }}>
          <Skeleton height={120} />
        </View>
      </View>
    );
  }

  const pendiente = solicitudes.find((s) => s.estado === "pendiente");
  const step: 1 | 2 | 3 = pendiente ? 3 : rol ? 2 : 1;

  if (pendiente) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {Header}
        <StepIndicator step={3} />
        <Animated.View key="pendiente" entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(200)} style={styles.centerMsg}>
          <ClockPulse />
          <Text style={{ fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 10 }}>Solicitud en revisión</Text>
          <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center", marginTop: 6 }}>
            Tu solicitud para ser {pendiente.rol_solicitado} está siendo revisada. Te avisaremos por chat y notificación.
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (!rol) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {Header}
        <StepIndicator step={step} />
        <Animated.View key="elegir" entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(200)} style={{ padding: 20, gap: 14, flexDirection: "row" }}>
          <RoleCard rolKey="vendedor" icon={<StorefrontIcon size={26} weight="duotone" />} title="Vendedor" description="Abre tu tienda y vende productos." onPress={() => setRol("vendedor")} />
          <RoleCard rolKey="repartidor" icon={<BicycleIcon size={26} weight="duotone" />} title="Repartidor" description="Entrega pedidos y gana por viaje." onPress={() => setRol("repartidor")} />
        </Animated.View>
      </View>
    );
  }

  return <SolicitudForm rol={rol} step={step} onBack={() => setRol(null)} header={Header} />;
}

function ClockPulse() {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ width: 68, height: 68, borderRadius: 34, backgroundColor: tokens.warnBg, alignItems: "center", justifyContent: "center" }, style]}>
      <ClockIcon size={30} weight="duotone" color={tokens.warn} />
    </Animated.View>
  );
}

function RoleCard({ rolKey, icon, title, description, onPress }: { rolKey: "vendedor" | "repartidor"; icon: React.ReactNode; title: string; description: string; onPress: () => void }) {
  const { tokens } = useTheme();
  const meta = ROLE_META[rolKey];
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.96, { duration: 100 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 150 }))}
      style={[animStyle, styles.roleCard, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
    >
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: meta.bg(tokens), alignItems: "center", justifyContent: "center" }}>
        {isValidElement(icon) ? cloneElement(icon as React.ReactElement<{ color?: string }>, { color: meta.accent(tokens) }) : icon}
      </View>
      <Text style={{ fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 8 }}>{title}</Text>
      <Text style={{ fontSize: 11.5, color: tokens.textSecondary, textAlign: "center", marginTop: 4 }}>{description}</Text>
    </AnimatedPressable>
  );
}

function SolicitudForm({ rol, step, onBack, header }: { rol: "vendedor" | "repartidor"; step: 1 | 2 | 3; onBack: () => void; header: React.ReactNode }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [duiNumero, setDuiNumero] = useState("");
  const [duiFrente, setDuiFrente] = useState<string | null>(null);
  const [duiReverso, setDuiReverso] = useState<string | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [fotoNegocio, setFotoNegocio] = useState<string | null>(null);
  const [tipoVehiculo, setTipoVehiculo] = useState("moto");
  const [vehiculoModelo, setVehiculoModelo] = useState("");
  const [vehiculoPlaca, setVehiculoPlaca] = useState("");
  const [licenciaNumero, setLicenciaNumero] = useState("");
  const [licenciaFrente, setLicenciaFrente] = useState<string | null>(null);
  const [licenciaReverso, setLicenciaReverso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    if (!nombreCompleto.trim() || !duiNumero.trim() || !duiFrente || !duiReverso) return toast.show("Completa tu nombre, DUI y ambas fotos del DUI.", "warning");
    if (duiNumero.replace(/\D/g, "").length !== 9) return toast.show("El DUI debe tener 9 dígitos, formato 00000000-0.", "warning");
    if (rol === "repartidor" && (!vehiculoModelo.trim() || !vehiculoPlaca.trim() || !licenciaNumero.trim() || !licenciaFrente || !licenciaReverso)) {
      return toast.show("Completa el modelo, la placa, la licencia de conducir y sus fotos.", "warning");
    }
    setEnviando(true);
    try {
      await solicitudesApi.crear({
        rol_solicitado: rol,
        nombre_completo: nombreCompleto,
        municipio,
        dui_numero: duiNumero,
        dui_frente: duiFrente,
        dui_reverso: duiReverso,
        nombre_negocio: rol === "vendedor" ? nombreNegocio : undefined,
        foto_negocio: rol === "vendedor" && fotoNegocio ? fotoNegocio : undefined,
        licencia_frente: rol === "repartidor" && licenciaFrente ? licenciaFrente : undefined,
        licencia_reverso: rol === "repartidor" && licenciaReverso ? licenciaReverso : undefined,
        tipo_vehiculo: rol === "repartidor" ? tipoVehiculo : undefined,
        vehiculo_modelo: rol === "repartidor" ? vehiculoModelo : undefined,
        vehiculo_placa: rol === "repartidor" ? vehiculoPlaca : undefined,
        licencia_numero: rol === "repartidor" ? licenciaNumero : undefined,
      });
      setEnviado(true);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {header}
        <StepIndicator step={3} />
        <Animated.View key="enviado" entering={FadeInRight.duration(280)} style={styles.centerMsg}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: tokens.okBg, alignItems: "center", justifyContent: "center" }}>
            <CheckCircleIcon size={32} weight="fill" color={tokens.ok} />
          </View>
          <Text style={{ fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 10 }}>Solicitud enviada</Text>
          <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center", marginTop: 6 }}>Te avisaremos apenas nuestro equipo la revise.</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top}>
      {header}
      <StepIndicator step={step} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack}>
          <Text style={{ fontSize: 12, color: tokens.textSecondary }}>← Cambiar rol</Text>
        </Pressable>
        <Input label="Nombre completo" value={nombreCompleto} onChangeText={setNombreCompleto} />
        <MunicipioPicker value={municipio} onChange={setMunicipio} />
        <Input label="Número de DUI" value={duiNumero} onChangeText={(t) => setDuiNumero(formatDui(t))} placeholder="00000000-0" maxLength={10} keyboardType="number-pad" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <FileField label="DUI (frente)" value={duiFrente} onPick={setDuiFrente} />
          <FileField label="DUI (reverso)" value={duiReverso} onPick={setDuiReverso} />
        </View>
        {rol === "vendedor" && (
          <>
            <Input label="Nombre del negocio" value={nombreNegocio} onChangeText={setNombreNegocio} />
            <FileField label="Foto del negocio (opcional)" value={fotoNegocio} onPick={setFotoNegocio} />
          </>
        )}
        {rol === "repartidor" && (
          <>
            <View>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 6 }}>Tipo de vehículo</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {VEHICULOS.map(({ key, label, Icon }) => (
                  <Pressable key={key} onPress={() => setTipoVehiculo(key)} style={[styles.vehChip, { borderColor: tipoVehiculo === key ? tokens.cyan : tokens.border, backgroundColor: tipoVehiculo === key ? tokens.cyanBg : tokens.surface1 }]}>
                    <Icon size={15} weight={tipoVehiculo === key ? "fill" : "regular"} color={tipoVehiculo === key ? tokens.cyan : tokens.textSecondary} />
                    <Text style={{ fontSize: 12.5, color: tipoVehiculo === key ? tokens.cyan : tokens.textSecondary }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Input label="Modelo del vehículo" value={vehiculoModelo} onChangeText={setVehiculoModelo} placeholder="Ej. Yamaha FZ 2020" />
            <Input label="Placa" value={vehiculoPlaca} onChangeText={(t) => setVehiculoPlaca(t.toUpperCase())} placeholder="P123-456" autoCapitalize="characters" />
            <Input label="Número de licencia de conducir" value={licenciaNumero} onChangeText={setLicenciaNumero} placeholder="12345678" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <FileField label="Licencia (frente)" value={licenciaFrente} onPick={setLicenciaFrente} />
              <FileField label="Licencia (reverso)" value={licenciaReverso} onPick={setLicenciaReverso} />
            </View>
          </>
        )}
        <Button size="lg" onPress={enviar} loading={enviando}>
          Enviar solicitud
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FileField({ label, value, onPick }: { label: string; value: string | null; onPick: (b64: string) => void }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 6 }}>{label}</Text>
      <Pressable
        onPress={async () => {
          const b64 = await pickBase64();
          if (b64) onPick(b64);
        }}
        style={[styles.fileField, { borderColor: value ? tokens.ok : tokens.borderStrong }]}
      >
        {value ? <CheckCircleIcon size={16} weight="fill" color={tokens.ok} /> : <UploadSimpleIcon size={16} color={tokens.textMuted} />}
        <Text style={{ fontSize: 12, color: value ? tokens.ok : tokens.textMuted }}>{value ? "Lista" : "Subir"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  centerMsg: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  roleCard: { flex: 1, alignItems: "center", padding: 20, borderRadius: 18, borderWidth: 1 },
  vehChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  fileField: { flexDirection: "row", alignItems: "center", gap: 6, height: 44, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", paddingHorizontal: 12, justifyContent: "center" },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
