import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'app.language';
const SUPPORTED = ['ru', 'en', 'kk'];

const detect = () => {
  const fromLS = localStorage.getItem(STORAGE_KEY);
  if (fromLS && SUPPORTED.includes(fromLS)) return fromLS;
  const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  if (SUPPORTED.includes(nav)) return nav;
  return 'ru';
};

export const LanguageContext = createContext({
  language: 'ru',
  changeLanguage: () => {},
  supportedLanguages: SUPPORTED,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(detect);

  const changeLanguage = (lang) => {
    if (!SUPPORTED.includes(lang)) return;
    setLanguage(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  const value = useMemo(
    () => ({ language, changeLanguage, supportedLanguages: SUPPORTED }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageProvider;
