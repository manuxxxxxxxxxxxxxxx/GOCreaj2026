import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "./types";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { AmbientPageBackground } from "../components/ui/AmbientPageBackground";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Fondo montado una sola vez para las 3 pantallas de auth (Login/Register/
 * ForgotPassword) -- antes cada pantalla montaba su propio GlowBackground,
 * lo que causaba que el fondo "cambiara" al navegar entre ellas y no volviera
 * a su estado original. Las pantallas ya declaraban contentStyle transparent
 * para pintar sobre este fondo compartido. Usa AmbientPageBackground (el mismo
 * degradado radial de 3 manchas que el `--bg-page-image` de la web en oscuro,
 * plano en claro) en vez del glow local -- pedido explícito: mismo fondo que
 * la web, sin el watermark de El Salvador. */
export function AuthStack() {
  return (
    <View style={{ flex: 1 }}>
      <AmbientPageBackground />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: false, contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </View>
  );
}
