import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { AuthStack } from "./AuthStack";
import { MainStack } from "./MainStack";
import { OnboardingScreen } from "../screens/auth/OnboardingScreen";

export function RootNavigator() {
  const { usuario, cargando, mostrarOnboarding } = useAuth();
  const { tokens } = useTheme();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tokens.bg }}>
        <ActivityIndicator color={tokens.cyan} size="large" />
      </View>
    );
  }

  if (usuario && mostrarOnboarding) return <OnboardingScreen />;

  return usuario ? <MainStack /> : <AuthStack />;
}
