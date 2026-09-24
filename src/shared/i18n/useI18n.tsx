import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { getCountry, getLocales } from 'react-native-localize';
import { DEFAULT_LANGUAGE, type AppLanguage } from './languages';
import {
  isSameResolution,
  resolveLanguage,
  type LanguageResolution,
} from './resolveLanguage';
import {
  formatDateTime,
  translate,
  type TranslationKey,
  type TranslationParams,
} from './translate';
import { useLanguageAnalytics } from './useLanguageAnalytics';

interface I18nContextValue {
  language: AppLanguage;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDateTime: (isoString: string) => string;
}

function createContextValue(
  language: AppLanguage,
  region: string | undefined,
): I18nContextValue {
  return {
    language,
    t: (key, params) => translate(language, key, params),
    formatDateTime: isoString => formatDateTime(language, region, isoString),
  };
}

// No provider (e.g. a screen rendered on its own in a test) means English,
// mirroring useTheme's light-palette default.
const I18nContext = createContext<I18nContextValue>(
  createContextValue(DEFAULT_LANGUAGE, undefined),
);

function resolveFromOS(): LanguageResolution {
  return resolveLanguage(getLocales(), getCountry());
}

export function I18nProvider({
  language,
  children,
}: {
  // Test-only override; production never passes this and always follows the
  // OS preferred-locale list via react-native-localize.
  language?: AppLanguage;
  children: React.ReactNode;
}) {
  // Lazy initial state resolves before the first paint — no English flash.
  const [osResolution, setOsResolution] = useState(resolveFromOS);

  // The OS language can change while backgrounded (Android keeps the
  // activity alive via configChanges; iOS relaunches the process instead),
  // so re-resolve on every return to the foreground. Returning the previous
  // state object for an equal resolution skips the re-render entirely.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        return;
      }
      const next = resolveFromOS();
      setOsResolution(previous =>
        isSameResolution(previous, next) ? previous : next,
      );
    });
    return () => subscription.remove();
  }, []);

  const resolution = useMemo<LanguageResolution>(
    () =>
      language === undefined
        ? osResolution
        : { ...osResolution, appLanguage: language },
    [language, osResolution],
  );
  useLanguageAnalytics(resolution);

  const { appLanguage, region } = resolution;
  const value = useMemo(
    () => createContextValue(appLanguage, region),
    [appLanguage, region],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
