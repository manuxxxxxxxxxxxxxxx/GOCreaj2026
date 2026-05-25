import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { NetworkProvider } from '@/context/NetworkContext';
import AppNavigator from '@/navigation/AppNavigator';

function Root() {
  const { isDark } = useTheme();
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
