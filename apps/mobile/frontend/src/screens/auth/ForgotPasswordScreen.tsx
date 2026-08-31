import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { authApi, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { AuthHeader } from "../../components/ui/AuthHeader";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [identificador, setIdentificador] = useState("");
  const [codigo, setCodigo] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [loading, setLoading] = useState(false);

  const solicitar = async () => {
    if (!identificador.trim()) return;
    setLoading(true);
    try {
      const r = await authApi.recuperarSolicitar(identificador.trim());
      if (r.codigo_dev) toast.show(`Código de prueba: ${r.codigo_dev}`, "info");
      setStep(2);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo solicitar el código.", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    if (!codigo.trim() || passwordNueva.length < 6) {
      toast.show("Completa el código y una contraseña de al menos 6 caracteres.", "warning");
      return;
    }
    setLoading(true);
    try {
      await authApi.recuperarConfirmar({ identificador: identificador.trim(), codigo: codigo.trim(), password_nueva: passwordNueva });
      toast.show("Contraseña actualizada, ya puedes ingresar", "success");
      navigation.navigate("Login");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthHeader navigation={navigation} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View
            entering={FadeInDown.duration(320)}
            style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
          >
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Recuperar contraseña</Text>
            <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
              {step === 1 ? "Te enviaremos un código a tu correo o teléfono." : "Ingresa el código y tu nueva contraseña."}
            </Text>
            <View style={{ gap: 16, marginTop: 20 }}>
              {step === 1 ? (
                <>
                  <Input label="Usuario, correo o teléfono" value={identificador} onChangeText={setIdentificador} autoCapitalize="none" />
                  <Button size="lg" onPress={solicitar} loading={loading}>
                    Enviar código
                  </Button>
                </>
              ) : (
                <>
                  <Input label="Código de 6 dígitos" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" />
                  <Input label="Nueva contraseña" value={passwordNueva} onChangeText={setPasswordNueva} secureTextEntry placeholder="Mínimo 6 caracteres" />
                  <Button size="lg" onPress={confirmar} loading={loading}>
                    Actualizar contraseña
                  </Button>
                </>
              )}
            </View>
          </Animated.View>
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.footer}>
            <Text style={{ color: tokens.cyan, fontFamily: "Inter_700Bold", fontSize: 13 }}>Volver a ingresar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontSize: 23, fontFamily: "SpaceGrotesk_600SemiBold", marginBottom: 7, letterSpacing: -0.2 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  footer: { alignItems: "center", marginTop: 20 },
});
