/**
 * server/routes/translate.js
 * Translation API Routes
 * Supports: Text, Resume, Vacancies, Recommendations
 */

import express from 'express';
import {
  translateText,
  translateResume,
  translateVacancies,
  translationCache // ✅ ИМПОРТ ВВЕРХУ (не динамический)
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
    const statusEmoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
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
        code: 'INVALID_LANGUAGE',
        supportedLanguages: ['ru', 'kz', 'en']
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({ 
        error: 'Text too long (max 10000 characters)',
        code: 'TEXT_TOO_LONG',
        maxLength: 10000,
        actualLength: text.length
      });
    }

    // Перевод
    const translation = await translateText(text, targetLang, context || '');
    
    res.json({ 
      translation,
      targetLang,
      originalLength: text.length,
      translatedLength: translation.length,
      cached: false // Можно добавить реальную проверку кэша
    });

  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'TRANSLATION_FAILED',
      fallback: req.body.text
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
    if (dataSize > 100000) {
      return res.status(400).json({ 
        error: 'Resume data too large (max 100KB)',
        code: 'DATA_TOO_LARGE',
        maxSize: 100000,
        actualSize: dataSize
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
      fallback: req.body.resumeData
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
        code: 'TOO_MANY_VACANCIES',
        maxCount: 50,
        actualCount: vacancies.length
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
      fallback: req.body.vacancies
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
        code: 'TOO_MANY_RECOMMENDATIONS',
        maxCount: 20,
        actualCount: recommendations.length
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

    // ✅ ИСПРАВЛЕНО: Проверка существования функции
    try {
      // Динамический импорт для проверки
      const translationModule = await import('../services/translation.js');
      
      if (translationModule.translateRecommendations) {
        const translated = await translationModule.translateRecommendations(recommendations, targetLang);
        
        res.json({ 
          recommendations: translated,
          targetLang,
          count: translated.length
        });
      } else {
        // Fallback: переводим как обычный текст
        console.warn('⚠️ translateRecommendations not available, using translateText');
        
        const translated = await Promise.all(
          recommendations.map(async (rec) => ({
            ...rec,
            title: rec.title ? await translateText(rec.title, targetLang, 'career advice') : rec.title,
            description: rec.description ? await translateText(rec.description, targetLang, 'career advice') : rec.description,
          }))
        );
        
        res.json({ 
          recommendations: translated,
          targetLang,
          count: translated.length,
          method: 'fallback'
        });
      }
    } catch (importError) {
      console.error('❌ Import error:', importError);
      res.status(500).json({ 
        error: 'Translation service error',
        code: 'SERVICE_ERROR',
        fallback: req.body.recommendations
      });
    }

  } catch (error) {
    console.error('❌ Recommendations translation error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'RECOMMENDATIONS_TRANSLATION_FAILED',
      fallback: req.body.recommendations
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
    supportedLanguages: ['ru', 'kz', 'en'],
    endpoints: {
      text: 'POST /api/translate/text',
      resume: 'POST /api/translate/resume',
      vacancies: 'POST /api/translate/vacancies',
      recommendations: 'POST /api/translate/recommendations',
      stats: 'GET /api/translate/stats'
    }
  });
});

// ============================================
// 📊 GET /api/translate/stats
// Статистика кэша
// ============================================

router.get('/stats', async (req, res) => { // ✅ ИСПРАВЛЕНО: async
  try {
    // Проверка существования кэша
    if (!translationCache) {
      return res.json({
        error: 'Cache not available',
        cacheSize: 0
      });
    }

    const keys = translationCache.keys();
    
    res.json({
      status: 'ok',
      cache: {
        size: keys.length,
        keys: keys.slice(0, 10), // Первые 10 ключей
        stats: translationCache.getStats ? translationCache.getStats() : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'STATS_ERROR'
    });
  }
});

// ============================================
// 🗑️ DELETE /api/translate/cache
// Очистка кэша (опционально, для админов)
// ============================================

router.delete('/cache', async (req, res) => {
  try {
    if (!translationCache) {
      return res.status(404).json({ 
        error: 'Cache not available',
        code: 'CACHE_NOT_AVAILABLE'
      });
    }

    const sizeBefore = translationCache.keys().length;
    translationCache.flushAll();
    
    res.json({ 
      success: true,
      message: 'Cache cleared',
      itemsCleared: sizeBefore,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cache clear error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'CACHE_CLEAR_ERROR'
    });
  }
});

export default router;