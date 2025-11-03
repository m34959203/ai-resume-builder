import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const STORAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['ru', 'kk', 'en'];
const DEFAULT_LANGUAGE = 'ru';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Попытка загрузить язык из localStorage
    const savedLanguage = localStorage.getItem(STORAGE_KEY);
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // Попытка определить язык браузера
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      return browserLang;
    }
    
    return DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    // Сохранение выбранного языка в localStorage
    localStorage.setItem(STORAGE_KEY, language);
    
    // Установка атрибута lang для HTML документа
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (newLanguage) => {
    if (SUPPORTED_LANGUAGES.includes(newLanguage)) {
      setLanguage(newLanguage);
    } else {
      console.warn(`Неподдерживаемый язык: ${newLanguage}`);
    }
  };

  const value = {
    language,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};