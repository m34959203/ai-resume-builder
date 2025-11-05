const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Переводит текст с одного языка на другой
export const translateText = async (text, fromLang, toLang) => {
  if (!text || fromLang === toLang) return text;

  try {
    const response = await fetch(`${API_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        from: fromLang,
        to: toLang,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Возвращаем оригинальный текст при ошибке
  }
};

// Переводит массив текстов
export const translateBulk = async (texts, fromLang, toLang) => {
  if (!texts || texts.length === 0 || fromLang === toLang) return texts;

  try {
    const response = await fetch(`${API_URL}/api/translate/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        from: fromLang,
        to: toLang,
      }),
    });

    if (!response.ok) {
      throw new Error('Bulk translation failed');
    }

    const data = await response.json();
    return data.translatedTexts;
  } catch (error) {
    console.error('Bulk translation error:', error);
    return texts;
  }
};

// Переводит все данные резюме
export const translateResumeData = async (resumeData, fromLang, toLang) => {
  if (fromLang === toLang) return resumeData;

  try {
    // Собираем все тексты для перевода
    const textsToTranslate = [];
    const textMap = [];

    // Функция для добавления текста в массив
    const addText = (text, path) => {
      if (text && typeof text === 'string' && text.trim()) {
        textsToTranslate.push(text);
        textMap.push(path);
      }
    };

    // Личная информация
    addText(resumeData.personalInfo?.summary, 'personalInfo.summary');
    addText(resumeData.personalInfo?.position, 'personalInfo.position');

    // Опыт работы
    resumeData.experience?.forEach((exp, i) => {
      addText(exp.position, `experience.${i}.position`);
      addText(exp.company, `experience.${i}.company`);
      addText(exp.description, `experience.${i}.description`);
      exp.achievements?.forEach((ach, j) => {
        addText(ach, `experience.${i}.achievements.${j}`);
      });
    });

    // Образование
    resumeData.education?.forEach((edu, i) => {
      addText(edu.institution, `education.${i}.institution`);
      addText(edu.degree, `education.${i}.degree`);
      addText(edu.field, `education.${i}.field`);
    });

    // Навыки
    resumeData.skills?.forEach((skill, i) => {
      addText(skill.name, `skills.${i}.name`);
    });

    // Языки
    resumeData.languages?.forEach((lang, i) => {
      addText(lang.name, `languages.${i}.name`);
    });

    // Сертификаты
    resumeData.certifications?.forEach((cert, i) => {
      addText(cert.name, `certifications.${i}.name`);
      addText(cert.issuer, `certifications.${i}.issuer`);
    });

    // Проекты
    resumeData.projects?.forEach((proj, i) => {
      addText(proj.name, `projects.${i}.name`);
      addText(proj.description, `projects.${i}.description`);
    });

    // Переводим все тексты
    const translatedTexts = await translateBulk(textsToTranslate, fromLang, toLang);

    // Создаем новый объект с переведенными данными
    const translatedData = JSON.parse(JSON.stringify(resumeData));

    // Применяем переводы
    translatedTexts.forEach((translatedText, index) => {
      const path = textMap[index];
      const keys = path.split('.');
      let obj = translatedData;

      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }

      obj[keys[keys.length - 1]] = translatedText;
    });

    return translatedData;
  } catch (error) {
    console.error('Resume translation error:', error);
    throw error;
  }
};

// Переводит AI-рекомендации
export const translateAIResponse = async (aiResponse, toLang) => {
  try {
    const response = await fetch(`${API_URL}/api/translate/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: aiResponse,
        to: toLang,
      }),
    });

    if (!response.ok) {
      throw new Error('AI response translation failed');
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('AI translation error:', error);
    return aiResponse;
  }
};

// Переводит вакансии с HH
export const translateHHVacancies = async (vacancies, toLang) => {
  try {
    const translatedVacancies = await Promise.all(
      vacancies.map(async (vacancy) => {
        const [translatedName, translatedDescription] = await translateBulk(
          [vacancy.name, vacancy.snippet?.requirement || ''],
          'ru', // HH обычно на русском
          toLang
        );

        return {
          ...vacancy,
          name: translatedName,
          snippet: {
            ...vacancy.snippet,
            requirement: translatedDescription,
          },
        };
      })
    );

    return translatedVacancies;
  } catch (error) {
    console.error('HH vacancies translation error:', error);
    return vacancies;
  }
};