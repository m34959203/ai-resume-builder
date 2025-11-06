import NodeCache from 'node-cache';

const translationCache = new NodeCache({ 
  stdTTL: 86400, // 24 часа
  checkperiod: 3600 
});

const GEMINI_API_KEY = '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';
const GEMINI_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Перевод текста через Gemini API
 */
async function translateText(text, targetLang, context = '') {
  // Проверка кэша
  const cacheKey = `${text}_${targetLang}_${context}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const langNames = {
    ru: 'Russian',
    kz: 'Kazakh',
    en: 'English'
  };

  const systemPrompt = context 
    ? `You are a professional translator specializing in ${context}. Translate to ${langNames[targetLang]}.`
    : `Translate the following text to ${langNames[targetLang]}. Return ONLY the translation, no explanations.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    const translation = data.choices[0].message.content.trim();

    // Сохранить в кэш
    translationCache.set(cacheKey, translation);

    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Возврат оригинала при ошибке
  }
}

/**
 * Пакетный перевод массива текстов
 */
async function translateBatch(texts, targetLang, context = '') {
  const promises = texts.map(text => translateText(text, targetLang, context));
  return Promise.all(promises);
}

/**
 * Перевод объекта резюме
 */
async function translateResume(resumeData, targetLang) {
  const context = 'resume/CV content';
  
  const translated = { ...resumeData };

  // Личная информация
  if (resumeData.summary) {
    translated.summary = await translateText(resumeData.summary, targetLang, context);
  }

  // Опыт работы
  if (resumeData.experience?.length) {
    translated.experience = await Promise.all(
      resumeData.experience.map(async (exp) => ({
        ...exp,
        position: await translateText(exp.position, targetLang, context),
        company: exp.company, // Название компании не переводим
        description: await translateText(exp.description, targetLang, context),
        achievements: await translateBatch(exp.achievements || [], targetLang, context)
      }))
    );
  }

  // Образование
  if (resumeData.education?.length) {
    translated.education = await Promise.all(
      resumeData.education.map(async (edu) => ({
        ...edu,
        degree: await translateText(edu.degree, targetLang, context),
        field: await translateText(edu.field, targetLang, context),
        institution: edu.institution // Название вуза не переводим
      }))
    );
  }

  // Навыки
  if (resumeData.skills?.length) {
    translated.skills = await translateBatch(resumeData.skills, targetLang, 'technical skills');
  }

  return translated;
}

/**
 * Перевод вакансий HH
 */
async function translateVacancies(vacancies, targetLang) {
  return Promise.all(
    vacancies.map(async (vacancy) => ({
      ...vacancy,
      name: await translateText(vacancy.name, targetLang, 'job vacancy'),
      description: vacancy.description 
        ? await translateText(vacancy.description, targetLang, 'job vacancy')
        : null,
      requirement: vacancy.requirement
        ? await translateText(vacancy.requirement, targetLang, 'job requirements')
        : null,
      responsibility: vacancy.responsibility
        ? await translateText(vacancy.responsibility, targetLang, 'job responsibilities')
        : null
    }))
  );
}

/**
 * Перевод AI рекомендаций
 */
async function translateRecommendations(recommendations, targetLang) {
  return Promise.all(
    recommendations.map(async (rec) => ({
      ...rec,
      title: await translateText(rec.title, targetLang, 'career advice'),
      description: await translateText(rec.description, targetLang, 'career advice'),
      action: await translateText(rec.action, targetLang, 'career advice')
    }))
  );
}

export {
  translateText,
  translateBatch,
  translateResume,
  translateVacancies,
  translateRecommendations,
  translationCache
};