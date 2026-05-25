import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { setNetworkOnline, flushOfflineBuffer } from '@/services/api';

interface NetCtx { online: boolean; }
const NetworkContext = createContext<NetCtx>({ online: true });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const slide = useRef(new Animated.Value(-60)).current;
  const { colors } = useTheme();
  const { t } = useLang();

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const isOn = state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(isOn);
      setNetworkOnline(isOn);
      if (isOn) void flushOfflineBuffer();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: online ? -60 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [online, slide]);

  return (
    <NetworkContext.Provider value={{ online }}>
      <View style={{ flex: 1 }}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.banner,
            { backgroundColor: colors.danger, transform: [{ translateY: slide }] },
          ]}
        >
          <Ionicons name="cloud-offline-outline" size={18} color="#FFF" />
          <Text style={styles.bannerTxt}>{t.network.offline}</Text>
        </Animated.View>
      </View>
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetCtx {
  return useContext(NetworkContext);
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 38, paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 8,
  },
  bannerTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
