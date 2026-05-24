import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList, TabParamList } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';

import BenefitsSlider from '@/screens/BenefitsSlider';
import AuthScreen from '@/screens/AuthScreen';
import OnboardingPhoneScreen from '@/screens/OnboardingPhoneScreen';
import UsernameSetupScreen from '@/screens/UsernameSetupScreen';
import HomeScreen from '@/screens/HomeScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

// ──────────────────────────────────────────────
// 5to tab — cambia dinámicamente según el rol
// ──────────────────────────────────────────────
function LastTabScreen() {
  const { usuario } = useAuth();
  switch (usuario?.rol) {
    case 'admin':      return <AdminScreen />;
    case 'vendedor':   return <SellerScreen />;
    case 'repartidor': return <DriverScreen />;
    default:           return <ProfileScreen />;
  }
}

type TabIconMap = Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]>;

function MainTabs() {
  const { colors } = useTheme();
  const { usuario } = useAuth();

  const fifthTabMeta: Record<string, { label: string; active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
    admin:      { label: 'Admin',     active: 'shield-checkmark',         inactive: 'shield-checkmark-outline' },
    vendedor:   { label: 'Mi Tienda', active: 'storefront',               inactive: 'storefront-outline' },
    repartidor: { label: 'Entregas',  active: 'bicycle',                  inactive: 'bicycle-outline' },
    comprador:  { label: 'Perfil',    active: 'person-circle',            inactive: 'person-circle-outline' },
  };
  const fMeta = fifthTabMeta[usuario?.rol ?? 'comprador'] ?? fifthTabMeta.comprador;

  const icons: TabIconMap = {
    Home:    ['home',           'home-outline'],
    Reels:   ['play-circle',    'play-circle-outline'],
    Cart:    ['cart',           'cart-outline'],
    Chats:   ['chatbubbles',    'chatbubbles-outline'],
    Profile: [fMeta.active,     fMeta.inactive],
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1 },
        tabBarIcon: ({ color, size, focused }) => {
          const [active, inactive] = icons[route.name] ?? ['help-circle', 'help-circle-outline'];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}      options={{ title: 'Inicio' }} />
      <Tab.Screen name="Reels"   component={ReelsScreen}     options={{ title: 'Reels' }} />
      <Tab.Screen name="Cart"    component={CartScreen}      options={{ title: 'Carrito' }} />
      <Tab.Screen name="Chats"   component={ChatListScreen}  options={{ title: 'Chats' }} />
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
  const { isDark, colors } = useTheme();
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
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        {!usuario ? (
          <>
            {firstLaunch && <Stack.Screen name="Benefits" component={BenefitsSlider} />}
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : !tieneUsername ? (
          <>
            {!telefonoVerificado && <Stack.Screen name="OnboardingPhone" component={OnboardingPhoneScreen} />}
            <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
          </>
        ) : (
          <>
            {/* MainTabs es la pantalla principal — el 5to tab cambia por rol */}
            <Stack.Screen name="Main"         component={MainTabs} />
            <Stack.Screen name="Product"      component={ProductScreen} />
            <Stack.Screen name="Cart"         component={CartScreen} />
            <Stack.Screen name="Tracking"     component={MapTrackingScreen} />
            <Stack.Screen name="Chat"         component={ChatScreen} />
            <Stack.Screen name="BecomeSeller" component={BecomeSellerScreen} />
            <Stack.Screen name="Support"      component={SupportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
