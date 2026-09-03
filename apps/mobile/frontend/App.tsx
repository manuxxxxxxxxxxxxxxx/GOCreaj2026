import "./global.css";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { colorScheme as nativewindColorScheme } from "nativewind";
import { useFonts as useSpaceGrotesk, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { useFonts as useInter, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts as useIBMPlexMono, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { ToastProvider } from "./src/context/ToastContext";
import { CallProvider } from "./src/context/CallContext";
import { AmbientPageBackground } from "./src/components/ui/AmbientPageBackground";
import { CallOverlay } from "./src/components/domain/chat/CallOverlay";
import { RootNavigator } from "./src/navigation/RootNavigator";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const { tokens, isDark } = useTheme();

  useEffect(() => {
    nativewindColorScheme.set(isDark ? "dark" : "light");
  }, [isDark]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), background: "transparent", card: tokens.surface1, border: tokens.border, primary: tokens.cyan, text: tokens.textPrimary },
  };

  return (
    <View style={{ flex: 1 }}>
      <AmbientPageBackground />
      <NavigationContainer theme={navTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <CallProvider>
                <RootNavigator />
                <CallOverlay />
              </CallProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [fontsSpaceGrotesk] = useSpaceGrotesk({ SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const [fontsInter] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [fontsMono] = useIBMPlexMono({ IBMPlexMono_500Medium });
  const fontsLoaded = fontsSpaceGrotesk && fontsInter && fontsMono;

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) onLayoutRootView();
  }, [fontsLoaded, onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
