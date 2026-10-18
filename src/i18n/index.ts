import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { appLanguages, languageByCode } from './languages';

const STORAGE_KEY = 'cashflow.language';

const i18n = createInstance();

const deviceLanguage = () => {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return appLanguages.some((l) => l.code === code) ? code : 'en';
};

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(appLanguages.map((l) => [l.code, { mobile: l.strings }])),
  lng: deviceLanguage(),
  fallbackLng: 'en',
  ns: ['mobile'],
  defaultNS: 'mobile',
  interpolation: { escapeValue: false },
  // The strings are bundled, so they are ready on the first render.
  initAsync: false,
});

/** Applies the language chosen in Settings earlier, if any. Call once before the splash screen hides. */
export async function restoreLanguage() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved !== i18n.language && appLanguages.some((l) => l.code === saved)) await i18n.changeLanguage(saved);
  } catch {
    // Storage unavailable: the device language stays.
  }
}

export async function setLanguage(code: string) {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Not saved: the choice lasts until the app closes.
  }
}

/** The current language and its writing direction; re-renders when the language changes. */
export function useLanguage() {
  const { i18n: instance } = useTranslation();
  const language = languageByCode(instance.language);
  return { language, isRTL: language.dir === 'rtl' };
}

export default i18n;
