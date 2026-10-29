import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import { langStore } from '../auth/storage';
import { en } from './en';
import { fr } from './fr';

export type Lang = 'fr' | 'en';

const dictionaries: Record<Lang, Record<string, string>> = { fr, en };

interface I18nValue {
  lang: Lang;
  /** Code de langue pour les dates et les nombres (Intl). */
  locale: string;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang());

  useEffect(() => {
    langStore.load().then((saved) => {
      if (saved === 'fr' || saved === 'en') setLangState(saved);
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    void langStore.save(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let text = dictionaries[lang][key];
      if (text === undefined) return key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, locale: lang === 'fr' ? 'fr-FR' : 'en-GB', setLang, t }),
    [lang, setLang, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans I18nProvider');
  return ctx;
}
