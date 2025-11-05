/**
 * Language Context
 * 
 * Manages application language state and provides translation functionality
 * Supports 7 languages: EN, RU, KK, ES, FR, DE, ZH
 * 
 * @module context/LanguageContext
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  AVAILABLE_LANGUAGES, 
  LANGUAGE_CODES, 
  DEFAULT_LANGUAGE 
} from '../locales/translations';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * LocalStorage key for language preference
 */
const STORAGE_KEY = 'preferredLanguage';

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * Language Context
 * @type {React.Context}
 */
export const LanguageContext = createContext(null);

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Safely get item from localStorage
 * @param {string} key - Storage key
 * @returns {string|null} - Stored value or null
 */
const getStorageItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
};

/**
 * Safely set item to localStorage
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to write to localStorage:', error);
  }
};

/**
 * Get browser language code
 * @returns {string} - Browser language code
 */
const getBrowserLanguage = () => {
  try {
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    return browserLang;
  } catch (error) {
    console.warn('Failed to detect browser language:', error);
    return DEFAULT_LANGUAGE;
  }
};

/**
 * Get initial language based on priority:
 * 1. Saved preference in localStorage
 * 2. Browser language
 * 3. Default language
 * @returns {string} - Initial language code
 */
const getInitialLanguage = () => {
  // 1. Check saved preference
  const savedLang = getStorageItem(STORAGE_KEY);
  if (savedLang && LANGUAGE_CODES.includes(savedLang)) {
    return savedLang;
  }

  // 2. Check browser language
  const browserLang = getBrowserLanguage();
  if (LANGUAGE_CODES.includes(browserLang)) {
    return browserLang;
  }

  // 3. Use default
  return DEFAULT_LANGUAGE;
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * Language Provider Component
 * Wraps application and provides language context
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 */
export const LanguageProvider = ({ children }) => {
  // Initialize language state
  const [language, setLanguage] = useState(getInitialLanguage);

  // Save to localStorage and update HTML lang attribute when language changes
  useEffect(() => {
    // Save to localStorage
    setStorageItem(STORAGE_KEY, language);

    // Update HTML lang attribute for accessibility
    try {
      document.documentElement.lang = language;
    } catch (error) {
      console.warn('Failed to set document language:', error);
    }

    // Update HTML dir attribute (for RTL languages)
    try {
      const langConfig = AVAILABLE_LANGUAGES.find(l => l.code === language);
      if (langConfig) {
        document.documentElement.dir = langConfig.direction;
      }
    } catch (error) {
      console.warn('Failed to set document direction:', error);
    }

    // Log language change (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Language] Changed to: ${language}`);
    }
  }, [language]);

  /**
   * Change language
   * @param {string} newLang - New language code
   * @returns {boolean} - Success status
   */
  const changeLanguage = (newLang) => {
    // Validate language code
    if (!newLang || typeof newLang !== 'string') {
      console.error('[Language] Invalid language code:', newLang);
      return false;
    }

    const langCode = newLang.toLowerCase();

    // Check if language is supported
    if (!LANGUAGE_CODES.includes(langCode)) {
      console.error('[Language] Unsupported language:', langCode);
      console.info('[Language] Available languages:', LANGUAGE_CODES.join(', '));
      return false;
    }

    // Check if already current language
    if (langCode === language) {
      console.info('[Language] Already using:', langCode);
      return true;
    }

    // Change language
    setLanguage(langCode);
    return true;
  };

  /**
   * Get language info by code
   * @param {string} code - Language code
   * @returns {Object|null} - Language info or null
   */
  const getLanguageInfo = (code) => {
    return AVAILABLE_LANGUAGES.find(lang => lang.code === code) || null;
  };

  /**
   * Check if language is supported
   * @param {string} code - Language code
   * @returns {boolean}
   */
  const isLanguageSupported = (code) => {
    return LANGUAGE_CODES.includes(code);
  };

  // Context value
  const contextValue = {
    // Current language
    language,
    
    // Change language function
    changeLanguage,
    
    // Language configuration
    availableLanguages: AVAILABLE_LANGUAGES,
    languageCodes: LANGUAGE_CODES,
    defaultLanguage: DEFAULT_LANGUAGE,
    
    // Utility functions
    getLanguageInfo,
    isLanguageSupported,
    
    // Current language info
    currentLanguageInfo: getLanguageInfo(language),
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Custom hook to use Language Context
 * Must be used within LanguageProvider
 * 
 * @returns {Object} Language context
 * @throws {Error} If used outside LanguageProvider
 * 
 * @example
 * const { language, changeLanguage } = useLanguage();
 * changeLanguage('es');
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error(
      'useLanguage must be used within LanguageProvider. ' +
      'Wrap your component tree with <LanguageProvider>.'
    );
  }
  
  return context;
};

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export language constants from translations module for convenience
// This allows importing from either location for backward compatibility
export { AVAILABLE_LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE };

export default LanguageProvider;