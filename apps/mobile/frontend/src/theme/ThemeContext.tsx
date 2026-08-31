import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTokens, lightTokens, type ThemeTokens } from "./tokens";

type ThemeChoice = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeChoice;
  tokens: ThemeTokens;
  isDark: boolean;
  setTheme: (t: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "gocreaj_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null | undefined>(() => Appearance.getColorScheme());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setThemeState(v);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const setTheme = (t: ThemeChoice) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  };

  const isDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const toggle = () => setTheme(isDark ? "light" : "dark");

  const value = useMemo(() => ({ theme, tokens, isDark, setTheme, toggle }), [theme, tokens, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
