/**
 * Resume Language Selector Component
 * 
 * Allows selecting language for resume content independently from interface language
 * Features:
 * - Visual separation of interface and document languages
 * - Automatic translation of resume data
 * - Loading states and error handling
 * - LocalStorage persistence
 * - Retry mechanism
 * 
 * @component
 * @example
 * <ResumeLanguageSelector 
 *   resumeData={resumeData}
 *   onDataChange={setResumeData}
 *   onLanguageChange={(lang) => console.log('Document language:', lang)}
 * />
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../context/LanguageContext';
import { translateResumeData } from '../services/translation';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY_DOCUMENT_LANGUAGE = 'documentLanguage';
const MAX_RETRY_ATTEMPTS = 2;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Save document language to localStorage
 */
const saveDocumentLanguage = (langCode) => {
  try {
    localStorage.setItem(STORAGE_KEY_DOCUMENT_LANGUAGE, langCode);
  } catch (error) {
    console.warn('Failed to save document language:', error);
  }
};

/**
 * Load document language from localStorage
 */
const loadDocumentLanguage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY_DOCUMENT_LANGUAGE);
  } catch (error) {
    console.warn('Failed to load document language:', error);
    return null;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Resume Language Selector
 * 
 * @param {Object} props
 * @param {Object} props.resumeData - Resume data to translate
 * @param {Function} props.onDataChange - Callback when data changes
 * @param {Function} props.onLanguageChange - Callback when document language changes
 * @param {string} props.initialLanguage - Initial document language (optional)
 */
const ResumeLanguageSelector = ({ 
  resumeData, 
  onDataChange,
  onLanguageChange,
  initialLanguage 
}) => {
  const { t } = useTranslation();
  const { language: interfaceLanguage } = useLanguage();
  
  // State
  const [documentLanguage, setDocumentLanguage] = useState(() => {
    // Priority: initialLanguage > saved preference > interface language
    return initialLanguage || loadDocumentLanguage() || interfaceLanguage;
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Ref to track abort controller
  const abortControllerRef = useRef(null);

  // Use languages from translations module
  const languages = AVAILABLE_LANGUAGES;

  /**
   * Handle language change with translation
   */
  const handleLanguageChange = useCallback(async (newLanguage) => {
    // Validate
    if (!newLanguage || newLanguage === documentLanguage) {
      return;
    }

    if (!languages.find(l => l.code === newLanguage)) {
      console.error('[ResumeLanguageSelector] Invalid language:', newLanguage);
      return;
    }

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsTranslating(true);
    setTranslationError(null);
    setRetryCount(0);

    try {
      // Validate resume data
      if (!resumeData || typeof resumeData !== 'object') {
        throw new Error('Invalid resume data');
      }

      // Translate resume data
      const translatedData = await translateResumeData(
        resumeData,
        documentLanguage,
        newLanguage
      );

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[ResumeLanguageSelector] Translation aborted');
        return;
      }

      // Update state
      setDocumentLanguage(newLanguage);
      
      // Save preference
      saveDocumentLanguage(newLanguage);

      // Notify parent
      if (onDataChange && typeof onDataChange === 'function') {
        onDataChange(translatedData);
      }

      if (onLanguageChange && typeof onLanguageChange === 'function') {
        onLanguageChange(newLanguage, languages.find(l => l.code === newLanguage));
      }

      // Success notification (optional)
      console.log(`[ResumeLanguageSelector] Translated to ${newLanguage}`);

    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }

      console.error('[ResumeLanguageSelector] Translation error:', error);
      setTranslationError(t('errors.translationFailed') || 'Translation failed');

    } finally {
      setIsTranslating(false);
      abortControllerRef.current = null;
    }
  }, [documentLanguage, resumeData, onDataChange, onLanguageChange, languages, t]);

  /**
   * Retry translation
   */
  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setTranslationError(t('errors.tryAgain') || 'Maximum retry attempts reached');
      return;
    }

    setRetryCount(prev => prev + 1);
    handleLanguageChange(documentLanguage);
  }, [retryCount, documentLanguage, handleLanguageChange, t]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Get current language info
  const interfaceLangInfo = languages.find(l => l.code === interfaceLanguage);
  const documentLangInfo = languages.find(l => l.code === documentLanguage);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🌐</span>
            {t('builder.resumeLanguage.title')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('builder.resumeLanguage.description')}
          </p>
        </div>
        
        {/* Loading Indicator */}
        {isTranslating && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-medium">{t('builder.translating')}</span>
          </div>
        )}
      </div>

      {/* Language Selectors */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Interface Language (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('builder.resumeLanguage.interfaceLanguage')}
          </label>
          <div className="px-4 py-3 bg-gray-100 rounded-lg border border-gray-300 flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label={interfaceLangInfo?.name}>
              {interfaceLangInfo?.flag}
            </span>
            <span className="font-medium text-gray-900">
              {interfaceLangInfo?.nativeName}
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              (UI)
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Controls menus and buttons
          </p>
        </div>

        {/* Document Language (Editable) */}
        <div>
          <label 
            htmlFor="document-language-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t('builder.resumeLanguage.documentLanguage')}
          </label>
          <div className="relative">
            <select
              id="document-language-select"
              value={documentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isTranslating}
              className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
            
            {/* Flag icon */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-2xl pointer-events-none">
              {documentLangInfo?.flag}
            </div>
            
            {/* Dropdown arrow */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Controls resume content
          </p>
        </div>
      </div>

      {/* Error Message */}
      {translationError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{translationError}</p>
            </div>
            
            {/* Retry Button */}
            {retryCount < MAX_RETRY_ATTEMPTS && (
              <button
                onClick={handleRetry}
                className="text-sm text-red-700 hover:text-red-900 font-medium underline"
              >
                Retry ({retryCount}/{MAX_RETRY_ATTEMPTS})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">
              {t('builder.resumeLanguage.tips.title') || 'Tips'}
            </p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>{t('builder.resumeLanguage.tips.tip1') || 'Interface language controls menus and buttons'}</li>
              <li>{t('builder.resumeLanguage.tips.tip2') || 'Document language controls resume content'}</li>
              <li>{t('builder.resumeLanguage.tips.tip3') || 'AI will generate content in document language'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Language Indicator */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Document language: {documentLangInfo?.nativeName}</span>
        </div>
        {documentLanguage !== interfaceLanguage && (
          <span className="text-amber-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Different from interface
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================

ResumeLanguageSelector.propTypes = {
  resumeData: PropTypes.object.isRequired,
  onDataChange: PropTypes.func.isRequired,
  onLanguageChange: PropTypes.func,
  initialLanguage: PropTypes.string,
};

ResumeLanguageSelector.defaultProps = {
  onLanguageChange: null,
  initialLanguage: null,
};

// ============================================================================
// EXPORT
// ============================================================================

export default ResumeLanguageSelector;