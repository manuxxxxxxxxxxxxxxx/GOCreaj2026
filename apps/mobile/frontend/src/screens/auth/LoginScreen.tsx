import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import { EnvelopeSimpleIcon, LockKeyIcon } from "phosphor-react-native";
import type { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { AuthHeader } from "../../components/ui/AuthHeader";
import { GoogleSignInButton } from "../../components/ui/GoogleSignInButton";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const { login, loginSocial } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!identificador.trim() || !password) {
      setError("Completa usuario y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await login(identificador.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (info: { id: string; email?: string; name?: string; idToken: string }) => {
    setGoogleLoading(true);
    try {
      await loginSocial({ provider: "google", id_token: info.idToken });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión con Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthHeader navigation={navigation} showBack={false} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View
            entering={FadeInDown.duration(320)}
            style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
          >
            <Text style={[styles.title, { color: tokens.textPrimary }]}>Bienvenido de nuevo</Text>
            <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>Pide, vende o reparte en SV[Go].</Text>

            <View style={{ gap: 16, marginTop: 20 }}>
              <Input label="Usuario, correo o teléfono" value={identificador} onChangeText={setIdentificador} icon={<EnvelopeSimpleIcon size={18} color={tokens.textMuted} />} autoCapitalize="none" placeholder="ejemplo@dominio.com" />
              <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry icon={<LockKeyIcon size={18} color={tokens.textMuted} />} error={error ?? undefined} placeholder="••••••••" />
              <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={{ alignSelf: "flex-end", marginTop: -8 }}>
                <Text style={{ fontSize: 12.5, color: tokens.cyan }}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
              <Button size="lg" onPress={submit} loading={loading}>
                Ingresar
              </Button>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
                <Text style={{ color: tokens.textMuted, fontSize: 12 }}>o continúa con</Text>
                <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
              </View>

              <GoogleSignInButton loading={googleLoading} onUserInfo={handleGoogle} />
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>¿No tienes cuenta? </Text>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={{ color: tokens.cyan, fontFamily: "Inter_700Bold", fontSize: 13 }}>Crear cuenta</Text>
            </Pressable>
          </View>
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  dividerLine: { flex: 1, height: 1 },
});
