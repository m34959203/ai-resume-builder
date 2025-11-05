/**
 * Translation Hook
 * 
 * Provides translation functionality for React components
 * Supports:
 * - Nested keys (dot notation)
 * - Variable interpolation
 * - Pluralization
 * - Fallback languages
 * - Number/Date formatting
 * 
 * @module hooks/useTranslation
 */

import { useLanguage } from '../context/LanguageContext';
import { translations } from '../locales/translations';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Fallback language when translation is not found
 */
const FALLBACK_LANGUAGE = 'en';

/**
 * Interpolation pattern for variables
 * Matches: {{variableName}}
 */
const INTERPOLATION_PATTERN = /\{\{(\w+)\}\}/g;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get nested value from object by dot-notation key
 * 
 * @param {Object} obj - Object to search
 * @param {string} path - Dot-notation path (e.g., 'home.title')
 * @returns {any} - Found value or undefined
 * 
 * @example
 * getNestedValue({ home: { title: 'Hello' } }, 'home.title') // 'Hello'
 */
const getNestedValue = (obj, path) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!path || typeof path !== 'string') return undefined;

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
};

/**
 * Replace interpolation variables in string
 * 
 * @param {string} text - Text with {{variables}}
 * @param {Object} variables - Variables to replace
 * @returns {string} - Interpolated text
 * 
 * @example
 * interpolate('Hello {{name}}!', { name: 'John' }) // 'Hello John!'
 */
const interpolate = (text, variables = {}) => {
  if (typeof text !== 'string') return text;
  if (!variables || typeof variables !== 'object') return text;

  return text.replace(INTERPOLATION_PATTERN, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
};

/**
 * Handle pluralization
 * 
 * @param {string|Object} translation - Translation value
 * @param {number} count - Count for pluralization
 * @param {string} language - Current language
 * @returns {string} - Pluralized text
 * 
 * @example
 * pluralize({ one: '1 item', other: '{{count}} items' }, 5) // '5 items'
 */
const pluralize = (translation, count, language) => {
  // If not an object, return as-is
  if (typeof translation !== 'object' || translation === null) {
    return translation;
  }

  // Check if it's a plural object
  if (!('one' in translation || 'other' in translation)) {
    return translation;
  }

  // Select appropriate plural form
  let form = 'other';

  if (count === 0 && 'zero' in translation) {
    form = 'zero';
  } else if (count === 1 && 'one' in translation) {
    form = 'one';
  } else if (count === 2 && 'two' in translation) {
    form = 'two';
  } else if (count > 10 && 'many' in translation) {
    form = 'many';
  }

  return translation[form] || translation.other || '';
};

/**
 * Format number according to locale
 * 
 * @param {number} number - Number to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} - Formatted number
 */
const formatNumber = (number, language, options = {}) => {
  try {
    return new Intl.NumberFormat(language, options).format(number);
  } catch (error) {
    console.warn('Failed to format number:', error);
    return String(number);
  }
};

/**
 * Format date according to locale
 * 
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date
 */
const formatDate = (date, language, options = {}) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(language, options).format(dateObj);
  } catch (error) {
    console.warn('Failed to format date:', error);
    return String(date);
  }
};

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Translation Hook
 * 
 * @returns {Object} Translation utilities
 * 
 * @example
 * const { t, language, formatNumber, formatDate } = useTranslation();
 * 
 * // Basic usage
 * t('home.title') // 'AI Resume Builder'
 * 
 * // With variables
 * t('welcome', { name: 'John' }) // 'Welcome, John!'
 * 
 * // With pluralization
 * t('items', { count: 5 }) // '5 items'
 * 
 * // Format number
 * formatNumber(1234.56) // '1,234.56' (en) or '1 234,56' (ru)
 * 
 * // Format date
 * formatDate(new Date()) // 'January 1, 2024' (en)
 */
export const useTranslation = () => {
  // Get language context
  const context = useLanguage();

  if (!context) {
    throw new Error(
      'useTranslation must be used within LanguageProvider. ' +
      'Wrap your component tree with <LanguageProvider>.'
    );
  }

  const { language, currentLanguageInfo } = context;

  /**
   * Translate function
   * 
   * @param {string} key - Translation key (dot notation)
   * @param {Object} options - Translation options
   * @param {Object} options.variables - Variables for interpolation
   * @param {number} options.count - Count for pluralization
   * @param {string} options.defaultValue - Default value if translation not found
   * @returns {string} - Translated text
   */
  const t = (key, options = {}) => {
    // Validate key
    if (!key || typeof key !== 'string') {
      console.warn('[Translation] Invalid key:', key);
      return String(key);
    }

    const { variables, count, defaultValue } = options;

    // Try to get translation in current language
    let translation = getNestedValue(translations[language], key);

    // Fallback to English if not found
    if (translation === undefined && language !== FALLBACK_LANGUAGE) {
      translation = getNestedValue(translations[FALLBACK_LANGUAGE], key);

      // Log missing translation in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[Translation] Missing translation for "${key}" in "${language}". ` +
          `Using fallback: "${FALLBACK_LANGUAGE}".`
        );
      }
    }

    // Use default value if still not found
    if (translation === undefined) {
      if (defaultValue !== undefined) {
        translation = defaultValue;
      } else {
        // Return key as last resort
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[Translation] No translation found for "${key}" in any language. ` +
            `Returning key.`
          );
        }
        return key;
      }
    }

    // Handle pluralization
    if (count !== undefined) {
      translation = pluralize(translation, count, language);
      
      // Add count to variables for interpolation
      const vars = { ...variables, count };
      return interpolate(translation, vars);
    }

    // Handle interpolation
    if (variables && typeof translation === 'string') {
      return interpolate(translation, variables);
    }

    // Return translation as-is
    return typeof translation === 'string' ? translation : key;
  };

  /**
   * Check if translation exists
   * 
   * @param {string} key - Translation key
   * @returns {boolean} - True if translation exists
   */
  const hasTranslation = (key) => {
    const translation = getNestedValue(translations[language], key);
    return translation !== undefined;
  };

  /**
   * Get all translations for a namespace
   * 
   * @param {string} namespace - Namespace (e.g., 'home')
   * @returns {Object} - All translations in namespace
   */
  const getNamespace = (namespace) => {
    return getNestedValue(translations[language], namespace) || {};
  };

  /**
   * Format number with locale
   */
  const formatNumberLocale = (number, options) => {
    return formatNumber(number, language, options);
  };

  /**
   * Format date with locale
   */
  const formatDateLocale = (date, options) => {
    return formatDate(date, language, options);
  };

  /**
   * Format currency with locale
   */
  const formatCurrency = (amount, currency = 'USD', options = {}) => {
    return formatNumber(amount, language, {
      style: 'currency',
      currency,
      ...options,
    });
  };

  /**
   * Format percentage
   */
  const formatPercentage = (value, options = {}) => {
    return formatNumber(value / 100, language, {
      style: 'percent',
      ...options,
    });
  };

  // Return hook API
  return {
    // Core functions
    t,
    translate: t, // Alias
    
    // Current language
    language,
    languageInfo: currentLanguageInfo,
    
    // Utilities
    hasTranslation,
    getNamespace,
    
    // Formatters
    formatNumber: formatNumberLocale,
    formatDate: formatDateLocale,
    formatCurrency,
    formatPercentage,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useTranslation;