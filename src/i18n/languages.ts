/**
 * The 29 languages, as in the web app's app-languages.ts. Adding one means one entry here
 * and one file in src/locales.
 */
export type TextDirection = 'ltr' | 'rtl';

export interface AppLanguage {
  code: string;
  name: string;
  nativeName: string;
  dir: TextDirection;
  strings: Record<string, unknown>;
}

export const appLanguages: AppLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', strings: require('@/locales/en.json') },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', strings: require('@/locales/ar.json') },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', strings: require('@/locales/bn.json') },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', strings: require('@/locales/de.json') },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', strings: require('@/locales/es.json') },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', strings: require('@/locales/fa.json') },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', strings: require('@/locales/fr.json') },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', strings: require('@/locales/he.json') },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', strings: require('@/locales/hi.json') },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', strings: require('@/locales/id.json') },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', strings: require('@/locales/it.json') },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', strings: require('@/locales/ja.json') },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', strings: require('@/locales/kn.json') },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', strings: require('@/locales/ko.json') },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', strings: require('@/locales/ml.json') },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr', strings: require('@/locales/ms.json') },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr', strings: require('@/locales/ne.json') },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', strings: require('@/locales/nl.json') },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', strings: require('@/locales/pl.json') },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', strings: require('@/locales/pt.json') },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', strings: require('@/locales/ru.json') },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr', strings: require('@/locales/si.json') },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', strings: require('@/locales/ta.json') },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr', strings: require('@/locales/th.json') },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', strings: require('@/locales/tr.json') },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr', strings: require('@/locales/uk.json') },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', strings: require('@/locales/ur.json') },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', strings: require('@/locales/vi.json') },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', strings: require('@/locales/zh.json') },
];

export const languageByCode = (code: string) => appLanguages.find((l) => l.code === code) ?? appLanguages[0];
