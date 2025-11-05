/**
 * Language Switcher Component
 * 
 * Multi-mode language selector with accessibility support
 * Supports 7 languages: EN, RU, KK, ES, FR, DE, ZH
 * 
 * @component
 * @example
 * // Dropdown mode (default)
 * <LanguageSwitcher />
 * 
 * // Compact dropdown
 * <LanguageSwitcher mode="dropdown" compact />
 * 
 * // Toggle buttons
 * <LanguageSwitcher mode="toggle" />
 * 
 * // Pills style
 * <LanguageSwitcher mode="pills" />
 */

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { AVAILABLE_LANGUAGES } from '../locales/translations';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => {
    try {
      document.body.removeChild(announcement);
    } catch (error) {
      // Element already removed
    }
  }, 1000);
};

/**
 * Save language preference to localStorage
 * @param {string} langCode - Language code to save
 */
const saveLanguagePreference = (langCode) => {
  try {
    localStorage.setItem('preferredLanguage', langCode);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Language Switcher Component
 * 
 * @param {Object} props
 * @param {'dropdown'|'toggle'|'pills'} props.mode - Display mode
 * @param {boolean} props.compact - Compact mode (for dropdown)
 * @param {number} props.toggleVisibleCount - Number of languages visible in toggle mode
 * @param {Function} props.onLanguageChange - Callback when language changes
 */
const LanguageSwitcher = ({ 
  mode = 'dropdown', 
  compact = false,
  toggleVisibleCount = 3,
  onLanguageChange
}) => {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Use languages from translations module
  const languages = AVAILABLE_LANGUAGES;
  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  /**
   * Handle language change
   * @param {string} langCode - New language code
   */
  const handleLanguageChange = (langCode) => {
    // Validate language code
    if (!languages.find(l => l.code === langCode)) {
      console.error('[LanguageSwitcher] Invalid language code:', langCode);
      return;
    }

    // Change language
    const success = changeLanguage(langCode);
    
    if (!success) {
      console.error('[LanguageSwitcher] Failed to change language to:', langCode);
      return;
    }

    // Close dropdown
    setIsOpen(false);

    // Save preference
    saveLanguagePreference(langCode);

    // Announce to screen readers
    const selectedLang = languages.find(l => l.code === langCode);
    if (selectedLang) {
      announceToScreenReader(`Language changed to ${selectedLang.name}`);
    }

    // Call callback if provided
    if (onLanguageChange && typeof onLanguageChange === 'function') {
      onLanguageChange(langCode, selectedLang);
    }
  };

  // ============================================================================
  // DROPDOWN MODE
  // ============================================================================
  if (mode === 'dropdown') {
    return (
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-white border border-gray-300 shadow-sm
            hover:border-blue-400 hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
            ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}
          `}
          aria-label={`Current language: ${currentLanguage.name}. Click to change language`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          type="button"
        >
          {/* Flag */}
          <span className={`${compact ? 'text-lg' : 'text-xl'}`} role="img" aria-hidden="true">
            {currentLanguage.flag}
          </span>

          {/* Language Code */}
          <span className={`font-medium text-gray-700 ${compact ? 'text-sm' : ''}`}>
            {currentLanguage.code.toUpperCase()}
          </span>

          {/* Native Name (hidden on mobile in compact mode) */}
          {!compact && (
            <span className="hidden sm:inline text-gray-600 text-sm">
              {currentLanguage.nativeName}
            </span>
          )}

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn"
            role="listbox"
            aria-label="Select language"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5
                  hover:bg-blue-50 transition-colors duration-150
                  ${language === lang.code ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}
                `}
                role="option"
                aria-selected={language === lang.code}
                type="button"
              >
                {/* Flag */}
                <span className="text-2xl" role="img" aria-hidden="true">
                  {lang.flag}
                </span>

                {/* Language Info */}
                <div className="flex-1 text-left">
                  <div className={`font-medium ${language === lang.code ? 'text-blue-700' : 'text-gray-900'}`}>
                    {lang.nativeName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {lang.name}
                  </div>
                </div>

                {/* Check Mark */}
                {language === lang.code && (
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // TOGGLE MODE
  // ============================================================================
  if (mode === 'toggle') {
    const visibleLanguages = languages.slice(0, toggleVisibleCount);
    const hiddenLanguages = languages.slice(toggleVisibleCount);

    return (
      <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1 border border-gray-200">
        {visibleLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              flex items-center gap-2
              ${language === lang.code 
                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
            aria-label={`Switch to ${lang.name}`}
            aria-pressed={language === lang.code}
            type="button"
          >
            <span className="text-lg" role="img" aria-label={`${lang.name} flag`}>
              {lang.flag}
            </span>
            <span className="hidden sm:inline">
              {lang.code.toUpperCase()}
            </span>
          </button>
        ))}

        {/* More Languages Dropdown */}
        {hiddenLanguages.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="More languages"
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fadeIn">
                {hiddenLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                    type="button"
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // PILLS MODE
  // ============================================================================
  if (mode === 'pills') {
    return (
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200 transform hover:scale-105
              ${language === lang.code 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-label={`Switch to ${lang.name}`}
            aria-pressed={language === lang.code}
            type="button"
          >
            <span className="text-lg" role="img" aria-label={`${lang.name} flag`}>
              {lang.flag}
            </span>
            <span>{lang.nativeName}</span>
          </button>
        ))}
      </div>
    );
  }

  // Invalid mode
  console.warn(`[LanguageSwitcher] Invalid mode: ${mode}. Using default.`);
  return null;
};

// ============================================================================
// PROP TYPES
// ============================================================================

LanguageSwitcher.propTypes = {
  mode: PropTypes.oneOf(['dropdown', 'toggle', 'pills']),
  compact: PropTypes.bool,
  toggleVisibleCount: PropTypes.number,
  onLanguageChange: PropTypes.func,
};

LanguageSwitcher.defaultProps = {
  mode: 'dropdown',
  compact: false,
  toggleVisibleCount: 3,
  onLanguageChange: null,
};

// ============================================================================
// PRESET COMPONENTS
// ============================================================================

/**
 * Compact language switcher for header/navbar
 */
export const CompactLanguageSwitcher = ({ onLanguageChange }) => {
  return <LanguageSwitcher mode="dropdown" compact onLanguageChange={onLanguageChange} />;
};

CompactLanguageSwitcher.propTypes = {
  onLanguageChange: PropTypes.func,
};

/**
 * Toggle language switcher for settings page
 */
export const ToggleLanguageSwitcher = ({ visibleCount, onLanguageChange }) => {
  return (
    <LanguageSwitcher 
      mode="toggle" 
      toggleVisibleCount={visibleCount} 
      onLanguageChange={onLanguageChange} 
    />
  );
};

ToggleLanguageSwitcher.propTypes = {
  visibleCount: PropTypes.number,
  onLanguageChange: PropTypes.func,
};

ToggleLanguageSwitcher.defaultProps = {
  visibleCount: 3,
};

/**
 * Pills language switcher for landing page
 */
export const PillsLanguageSwitcher = ({ onLanguageChange }) => {
  return <LanguageSwitcher mode="pills" onLanguageChange={onLanguageChange} />;
};

PillsLanguageSwitcher.propTypes = {
  onLanguageChange: PropTypes.func,
};

// ============================================================================
// EXPORT
// ============================================================================

export default LanguageSwitcher;