import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList, TabParamList } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import GuestGate from '@/components/GuestGate';

import BenefitsSlider from '@/screens/BenefitsSlider';
import AuthScreen from '@/screens/AuthScreen';
import RoleChangeBanner from '@/components/RoleChangeBanner';
import IncomingCallBanner from '@/components/IncomingCallBanner';
import OnboardingPhoneScreen from '@/screens/OnboardingPhoneScreen';
import UsernameSetupScreen from '@/screens/UsernameSetupScreen';
import HomeScreen from '@/screens/HomeScreen';
import LocationSelect from '@/screens/LocationSelect';
import ExploreScreen from '@/screens/ExploreScreen';
import PedidosScreen from '@/screens/PedidosScreen';
import MiCuentaScreen from '@/screens/MiCuentaScreen';
import ReelsScreen from '@/screens/ReelsScreen';
import CartScreen from '@/screens/CartScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ProductScreen from '@/screens/ProductScreen';
import BecomeSellerScreen from '@/screens/BecomeSellerScreen';
import AdminScreen from '@/screens/AdminScreen';
import SellerScreen from '@/screens/SellerScreen';
import DriverScreen from '@/screens/DriverScreen';
import MapTrackingScreen from '@/screens/MapTrackingScreen';
import ChatScreen, { ChatListScreen } from '@/screens/ChatScreen';
import SupportScreen from '@/screens/SupportScreen';
import NotificacionesScreen from '@/screens/NotificacionesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

// ── 4° tab — dinámico según rol ────────────────────────────────────────
function LastTabScreen() {
  const { usuario } = useAuth();
  if (!usuario) {
    return (
      <GuestGate
        icon="person-circle-outline"
        title="Inicia sesión para ver tu perfil"
        subtitle="Crea una cuenta o inicia sesión para guardar productos, hacer pedidos y acceder a tu perfil."
      />
    );
  }
  switch (usuario?.rol) {
    case 'admin':      return <AdminScreen />;
    case 'vendedor':   return <SellerScreen />;
    case 'repartidor': return <DriverScreen />;
    default:           return <ProfileScreen />;
  }
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const { usuario } = useAuth();

  const fourthTabMeta: Record<string, {
    label: string;
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }> = {
    admin:      { label: 'Admin',     active: 'shield-checkmark',      inactive: 'shield-checkmark-outline' },
    vendedor:   { label: 'Mi Tienda', active: 'storefront',            inactive: 'storefront-outline' },
    repartidor: { label: 'Entregas',  active: 'bicycle',               inactive: 'bicycle-outline' },
    comprador:  { label: 'Perfil',    active: 'person-circle',         inactive: 'person-circle-outline' },
  };
  const fMeta = fourthTabMeta[usuario?.rol ?? 'comprador'] ?? fourthTabMeta.comprador;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 72,
          paddingBottom: 14,
          paddingTop: 10,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.30 : 0.06,
          shadowRadius: 16,
          elevation: 20,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Home:    ['home',          'home-outline'],
            Explore: ['compass',       'compass-outline'],
            Reels:   ['play-circle',   'play-circle-outline'],
            Pedidos: ['receipt',       'receipt-outline'],
            Chats:   ['chatbubbles',   'chatbubbles-outline'],
            Profile: [fMeta.active,    fMeta.inactive],
          };
          const [active, inactive] = icons[route.name] ?? ['help-circle', 'help-circle-outline'];
          const iconSize = focused ? size + 1 : size;
          if (focused) {
            return (
              <View style={{
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.accentLight,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name={active} size={iconSize} color={color} />
              </View>
            );
          }
          return <Ionicons name={inactive} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Inicio' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explorar' }} />
      <Tab.Screen name="Reels"   component={ReelsScreen}   options={{ title: 'Reels' }} />
      <Tab.Screen name="Pedidos" component={PedidosScreen} options={{ title: 'Pedidos' }} />
      <Tab.Screen name="Chats"   component={ChatListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen
        name="Profile"
        component={LastTabScreen}
        options={{ title: fMeta.label }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { usuario, cargando } = useAuth();
  const { isDark, colors }    = useTheme();
  const [firstLaunch, setFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('svgo_first_launch').then(val => {
      setFirstLaunch(val !== '1');
    });
  }, [usuario]);

  if (cargando || firstLaunch === null) return <LoadingScreen mensaje="Iniciando" />;

  const navTheme = isDark
    ? { ...DarkTheme,    colors: { ...DarkTheme.colors,    background: colors.background, card: colors.card, border: colors.border, text: colors.text, primary: colors.accent, notification: colors.danger } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.card, border: colors.border, text: colors.text, primary: colors.accent, notification: colors.danger } };

  const telefonoVerificado = (usuario?.telefono_verificado ?? 0) === 1;
  const tieneUsername      = !!usuario?.username;

  return (
    <NavigationContainer theme={navTheme}>
      {/* Banner global de notificación de cambio de rol (cuando admin aprueba) */}
      <RoleChangeBanner />
      {/* Banner global de llamada entrante (top toast, no pantalla completa) */}
      {usuario && <IncomingCallBanner />}
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        {usuario && !tieneUsername ? (
          // Registro recién creado: forzar onboarding antes de soltarlo a la app.
          <>
            {!telefonoVerificado && <Stack.Screen name="OnboardingPhone" component={OnboardingPhoneScreen} />}
            <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
          </>
        ) : (
          // Invitado O usuario autenticado completo: mismo set de pantallas.
          // Home/Explore/Reels son de navegación pública; Chats/Perfil/Carrito/Pedidos
          // se auto-protegen por dentro (GuestGate) y redirigen a "Auth" si hace falta.
          <>
            {firstLaunch && !usuario && <Stack.Screen name="Benefits" component={BenefitsSlider} />}
            <Stack.Screen name="Main"         component={MainTabs} />
            <Stack.Screen name="Auth"         component={AuthScreen} />
            <Stack.Screen name="Location"     component={LocationSelect} />
            <Stack.Screen name="MiCuenta"     component={MiCuentaScreen} />
            <Stack.Screen name="Product"      component={ProductScreen} />
            <Stack.Screen name="Cart"         component={CartScreen} />
            <Stack.Screen name="Tracking"     component={MapTrackingScreen} />
            <Stack.Screen name="Chat"         component={ChatScreen} />
            <Stack.Screen name="BecomeSeller" component={BecomeSellerScreen} />
            <Stack.Screen name="Support"      component={SupportScreen} />
            <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
