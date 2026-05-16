// app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { AppNavigator } from '../src/navigation/AppNavigator';

export default function App() {
  const { user, loading } = useAuth();

  // Mientras lee la sesión guardada en AsyncStorage
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  // Si NO hay sesión -> a login
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Si HAY sesión -> mostrar la app con sus tabs
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}