import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const AVAILABLE_LANGUAGES = ['en', 'kk', 'ru'];
const DEFAULT_LANGUAGE = 'ru';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && AVAILABLE_LANGUAGES.includes(savedLang)) {
      return savedLang;
    }
    
    const browserLang = navigator.language.split('-')[0];
    return AVAILABLE_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (lang) => {
    if (AVAILABLE_LANGUAGES.includes(lang)) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, availableLanguages: AVAILABLE_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};