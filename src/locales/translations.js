/**
 * Translations Module
 * 
 * Centralized translation storage for the application
 * Supports 7 languages: EN, RU, KK, ES, FR, DE, ZH
 * 
 * Structure:
 * - common: Common UI elements
 * - nav: Navigation items
 * - home: Homepage content
 * - builder: Resume builder interface
 * - ai: AI-related messages
 * - errors: Error messages
 * - success: Success messages
 * 
 * @module locales/translations
 */

// ============================================================================
// TRANSLATION DATA
// ============================================================================

/**
 * Main translations object
 * @type {Object.<string, Object>}
 */
export const translations = {
  // ========================================
  // ENGLISH
  // ========================================
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      download: 'Download',
      next: 'Next',
      back: 'Back',
      continue: 'Continue',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      search: 'Search',
      filter: 'Filter',
      clear: 'Clear',
      apply: 'Apply',
      ok: 'OK',
      // Pluralization examples
      items: {
        zero: 'No items',
        one: '{{count}} item',
        other: '{{count}} items'
      }
    },
    nav: {
      home: 'Home',
      builder: 'Builder',
      templates: 'Templates',
      about: 'About',
      contact: 'Contact',
      pricing: 'Pricing'
    },
    home: {
      title: 'AI-Powered Resume Builder',
      subtitle: 'Create professional resumes in minutes with artificial intelligence',
      getStarted: 'Get Started',
      learnMore: 'Learn More',
      features: {
        title: 'Features',
        ai: {
          title: 'AI-Powered',
          description: 'Leverage cutting-edge AI to generate compelling content tailored to your experience'
        },
        templates: {
          title: 'Professional Templates',
          description: 'Choose from multiple beautiful, ATS-friendly templates designed by professionals'
        },
        export: {
          title: 'Export & Share',
          description: 'Download your resume as PDF or share it instantly with potential employers'
        },
        hhImport: {
          title: 'HeadHunter Import',
          description: 'Import your resume directly from HeadHunter platform'
        },
        multilingual: {
          title: 'Multi-Language Support',
          description: 'Create resumes in English, Russian, Kazakh, Spanish, French, German, and Chinese'
        },
        instant: {
          title: 'Instant Results',
          description: 'Get your professional resume ready in minutes, not hours'
        }
      },
      cta: {
        title: 'Ready to Build Your Perfect Resume?',
        subtitle: 'Join thousands of professionals who landed their dream jobs',
        button: 'Start Building Now'
      }
    },
    builder: {
      title: 'Resume Builder',
      importFromHH: 'Import from HeadHunter',
      importing: 'Importing...',
      personalInfo: {
        title: 'Personal Information',
        fullName: 'Full Name',
        email: 'Email',
        phone: 'Phone',
        location: 'Location',
        summary: 'Professional Summary',
        position: 'Desired Position',
        website: 'Website',
        linkedin: 'LinkedIn',
        github: 'GitHub',
        portfolio: 'Portfolio'
      },
      experience: {
        title: 'Work Experience',
        company: 'Company',
        position: 'Position',
        startDate: 'Start Date',
        endDate: 'End Date',
        current: 'Current Position',
        description: 'Description',
        addExperience: 'Add Experience',
        achievements: 'Key Achievements',
        responsibilities: 'Responsibilities'
      },
      education: {
        title: 'Education',
        institution: 'Institution',
        degree: 'Degree',
        field: 'Field of Study',
        graduationYear: 'Graduation Year',
        startYear: 'Start Year',
        addEducation: 'Add Education',
        gpa: 'GPA',
        honors: 'Honors & Awards'
      },
      skills: {
        title: 'Skills',
        addSkill: 'Add Skill',
        skillName: 'Skill Name',
        level: 'Level',
        category: 'Category',
        levels: {
          beginner: 'Beginner',
          intermediate: 'Intermediate',
          advanced: 'Advanced',
          expert: 'Expert'
        },
        categories: {
          technical: 'Technical',
          soft: 'Soft Skills',
          language: 'Languages',
          other: 'Other'
        }
      },
      languages: {
        title: 'Languages',
        addLanguage: 'Add Language',
        languageName: 'Language',
        proficiency: 'Proficiency',
        levels: {
          basic: 'Basic',
          intermediate: 'Intermediate',
          advanced: 'Advanced',
          fluent: 'Fluent',
          native: 'Native'
        }
      },
      certifications: {
        title: 'Certifications',
        addCertification: 'Add Certification',
        name: 'Certification Name',
        issuer: 'Issuing Organization',
        date: 'Date Obtained',
        expiryDate: 'Expiry Date',
        credentialId: 'Credential ID'
      },
      projects: {
        title: 'Projects',
        addProject: 'Add Project',
        name: 'Project Name',
        description: 'Description',
        technologies: 'Technologies Used',
        link: 'Project Link',
        github: 'GitHub Repository'
      },
      template: {
        title: 'Choose Template',
        modern: 'Modern',
        professional: 'Professional',
        creative: 'Creative',
        minimal: 'Minimal',
        compact: 'Compact',
        elegant: 'Elegant'
      },
      resumeLanguage: {
        title: 'Resume Language',
        description: 'Choose the language for your resume content (independent of interface language)',
        interfaceLanguage: 'Interface Language',
        documentLanguage: 'Document Language',
        tips: {
          title: 'Tips',
          tip1: 'Interface language controls menus and buttons',
          tip2: 'Document language controls resume content',
          tip3: 'AI will generate content in document language'
        }
      },
      actions: {
        generateWithAI: 'Generate with AI',
        improve: 'Improve',
        preview: 'Preview',
        downloadPDF: 'Download PDF',
        saveProgress: 'Save Progress',
        reset: 'Reset',
        print: 'Print',
        share: 'Share',
        duplicate: 'Duplicate'
      },
      translateData: 'Translate Resume',
      translating: 'Translating...'
    },
    ai: {
      generating: 'AI is generating content...',
      suggestions: 'Enter your prompt for AI suggestions...',
      improve: 'Improve with AI',
      error: 'Failed to generate AI content',
      success: 'Content generated successfully',
      improvingDescription: 'Improving description...',
      generatingSummary: 'Generating professional summary...',
      analyzing: 'Analyzing your resume...',
      optimizing: 'Optimizing content...'
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      invalidPhone: 'Invalid phone number',
      invalidUrl: 'Invalid URL',
      somethingWrong: 'Something went wrong',
      tryAgain: 'Please try again',
      networkError: 'Network error. Please check your connection',
      unauthorized: 'Unauthorized access',
      notFound: 'Resource not found',
      serverError: 'Server error. Please try again later',
      translationFailed: 'Translation failed. Please try again.'
    },
    success: {
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      updated: 'Updated successfully',
      imported: 'Imported successfully',
      exported: 'Exported successfully',
      copied: 'Copied to clipboard'
    }
  },

  // Остальные языки (ru, kk, es, fr, de, zh) - идентичны вашему коду
  // Для краткости показываю только EN, но в реальном файле должны быть все 7
  
  ru: {
    // ... ваш код для RU
  },
  
  kk: {
    // ... ваш код для KK  
  },
  
  es: {
    // ... ваш код для ES
  },
  
  fr: {
    // ... ваш код для FR
  },
  
  de: {
    // ... ваш код для DE
  },
  
  zh: {
    // ... ваш код для ZH
  }
};

// ============================================================================
// LANGUAGE CONFIGURATION
// ============================================================================

/**
 * Available languages with metadata
 * @type {Array<Object>}
 */
export const AVAILABLE_LANGUAGES = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US'
  },
  { 
    code: 'ru', 
    name: 'Russian', 
    nativeName: 'Русский',
    flag: '🇷🇺',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'ru-RU'
  },
  { 
    code: 'kk', 
    name: 'Kazakh', 
    nativeName: 'Қазақша',
    flag: '🇰🇿',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'kk-KZ'
  },
  { 
    code: 'es', 
    name: 'Spanish', 
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'es-ES'
  },
  { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'fr-FR'
  },
  { 
    code: 'de', 
    name: 'German', 
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'de-DE'
  },
  { 
    code: 'zh', 
    name: 'Chinese', 
    nativeName: '中文',
    flag: '🇨🇳',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'zh-CN'
  }
];

/**
 * Language codes array
 * @type {Array<string>}
 */
export const LANGUAGE_CODES = AVAILABLE_LANGUAGES.map(lang => lang.code);

/**
 * Default language code
 * @type {string}
 */
export const DEFAULT_LANGUAGE = 'en';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get available languages
 * @deprecated Use AVAILABLE_LANGUAGES constant instead
 * @returns {Array<Object>} Array of language objects
 */
export const getAvailableLanguages = () => AVAILABLE_LANGUAGES;

/**
 * Check if language is supported
 * @param {string} langCode - Language code to check
 * @returns {boolean} True if language is supported
 * 
 * @example
 * isLanguageSupported('en') // true
 * isLanguageSupported('jp') // false
 */
export const isLanguageSupported = (langCode) => {
  return langCode && LANGUAGE_CODES.includes(langCode.toLowerCase());
};

/**
 * Get default language based on browser settings
 * Falls back to 'en' if browser language is not supported
 * 
 * @returns {string} Language code
 * 
 * @example
 * getDefaultLanguage() // 'en' or browser language
 */
export const getDefaultLanguage = () => {
  try {
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    return isLanguageSupported(browserLang) ? browserLang : DEFAULT_LANGUAGE;
  } catch (error) {
    console.warn('Failed to detect browser language:', error);
    return DEFAULT_LANGUAGE;
  }
};

/**
 * Get language info by code
 * @param {string} langCode - Language code
 * @returns {Object|null} Language object or null if not found
 * 
 * @example
 * getLanguageInfo('en') // { code: 'en', name: 'English', ... }
 */
export const getLanguageInfo = (langCode) => {
  return AVAILABLE_LANGUAGES.find(lang => lang.code === langCode) || null;
};

/**
 * Get translation value by key path
 * @param {string} langCode - Language code
 * @param {string} keyPath - Dot-notation key path
 * @returns {any} Translation value or undefined
 * 
 * @example
 * getTranslation('en', 'home.title') // 'AI-Powered Resume Builder'
 */
export const getTranslation = (langCode, keyPath) => {
  if (!isLanguageSupported(langCode)) return undefined;
  
  const keys = keyPath.split('.');
  let value = translations[langCode];
  
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
 * Check if translation key exists in specific language
 * @param {string} langCode - Language code
 * @param {string} keyPath - Dot-notation key path
 * @returns {boolean} True if key exists
 * 
 * @example
 * hasTranslation('en', 'home.title') // true
 * hasTranslation('en', 'nonexistent.key') // false
 */
export const hasTranslation = (langCode, keyPath) => {
  return getTranslation(langCode, keyPath) !== undefined;
};

/**
 * Get all translation keys for a language (flat structure)
 * @param {string} langCode - Language code
 * @param {string} prefix - Key prefix for nested objects
 * @returns {Array<string>} Array of all keys
 * 
 * @example
 * getAllKeys('en') // ['common.loading', 'common.error', ...]
 */
export const getAllKeys = (langCode, prefix = '') => {
  const lang = translations[langCode];
  if (!lang) return [];
  
  const keys = [];
  
  const extractKeys = (obj, currentPrefix) => {
    Object.keys(obj).forEach(key => {
      const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        extractKeys(obj[key], fullKey);
      } else {
        keys.push(fullKey);
      }
    });
  };
  
  extractKeys(lang, prefix);
  return keys;
};

/**
 * Find missing translation keys between languages
 * @param {string} baseLanguage - Base language to compare against (default: 'en')
 * @returns {Object} Object with language codes as keys and arrays of missing keys
 * 
 * @example
 * findMissingKeys() 
 * // { ru: ['home.newKey'], kk: [] }
 */
export const findMissingKeys = (baseLanguage = 'en') => {
  const baseKeys = getAllKeys(baseLanguage);
  const missing = {};
  
  LANGUAGE_CODES.forEach(langCode => {
    if (langCode === baseLanguage) return;
    
    const langKeys = getAllKeys(langCode);
    missing[langCode] = baseKeys.filter(key => !langKeys.includes(key));
  });
  
  return missing;
};

/**
 * Validate translation structure consistency
 * Checks if all languages have the same structure
 * @returns {Object} Validation result with errors array
 * 
 * @example
 * validateTranslations() 
 * // { valid: true, errors: [] }
 */
export const validateTranslations = () => {
  const errors = [];
  const baseKeys = getAllKeys('en');
  
  LANGUAGE_CODES.forEach(langCode => {
    if (langCode === 'en') return;
    
    const langKeys = getAllKeys(langCode);
    const missing = baseKeys.filter(key => !langKeys.includes(key));
    const extra = langKeys.filter(key => !baseKeys.includes(key));
    
    if (missing.length > 0) {
      errors.push({
        language: langCode,
        type: 'missing',
        keys: missing
      });
    }
    
    if (extra.length > 0) {
      errors.push({
        language: langCode,
        type: 'extra',
        keys: extra
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================================
// DEVELOPMENT TOOLS
// ============================================================================

/**
 * Log translation statistics (development only)
 */
export const logTranslationStats = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('📊 Translation Statistics');
  
  LANGUAGE_CODES.forEach(langCode => {
    const keys = getAllKeys(langCode);
    const info = getLanguageInfo(langCode);
    console.log(`${info.flag} ${info.nativeName} (${langCode}): ${keys.length} keys`);
  });
  
  const validation = validateTranslations();
  if (!validation.valid) {
    console.warn('⚠️  Translation issues found:', validation.errors);
  } else {
    console.log('✅ All translations are consistent');
  }
  
  console.groupEnd();
};

// Auto-validate in development
if (process.env.NODE_ENV === 'development') {
  const validation = validateTranslations();
  if (!validation.valid) {
    console.warn('[Translations] Validation failed:', validation);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default translations;