import axios from 'axios';

const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY || process.env.OPENROUTER_API_KEY;
const TRANSLATION_MODEL = process.env.TRANSLATION_MODEL || 'google/gemini-2.0-flash-exp:free';
const TRANSLATION_BASE_URL = process.env.TRANSLATION_BASE_URL || 'https://openrouter.ai/api/v1';
const APP_URL = process.env.OPENROUTER_REFERER || 'http://localhost:5173';

// Маппинг языковых кодов
const languageNames = {
  'en': 'English',
  'ru': 'Russian',
  'kk': 'Kazakh',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese (Simplified)',
};

// ========================================
// GEMINI TRANSLATION (через OpenRouter)
// ========================================
async function translateWithGemini(text, fromLang, toLang) {
  try {
    const response = await axios.post(
      `${TRANSLATION_BASE_URL}/chat/completions`,
      {
        model: TRANSLATION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in resume and business content. Translate accurately from ${languageNames[fromLang]} to ${languageNames[toLang]}. Return ONLY the translated text, preserving formatting and professional tone.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${TRANSLATION_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_URL,
          'X-Title': 'AI Resume Builder - Translation',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Gemini translation error:', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// MAIN TRANSLATION FUNCTION
// ========================================
export async function translateText(text, fromLang, toLang) {
  // Если языки одинаковые или текст пустой
  if (fromLang === toLang || !text || text.trim() === '') {
    return text;
  }

  try {
    return await translateWithGemini(text, fromLang, toLang);
  } catch (error) {
    console.error('Translation failed:', error);
    // Возвращаем оригинал при ошибке
    return text;
  }
}

// ========================================
// BULK TRANSLATION (последовательный)
// ========================================
export async function translateBulk(texts, fromLang, toLang) {
  if (fromLang === toLang || !texts || texts.length === 0) {
    return texts;
  }

  try {
    const translatedTexts = [];
    
    for (let i = 0; i < texts.length; i++) {
      if (!texts[i] || texts[i].trim() === '') {
        translatedTexts.push(texts[i]);
        continue;
      }
      
      const translated = await translateText(texts[i], fromLang, toLang);
      translatedTexts.push(translated);
      
      // Небольшая задержка между запросами
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return translatedTexts;
  } catch (error) {
    console.error('Bulk translation failed:', error);
    return texts;
  }
}

// ========================================
// OPTIMIZED BULK TRANSLATION (батчи)
// ========================================
export async function translateBulkOptimized(texts, fromLang, toLang) {
  if (fromLang === toLang || !texts || texts.length === 0) {
    return texts;
  }

  // Если мало текстов, используем обычный метод
  if (texts.length <= 2) {
    return translateBulk(texts, fromLang, toLang);
  }

  try {
    // Объединяем тексты с маркерами
    const textEntries = texts.map((text, index) => {
      return `[TEXT_${index}]\n${text}\n[/TEXT_${index}]`;
    }).join('\n\n');

    const prompt = `Translate the following texts from ${languageNames[fromLang]} to ${languageNames[toLang]}. Each text is wrapped in [TEXT_N] tags. Preserve the same tags in your response with translated content inside:\n\n${textEntries}`;

    const response = await axios.post(
      `${TRANSLATION_BASE_URL}/chat/completions`,
      {
        model: TRANSLATION_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate each tagged text accurately while preserving the tags and formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${TRANSLATION_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_URL,
          'X-Title': 'AI Resume Builder - Batch Translation',
        },
      }
    );

    const translatedCombined = response.data.choices[0].message.content.trim();

    // Извлекаем переведенные тексты
    const translatedTexts = [];
    for (let i = 0; i < texts.length; i++) {
      const regex = new RegExp(`\\[TEXT_${i}\\]\\s*([\\s\\S]*?)\\s*\\[\\/TEXT_${i}\\]`, 'm');
      const match = translatedCombined.match(regex);
      
      if (match && match[1]) {
        translatedTexts.push(match[1].trim());
      } else {
        // Fallback: если не нашли тег, используем оригинал
        translatedTexts.push(texts[i]);
      }
    }

    // Проверяем что получили все тексты
    if (translatedTexts.length === texts.length) {
      return translatedTexts;
    } else {
      console.warn('Batch translation incomplete, falling back to sequential');
      return translateBulk(texts, fromLang, toLang);
    }
  } catch (error) {
    console.error('Optimized bulk translation failed:', error);
    // Fallback к последовательному переводу
    return translateBulk(texts, fromLang, toLang);
  }
}

// ========================================
// RESUME CONTEXT-AWARE TRANSLATION
// ========================================
export async function translateResumeText(text, fromLang, toLang, context = '') {
  if (fromLang === toLang || !text || text.trim() === '') {
    return text;
  }

  try {
    const contextHint = context ? `This is a ${context} section of a professional resume.` : '';
    
    const response = await axios.post(
      `${TRANSLATION_BASE_URL}/chat/completions`,
      {
        model: TRANSLATION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a professional resume translator. ${contextHint} Translate from ${languageNames[fromLang]} to ${languageNames[toLang]} maintaining professional tone and impact. Return ONLY the translated text.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${TRANSLATION_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_URL,
          'X-Title': 'AI Resume Builder - Resume Translation',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Resume translation failed:', error);
    return text;
  }
}