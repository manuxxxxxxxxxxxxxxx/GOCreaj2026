import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ColorPalette {
  background: string;
  text: string;
  accent: string;
  accentLight: string;
  contrast: string;
  border: string;
  muted: string;
  danger: string;
  success: string;
  warning: string;
  card: string;
  overlay: string;
  inputBg: string;
}

export const lightColors: ColorPalette = {
  background: '#F3F0FA',
  text: '#111827',
  accent: '#4A6D8C',
  accentLight: 'rgba(74,109,140,0.10)',
  contrast: '#FFFFFF',
  border: '#E2DCEF',
  muted: '#6B7280',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  card: '#FFFFFF',
  overlay: 'rgba(17,17,17,0.50)',
  inputBg: '#FFFFFF',
};

export const darkColors: ColorPalette = {
  background: '#0D1117',
  text: '#F3F4F6',
  accent: '#60A5D8',
  accentLight: 'rgba(96,165,216,0.12)',
  contrast: '#0D1117',
  border: '#21262D',
  muted: '#8B949E',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FCD34D',
  card: '#161B22',
  overlay: 'rgba(0,0,0,0.75)',
  inputBg: '#21262D',
};

interface ThemeCtx {
  isDark: boolean;
  colors: ColorPalette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('svgo_theme').then(v => {
      if (v === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = async (): Promise<void> => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('svgo_theme', next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
