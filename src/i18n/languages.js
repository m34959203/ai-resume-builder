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
 * Форматирование даты для текущего языка
 */
export const formatDate = (date, options = {}) => {
  const locale = getCurrentLanguage();
  const localeMap = {
    ru: 'ru-RU',
    kz: 'kk-KZ',
    en: 'en-US'
  };
  
  return new Intl.DateTimeFormat(localeMap[locale], options).format(new Date(date));
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
  
  return new Intl.NumberFormat(localeMap[locale], options).format(number);
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