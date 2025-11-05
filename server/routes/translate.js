/**
 * Translation Routes
 * 
 * Handles all translation requests using Gemini 2.0 Flash
 * - Single text translation
 * - Batch translation (sequential)
 * - Optimized batch translation (combined)
 * - Resume data translation
 * - HH vacancies translation
 * - AI response translation
 * 
 * @requires services/ai
 * @module routes/translate
 */

import express from 'express';
import { 
  translateWithAI, 
  translateBatch, 
  translateBatchOptimized 
} from '../services/ai.js';

const router = express.Router();

/* ============================== Constants ==================================== */

const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  kk: { name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
};

/* ============================== Utilities ==================================== */

/**
 * Validate language code
 */
function isValidLanguage(lang) {
  return lang && SUPPORTED_LANGUAGES[lang];
}

/**
 * Get language name
 */
function getLanguageName(langCode) {
  return SUPPORTED_LANGUAGES[langCode]?.name || langCode;
}

/**
 * Validate request body
 */
function validateTranslationRequest(req) {
  const errors = [];
  
  if (!req.body) {
    errors.push('Request body is required');
  }
  
  return errors;
}

/**
 * Extract translatable texts from object recursively
 */
function extractTexts(obj, path = '', texts = [], paths = []) {
  if (typeof obj === 'string' && obj.trim()) {
    texts.push(obj);
    paths.push(path);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractTexts(item, `${path}[${index}]`, texts, paths);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      const newPath = path ? `${path}.${key}` : key;
      extractTexts(obj[key], newPath, texts, paths);
    });
  }
  
  return { texts, paths };
}

/**
 * Apply translations to object
 */
function applyTranslations(obj, translatedTexts, paths) {
  const result = JSON.parse(JSON.stringify(obj));
  
  translatedTexts.forEach((translatedText, index) => {
    const path = paths[index];
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = translatedText;
  });
  
  return result;
}

/* ============================== Routes ======================================= */

/**
 * GET /api/translate/languages
 * Get list of supported languages
 */
router.get('/languages', (req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
    count: Object.keys(SUPPORTED_LANGUAGES).length,
  });
});

/**
 * POST /api/translate
 * Translate single text
 * 
 * Body: {
 *   text: string,
 *   targetLanguage: string,
 *   sourceLanguage?: string (default: 'auto')
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANGUAGE'
      });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({ 
        error: `Unsupported target language: ${targetLanguage}`,
        code: 'INVALID_TARGET_LANGUAGE',
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
      });
    }

    if (sourceLanguage !== 'auto' && !isValidLanguage(sourceLanguage)) {
      return res.status(400).json({ 
        error: `Unsupported source language: ${sourceLanguage}`,
        code: 'INVALID_SOURCE_LANGUAGE',
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
      });
    }

    // Same language check
    if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
      return res.json({ 
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        cached: true,
      });
    }

    // Translate
    const startTime = Date.now();
    const translatedText = await translateWithAI(text, targetLanguage, sourceLanguage);
    const duration = Date.now() - startTime;

    res.json({ 
      translatedText,
      sourceLanguage,
      targetLanguage,
      provider: 'gemini-2.0-flash',
      duration,
      characterCount: text.length,
    });

  } catch (error) {
    console.error('[Translate] Error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      message: error.message,
      code: 'TRANSLATION_ERROR'
    });
  }
});

/**
 * POST /api/translate/batch
 * Translate multiple texts
 * 
 * Body: {
 *   texts: string[],
 *   targetLanguage: string,
 *   sourceLanguage?: string (default: 'auto'),
 *   optimized?: boolean (default: true)
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { 
      texts, 
      targetLanguage, 
      sourceLanguage = 'auto',
      optimized = true 
    } = req.body;

    // Validation
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ 
        error: 'Texts array is required',
        code: 'MISSING_TEXTS'
      });
    }

    if (texts.length === 0) {
      return res.json({ 
        translatedTexts: [],
        count: 0,
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANGUAGE'
      });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({ 
        error: `Unsupported target language: ${targetLanguage}`,
        code: 'INVALID_TARGET_LANGUAGE',
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
      });
    }

    // Same language check
    if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
      return res.json({ 
        translatedTexts: texts,
        sourceLanguage,
        targetLanguage,
        count: texts.length,
        cached: true,
      });
    }

    // Translate
    const startTime = Date.now();
    const translatedTexts = optimized && texts.length > 2
      ? await translateBatchOptimized(texts, targetLanguage, sourceLanguage)
      : await translateBatch(texts, targetLanguage, sourceLanguage);
    const duration = Date.now() - startTime;

    res.json({ 
      translatedTexts,
      sourceLanguage,
      targetLanguage,
      count: translatedTexts.length,
      provider: 'gemini-2.0-flash',
      method: optimized && texts.length > 2 ? 'optimized' : 'sequential',
      duration,
      averageDuration: Math.round(duration / texts.length),
    });

  } catch (error) {
    console.error('[Translate Batch] Error:', error);
    res.status(500).json({ 
      error: 'Batch translation failed',
      message: error.message,
      code: 'BATCH_TRANSLATION_ERROR'
    });
  }
});

/**
 * POST /api/translate/resume
 * Translate entire resume data
 * 
 * Body: {
 *   resumeData: object,
 *   targetLanguage: string,
 *   sourceLanguage?: string (default: 'auto')
 * }
 */
router.post('/resume', async (req, res) => {
  try {
    const { resumeData, targetLanguage, sourceLanguage = 'auto' } = req.body;

    // Validation
    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ 
        error: 'Resume data object is required',
        code: 'MISSING_RESUME_DATA'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANGUAGE'
      });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({ 
        error: `Unsupported target language: ${targetLanguage}`,
        code: 'INVALID_TARGET_LANGUAGE'
      });
    }

    // Same language check
    if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
      return res.json({ 
        resumeData,
        sourceLanguage,
        targetLanguage,
        cached: true,
      });
    }

    // Extract all translatable texts
    const { texts, paths } = extractTexts(resumeData);

    if (texts.length === 0) {
      return res.json({ 
        resumeData,
        sourceLanguage,
        targetLanguage,
        textsTranslated: 0,
      });
    }

    // Translate all texts (use optimized batch)
    const startTime = Date.now();
    const translatedTexts = await translateBatchOptimized(texts, targetLanguage, sourceLanguage);
    const duration = Date.now() - startTime;

    // Apply translations
    const translatedResumeData = applyTranslations(resumeData, translatedTexts, paths);

    res.json({ 
      resumeData: translatedResumeData,
      sourceLanguage,
      targetLanguage,
      textsTranslated: translatedTexts.length,
      provider: 'gemini-2.0-flash',
      duration,
    });

  } catch (error) {
    console.error('[Translate Resume] Error:', error);
    res.status(500).json({ 
      error: 'Resume translation failed',
      message: error.message,
      code: 'RESUME_TRANSLATION_ERROR'
    });
  }
});

/**
 * POST /api/translate/ai-response
 * Translate AI-generated response
 * 
 * Body: {
 *   text: string,
 *   targetLanguage: string,
 *   context?: string (e.g., 'resume', 'cover-letter')
 * }
 */
router.post('/ai-response', async (req, res) => {
  try {
    const { text, targetLanguage, context = 'general' } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANGUAGE'
      });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({ 
        error: `Unsupported target language: ${targetLanguage}`,
        code: 'INVALID_TARGET_LANGUAGE'
      });
    }

    // Translate (AI responses are usually in English)
    const startTime = Date.now();
    const translatedText = await translateWithAI(text, targetLanguage, 'en');
    const duration = Date.now() - startTime;

    res.json({ 
      translatedText,
      sourceLanguage: 'en',
      targetLanguage,
      context,
      provider: 'gemini-2.0-flash',
      duration,
    });

  } catch (error) {
    console.error('[Translate AI Response] Error:', error);
    res.status(500).json({ 
      error: 'AI response translation failed',
      message: error.message,
      code: 'AI_TRANSLATION_ERROR'
    });
  }
});

/**
 * POST /api/translate/vacancies
 * Translate HeadHunter vacancies
 * 
 * Body: {
 *   vacancies: array,
 *   targetLanguage: string
 * }
 */
router.post('/vacancies', async (req, res) => {
  try {
    const { vacancies, targetLanguage } = req.body;

    // Validation
    if (!vacancies || !Array.isArray(vacancies)) {
      return res.status(400).json({ 
        error: 'Vacancies array is required',
        code: 'MISSING_VACANCIES'
      });
    }

    if (vacancies.length === 0) {
      return res.json({ 
        vacancies: [],
        count: 0,
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANGUAGE'
      });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({ 
        error: `Unsupported target language: ${targetLanguage}`,
        code: 'INVALID_TARGET_LANGUAGE'
      });
    }

    // HH vacancies are usually in Russian
    const sourceLanguage = 'ru';

    if (sourceLanguage === targetLanguage) {
      return res.json({ 
        vacancies,
        count: vacancies.length,
        cached: true,
      });
    }

    // Extract texts to translate from vacancies
    const textsToTranslate = [];
    const indices = [];

    vacancies.forEach((vacancy, idx) => {
      if (vacancy.name) {
        textsToTranslate.push(vacancy.name);
        indices.push({ idx, field: 'name' });
      }
      if (vacancy.snippet?.requirement) {
        textsToTranslate.push(vacancy.snippet.requirement);
        indices.push({ idx, field: 'requirement' });
      }
      if (vacancy.snippet?.responsibility) {
        textsToTranslate.push(vacancy.snippet.responsibility);
        indices.push({ idx, field: 'responsibility' });
      }
    });

    if (textsToTranslate.length === 0) {
      return res.json({ 
        vacancies,
        count: vacancies.length,
        textsTranslated: 0,
      });
    }

    // Translate all texts
    const startTime = Date.now();
    const translatedTexts = await translateBatchOptimized(
      textsToTranslate, 
      targetLanguage, 
      sourceLanguage
    );
    const duration = Date.now() - startTime;

    // Apply translations
    const translatedVacancies = JSON.parse(JSON.stringify(vacancies));

    translatedTexts.forEach((translatedText, i) => {
      const { idx, field } = indices[i];
      
      if (field === 'name') {
        translatedVacancies[idx].name = translatedText;
      } else if (field === 'requirement') {
        if (!translatedVacancies[idx].snippet) {
          translatedVacancies[idx].snippet = {};
        }
        translatedVacancies[idx].snippet.requirement = translatedText;
      } else if (field === 'responsibility') {
        if (!translatedVacancies[idx].snippet) {
          translatedVacancies[idx].snippet = {};
        }
        translatedVacancies[idx].snippet.responsibility = translatedText;
      }
    });

    res.json({ 
      vacancies: translatedVacancies,
      sourceLanguage,
      targetLanguage,
      count: translatedVacancies.length,
      textsTranslated: translatedTexts.length,
      provider: 'gemini-2.0-flash',
      duration,
    });

  } catch (error) {
    console.error('[Translate Vacancies] Error:', error);
    res.status(500).json({ 
      error: 'Vacancies translation failed',
      message: error.message,
      code: 'VACANCIES_TRANSLATION_ERROR'
    });
  }
});

/**
 * POST /api/translate/detect
 * Detect language of text (simple heuristic)
 */
router.post('/detect', (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    // Simple heuristic detection
    let detectedLanguage = 'en';
    
    // Cyrillic check
    if (/[\u0400-\u04FF]/.test(text)) {
      // Check for Kazakh-specific characters
      if (/[ӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(text)) {
        detectedLanguage = 'kk';
      } else {
        detectedLanguage = 'ru';
      }
    }
    // Chinese check
    else if (/[\u4E00-\u9FFF]/.test(text)) {
      detectedLanguage = 'zh';
    }
    // Spanish/French accents
    else if (/[áéíóúñü]/i.test(text)) {
      detectedLanguage = text.includes('ñ') ? 'es' : 'fr';
    }
    // German umlauts
    else if (/[äöüß]/i.test(text)) {
      detectedLanguage = 'de';
    }

    res.json({ 
      detectedLanguage,
      confidence: 'heuristic',
      languageInfo: SUPPORTED_LANGUAGES[detectedLanguage],
    });

  } catch (error) {
    console.error('[Detect Language] Error:', error);
    res.status(500).json({ 
      error: 'Language detection failed',
      message: error.message,
      code: 'DETECTION_ERROR'
    });
  }
});

/**
 * GET /api/translate/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'translation',
    provider: 'gemini-2.0-flash',
    supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
    endpoints: [
      'POST /api/translate',
      'POST /api/translate/batch',
      'POST /api/translate/resume',
      'POST /api/translate/ai-response',
      'POST /api/translate/vacancies',
      'POST /api/translate/detect',
      'GET  /api/translate/languages',
      'GET  /api/translate/health',
    ],
  });
});

/* ============================== Error Handler ================================ */

// Catch-all error handler for this router
router.use((error, req, res, next) => {
  console.error('[Translate Router] Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal translation service error',
    message: error.message,
    code: 'INTERNAL_ERROR',
  });
});

/* ============================== Export ======================================= */

export default router;