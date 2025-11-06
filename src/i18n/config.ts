import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import knCommon from './locales/kn/common.json';
import taCommon from './locales/ta/common.json';
import teCommon from './locales/te/common.json';
import guCommon from './locales/gu/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      hi: { common: hiCommon },
      kn: { common: knCommon },
      ta: { common: taCommon },
      te: { common: teCommon },
      gu: { common: guCommon }
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
