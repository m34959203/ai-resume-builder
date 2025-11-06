import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// ===================================
// ЯЗЫКОВЫЕ КОНСТАНТЫ
// ===================================

export const LANGUAGES = {
  ru: {
    code: 'ru',
    name: 'Русский',
    nativeName: 'Русский',
    flag: '🇷🇺',
    dir: 'ltr'
  },
  kz: {
    code: 'kz',
    name: 'Kazakh',
    nativeName: 'Қазақша',
    flag: '🇰🇿',
    dir: 'ltr'
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    dir: 'ltr'
  }
};

export const DEFAULT_LANGUAGE = 'ru';
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);

// ===================================
// NAMESPACES
// ===================================

export const NAMESPACES = {
  COMMON: 'common',
  BUILDER: 'builder',
  PDF: 'pdf',
  VALIDATION: 'validation',
  VACANCIES: 'vacancies',
  COURSES: 'courses',
  AI: 'ai'
};

// ===================================
// i18n КОНФИГУРАЦИЯ
// ===================================

i18n
  // Загрузка переводов с сервера
  .use(HttpBackend)
  
  // Автоопределение языка
  .use(LanguageDetector)
  
  // React интеграция
  .use(initReactI18next)
  
  // Инициализация
  .init({
    // Язык по умолчанию
    fallbackLng: DEFAULT_LANGUAGE,
    
    // Поддерживаемые языки
    supportedLngs: SUPPORTED_LANGUAGES,
    
    // Не загружать языки вне списка
    load: 'languageOnly',
    
    // Пространства имен
    ns: Object.values(NAMESPACES),
    defaultNS: NAMESPACES.COMMON,
    
    // Backend конфигурация
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      requestOptions: {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'default', // ✅ ИСПРАВЛЕНО: используем браузерный кэш
      },
    },
    
    // Определение языка
    detection: {
      order: [
        'localStorage',
        'cookie',
        'navigator',
        'htmlTag',
        'path',
        'subdomain'
      ],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
      cookieMinutes: 10080, // 7 дней
    },
    
    // React опции
    react: {
      useSuspense: false, // ✅ ИСПРАВЛЕНО: избегаем проблем с async
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },
    
    // Интерполяция
    interpolation: {
      escapeValue: false, // React уже экранирует
      formatSeparator: ',',
    },
    
    // Дебаг (только в dev)
    debug: import.meta.env.DEV,
    
    // Оптимизация
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV 
      ? (lng, ns, key) => console.warn(`🔍 Missing translation: ${lng}.${ns}.${key}`)
      : undefined,
  })
  .catch((err) => {
    console.error('❌ i18n initialization failed:', err);
  });

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================

i18n.on('languageChanged', (lng) => {
  // Обновить HTML атрибуты
  document.documentElement.lang = lng;
  document.documentElement.dir = LANGUAGES[lng]?.dir || 'ltr';
  
  // Сохранить в localStorage
  localStorage.setItem('i18nextLng', lng);
  
  // Аналитика
  if (window.gtag) {
    window.gtag('event', 'language_change', {
      language: lng
    });
  }
  
  console.log(`🌐 Language changed to: ${lng}`);
});

i18n.on('loaded', (loaded) => {
  console.log('✅ Translations loaded:', loaded);
});

i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(`❌ Failed loading translation: ${lng} ${ns}`, msg);
});

export default i18n;