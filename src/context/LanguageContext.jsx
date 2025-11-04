// src/context/LanguageContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

export const SUPPORTED_LANGUAGES = ['ru', 'kk', 'en'];
export const DEFAULT_LANGUAGE = 'ru';

// Храним под обоими старыми/новыми ключами, чтобы не потерять выбор у пользователя
const STORAGE_KEYS = ['app.lang', 'app_language'];

// Безопасный дефолт, чтобы потребители контекста не падали даже без провайдера
export const LanguageContext = createContext({
  lang: DEFAULT_LANGUAGE,
  language: DEFAULT_LANGUAGE,
  setLang: () => {},
  changeLanguage: () => {},
  supportedLanguages: SUPPORTED_LANGUAGES,
  hasProvider: false,
});

// Нормализация кодов языка (kk/kz → kk и т.д.)
export function normalizeLang(raw) {
  const v = String(raw || '').toLowerCase();
  if (v === 'kz') return 'kk';
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('kk') || v === 'kz') return 'kk';
  if (v.startsWith('en')) return 'en';
  return SUPPORTED_LANGUAGES.includes(v) ? v : DEFAULT_LANGUAGE;
}

function readInitialLang(initial) {
  if (initial) return normalizeLang(initial);

  // 1) localStorage (любой из ключей)
  try {
    for (const k of STORAGE_KEYS) {
      const saved = localStorage.getItem(k);
      if (saved) return normalizeLang(saved);
    }
  } catch {}

  // 2) <html lang="...">
  try {
    const htmlLang = document?.documentElement?.getAttribute?.('lang');
    if (htmlLang) return normalizeLang(htmlLang);
  } catch {}

  // 3) язык браузера
  try {
    const nav = navigator?.language || navigator?.userLanguage;
    if (nav) return normalizeLang(nav);
  } catch {}

  return DEFAULT_LANGUAGE;
}

// Базовый компонент провайдера (ниже экспортируем и как default, и как named)
function LanguageProviderBase({ children, initialLang }) {
  const [lang, setLangState] = useState(() => readInitialLang(initialLang));

  const setLang = useCallback((next) => {
    setLangState((prev) =>
      normalizeLang(typeof next === 'function' ? next(prev) : next)
    );
  }, []);

  // Алиас под старый API
  const changeLanguage = setLang;

  // Сохраняем выбор и проставляем <html lang="...">
  useEffect(() => {
    try {
      STORAGE_KEYS.forEach((k) => localStorage.setItem(k, lang));
    } catch {}
    try {
      document?.documentElement?.setAttribute('lang', lang);
    } catch {}
  }, [lang]);

  // Синхронизация между вкладками
  useEffect(() => {
    const onStorage = (e) => {
      if (STORAGE_KEYS.includes(e.key)) {
        setLangState(normalizeLang(e.newValue));
      }
    };
    window?.addEventListener?.('storage', onStorage);
    return () => window?.removeEventListener?.('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      language: lang,
      setLang,
      changeLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      hasProvider: true,
    }),
    [lang, setLang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ✅ Экспортируем в обоих вариантах:
// - default:   import LanguageProvider from '...'
// - named:     import { LanguageProvider } from '...'
export const LanguageProvider = LanguageProviderBase;
export default LanguageProviderBase;
