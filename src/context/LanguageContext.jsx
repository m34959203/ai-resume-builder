import React, { createContext, useMemo, useState, useEffect } from 'react';

export const LanguageContext = createContext({
  lang: 'ru',
  setLang: () => {},
});

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ru');

  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
