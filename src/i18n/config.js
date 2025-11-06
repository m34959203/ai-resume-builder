// src/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

/* =========================
 * ЯЗЫКИ
 * ======================= */
export const LANGUAGES = {
  ru: { code: 'ru', name: 'Русский', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  kz: { code: 'kz', name: 'Kazakh',  nativeName: 'Қазақша',  flag: '🇰🇿', dir: 'ltr' },
  en: { code: 'en', name: 'English', nativeName: 'English',  flag: '🇬🇧', dir: 'ltr' },
};

export const DEFAULT_LANGUAGE = 'ru';
export const SUPPORTED_LANGUAGES = ['ru', 'kz', 'en'];

/* =========================
 * НЕЙМСПЕЙСЫ
 * ======================= */
// БАЗОВЫЕ (есть в public/locales/*/)
const CORE_NAMESPACES = ['common', 'builder', 'validation'];
// ОПЦИОНАЛЬНЫЕ (могут отсутствовать сейчас; появятся позже)
const OPTIONAL_NAMESPACES = ['pdf', 'vacancies', 'courses', 'ai'];

export const NAMESPACES = {
  COMMON: 'common',
  BUILDER: 'builder',
  VALIDATION: 'validation',
  PDF: 'pdf',
  VACANCIES: 'vacancies',
  COURSES: 'courses',
  AI: 'ai',
};

/* =========================
 * I18N INIT
 * ======================= */
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // языки
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true, // ru-RU → ru
    load: 'languageOnly',
    cleanCode: true,

    // НЕ подгружаем всё разом — только core.
    // Остальные неймспейсы будут запрошены лениво,
    // когда где-то вызовут useTranslation('pdf') и т.п.
    ns: CORE_NAMESPACES,
    defaultNS: 'common',
    fallbackNS: ['common'],

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      requestOptions: {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'default',
      },
    },

    // порядок определения языка: URL → localStorage → браузер
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
    },

    // В проде используем Suspense (мы обернули <App/> в <Suspense/>)
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },

    debug: import.meta.env.DEV,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (lng, ns, key) => console.warn(`🔍 Missing translation: ${lng}.${ns}.${key}`)
      : undefined,
  })
  .catch((err) => {
    console.error('❌ i18n initialization failed:', err);
  });

/* =========================
 * СОБЫТИЯ
 * ======================= */

// Аккуратно ведём себя с отсутствующими optional-неймспейсами
i18n.on('failedLoading', (lng, ns, msg) => {
  if (OPTIONAL_NAMESPACES.includes(ns)) {
    console.warn(`ℹ️ Optional namespace not found (skipped): ${lng}/${ns}`);
    return;
  }
  console.error(`❌ Failed loading translation: ${lng}/${ns}`, msg);
});

i18n.on('loaded', (loaded) => {
  if (import.meta.env.DEV) {
    console.log('✅ Translations loaded:', loaded);
  }
});

i18n.on('languageChanged', (lng) => {
  try {
    document.documentElement.lang = lng;
    document.documentElement.dir = LANGUAGES[lng]?.dir || 'ltr';
    localStorage.setItem('i18nextLng', lng);
  } catch {}
  if (window.gtag) {
    window.gtag('event', 'language_change', { language: lng });
  }
  console.log(`🌐 Language changed to: ${lng}`);
});

export default i18n;
