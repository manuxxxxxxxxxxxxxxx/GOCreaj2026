import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { isLoggedIn, getStoredUser, getDashboardRoute } from '../services/authService';
import { Colors } from '../theme/colors';

import LoginScreen          from '../screens/LoginScreen';
import HomeScreen           from '../screens/HomeScreen';
import MarketScreen         from '../screens/MarketScreen';
import CartScreen           from '../screens/CartScreen';
import ChatScreen           from '../screens/ChatScreen';
import DeliveryScreen       from '../screens/DeliveryScreen';
import ReelsScreen          from '../screens/ReelsScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import HistorialScreen      from '../screens/HistorialScreen';
import SellerDashboardScreen from '../screens/SellerDashboardScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import AdminDashboardScreen  from '../screens/AdminDashboardScreen';

export type RootStackParamList = {
  Login:            undefined;
  Home:             undefined;
  Market:           undefined;
  Cart:             undefined;
  Chat:             undefined;
  Delivery:         undefined;
  Reels:            undefined;
  Profile:          undefined;
  Historial:        undefined;
  SellerDashboard:  undefined;
  DriverDashboard:  undefined;
  AdminDashboard:   undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        setInitialRoute('Login');
        return;
      }
      const user = await getStoredUser();
      const route = getDashboardRoute(user.role) as keyof RootStackParamList;
      setInitialRoute(route);
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Login"           component={LoginScreen} />
        <Stack.Screen name="Home"            component={HomeScreen} />
        <Stack.Screen name="Market"          component={MarketScreen} />
        <Stack.Screen name="Cart"            component={CartScreen} />
        <Stack.Screen name="Chat"            component={ChatScreen} />
        <Stack.Screen name="Delivery"        component={DeliveryScreen} />
        <Stack.Screen name="Reels"           component={ReelsScreen} />
        <Stack.Screen name="Profile"         component={ProfileScreen} />
        <Stack.Screen name="Historial"       component={HistorialScreen} />
        <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
        <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
        <Stack.Screen name="AdminDashboard"  component={AdminDashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}
