import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang, Translations } from '@/theme/translations';

const STORAGE_KEY = 'svgo_lang';
const LANG_CYCLE: Lang[] = ['es', 'en', 'fr'];
const LANG_LABELS: Record<Lang, string> = { es: 'ES', en: 'EN', fr: 'FR' };
const LANG_NAMES: Record<Lang, string> = { es: 'Español', en: 'English', fr: 'Français' };

interface LangContextValue {
  lang: Lang;
  langLabel: string;
  langName: string;
  t: Translations;
  cambiarIdioma: () => void;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'es' || saved === 'fr') setLangState(saved);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const cambiarIdioma = useCallback(() => {
    const idx = LANG_CYCLE.indexOf(lang);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
    setLang(next);
  }, [lang, setLang]);

  return (
    <LangContext.Provider value={{
      lang,
      langLabel: LANG_LABELS[lang],
      langName: LANG_NAMES[lang],
      t: translations[lang],
      cambiarIdioma,
      setLang,
    }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang debe usarse dentro de LangProvider');
  return ctx;
}
