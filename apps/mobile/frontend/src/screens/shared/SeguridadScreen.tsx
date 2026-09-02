import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, DeviceMobileIcon, KeyIcon, ShieldCheckIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi, ApiError } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SessionList } from "../../components/domain/SessionList";

type Props = NativeStackScreenProps<RootStackParamList, "Seguridad">;

export function SeguridadScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Seguridad</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <TelefonoSection />
        <PasswordSection />
        <SectionCard icon={<ShieldCheckIcon size={16} color={tokens.cyan} />} title="Sesiones activas" description="Dispositivos donde tu cuenta ha iniciado sesión.">
          <SessionList limit={5} />
        </SectionCard>
      </ScrollView>
    </View>
  );
}

function SectionCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: description ? 4 : 14 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.cyanBg, alignItems: "center", justifyContent: "center" }}>{icon}</View>
        <Text style={{ fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{title}</Text>
      </View>
      {!!description && <Text style={{ fontSize: 12, color: tokens.textSecondary, marginBottom: 14, paddingLeft: 42 }}>{description}</Text>}
      <View style={{ gap: 14 }}>{children}</View>
    </Card>
  );
}

function TelefonoSection() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  if (!usuario?.telefono) return null;

  const enviarSms = async () => {
    setEnviandoSms(true);
    try {
      const r = await authApi.enviarSms();
      setCodigoEnviado(r.codigo);
      toast.show(`Código de verificación: ${r.codigo} (simulado, no hay proveedor SMS real)`, "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el código.", "error");
    } finally {
      setEnviandoSms(false);
    }
  };

  const verificar = async () => {
    if (!codigo.trim()) return;
    setVerificando(true);
    try {
      const r = await authApi.verificarSms(codigo.trim());
      actualizarUsuarioLocal(r.usuario);
      toast.show("Teléfono verificado", "success");
      setCodigoEnviado(null);
      setCodigo("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <SectionCard icon={<DeviceMobileIcon size={16} color={tokens.cyan} />} title="Verificación de teléfono" description="Un teléfono verificado ayuda a proteger tu cuenta y agiliza el soporte.">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{usuario.telefono}</Text>
          <Text style={{ fontSize: 12, color: usuario.telefono_verificado ? tokens.ok : tokens.textSecondary }}>{usuario.telefono_verificado ? "Verificado" : "Sin verificar"}</Text>
        </View>
        {!usuario.telefono_verificado && (
          <Button size="sm" variant="secondary" onPress={enviarSms} loading={enviandoSms}>
            Verificar
          </Button>
        )}
      </View>
      {codigoEnviado && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <Input label="Código de 6 dígitos" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" style={{ flex: 1 }} />
          <Button size="sm" onPress={verificar} loading={verificando}>
            Confirmar
          </Button>
        </View>
      )}
    </SectionCard>
  );
}

function PasswordSection() {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const toast = useToast();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (usuario?.auth_provider !== "local") return null;

  const guardar = async () => {
    if (passwordNueva.length < 6) return toast.show("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
    if (passwordNueva !== passwordConfirmar) return toast.show("Las contraseñas no coinciden.", "warning");
    setGuardando(true);
    try {
      await authApi.actualizarPerfil({ password_actual: passwordActual, password_nueva: passwordNueva });
      toast.show("Contraseña actualizada", "success");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SectionCard icon={<KeyIcon size={16} color={tokens.cyan} />} title="Contraseña" description="Usa una contraseña que no utilices en otros sitios.">
      <Input label="Contraseña actual" value={passwordActual} onChangeText={setPasswordActual} secureTextEntry />
      <Input label="Contraseña nueva" value={passwordNueva} onChangeText={setPasswordNueva} secureTextEntry />
      <Input label="Confirmar contraseña nueva" value={passwordConfirmar} onChangeText={setPasswordConfirmar} secureTextEntry />
      <Button size="sm" onPress={guardar} loading={guardando} style={{ alignSelf: "flex-start" }}>
        Actualizar contraseña
      </Button>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
