import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
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
