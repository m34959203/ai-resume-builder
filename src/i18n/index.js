import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'kk', 'en'],
    ns: ['common', 'builder'],
    defaultNS: 'common',
    backend: {
      // Vite раздаёт из /public как из корня
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },
    load: 'languageOnly',               // чтобы 'kk-KZ' → 'kk'
    nonExplicitSupportedLngs: true,
    keySeparator: '.',                  // ВАЖНО: нужны точечные ключи
    returnNull: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    debug: import.meta?.env?.DEV ?? false
  });

export default i18n;
