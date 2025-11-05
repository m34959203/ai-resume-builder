const TRANSLATION_API_URL = import.meta.env.VITE_API_BASE_URL + '/api/translate' || 'http://localhost:3001/api/translate';

const translationCache = new Map();

export const translateText = async (text, targetLanguage, sourceLanguage = 'auto') => {
  if (!text || typeof text !== 'string') return text;
  
  const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const response = await fetch(TRANSLATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
        sourceLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    const translated = data.translatedText;
    
    translationCache.set(cacheKey, translated);
    
    return translated;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

export const translateBatch = async (texts, targetLanguage, sourceLanguage = 'auto') => {
  try {
    const promises = texts.map(text => translateText(text, targetLanguage, sourceLanguage));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
};

export const translateResumeData = async (resumeData, targetLanguage) => {
  try {
    const translated = { ...resumeData };

    if (resumeData.personalInfo) {
      translated.personalInfo = {
        ...resumeData.personalInfo,
        summary: await translateText(resumeData.personalInfo.summary, targetLanguage),
        position: await translateText(resumeData.personalInfo.position, targetLanguage),
      };
    }

    if (resumeData.experience && Array.isArray(resumeData.experience)) {
      translated.experience = await Promise.all(
        resumeData.experience.map(async (exp) => ({
          ...exp,
          position: await translateText(exp.position, targetLanguage),
          description: await translateText(exp.description, targetLanguage),
        }))
      );
    }

    if (resumeData.education && Array.isArray(resumeData.education)) {
      translated.education = await Promise.all(
        resumeData.education.map(async (edu) => ({
          ...edu,
          degree: await translateText(edu.degree, targetLanguage),
          field: await translateText(edu.field, targetLanguage),
        }))
      );
    }

    if (resumeData.skills && Array.isArray(resumeData.skills)) {
      translated.skills = resumeData.skills;
    }

    if (resumeData.languages && Array.isArray(resumeData.languages)) {
      translated.languages = resumeData.languages;
    }

    return translated;
  } catch (error) {
    console.error('Resume translation error:', error);
    return resumeData;
  }
};

export const detectLanguage = (text) => {
  if (!text) return 'unknown';
  
  const cyrillicPattern = /[а-яА-ЯёЁ]/;
  const kazakhPattern = /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/;
  
  if (kazakhPattern.test(text)) return 'kk';
  if (cyrillicPattern.test(text)) return 'ru';
  return 'en';
};