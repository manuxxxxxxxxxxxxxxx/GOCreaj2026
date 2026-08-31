import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { BicycleIcon, CaretLeftIcon, CheckCircleIcon, ClockIcon, StorefrontIcon, UploadSimpleIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { solicitudesApi, ApiError } from "../../lib/api";
import type { SolicitudRol } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";

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
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const [rol, setRol] = useState<"vendedor" | "repartidor" | null>(null);

  useEffect(() => {
    solicitudesApi.misSolicitudes().then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  }, []);

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
        <Skeleton height={120} />
      </View>
    );
  }

  const pendiente = solicitudes.find((s) => s.estado === "pendiente");

  if (pendiente) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {Header}
        <View style={styles.centerMsg}>
          <ClockIcon size={32} color={tokens.warn} />
          <Text style={{ fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 10 }}>Solicitud en revisión</Text>
          <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center", marginTop: 6 }}>
            Tu solicitud para ser {pendiente.rol_solicitado} está siendo revisada. Te avisaremos por chat y notificación.
          </Text>
        </View>
      </View>
    );
  }

  if (!rol) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {Header}
        <View style={{ padding: 20, gap: 14, flexDirection: "row" }}>
          <RoleCard icon={<StorefrontIcon size={24} color={tokens.cyan} />} title="Vendedor" description="Abre tu tienda y vende productos." onPress={() => setRol("vendedor")} />
          <RoleCard icon={<BicycleIcon size={24} color={tokens.cyan} />} title="Repartidor" description="Entrega pedidos y gana por viaje." onPress={() => setRol("repartidor")} />
        </View>
      </View>
    );
  }

  return <SolicitudForm rol={rol} onBack={() => setRol(null)} header={Header} />;
}

function RoleCard({ icon, title, description, onPress }: { icon: React.ReactNode; title: string; description: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.roleCard, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
      {icon}
      <Text style={{ fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 8 }}>{title}</Text>
      <Text style={{ fontSize: 11.5, color: tokens.textSecondary, textAlign: "center", marginTop: 4 }}>{description}</Text>
    </Pressable>
  );
}

function SolicitudForm({ rol, onBack, header }: { rol: "vendedor" | "repartidor"; onBack: () => void; header: React.ReactNode }) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [duiNumero, setDuiNumero] = useState("");
  const [duiFrente, setDuiFrente] = useState<string | null>(null);
  const [duiReverso, setDuiReverso] = useState<string | null>(null);
  const [tipoVehiculo, setTipoVehiculo] = useState("moto");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    if (!nombreCompleto.trim() || !duiNumero.trim() || !duiFrente || !duiReverso) return toast.show("Completa tu nombre, DUI y ambas fotos del DUI.", "warning");
    setEnviando(true);
    try {
      await solicitudesApi.crear({ rol_solicitado: rol, nombre_completo: nombreCompleto, municipio, dui_numero: duiNumero, dui_frente: duiFrente, dui_reverso: duiReverso, tipo_vehiculo: rol === "repartidor" ? tipoVehiculo : undefined });
      setEnviado(true);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        <View style={styles.centerMsg}>
          <ClockIcon size={32} color={tokens.warn} />
          <Text style={{ fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 10 }}>Solicitud enviada</Text>
          <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center", marginTop: 6 }}>Te avisaremos apenas nuestro equipo la revise.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }}>
        <Pressable onPress={onBack}>
          <Text style={{ fontSize: 12, color: tokens.textSecondary }}>← Cambiar rol</Text>
        </Pressable>
        <Input label="Nombre completo" value={nombreCompleto} onChangeText={setNombreCompleto} />
        <Input label="Municipio" value={municipio} onChangeText={setMunicipio} />
        <Input label="Número de DUI" value={duiNumero} onChangeText={setDuiNumero} placeholder="00000000-0" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <FileField label="DUI (frente)" value={duiFrente} onPick={setDuiFrente} />
          <FileField label="DUI (reverso)" value={duiReverso} onPick={setDuiReverso} />
        </View>
        {rol === "repartidor" && (
          <View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 6 }}>Tipo de vehículo</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {["moto", "bicicleta", "carro", "a_pie"].map((v) => (
                <Pressable key={v} onPress={() => setTipoVehiculo(v)} style={[styles.vehChip, { borderColor: tipoVehiculo === v ? tokens.cyan : tokens.border, backgroundColor: tipoVehiculo === v ? tokens.cyanBg : tokens.surface1 }]}>
                  <Text style={{ fontSize: 12, color: tipoVehiculo === v ? tokens.cyan : tokens.textSecondary, textTransform: "capitalize" }}>{v.replace("_", " ")}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <Button size="lg" onPress={enviar} loading={enviando}>
          Enviar solicitud
        </Button>
      </ScrollView>
    </View>
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
  vehChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  fileField: { flexDirection: "row", alignItems: "center", gap: 6, height: 44, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", paddingHorizontal: 12, justifyContent: "center" },
});
