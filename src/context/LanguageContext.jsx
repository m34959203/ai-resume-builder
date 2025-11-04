// src/context/LanguageContext.jsx
import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';

export const SUPPORTED_LANGUAGES = ['ru', 'kk', 'en'];
export const DEFAULT_LANGUAGE = 'ru';

// Поддерживаем оба ключа для совместимости со старым кодом
const STORAGE_KEYS = ['app.lang', 'app_language'];

export const LanguageContext = createContext({
  // Значения по умолчанию — чтобы не падать без провайдера
  lang: DEFAULT_LANGUAGE,
  language: DEFAULT_LANGUAGE,
  setLang: () => {},
  changeLanguage: () => {},
  supportedLanguages: SUPPORTED_LANGUAGES,
  hasProvider: false,
});

export function normalizeLang(raw) {
  const v = String(raw || '').toLowerCase();
  if (!v) return DEFAULT_LANGUAGE;
  if (v === 'kz') return 'kk';
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('kk')) return 'kk';
  if (v.startsWith('en')) return 'en';
  return SUPPORTED_LANGUAGES.includes(v) ? v : DEFAULT_LANGUAGE;
}

function readInitialLang(initialProp) {
  // 1) Язык передан пропсом провайдера
  if (initialProp) return normalizeLang(initialProp);

  // 2) localStorage (оба ключа)
  try {
    for (const k of STORAGE_KEYS) {
      const saved = localStorage.getItem(k);
      if (saved) return normalizeLang(saved);
    }
  } catch {}

  // 3) <html lang="...">
  try {
    const htmlLang = document?.documentElement?.getAttribute('lang');
    if (htmlLang) return normalizeLang(htmlLang);
  } catch {}

  // 4) Язык браузера
  try {
    const nav = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || '';
    if (nav) return normalizeLang(nav);
  } catch {}

  return DEFAULT_LANGUAGE;
}

export const LanguageProvider = ({ children, initialLang }) => {
  const [lang, setLangState] = useState(() => readInitialLang(initialLang));

  const setLang = useCallback((next) => {
    setLangState((prev) => normalizeLang(typeof next === 'function' ? next(prev) : next));
  }, []);

  // Совместимый алиас
  const changeLanguage = setLang;

  // Сохраняем выбор и выставляем <html lang="...">
  useEffect(() => {
    try { STORAGE_KEYS.forEach((k) => localStorage.setItem(k, lang)); } catch {}
    try { document?.documentElement?.setAttribute('lang', lang); } catch {}
  }, [lang]);

  // Синхронизация языка между вкладками
  useEffect(() => {
    const onStorage = (e) => {
      if (STORAGE_KEYS.includes(e.key)) setLangState(normalizeLang(e.newValue));
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      lang,
      language: lang,                   // alias для старого/иного кода
      setLang,
      changeLanguage,                   // alias
      supportedLanguages: SUPPORTED_LANGUAGES,
      hasProvider: true,
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageProvider;
