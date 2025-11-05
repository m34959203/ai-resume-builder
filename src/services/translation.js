/**
 * Translation Service
 * 
 * Client-side translation service that communicates with backend API
 * Features:
 * - Single text translation
 * - Bulk translation (optimized)
 * - Resume data translation
 * - AI response translation
 * - HH vacancies translation
 * - Request caching
 * - Retry mechanism
 * - AbortController support
 * 
 * @module services/translation
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 2;
const CACHE_TTL = 3600000; // 1 hour
const CACHE_MAX_SIZE = 100;

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

/**
 * Simple LRU cache for translations
 */
class TranslationCache {
  constructor(maxSize = CACHE_MAX_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Generate cache key
   */
  _generateKey(text, fromLang, toLang) {
    return `${fromLang}:${toLang}:${text.substring(0, 100)}`;
  }

  /**
   * Get cached translation
   */
  get(text, fromLang, toLang) {
    const key = this._generateKey(text, fromLang, toLang);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, cached);

    return cached.value;
  }

  /**
   * Set cached translation
   */
  set(text, fromLang, toLang, translation) {
    const key = this._generateKey(text, fromLang, toLang);

    // Remove oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value: translation,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }
}

// Global cache instance
const translationCache = new TranslationCache();

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, maxRetries = MAX_RETRY_ATTEMPTS) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (response.ok) {
        return response;
      }

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      lastError = new Error(`Server error: ${response.status}`);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error;

      // Don't retry on abort or client errors
      if (error.name === 'AbortError' || error.message.includes('Client error')) {
        throw error;
      }

      // Wait before retry
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Validate language code
 */
function validateLanguageCode(langCode) {
  const validCodes = ['en', 'ru', 'kk', 'es', 'fr', 'de', 'zh'];
  return validCodes.includes(langCode);
}

/**
 * Set nested value in object by path
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    // Handle array indices
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      current = current[index];
    } else {
      current = current[key];
    }

    if (!current) {
      console.warn(`[Translation] Invalid path: ${path}`);
      return;
    }
  }

  const lastKey = keys[keys.length - 1];
  if (/^\d+$/.test(lastKey)) {
    current[parseInt(lastKey, 10)] = value;
  } else {
    current[lastKey] = value;
  }
}

// ============================================================================
// CORE TRANSLATION FUNCTIONS
// ============================================================================

/**
 * Translate single text
 * 
 * @param {string} text - Text to translate
 * @param {string} fromLang - Source language code
 * @param {string} toLang - Target language code
 * @param {Object} options - Additional options
 * @param {AbortSignal} options.signal - AbortController signal
 * @param {boolean} options.useCache - Use cache (default: true)
 * @returns {Promise<string>} Translated text
 * 
 * @example
 * const translated = await translateText('Hello', 'en', 'ru');
 */
export const translateText = async (text, fromLang, toLang, options = {}) => {
  // Validation
  if (!text || typeof text !== 'string') {
    console.warn('[Translation] Invalid text:', text);
    return text || '';
  }

  if (!text.trim()) {
    return text;
  }

  // Same language check
  if (fromLang === toLang) {
    return text;
  }

  // Validate language codes
  if (!validateLanguageCode(fromLang) || !validateLanguageCode(toLang)) {
    console.warn('[Translation] Invalid language codes:', fromLang, toLang);
    return text;
  }

  // Check cache
  const useCache = options.useCache !== false;
  if (useCache) {
    const cached = translationCache.get(text, fromLang, toLang);
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await fetchWithRetry(
      `${API_URL}/api/translate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          from: fromLang,
          to: toLang,
        }),
        signal: options.signal,
      }
    );

    const data = await response.json();
    const translatedText = data.translatedText || text;

    // Cache result
    if (useCache) {
      translationCache.set(text, fromLang, toLang, translatedText);
    }

    return translatedText;
  } catch (error) {
    // Re-throw abort errors
    if (error.name === 'AbortError') {
      throw error;
    }

    console.error('[Translation] Error:', error);
    return text; // Fallback to original
  }
};

/**
 * Translate multiple texts (bulk)
 * 
 * @param {string[]} texts - Array of texts to translate
 * @param {string} fromLang - Source language code
 * @param {string} toLang - Target language code
 * @param {Object} options - Additional options
 * @param {AbortSignal} options.signal - AbortController signal
 * @param {boolean} options.optimized - Use optimized endpoint (default: true)
 * @returns {Promise<string[]>} Array of translated texts
 * 
 * @example
 * const translated = await translateBulk(['Hello', 'World'], 'en', 'ru');
 */
export const translateBulk = async (texts, fromLang, toLang, options = {}) => {
  // Validation
  if (!Array.isArray(texts) || texts.length === 0) {
    return texts || [];
  }

  // Same language check
  if (fromLang === toLang) {
    return texts;
  }

  // Validate language codes
  if (!validateLanguageCode(fromLang) || !validateLanguageCode(toLang)) {
    console.warn('[Translation] Invalid language codes:', fromLang, toLang);
    return texts;
  }

  try {
    const response = await fetchWithRetry(
      `${API_URL}/api/translate/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          from: fromLang,
          to: toLang,
          optimized: options.optimized !== false,
        }),
        signal: options.signal,
      }
    );

    const data = await response.json();
    return data.translatedTexts || texts;
  } catch (error) {
    // Re-throw abort errors
    if (error.name === 'AbortError') {
      throw error;
    }

    console.error('[Translation] Bulk error:', error);
    return texts; // Fallback to original
  }
};

/**
 * Translate entire resume data
 * 
 * @param {Object} resumeData - Resume data object
 * @param {string} fromLang - Source language code
 * @param {string} toLang - Target language code
 * @param {Object} options - Additional options
 * @param {AbortSignal} options.signal - AbortController signal
 * @returns {Promise<Object>} Translated resume data
 * 
 * @example
 * const translated = await translateResumeData(resume, 'en', 'ru');
 */
export const translateResumeData = async (resumeData, fromLang, toLang, options = {}) => {
  // Same language check
  if (fromLang === toLang) {
    return resumeData;
  }

  // Validate input
  if (!resumeData || typeof resumeData !== 'object') {
    throw new Error('Invalid resume data');
  }

  try {
    // Use dedicated endpoint for better performance
    const response = await fetchWithRetry(
      `${API_URL}/api/translate/resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeData,
          from: fromLang,
          to: toLang,
        }),
        signal: options.signal,
      }
    );

    const data = await response.json();
    return data.resumeData || resumeData;
  } catch (error) {
    // Re-throw abort errors
    if (error.name === 'AbortError') {
      throw error;
    }

    console.error('[Translation] Resume error:', error);
    
    // Fallback: translate client-side
    return translateResumeDataClientSide(resumeData, fromLang, toLang, options);
  }
};

/**
 * Client-side resume translation fallback
 * @private
 */
async function translateResumeDataClientSide(resumeData, fromLang, toLang, options = {}) {
  try {
    const textsToTranslate = [];
    const textPaths = [];

    // Helper to add text for translation
    const addText = (text, path) => {
      if (text && typeof text === 'string' && text.trim()) {
        textsToTranslate.push(text);
        textPaths.push(path);
      }
    };

    // Personal info
    addText(resumeData.personalInfo?.summary, 'personalInfo.summary');
    addText(resumeData.personalInfo?.position, 'personalInfo.position');

    // Experience
    resumeData.experience?.forEach((exp, i) => {
      addText(exp.position, `experience.${i}.position`);
      addText(exp.company, `experience.${i}.company`);
      addText(exp.description, `experience.${i}.description`);
      exp.achievements?.forEach((ach, j) => {
        addText(ach, `experience.${i}.achievements.${j}`);
      });
      exp.responsibilities?.forEach((resp, j) => {
        addText(resp, `experience.${i}.responsibilities.${j}`);
      });
    });

    // Education
    resumeData.education?.forEach((edu, i) => {
      addText(edu.institution, `education.${i}.institution`);
      addText(edu.degree, `education.${i}.degree`);
      addText(edu.field, `education.${i}.field`);
      addText(edu.honors, `education.${i}.honors`);
    });

    // Skills
    resumeData.skills?.forEach((skill, i) => {
      addText(skill.name, `skills.${i}.name`);
    });

    // Languages (only names, not proficiency levels)
    resumeData.languages?.forEach((lang, i) => {
      addText(lang.name, `languages.${i}.name`);
    });

    // Certifications
    resumeData.certifications?.forEach((cert, i) => {
      addText(cert.name, `certifications.${i}.name`);
      addText(cert.issuer, `certifications.${i}.issuer`);
    });

    // Projects
    resumeData.projects?.forEach((proj, i) => {
      addText(proj.name, `projects.${i}.name`);
      addText(proj.description, `projects.${i}.description`);
    });

    // Translate all texts in bulk
    const translatedTexts = await translateBulk(
      textsToTranslate,
      fromLang,
      toLang,
      options
    );

    // Apply translations
    const translatedData = JSON.parse(JSON.stringify(resumeData));

    translatedTexts.forEach((translatedText, index) => {
      const path = textPaths[index];
      setNestedValue(translatedData, path, translatedText);
    });

    return translatedData;
  } catch (error) {
    console.error('[Translation] Client-side resume translation failed:', error);
    throw error;
  }
}

/**
 * Translate AI response
 * 
 * @param {string} aiResponse - AI generated text
 * @param {string} toLang - Target language code
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Translated text
 */
export const translateAIResponse = async (aiResponse, toLang, options = {}) => {
  if (!aiResponse || typeof aiResponse !== 'string') {
    return aiResponse || '';
  }

  try {
    const response = await fetchWithRetry(
      `${API_URL}/api/translate/ai-response`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: aiResponse,
          to: toLang,
          context: options.context || 'general',
        }),
        signal: options.signal,
      }
    );

    const data = await response.json();
    return data.translatedText || aiResponse;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    console.error('[Translation] AI response error:', error);
    return aiResponse;
  }
};

/**
 * Translate HH vacancies
 * 
 * @param {Array} vacancies - Array of vacancy objects
 * @param {string} toLang - Target language code
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Translated vacancies
 */
export const translateHHVacancies = async (vacancies, toLang, options = {}) => {
  if (!Array.isArray(vacancies) || vacancies.length === 0) {
    return vacancies || [];
  }

  try {
    // Use dedicated endpoint for better performance
    const response = await fetchWithRetry(
      `${API_URL}/api/translate/vacancies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vacancies,
          to: toLang,
        }),
        signal: options.signal,
      }
    );

    const data = await response.json();
    return data.vacancies || vacancies;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    console.error('[Translation] HH vacancies error:', error);
    return vacancies;
  }
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear translation cache
 */
export const clearTranslationCache = () => {
  translationCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: translationCache.cache.size,
    maxSize: translationCache.maxSize,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  translateText,
  translateBulk,
  translateResumeData,
  translateAIResponse,
  translateHHVacancies,
  clearTranslationCache,
  getCacheStats,
};