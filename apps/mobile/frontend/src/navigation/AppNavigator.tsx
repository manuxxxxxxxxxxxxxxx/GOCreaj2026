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
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const { colors } = useTheme();
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
          const icons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Home:    ['home',           'home-outline'],
            Reels:   ['play-circle',    'play-circle-outline'],
            Cart:    ['cart',           'cart-outline'],
            Chats:   ['chatbubbles',    'chatbubbles-outline'],
            Profile: ['person-circle',  'person-circle-outline'],
          };
          const [active, inactive] = icons[route.name];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}      options={{ title: 'Inicio' }} />
      <Tab.Screen name="Reels"   component={ReelsScreen}     options={{ title: 'Reels' }} />
      <Tab.Screen name="Cart"    component={CartScreen}      options={{ title: 'Carrito' }} />
      <Tab.Screen name="Chats"   component={ChatListScreen}  options={{ title: 'Chats' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}   options={{ title: 'Perfil' }} />
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
            {/* Bienvenida solo en la primera instalación — logout no la vuelve a mostrar */}
            {firstLaunch && <Stack.Screen name="Benefits" component={BenefitsSlider} />}
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : !tieneUsername ? (
          <>
            {/* Setup de usuario nuevo: Teléfono → @usuario + foto */}
            {!telefonoVerificado && <Stack.Screen name="OnboardingPhone" component={OnboardingPhoneScreen} />}
            <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
          </>
        ) : (
          <>
            {/* App principal según rol */}
            {usuario.rol === 'admin'      && <Stack.Screen name="Admin"    component={AdminScreen} />}
            {usuario.rol === 'vendedor'   && <Stack.Screen name="Seller"   component={SellerScreen} />}
            {usuario.rol === 'repartidor' && <Stack.Screen name="Driver"   component={DriverScreen} />}
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
