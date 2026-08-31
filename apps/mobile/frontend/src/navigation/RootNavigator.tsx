import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { AuthStack } from "./AuthStack";
import { MainStack } from "./MainStack";

export function RootNavigator() {
  const { usuario, cargando } = useAuth();
  const { tokens } = useTheme();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tokens.bg }}>
        <ActivityIndicator color={tokens.cyan} size="large" />
      </View>
    );
  }

  return usuario ? <MainStack /> : <AuthStack />;
}
