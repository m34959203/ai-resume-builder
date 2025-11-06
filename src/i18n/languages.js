/**
 * Языковые утилиты
 */

import i18n, { LANGUAGES, SUPPORTED_LANGUAGES } from './config';

/**
 * Получить текущий язык
 */
export const getCurrentLanguage = () => {
  return i18n.language || 'ru';
};

/**
 * Получить информацию о языке
 */
export const getLanguageInfo = (code) => {
  return LANGUAGES[code] || LANGUAGES.ru;
};

/**
 * Проверить поддержку языка
 */
export const isLanguageSupported = (code) => {
  return SUPPORTED_LANGUAGES.includes(code);
};

/**
 * Изменить язык
 */
export const changeLanguage = async (code) => {
  if (!isLanguageSupported(code)) {
    console.warn(`Language ${code} is not supported`);
    return false;
  }
  
  try {
    await i18n.changeLanguage(code);
    return true;
  } catch (error) {
    console.error('Failed to change language:', error);
    return false;
  }
};

/**
 * Получить список всех языков
 */
export const getAllLanguages = () => {
  return Object.values(LANGUAGES);
};

/**
 * Получить направление текста (LTR/RTL)
 */
export const getTextDirection = (code) => {
  const lang = code || getCurrentLanguage();
  return LANGUAGES[lang]?.dir || 'ltr';
};

/**
 * Форматирование даты для текущего языка
 */
export const formatDate = (date, options = {}) => {
  const locale = getCurrentLanguage();
  const localeMap = {
    ru: 'ru-RU',
    kz: 'kk-KZ',
    en: 'en-US'
  };
  
  try {
    return new Intl.DateTimeFormat(localeMap[locale], options).format(new Date(date));
  } catch (error) {
    console.error('Date formatting error:', error);
    return date.toString();
  }
};

/**
 * Форматирование числа для текущего языка
 */
export const formatNumber = (number, options = {}) => {
  const locale = getCurrentLanguage();
  const localeMap = {
    ru: 'ru-RU',
    kz: 'kk-KZ',
    en: 'en-US'
  };
  
  try {
    return new Intl.NumberFormat(localeMap[locale], options).format(number);
  } catch (error) {
    console.error('Number formatting error:', error);
    return number.toString();
  }
};

/**
 * Форматирование валюты
 */
export const formatCurrency = (amount, currency = 'KZT') => {
  return formatNumber(amount, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * Относительное время (например: "2 дня назад")
 */
export const formatRelativeTime = (date) => {
  const locale = getCurrentLanguage();
  const localeMap = {
    ru: 'ru-RU',
    kz: 'kk-KZ',
    en: 'en-US'
  };
  
  try {
    const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { numeric: 'auto' });
    const diff = new Date(date) - new Date();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    
    if (Math.abs(days) < 1) {
      const hours = Math.round(diff / (1000 * 60 * 60));
      return rtf.format(hours, 'hour');
    }
    if (Math.abs(days) < 30) {
      return rtf.format(days, 'day');
    }
    const months = Math.round(days / 30);
    return rtf.format(months, 'month');
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return formatDate(date);
  }
};