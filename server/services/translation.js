import NodeCache from 'node-cache';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 🔐 КОНФИГУРАЦИЯ (ИЗ .env)
// ============================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = process.env.GEMINI_URL || 'https://openrouter.ai/api/v1/chat/completions';
const CACHE_DIR = path.join(__dirname, '..', 'data', 'translation-cache');

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables!');
}

// ============================================
// 💾 КЭШИРОВАНИЕ (В ПАМЯТИ)
// ============================================
const translationCache = new NodeCache({ 
  stdTTL: 86400 * 7, // 7 дней
  checkperiod: 3600,
  useClones: false // Производительность
});

// ============================================
// 💾 ПЕРСИСТЕНТНЫЙ КЭШ (НА ДИСКЕ)
// ============================================

/**
 * Загрузка кэша с диска при старте
 */
async function loadCacheFromDisk() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheFile = path.join(CACHE_DIR, 'translations.json');
    const data = await fs.readFile(cacheFile, 'utf-8');
    const cache = JSON.parse(data);
    
    Object.entries(cache).forEach(([key, value]) => {
      translationCache.set(key, value);
    });
    
    console.log(`✅ Loaded ${Object.keys(cache).length} cached translations`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('❌ Failed to load cache:', error);
    }
  }
}

/**
 * Сохранение кэша на диск
 */
async function saveCacheToDisk() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    
    const cache = translationCache.keys().reduce((acc, key) => {
      acc[key] = translationCache.get(key);
      return acc;
    }, {});
    
    const cacheFile = path.join(CACHE_DIR, 'translations.json');
    await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
    
    console.log(`💾 Saved ${Object.keys(cache).length} translations to cache`);
  } catch (error) {
    console.error('❌ Failed to save cache:', error);
  }
}

// Автосохранение каждые 5 минут
setInterval(saveCacheToDisk, 5 * 60 * 1000);

// Сохранить при выходе
process.on('SIGINT', async () => {
  console.log('\n💾 Saving cache before exit...');
  await saveCacheToDisk();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await saveCacheToDisk();
  process.exit(0);
});

// ============================================
// 🔄 RETRY ЛОГИКА С EXPONENTIAL BACKOFF
// ============================================

/**
 * Retry с экспоненциальной задержкой
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      
      // Не ретраить клиентские ошибки (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (isLastAttempt) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ============================================
// ✅ ВАЛИДАЦИЯ КАЧЕСТВА ПЕРЕВОДА
// ============================================

/**
 * Проверка качества перевода
 */
function validateTranslation(original, translated, targetLang) {
  const issues = [];

  // Проверка на пустоту
  if (!translated || translated.trim().length === 0) {
    issues.push({
      type: 'empty_translation',
      severity: 'error',
      message: 'Translation is empty'
    });
  }

  // Проверка соотношения длины
  const lengthRatio = translated.length / original.length;
  if (lengthRatio < 0.2 || lengthRatio > 5) {
    issues.push({
      type: 'length_mismatch',
      severity: 'warning',
      message: `Length ratio: ${lengthRatio.toFixed(2)}`
    });
  }

  // Проверка на неизмененный текст
  if (original === translated && targetLang !== 'ru') {
    issues.push({
      type: 'unchanged',
      severity: 'warning',
      message: 'Translation appears unchanged'
    });
  }

  // Проверка казахских символов для kz
  if (targetLang === 'kz') {
    const kazakhChars = /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/;
    if (!kazakhChars.test(translated) && original.length > 5) {
      issues.push({
        type: 'language_detection',
        severity: 'warning',
        message: 'No Kazakh-specific characters found'
      });
    }
  }

  return {
    isValid: !issues.some(i => i.severity === 'error'),
    issues
  };
}

// ============================================
// 🤖 ОСНОВНАЯ ФУНКЦИЯ ПЕРЕВОДА
// ============================================

/**
 * Перевод текста через Gemini API
 */
async function translateText(text, targetLang, context = '') {
  // Проверка входных данных
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Если язык исходный - вернуть как есть
  if (targetLang === 'ru') {
    return text;
  }

  // Проверка API ключа
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY not configured, returning original text');
    return text;
  }

  // Проверка кэша
  const cacheKey = `${text}_${targetLang}_${context}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const langNames = {
    ru: 'Russian',
    kz: 'Kazakh',
    en: 'English'
  };

  const systemPrompt = context 
    ? `You are a professional translator specializing in ${context}. Translate to ${langNames[targetLang]}. Preserve formatting and tone. Return ONLY the translation.`
    : `Translate the following text to ${langNames[targetLang]}. Return ONLY the translation, no explanations.`;

  try {
    const translation = await retryWithBackoff(async () => {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
          'X-Title': 'AI Resume Builder'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API error: ${response.status}`);
        error.status = response.status;
        error.details = errorText;
        throw error;
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid API response structure');
      }

      return data.choices[0].message.content.trim();
    });

    // Валидация качества
    const validation = validateTranslation(text, translation, targetLang);
    
    if (!validation.isValid) {
      console.error('❌ Translation validation failed:', validation.issues);
      return text; // Fallback к оригиналу
    }

    if (validation.issues.length > 0) {
      console.warn('⚠️ Translation warnings:', validation.issues);
    }

    // Сохранить в кэш
    translationCache.set(cacheKey, translation);

    return translation;

  } catch (error) {
    console.error('❌ Translation error:', error.message);
    return text; // 🛡️ Fail gracefully - возврат оригинала
  }
}

// ============================================
// 📦 BATCH ПЕРЕВОД
// ============================================

/**
 * Пакетный перевод массива текстов
 */
async function translateBatch(texts, targetLang, context = '') {
  const results = [];
  
  for (const text of texts) {
    if (!text || text.trim().length === 0) {
      results.push(text);
      continue;
    }
    
    const translated = await translateText(text, targetLang, context);
    results.push(translated);
    
    // Небольшая задержка между запросами для избежания rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// ============================================
// 📄 ПЕРЕВОД РЕЗЮМЕ
// ============================================

/**
 * Перевод объекта резюме
 */
async function translateResume(resumeData, targetLang) {
  const context = 'resume/CV content';
  const translated = { ...resumeData };

  try {
    // Summary
    if (resumeData.summary) {
      translated.summary = await translateText(
        resumeData.summary, 
        targetLang, 
        context
      );
    }

    // Experience
    if (resumeData.experience?.length) {
      translated.experience = [];
      
      for (const exp of resumeData.experience) {
        const translatedExp = {
          ...exp,
          position: await translateText(exp.position || '', targetLang, context),
          company: exp.company, // ❌ НЕ переводим название компании
          description: await translateText(exp.description || '', targetLang, context),
        };
        
        // Achievements
        if (exp.achievements?.length) {
          translatedExp.achievements = await translateBatch(
            exp.achievements, 
            targetLang, 
            context
          );
        }
        
        translated.experience.push(translatedExp);
      }
    }

    // Education
    if (resumeData.education?.length) {
      translated.education = [];
      
      for (const edu of resumeData.education) {
        translated.education.push({
          ...edu,
          degree: await translateText(edu.degree || '', targetLang, context),
          field: await translateText(edu.field || '', targetLang, context),
          institution: edu.institution // ❌ НЕ переводим название учебного заведения
        });
      }
    }

    // Skills
    if (resumeData.skills?.length) {
      translated.skills = await translateBatch(
        resumeData.skills, 
        targetLang, 
        'technical skills'
      );
    }

    return translated;

  } catch (error) {
    console.error('❌ Resume translation failed:', error);
    throw error;
  }
}

// ============================================
// 💼 ПЕРЕВОД ВАКАНСИЙ
// ============================================

/**
 * Перевод вакансий HH
 */
async function translateVacancies(vacancies, targetLang) {
  const results = [];
  
  for (const vacancy of vacancies) {
    try {
      const translated = {
        ...vacancy,
        name: await translateText(vacancy.name, targetLang, 'job vacancy'),
      };

      // Description (убираем HTML теги)
      if (vacancy.description) {
        const cleanDesc = vacancy.description.replace(/<[^>]*>/g, '');
        translated.description = await translateText(cleanDesc, targetLang, 'job vacancy');
      }

      // Requirement
      if (vacancy.requirement) {
        const cleanReq = vacancy.requirement.replace(/<[^>]*>/g, '');
        translated.requirement = await translateText(cleanReq, targetLang, 'job requirements');
      }

      // Responsibility
      if (vacancy.responsibility) {
        const cleanResp = vacancy.responsibility.replace(/<[^>]*>/g, '');
        translated.responsibility = await translateText(cleanResp, targetLang, 'job responsibilities');
      }

      results.push(translated);
      
      // Задержка между вакансиями
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Failed to translate vacancy ${vacancy.id}:`, error);
      results.push(vacancy); // 🛡️ Fallback к оригиналу
    }
  }
  
  return results;
}

// ============================================
// 🎯 ПЕРЕВОД РЕКОМЕНДАЦИЙ
// ============================================

/**
 * Перевод AI рекомендаций
 */
async function translateRecommendations(recommendations, targetLang) {
  const results = [];
  
  for (const rec of recommendations) {
    try {
      const translated = {
        ...rec,
        title: await translateText(rec.title, targetLang, 'career advice'),
        description: await translateText(rec.description, targetLang, 'career advice'),
      };

      if (rec.action) {
        translated.action = await translateText(rec.action, targetLang, 'career advice');
      }

      results.push(translated);
      
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('❌ Failed to translate recommendation:', error);
      results.push(rec); // 🛡️ Fallback
    }
  }
  
  return results;
}

// ============================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ============================================

// Загрузить кэш при импорте модуля
loadCacheFromDisk();

// ============================================
// 📤 ЭКСПОРТ
// ============================================

export {
  translateText,
  translateBatch,
  translateResume,
  translateVacancies,
  translateRecommendations,
  translationCache
};