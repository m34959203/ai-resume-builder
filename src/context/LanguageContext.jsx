import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const SUPPORTED = ['ru', 'kk', 'en'];
const LS_KEY = 'app_lang';

// Нормализация кодов языка: 'kz' → 'kk', 'kk-KZ' → 'kk', 'ru-RU' → 'ru', и т.п.
const NORM_MAP = {
  kz: 'kk',
  'kk-kz': 'kk',
  'ru-ru': 'ru',
  'en-us': 'en',
};
function normLang(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'ru';
  const mapped = NORM_MAP[raw] || raw.split(/[-_]/)[0]; // берём базовую часть xx-YY → xx
  return SUPPORTED.includes(mapped) ? mapped : 'ru';
}

export const LanguageContext = createContext({
  language: 'ru',
  changeLanguage: () => {},
  supportedLanguages: SUPPORTED,
});

export function LanguageProvider({ children, defaultLanguage = 'ru' }) {
  const getInitial = () => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return normLang(stored || defaultLanguage);
    } catch {
      return normLang(defaultLanguage);
    }
  };

  const [language, setLanguage] = useState(getInitial);

  // Сохраняем язык в localStorage
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, language); } catch {}
  }, [language]);

  // Слушаем изменения языка в других вкладках
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e) => {
      if (e.key === LS_KEY) {
        const next = normLang(e.newValue);
        if (next && next !== language) setLanguage(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [language]);

  // Публичный метод смены языка (всегда нормализует вход)
  const changeLanguage = useCallback((code) => {
    setLanguage(normLang(code));
  }, []);

  const value = useMemo(() => ({
    language,
    changeLanguage,
    supportedLanguages: SUPPORTED,
  }), [language, changeLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
