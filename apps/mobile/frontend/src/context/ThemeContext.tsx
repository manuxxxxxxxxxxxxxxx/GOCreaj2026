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
  ctaAccent: string;
  ctaAccentLight: string;
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

// ─── Bandera Institucional (ver DESIGN.md) ─────────────────────────────────
// MODO OSCURO: azul institucional profundo + texto BLANCO ABSOLUTO.
// React Native no soporta backdrop-filter/blur real de forma nativa barata;
// `surface`/`card`/`elevated` van casi opacos (no vidrio) para que el fondo
// ambiental nunca tiña el texto — ver docs/redisenio/PROGRESO.md punto 9
// sobre si el degradado de fondo en mobile debe animarse o quedar estático.
export const darkColors: ColorPalette = {
  background:    '#050B16',
  surface:       '#0A1628',
  card:          '#122544',
  elevated:      '#17304F',
  text:          '#FFFFFF',          // ⚡ BLANCO ABSOLUTO
  textSecondary: '#FFFFFF',          // ⚡ Sin texto opacado: el contraste manda
  accent:        '#5D91EE',
  accentLight:   'rgba(93,145,238,0.14)',
  accentDark:    '#84AAF4',
  ctaAccent:     '#F5B93B',
  ctaAccentLight:'rgba(245,185,59,0.16)',
  contrast:      '#FFFFFF',
  border:        '#24406B',
  borderLight:   '#2D4E80',
  muted:         '#A9B8CE',
  danger:        '#F87171',
  success:       '#34D399',
  warning:       '#FCD34D',
  overlay:       'rgba(0,0,0,0.80)',
  inputBg:       '#122544',
  tabBar:        '#0A1628',
  shadow:        '#000000',
};

// MODO CLARO: blanco azulado sofisticado + texto NEGRO ABSOLUTO.
export const lightColors: ColorPalette = {
  background:    '#F3F6FC',
  surface:       '#FFFFFF',
  card:          '#FFFFFF',
  elevated:      '#EDF2FA',
  text:          '#000000',          // ⚡ NEGRO ABSOLUTO
  textSecondary: '#000000',          // ⚡ Contraste pleno
  accent:        '#1D5FD1',
  accentLight:   'rgba(29,95,209,0.10)',
  accentDark:    '#123F94',
  ctaAccent:     '#F0A202',
  ctaAccentLight:'rgba(240,162,2,0.12)',
  contrast:      '#000000',
  border:        '#DCE4F1',
  borderLight:   '#C8D5E8',
  muted:         '#4A5A73',
  danger:        '#DC2626',
  success:       '#16A34A',
  warning:       '#D97706',
  overlay:       'rgba(11,27,51,0.55)',
  inputBg:       '#FFFFFF',
  tabBar:        '#FFFFFF',
  shadow:        '#0B1B33',
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
