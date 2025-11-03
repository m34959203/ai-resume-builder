import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales/translations';

/**
 * Хук для работы с переводами
 * @returns {Object} - объект с функциями перевода и текущим языком
 */
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  
  const { language } = context;
  
  /**
   * Получить перевод по ключу
   * @param {string} key - путь к переводу (например, "nav.home" или "builder.personal.fullName")
   * @param {Object} params - параметры для подстановки в строку
   * @returns {string} - переведённый текст
   */
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[language];
    
    // Проходим по вложенным ключам
    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        console.warn(`Translation not found for key: ${key} in language: ${language}`);
        return key; // Возвращаем ключ если перевод не найден
      }
    }
    
    // Если перевод не строка, возвращаем ключ
    if (typeof translation !== 'string') {
      console.warn(`Translation for key: ${key} is not a string in language: ${language}`);
      return key;
    }
    
    // Заменяем параметры в строке (например, {{name}} -> John)
    let result = translation;
    Object.keys(params).forEach(param => {
      const placeholder = new RegExp(`{{${param}}}`, 'g');
      result = result.replace(placeholder, params[param]);
    });
    
    return result;
  };
  
  /**
   * Проверить существование перевода
   * @param {string} key - путь к переводу
   * @returns {boolean}
   */
  const hasTranslation = (key) => {
    const keys = key.split('.');
    let translation = translations[language];
    
    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        return false;
      }
    }
    
    return typeof translation === 'string';
  };
  
  /**
   * Получить все переводы для определённой секции
   * @param {string} section - название секции (например, "nav" или "builder.personal")
   * @returns {Object} - объект с переводами
   */
  const getSection = (section) => {
    const keys = section.split('.');
    let result = translations[language];
    
    for (const k of keys) {
      if (result && typeof result === 'object') {
        result = result[k];
      } else {
        console.warn(`Section not found: ${section} in language: ${language}`);
        return {};
      }
    }
    
    return result || {};
  };
  
  return {
    t,
    language,
    hasTranslation,
    getSection,
    ...context
  };
};