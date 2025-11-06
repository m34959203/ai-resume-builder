import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/config';

/**
 * Компонент переключателя языков
 * @param {string} variant - 'buttons' | 'dropdown' | 'compact'
 */
export default function LanguageSwitcher({ variant = 'buttons', className = '' }) {
  const { i18n, t } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Обработчик смены языка
   */
  const handleLanguageChange = useCallback(async (langCode) => {
    // Если язык уже выбран - ничего не делаем
    if (i18n.language === langCode || isChanging) {
      return;
    }

    setIsChanging(true);
    setError(null);

    try {
      await i18n.changeLanguage(langCode);
      
      // Сохранить предпочтение пользователя
      localStorage.setItem('preferredLanguage', langCode);
      
      // Dispatch event для других компонентов
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('languageChanged', { 
          detail: { language: langCode } 
        }));
      }

      console.log(`✅ Language changed to: ${langCode}`);

    } catch (err) {
      console.error('❌ Language change failed:', err);
      setError(t('errors.languageChangeFailed', 'Failed to change language'));
      
      // Автоочистка ошибки через 3 секунды
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsChanging(false);
    }
  }, [i18n, isChanging, t]);

  // ============================================
  // ВАРИАНТ: DROPDOWN (для мобильных)
  // ============================================
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isChanging}
          className={`
            px-3 py-2 pr-8 border rounded-lg bg-white
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            cursor-pointer
          `}
          aria-label={t('language.select', 'Select language')}
        >
          {Object.entries(LANGUAGES).map(([code, { nativeName, flag }]) => (
            <option key={code} value={code}>
              {flag} {nativeName}
            </option>
          ))}
        </select>

        {isChanging && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}

        {error && (
          <div className="absolute top-full mt-1 left-0 right-0 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // ВАРИАНТ: COMPACT (только флаги)
  // ============================================
  if (variant === 'compact') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {Object.entries(LANGUAGES).map(([code, { nativeName, flag }]) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            disabled={isChanging}
            className={`
              w-10 h-10 rounded-full transition-all
              flex items-center justify-center
              disabled:opacity-50 disabled:cursor-not-allowed
              ${i18n.language === code 
                ? 'bg-blue-600 text-white ring-2 ring-blue-300 scale-110' 
                : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
              }
            `}
            aria-label={`Switch to ${nativeName}`}
            aria-current={i18n.language === code ? 'true' : 'false'}
            title={nativeName}
          >
            <span className="text-xl" role="img" aria-label={nativeName}>
              {flag}
            </span>
          </button>
        ))}
        
        {isChanging && (
          <div className="flex items-center ml-1">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // ВАРИАНТ: BUTTONS (по умолчанию)
  // ============================================
  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {Object.entries(LANGUAGES).map(([code, { nativeName, flag }]) => (
        <button
          key={code}
          onClick={() => handleLanguageChange(code)}
          disabled={isChanging}
          className={`
            px-3 py-2 rounded-lg transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${i18n.language === code 
              ? 'bg-blue-600 text-white shadow-md focus:ring-blue-500' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400'
            }
          `}
          aria-label={`Switch to ${nativeName}`}
          aria-current={i18n.language === code ? 'true' : 'false'}
        >
          <span className="mr-1.5" role="img" aria-label={nativeName}>
            {flag}
          </span>
          <span className="hidden sm:inline font-medium">
            {nativeName}
          </span>
        </button>
      ))}
      
      {isChanging && (
        <div className="ml-1">
          <Spinner size="sm" />
        </div>
      )}

      {error && (
        <div className="w-full text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-1">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Компонент спиннера
 */
function Spinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]} text-blue-600`}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}