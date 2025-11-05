import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const LanguageContext = createContext({
  language: 'ru',
  changeLanguage: () => {},
  supportedLanguages: ['ru', 'kk', 'en'],
});

export function LanguageProvider({ children, defaultLanguage = 'ru' }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('app_lang') || defaultLanguage;
    } catch {
      return defaultLanguage;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('app_lang', language); } catch {}
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    if (['ru', 'kk', 'en'].includes(lang)) setLanguage(lang);
  }, []);

  const value = useMemo(() => ({
    language,
    changeLanguage,
    supportedLanguages: ['ru', 'kk', 'en'],
  }), [language, changeLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
