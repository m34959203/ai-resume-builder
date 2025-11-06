import express from 'express';
import {
  translateText,
  translateResume,
  translateVacancies,
  translateRecommendations
} from '../services/translation.js';

const router = express.Router();

// ============================================
// 🔍 ВАЛИДАЦИЯ
// ============================================

/**
 * Валидация языка
 */
function validateLanguage(lang) {
  const supportedLangs = ['ru', 'kz', 'en'];
  return supportedLangs.includes(lang);
}

/**
 * Middleware для логирования
 */
function logRequest(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`🌐 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

router.use(logRequest);

// ============================================
// 📝 POST /api/translate/text
// Перевод простого текста
// ============================================

router.post('/text', async (req, res) => {
  try {
    const { text, targetLang, context } = req.body;

    // Валидация
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string',
        code: 'INVALID_TEXT'
      });
    }

    if (!targetLang) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANG'
      });
    }

    if (!validateLanguage(targetLang)) {
      return res.status(400).json({ 
        error: 'Invalid target language. Supported: ru, kz, en',
        code: 'INVALID_LANGUAGE'
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({ 
        error: 'Text too long (max 10000 characters)',
        code: 'TEXT_TOO_LONG'
      });
    }

    // Перевод
    const translation = await translateText(text, targetLang, context || '');
    
    res.json({ 
      translation,
      cached: translation === text ? undefined : false,
      targetLang,
      originalLength: text.length,
      translatedLength: translation.length
    });

  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'TRANSLATION_FAILED',
      fallback: req.body.text // 🛡️ Возврат оригинала
    });
  }
});

// ============================================
// 📄 POST /api/translate/resume
// Перевод резюме
// ============================================

router.post('/resume', async (req, res) => {
  try {
    const { resumeData, targetLang } = req.body;

    // Валидация
    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ 
        error: 'Resume data is required and must be an object',
        code: 'INVALID_RESUME_DATA'
      });
    }

    if (!targetLang) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANG'
      });
    }

    if (!validateLanguage(targetLang)) {
      return res.status(400).json({ 
        error: 'Invalid target language. Supported: ru, kz, en',
        code: 'INVALID_LANGUAGE'
      });
    }

    // Проверка размера
    const dataSize = JSON.stringify(resumeData).length;
    if (dataSize > 100000) { // 100KB
      return res.status(400).json({ 
        error: 'Resume data too large (max 100KB)',
        code: 'DATA_TOO_LARGE'
      });
    }

    // Перевод
    const translated = await translateResume(resumeData, targetLang);
    
    res.json({ 
      resume: translated,
      targetLang,
      sectionsTranslated: {
        summary: !!resumeData.summary,
        experience: resumeData.experience?.length || 0,
        education: resumeData.education?.length || 0,
        skills: resumeData.skills?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Resume translation error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'RESUME_TRANSLATION_FAILED',
      fallback: req.body.resumeData // 🛡️ Fallback
    });
  }
});

// ============================================
// 💼 POST /api/translate/vacancies
// Перевод вакансий
// ============================================

router.post('/vacancies', async (req, res) => {
  try {
    const { vacancies, targetLang } = req.body;

    // Валидация
    if (!Array.isArray(vacancies)) {
      return res.status(400).json({ 
        error: 'Vacancies must be an array',
        code: 'INVALID_VACANCIES'
      });
    }

    if (vacancies.length === 0) {
      return res.json({ vacancies: [] });
    }

    if (vacancies.length > 50) {
      return res.status(400).json({ 
        error: 'Too many vacancies (max 50 per request)',
        code: 'TOO_MANY_VACANCIES'
      });
    }

    if (!targetLang) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANG'
      });
    }

    if (!validateLanguage(targetLang)) {
      return res.status(400).json({ 
        error: 'Invalid target language. Supported: ru, kz, en',
        code: 'INVALID_LANGUAGE'
      });
    }

    // Перевод
    const translated = await translateVacancies(vacancies, targetLang);
    
    res.json({ 
      vacancies: translated,
      targetLang,
      count: translated.length
    });

  } catch (error) {
    console.error('❌ Vacancies translation error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'VACANCIES_TRANSLATION_FAILED',
      fallback: req.body.vacancies // 🛡️ Fallback
    });
  }
});

// ============================================
// 🎯 POST /api/translate/recommendations
// Перевод рекомендаций
// ============================================

router.post('/recommendations', async (req, res) => {
  try {
    const { recommendations, targetLang } = req.body;

    // Валидация
    if (!Array.isArray(recommendations)) {
      return res.status(400).json({ 
        error: 'Recommendations must be an array',
        code: 'INVALID_RECOMMENDATIONS'
      });
    }

    if (recommendations.length === 0) {
      return res.json({ recommendations: [] });
    }

    if (recommendations.length > 20) {
      return res.status(400).json({ 
        error: 'Too many recommendations (max 20 per request)',
        code: 'TOO_MANY_RECOMMENDATIONS'
      });
    }

    if (!targetLang) {
      return res.status(400).json({ 
        error: 'Target language is required',
        code: 'MISSING_TARGET_LANG'
      });
    }

    if (!validateLanguage(targetLang)) {
      return res.status(400).json({ 
        error: 'Invalid target language. Supported: ru, kz, en',
        code: 'INVALID_LANGUAGE'
      });
    }

    // Перевод
    const translated = await translateRecommendations(recommendations, targetLang);
    
    res.json({ 
      recommendations: translated,
      targetLang,
      count: translated.length
    });

  } catch (error) {
    console.error('❌ Recommendations translation error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'RECOMMENDATIONS_TRANSLATION_FAILED',
      fallback: req.body.recommendations // 🛡️ Fallback
    });
  }
});

// ============================================
// 🏥 GET /api/translate/health
// Health check
// ============================================

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'translation',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    supportedLanguages: ['ru', 'kz', 'en']
  });
});

// ============================================
// 📊 GET /api/translate/stats
// Статистика кэша (опционально)
// ============================================

router.get('/stats', (req, res) => {
  const { translationCache } = await import('../services/translation.js');
  
  res.json({
    cacheSize: translationCache.keys().length,
    cacheStats: translationCache.getStats()
  });
});

export default router;