import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ColorPalette {
  background: string;
  surface: string;
  card: string;
  elevated: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  contrast: string;
  border: string;
  borderLight: string;
  muted: string;
  danger: string;
  success: string;
  warning: string;
  overlay: string;
  inputBg: string;
  tabBar: string;
  shadow: string;
}

// ─── MODO OSCURO: superficies azuladas profundas + texto BLANCO ABSOLUTO ───
export const darkColors: ColorPalette = {
  background:    '#0B0F19',
  surface:       '#0D1321',
  card:          '#121B2D',
  elevated:      '#1A2236',
  text:          '#FFFFFF',          // ⚡ BLANCO ABSOLUTO
  textSecondary: '#FFFFFF',          // ⚡ Sin texto opacado: el contraste manda
  accent:        '#3B82F6',
  accentLight:   'rgba(59,130,246,0.14)',
  accentDark:    '#1D4ED8',
  contrast:      '#FFFFFF',
  border:        '#1E293B',
  borderLight:   '#2D3D55',
  muted:         '#94A3B8',
  danger:        '#F87171',
  success:       '#4ADE80',
  warning:       '#FCD34D',
  overlay:       'rgba(0,0,0,0.80)',
  inputBg:       '#1E293B',
  tabBar:        '#0D1321',
  shadow:        '#000000',
};

// ─── MODO CLARO: blanco sofisticado + texto NEGRO ABSOLUTO ────────────────
export const lightColors: ColorPalette = {
  background:    '#F8FAFC',
  surface:       '#FFFFFF',
  card:          '#FFFFFF',
  elevated:      '#F1F5F9',
  text:          '#000000',          // ⚡ NEGRO ABSOLUTO
  textSecondary: '#000000',          // ⚡ Contraste pleno
  accent:        '#2563EB',
  accentLight:   'rgba(37,99,235,0.10)',
  accentDark:    '#1D4ED8',
  contrast:      '#000000',
  border:        '#E2E8F0',
  borderLight:   '#CBD5E1',
  muted:         '#475569',
  danger:        '#DC2626',
  success:       '#16A34A',
  warning:       '#D97706',
  overlay:       'rgba(15,23,42,0.55)',
  inputBg:       '#FFFFFF',
  tabBar:        '#FFFFFF',
  shadow:        '#0F172A',
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
