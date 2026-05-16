// src/navigation/AppNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ✅ IMPORTS CORREGIDOS según los exports reales de tu proyecto:
//   Home y Chat usan `export default`
//   Reels, Explorador y Perfil usan `export` con nombre
import ChatScreen from '../screens/Chat';
import { ExploreScreen } from '../screens/Explorador';
import HomeScreen from '../screens/Home';
import { ProfileScreen } from '../screens/Perfil';
import { ReelsScreen } from '../screens/Reels';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',    label: 'Inicio',  icon: '🏠' },
  { name: 'Reels',   label: 'Reels',   icon: '▶️' },
  { name: 'Explore', label: 'Explorar', icon: '🔍' },
  { name: 'Chat',    label: 'Chat',    icon: '💬' },
  { name: 'Profile', label: 'Perfil',  icon: '👤' },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes.map((route: any, i: number) => {
        const focused = state.index === i;
        const tab = TABS[i];
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={s.tabItem}
            activeOpacity={0.7}
          >
            {focused && <View style={s.activeBar} />}
            <View style={[s.iconWrap, focused && s.iconWrapActive]}>
              <Text style={s.tabIcon}>{tab.icon}</Text>
              {route.name === 'Chat' && (
                <View style={s.chatBadge}>
                  <Text style={s.chatBadgeTxt}>3</Text>
                </View>
              )}
            </View>
            <Text style={[s.tabLabel, focused && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Reels"   component={ReelsScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Chat"    component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  activeBar: { position: 'absolute', top: -6, width: 28, height: 3, backgroundColor: '#059669', borderRadius: 999 },
  iconWrap: { width: 40, height: 36, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconWrapActive: { backgroundColor: '#ecfdf5' },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', marginTop: 1 },
  tabLabelActive: { color: '#059669', fontWeight: '700' },
  chatBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', borderRadius: 999, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  chatBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '900' },
});