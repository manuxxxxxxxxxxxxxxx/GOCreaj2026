import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { NetworkProvider } from '@/context/NetworkContext';
import AppNavigator from '@/navigation/AppNavigator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLangAccountSync } from '@/hooks/useLangAccountSync';

function Root() {
  const { isDark } = useTheme();
  const { usuario } = useAuth();
  usePushNotifications(usuario?.id);
  useLangAccountSync();
  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    // Bandera Institucional (ver DESIGN.md) — fuentes activas.
    'Archivo-Bold': require('./assets/fonts/Archivo-Bold.ttf'),
    'Archivo-ExtraBold': require('./assets/fonts/Archivo-ExtraBold.ttf'),
    'HankenGrotesk-Regular': require('./assets/fonts/HankenGrotesk-Regular.ttf'),
    'HankenGrotesk-SemiBold': require('./assets/fonts/HankenGrotesk-SemiBold.ttf'),
    'HankenGrotesk-Bold': require('./assets/fonts/HankenGrotesk-Bold.ttf'),
    'HankenGrotesk-ExtraBold': require('./assets/fonts/HankenGrotesk-ExtraBold.ttf'),
    // Sistema anterior — se mantienen cargadas hasta migrar toda pantalla
    // que aún las referencie directamente (ver docs/redisenio/PROGRESO.md).
    'Sora-Bold': require('./assets/fonts/Sora-Bold.ttf'),
    'Sora-ExtraBold': require('./assets/fonts/Sora-ExtraBold.ttf'),
    'Manrope-Regular': require('./assets/fonts/Manrope-Regular.ttf'),
    'Manrope-SemiBold': require('./assets/fonts/Manrope-SemiBold.ttf'),
    'Manrope-Bold': require('./assets/fonts/Manrope-Bold.ttf'),
    'Manrope-ExtraBold': require('./assets/fonts/Manrope-ExtraBold.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              <NetworkProvider>
                <Root />
              </NetworkProvider>
            </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
