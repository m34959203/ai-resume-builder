// src/services/ai.js

/**
 * Генерация рекомендаций для резюме с помощью серверного AI‑прокси.
 * Возвращает объект { professions, skillsToLearn, courses, matchScore }.
 *
 * При недоступности сервиса или ошибках возвращается детерминированный набор
 * рекомендаций, основанный на текущих навыках кандидата.
 *
 * @param {Object} profile Профиль пользователя (полные данные из анкеты).
 * @returns {Promise<Object>} Рекомендации в формате { professions, skillsToLearn, courses, matchScore }
 */
export async function generateRecommendationsLLM(profile) {
  const userProfile = profile || {};
  try {
    // Сообщения для LLM: система просит вернуть только JSON
    const messages = [
      {
        role: 'system',
        content:
          'Ты карьерный консультант. Всегда возвращай ТОЛЬКО валидный JSON с полями: ' +
          '{"professions": string[], "skillsToLearn": string[], ' +
          '"courses": [{"name": string, "duration": string}], "matchScore": number}. Без комментариев и пояснений.',
      },
      {
        role: 'user',
        content:
          `Профиль:\n${JSON.stringify(userProfile)}\n` +
          'Верни только JSON без пояснений.',
      },
    ];

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, complexity: 'auto', temperature: 0.3 }),
    });
    if (!response.ok) {
      throw new Error(`AI proxy responded with status ${response.status}`);
    }
    const data = await response.json();
    const content = data?.content || '';

    // Ищем JSON‑объект в тексте (бывает, что модель добавляет лишний текст)
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON found in AI response');
    }
    const jsonString = content.slice(start, end + 1);
    const parsed = JSON.parse(jsonString);

    return {
      professions: Array.isArray(parsed.professions) ? parsed.professions : [],
      skillsToLearn: Array.isArray(parsed.skillsToLearn) ? parsed.skillsToLearn : [],
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      matchScore:
        typeof parsed.matchScore === 'number' && !Number.isNaN(parsed.matchScore)
          ? parsed.matchScore
          : 0,
    };
  } catch (error) {
    // Фолбэк: базовые рекомендации по навыкам
    const lowerSkills = (userProfile.skills || []).map((s) => String(s).toLowerCase());
    const hasDevSkills = lowerSkills.some((s) =>
      ['react', 'javascript', 'python', 'java'].includes(s),
    );
    const hasDesignSkills = lowerSkills.some((s) =>
      ['figma', 'photoshop', 'design'].includes(s),
    );

    if (hasDevSkills) {
      return {
        professions: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'],
        skillsToLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
        courses: [
          { name: 'Coursera — React Специализация', duration: '3 месяца' },
          { name: 'Udemy — Complete Web Development', duration: '2 месяца' },
          { name: 'Stepik — Python для начинающих', duration: '1 месяц' },
        ],
        matchScore: 75,
      };
    }
    if (hasDesignSkills) {
      return {
        professions: ['UI/UX Designer', 'Product Designer', 'Graphic Designer'],
        skillsToLearn: ['User Research', 'Interaction Design', 'Design Systems'],
        courses: [
          { name: 'Coursera — UX Research', duration: '3 месяца' },
          { name: 'Udemy — UI/UX Design', duration: '2 месяца' },
        ],
        matchScore: 72,
      };
    }
    // Общий фолбэк
    return {
      professions: ['Project Manager', 'Business Analyst', 'Marketing Specialist'],
      skillsToLearn: ['Agile', 'Data Analysis', 'Digital Marketing'],
      courses: [
        { name: 'Udemy — Project Management', duration: '3 месяца' },
        { name: 'Coursera — Data Analysis', duration: '2 месяца' },
      ],
      matchScore: 65,
    };
  }
}

// Экспорт по умолчанию на случай будущих расширений
export default {
  generateRecommendationsLLM,
};
