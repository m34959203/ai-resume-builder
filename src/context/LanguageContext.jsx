// src/context/LanguageContext.jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const SUPPORTED = ['ru', 'kk', 'en'];
const LS_KEY = 'app_lang';

// Нормализация кодов языка: 'kz' → 'kk', 'kk-KZ' → 'kk', 'ru-RU' → 'ru', и т.п.
const NORM_MAP = {
  kz: 'kk',
  'kk-kz': 'kk',
  'ru-ru': 'ru',
  'en-us': 'en',
  'en-gb': 'en',
};

function normLang(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'ru';
  
  // Проверяем прямое совпадение в карте
  if (NORM_MAP[raw]) return NORM_MAP[raw];
  
  // Отсекаем региональную часть (xx-YY → xx)
  const base = raw.split(/[-_]/)[0];
  
  // Проверяем, входит ли базовая часть в список поддерживаемых
  return SUPPORTED.includes(base) ? base : 'ru';
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
      if (stored) {
        return normLang(stored);
      }
      return normLang(defaultLanguage);
    } catch {
      return normLang(defaultLanguage);
    }
  };

  const [language, setLanguage] = useState(getInitial);

  // Сохраняем нормализованный язык в localStorage
  useEffect(() => {
    try { 
      localStorage.setItem(LS_KEY, language); 
    } catch (e) {
      console.warn('Failed to save language to localStorage:', e);
    }
  }, [language]);

  // Слушаем изменения языка в других вкладках
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const onStorage = (e) => {
      if (e.key === LS_KEY && e.newValue) {
        const next = normLang(e.newValue);
        if (next !== language) {
          setLanguage(next);
        }
      }
    };
    
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [language]);

  // Публичный метод смены языка (всегда нормализует вход)
  const changeLanguage = useCallback((code) => {
    const normalized = normLang(code);
    setLanguage(normalized);
  }, []);

  const value = useMemo(() => ({
    language,
    changeLanguage,
    supportedLanguages: SUPPORTED,
  }), [language, changeLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}