/**
 * AI Service - OpenRouter Integration
 * 
 * Provides AI-powered features for resume building:
 * - Text translation (EN, KK, RU)
 * - Content generation and improvement
 * - Career recommendations
 * - Skill suggestions
 * - Text polishing
 * 
 * @requires Node 18+
 * @module services/ai
 */

'use strict';

/* ============================= Configuration ================================= */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const MODELS = {
  primary: process.env.OPENROUTER_MODEL_PRIMARY || 'google/gemma-3-12b-it:free',
  complex: process.env.OPENROUTER_MODEL_COMPLEX || 'deepseek/deepseek-r1:free',
  translate: process.env.OPENROUTER_MODEL_TRANSLATE || 'google/gemma-3-12b-it:free',
};

const DEFAULT_TIMEOUT = Math.max(
  5000,
  Number(process.env.OR_TIMEOUT_MS || 30000) || 30000
);

/* ============================ Language Configs ================================ */

const LANGUAGE_NAMES = {
  en: 'English',
  kk: 'Kazakh (Қазақша)',
  ru: 'Russian (Русский)',
};

const SYSTEM_PROMPTS = {
  en: {
    translator: 'You are a professional translator. Translate accurately and naturally, preserving tone and context.',
    summarizer: 'You are a career consultant assistant. Write concisely and professionally in English. Maximum 3-4 sentences.',
    recommender: 'You are a career expert. Always return ONLY minified JSON without comments or explanations.',
    coverLetter: 'You are a career assistant. Write in English, business style, 150-220 words, no fluff, with achievement examples.',
    skillSuggester: 'You are a concise skill development assistant. Reply only with a list, comma-separated, no explanations.',
    textPolisher: 'You are a strict English editor. Fix spelling and punctuation without changing meaning.',
    searchInferrer: 'You are a career assistant. From resume JSON, return ONLY valid JSON object for job search in Kazakhstan.',
  },
  kk: {
    translator: 'Сіз кәсіби аудармашысыз. Мағынасы мен контекстін сақтай отырып, дәл және табиғи аударыңыз.',
    summarizer: 'Сіз мансап кеңесшісінің көмекшісісіз. Қысқа және кәсіби жазыңыз. Максимум 3-4 сөйлем.',
    recommender: 'Сіз мансап бойынша сарапшысыз. Әрқашан ТЕК минификацияланған JSON қайтарыңыз, түсініктемелерсіз.',
    coverLetter: 'Сіз мансап көмекшісісіз. Қазақ тілінде, іскерлік стильде, 150-220 сөз, қысқа, жетістіктер мысалдарымен жазыңыз.',
    skillSuggester: 'Сіз дағдыларды дамыту бойынша қысқа көмекшісіз. Тек тізіммен, үтірмен бөлінген, түсініктемесіз жауап беріңіз.',
    textPolisher: 'Сіз қатаң қазақ тілі редакторысыз. Мағынасын өзгертпей орфографияны және пунктуацияны түзетіңіз.',
    searchInferrer: 'Сіз мансап көмекшісісіз. Резюме JSON-нан Қазақстандағы жұмыс іздеу үшін ТЕК жарамды JSON объектін қайтарыңыз.',
  },
  ru: {
    translator: 'Ты профессиональный переводчик. Переводи точно и естественно, сохраняя тон и контекст.',
    summarizer: 'Ты помощник карьерного консультанта. Пиши кратко и профессионально на русском. Максимум 3-4 предложения.',
    recommender: 'Ты эксперт по карьере. Всегда возвращай ТОЛЬКО минифицированный JSON без комментариев и пояснений.',
    coverLetter: 'Ты карьерный ассистент. Пиши на русском, деловым стилем, 150-220 слов, без воды, с примерами достижений.',
    skillSuggester: 'Ты лаконичный ассистент по развитию навыков. Отвечай только списком, через запятую, без пояснений.',
    textPolisher: 'Ты строгий редактор на русском языке. Исправляй орфографию и пунктуацию, не меняя смысл.',
    searchInferrer: 'Ты карьерный ассистент. По JSON резюме верни ONLY валидный JSON-объект для поиска вакансий в Казахстане.',
  },
};

/* ============================== Utilities ==================================== */

/**
 * Ensure API key is set
 * @throws {Error} If OPENROUTER_API_KEY is not set
 */
function ensureApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Please set it in your environment variables.'
    );
  }
  return key;
}

/**
 * Pick appropriate model
 */
function pickModel({ complex = false, override, type = 'default' } = {}) {
  if (override) return override;
  if (type === 'translate') return MODELS.translate;
  return complex ? MODELS.complex : MODELS.primary;
}

/**
 * Build request headers
 */
function baseHeaders() {
  const headers = {
    Authorization: `Bearer ${ensureApiKey()}`,
    'Content-Type': 'application/json',
  };

  if (process.env.ORIGIN_HEADER) {
    headers['HTTP-Referer'] = process.env.ORIGIN_HEADER;
  }

  if (process.env.APP_TITLE) {
    headers['X-Title'] = process.env.APP_TITLE;
  }

  return headers;
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function withTimeout(fetchFactory, ms = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    return await fetchFactory(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Try to parse JSON from potentially noisy text
 */
function tryParseJSON(text) {
  if (!text) return null;

  // Try as-is
  try {
    return JSON.parse(text);
  } catch {}

  // Try extracting from ```json ... ```
  const fenceMatch = /```json\s*([\s\S]*?)\s*```/i.exec(text);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // Try finding first { to last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}

/**
 * Normalize text (clean up spacing and punctuation)
 */
function normalizeText(text) {
  return String(text ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*-\s*/g, ' — ')
    .replace(/\s*—\s*/g, ' — ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s*:\s*/g, ': ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/ +\./g, '.')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Get system prompt in specified language
 */
function getSystemPrompt(type, language = 'ru') {
  const lang = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.ru;
  return lang[type] || SYSTEM_PROMPTS.ru[type];
}

/* ======================== OpenRouter Communication =========================== */

/**
 * Request to OpenRouter with retries
 */
async function requestOpenRouter(
  { body, timeoutMs = DEFAULT_TIMEOUT },
  { retries = 2 } = {}
) {
  let attempt = 0;

  while (true) {
    const response = await withTimeout(
      (signal) =>
        fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: baseHeaders(),
          body: JSON.stringify(body),
          signal,
        }),
      timeoutMs
    );

    if (response.ok) {
      return response;
    }

    const status = response.status;
    const retryAfter = Number(response.headers?.get?.('Retry-After') || 0);
    const isRetriable = status === 429 || (status >= 500 && status < 600);

    if (attempt < retries && isRetriable) {
      const backoff = retryAfter > 0 
        ? retryAfter * 1000 
        : Math.min(400 * Math.pow(2, attempt), 3000);
      
      console.log(`[AI] Retrying after ${backoff}ms (attempt ${attempt + 1}/${retries})`);
      await delay(backoff);
      attempt += 1;
      continue;
    }

    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter error ${status}: ${errorText}`);
  }
}

/**
 * Chat with OpenRouter
 */
async function openrouterChat({
  messages,
  model,
  temperature = 0.2,
  max_tokens = 900,
  top_p = 0.9,
  reasoning,
  response_format,
  timeoutMs = DEFAULT_TIMEOUT,
}) {
  const body = {
    model,
    messages,
    temperature,
    top_p,
    max_tokens,
    stream: false,
  };

  if (reasoning) body.reasoning = reasoning;
  if (response_format) body.response_format = response_format;

  const response = await requestOpenRouter({ body, timeoutMs });
  const data = await response.json();
  
  const content = data?.choices?.[0]?.message?.content ?? '';
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/**
 * Safe chat with JSON format fallback
 */
async function openrouterChatSafe(args) {
  try {
    return await openrouterChat({
      ...args,
      response_format: args.response_format ?? { type: 'json_object' },
    });
  } catch (error) {
    console.warn('[AI] JSON format failed, retrying without format:', error.message);
    return openrouterChat({ ...args, response_format: undefined });
  }
}

/* =========================== Public API Functions ============================ */

/**
 * Generic LLM chat function
 */
export async function chatLLM({
  messages,
  complex = false,
  overrideModel,
  temperature,
  max_tokens,
  language = 'ru',
}) {
  const model = pickModel({ complex, override: overrideModel });
  
  return openrouterChat({
    messages,
    model,
    temperature,
    max_tokens,
    reasoning: complex ? { effort: 'medium' } : undefined,
  });
}

/* ============================= Translation =================================== */

/**
 * Translate text using AI
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code (optional)
 * @returns {Promise<string>} Translated text
 */
export async function translateWithAI(text, targetLanguage = 'en', sourceLanguage = 'auto') {
  if (!text) return '';

  const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const sourceLangName = sourceLanguage === 'auto' 
    ? 'the source language'
    : (LANGUAGE_NAMES[sourceLanguage] || sourceLanguage);

  const systemPrompt = getSystemPrompt('translator', targetLanguage);
  const userPrompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. Return ONLY the translation without any explanations or additional text:\n\n${text}`;

  try {
    const model = pickModel({ type: 'translate' });
    
    const translated = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.3,
      max_tokens: Math.min(2000, text.length * 2),
      timeoutMs: 20000,
    });

    return normalizeText(translated);
  } catch (error) {
    console.error('[AI] Translation error:', error);
    return text; // Return original on error
  }
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(texts, targetLanguage = 'en', sourceLanguage = 'auto') {
  const results = [];
  
  for (const text of texts) {
    try {
      const translated = await translateWithAI(text, targetLanguage, sourceLanguage);
      results.push(translated);
    } catch (error) {
      console.error('[AI] Batch translate item error:', error);
      results.push(text); // Use original on error
    }
  }

  return results;
}

/* ========================= Resume AI Functions =============================== */

/**
 * Generate profile summary
 */
export async function summarizeProfile(profile, { language = 'ru', overrideModel } = {}) {
  const model = pickModel({ complex: false, override: overrideModel });
  const systemPrompt = getSystemPrompt('summarizer', language);

  const userPrompt = language === 'en'
    ? `Candidate profile (JSON):\n${JSON.stringify(profile, null, 2)}\n\nCreate a brief summary of the candidate's strengths and focus. No lists or bullets - solid text.`
    : language === 'kk'
    ? `Үміткердің профилі (JSON):\n${JSON.stringify(profile, null, 2)}\n\nҮміткердің күшті жақтары мен бағытының қысқаша түйіндемесін жасаңыз. Тізімсіз және белгілеусіз - тұтас мәтін.`
    : `Профиль кандидата (JSON):\n${JSON.stringify(profile, null, 2)}\n\nСделай краткое саммари сильных сторон и фокуса кандидата. Без списков и маркировок - цельный текст.`;

  try {
    return await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.4,
      max_tokens: 220,
    });
  } catch (error) {
    console.error('[AI] Summarize error:', error);
    return language === 'en' 
      ? 'Experienced professional with diverse skill set.'
      : language === 'kk'
      ? 'Әртүрлі дағдылары бар тәжірибелі маман.'
      : 'Опытный специалист с разносторонними навыками.';
  }
}

/**
 * Generate career recommendations
 */
export async function recommendFromProfile(profile, { language = 'ru', complex = false, overrideModel } = {}) {
  const model = pickModel({ complex, override: overrideModel });
  const systemPrompt = getSystemPrompt('recommender', language);

  const userPrompt = language === 'en'
    ? `Here is the candidate profile:\n${JSON.stringify(profile, null, 2)}\n\nCreate a JSON object with this structure:\n{"professions":["string",...], "skillsToLearn":["string",...], "courses":[{"name":"string","duration":"string"},...], "matchScore":0}\nWhere:\n- "professions" - 3-5 suitable roles\n- "skillsToLearn" - 4-8 key skills for growth\n- "courses" - 2-4 courses ({"name","duration"}, no links)\n- "matchScore" - integer 0-100 for market fit\nResponse - ONLY JSON, NO text.`
    : language === 'kk'
    ? `Міне үміткердің профилі:\n${JSON.stringify(profile, null, 2)}\n\nМынадай құрылымды JSON объектін жасаңыз:\n{"professions":["string",...], "skillsToLearn":["string",...], "courses":[{"name":"string","duration":"string"},...], "matchScore":0}\nМұнда:\n- "professions" - 3-5 қолайлы рөлдер\n- "skillsToLearn" - өсу үшін 4-8 негізгі дағды\n- "courses" - 2-4 курс ({"name","duration"}, сілтемелерсіз)\n- "matchScore" - нарыққа сәйкестік үшін 0-100 бүтін сан\nЖауап - ТЕК JSON, МӘТІНСІЗ.`
    : `Вот профиль кандидата:\n${JSON.stringify(profile, null, 2)}\n\nСформируй объект JSON строго такого вида:\n{"professions":["string",...], "skillsToLearn":["string",...], "courses":[{"name":"string","duration":"string"},...], "matchScore":0}\nГде:\n- "professions" - 3-5 подходящих ролей\n- "skillsToLearn" - 4-8 ключевых навыков для роста\n- "courses" - 2-4 курса ({"name","duration"}, без ссылок)\n- "matchScore" - целое 0-100 о соответствии рынку\nОтвет - ТОЛЬКО JSON, БЕЗ текста.`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: complex ? 0.6 : 0.3,
      max_tokens: 600,
      reasoning: complex ? { effort: 'medium' } : undefined,
    });

    const json = tryParseJSON(text);
    if (json) return json;
  } catch (error) {
    console.error('[AI] Recommend error:', error);
  }

  // Fallback
  return {
    professions: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'],
    skillsToLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
    courses: [
      { name: 'Coursera — React Specialization', duration: '3 months' },
      { name: 'Udemy — Complete Web Development', duration: '2 months' },
    ],
    matchScore: 70,
  };
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter(
  { vacancy, profile },
  { language = 'ru', complex = false, overrideModel } = {}
) {
  const model = pickModel({ complex, override: overrideModel });
  const systemPrompt = getSystemPrompt('coverLetter', language);

  const userPrompt = language === 'en'
    ? `Candidate data:\n${JSON.stringify(profile, null, 2)}\n\nVacancy (brief):\n${JSON.stringify(vacancy, null, 2)}\n\nTask: create a personalized cover letter.\nFormat requirements:\n- No "Hello, my name is" greeting\n- 2-3 paragraphs: relevant experience → stack and achievements → motivation/fit\n- End with 1 sentence about interview readiness.`
    : language === 'kk'
    ? `Үміткер деректері:\n${JSON.stringify(profile, null, 2)}\n\nБос орын (қысқаша):\n${JSON.stringify(vacancy, null, 2)}\n\nТапсырма: жекелендірілген сүйемелдеу хатын жасаңыз.\nФормат талаптары:\n- "Сәлем, менің атым" сәлемдемесіз\n- 2-3 абзац: тиісті тәжірибе → стек және жетістіктер → мотивация/сәйкестік\n- Сұхбатқа дайындық туралы 1 сөйлеммен аяқтаңыз.`
    : `Данные кандидата:\n${JSON.stringify(profile, null, 2)}\n\nВакансия (кратко):\n${JSON.stringify(vacancy, null, 2)}\n\nЗадача: сделай персонализированное сопроводительное письмо.\nТребования к формату:\n- Обращение без "Здравствуйте, меня зовут"\n- 2-3 абзаца: релевантный опыт → стек и достижения → мотивация/fit\n- В конце 1 предложение про готовность к собеседованию.`;

  try {
    const content = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.5,
      max_tokens: 380,
      reasoning: complex ? { effort: 'low' } : undefined,
    });

    return normalizeText(content.replace(/```[\s\S]*?```/g, ''));
  } catch (error) {
    console.error('[AI] Cover letter error:', error);
    
    return language === 'en'
      ? 'I am ready to discuss the vacancy details and would be happy to tell more about relevant projects during the interview.'
      : language === 'kk'
      ? 'Бос орын туралы толығырақ талқылауға дайынмын және сұхбат кезінде тиісті жобалар туралы көбірек айтуға қуаныштымын.'
      : 'Готов обсудить детали вакансии и буду рад рассказать больше о релевантных проектах на собеседовании.';
  }
}

/**
 * Suggest skills for development
 */
export async function suggestSkills(profile, { language = 'ru', overrideModel } = {}) {
  const model = pickModel({ complex: false, override: overrideModel });
  const systemPrompt = getSystemPrompt('skillSuggester', language);

  const userPrompt = language === 'en'
    ? `Profile:\n${JSON.stringify(profile, null, 2)}\nProvide 6-8 skills for development (one-two word names), no explanations.`
    : language === 'kk'
    ? `Профиль:\n${JSON.stringify(profile, null, 2)}\nДамыту үшін 6-8 дағдыны беріңіз (бір-екі сөзді атаулар), түсініктемесіз.`
    : `Профиль:\n${JSON.stringify(profile, null, 2)}\nДай 6-8 навыков для развития (одно-двухсловные названия), без пояснений.`;

  try {
    const text = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.3,
      max_tokens: 120,
    });

    return text
      .replace(/\n/g, ' ')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch (error) {
    console.error('[AI] Suggest skills error:', error);
    
    return language === 'en'
      ? ['Communication', 'Data Analysis', 'TypeScript', 'SQL', 'Docker', 'Design Systems']
      : language === 'kk'
      ? ['Қарым-қатынас', 'Деректерді талдау', 'TypeScript', 'SQL', 'Docker', 'Дизайн жүйелері']
      : ['Коммуникации', 'Аналитика данных', 'TypeScript', 'SQL', 'Docker', 'Design Systems'];
  }
}

/* ============================= Text Polishing ================================ */

/**
 * Polish text (fix grammar, punctuation, optionally convert to bullets)
 */
export async function polishText(
  text,
  {
    lang = 'ru',
    mode = 'auto',
    complex,
    overrideModel,
    maxBullets = 16,
  } = {}
) {
  if (!text) return { corrected: '', bullets: [] };

  const shouldUseComplex = complex ?? (mode === 'bullets' || String(text).length > 600);
  const model = pickModel({ complex: shouldUseComplex, override: overrideModel });

  const systemPrompt = getSystemPrompt('textPolisher', lang);
  const fullSystemPrompt = `${systemPrompt} Always return ONLY JSON without extra text. Schema: {"corrected": string, "bullets": string[]}. Modes: "paragraph" - solid text; "bullets" - short points; "auto" - preserve author's format.`;

  const userPrompt = JSON.stringify({
    lang,
    mode,
    maxBullets,
    text: String(text),
  });

  try {
    const content = await openrouterChatSafe({
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: shouldUseComplex ? 0.2 : 0.1,
      max_tokens: 700,
      reasoning: shouldUseComplex ? { effort: 'low' } : undefined,
    });

    const json = tryParseJSON(content);
    const corrected = json?.corrected ?? String(text);
    let bullets = Array.isArray(json?.bullets) ? json.bullets.filter(Boolean) : [];

    if (maxBullets && bullets.length > maxBullets) {
      bullets = bullets.slice(0, maxBullets);
    }

    return {
      corrected: normalizeText(corrected),
      bullets: bullets.map(normalizeText),
    };
  } catch (error) {
    console.error('[AI] Polish text error:', error);
    return { corrected: String(text), bullets: [] };
  }
}

/**
 * Batch polish multiple texts
 */
export async function polishMany(texts, opts = {}) {
  const results = [];
  
  for (const text of Array.isArray(texts) ? texts : []) {
    const result = await polishText(text, opts);
    results.push(result);
  }

  return results;
}

/* ======================== Job Search Inference =============================== */

const KZ_CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар',
  'Усть-Каменогорск', 'Семей', 'Костанай', 'Кызылорда', 'Атырау', 'Актау',
  'Туркестан', 'Петропавловск', 'Талдыкорган', 'Кокшетау', 'Темиртау',
  'Экибастуз', 'Рудный',
];

function calculateYearsOfExperience(profile = {}) {
  const experiences = Array.isArray(profile.experience) ? profile.experience : [];
  if (!experiences.length) return 0;

  let totalMs = 0;

  for (const exp of experiences) {
    const start = exp?.start || exp?.from || exp?.dateStart || exp?.date_from;
    const end = exp?.end || exp?.to || exp?.dateEnd || exp?.date_to || new Date().toISOString();

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    if (startDate && endDate && !isNaN(+startDate) && !isNaN(+endDate) && endDate > startDate) {
      totalMs += (+endDate - +startDate);
    } else {
      totalMs += 365 * 24 * 3600 * 1000; // Default to 1 year
    }
  }

  return totalMs / (365 * 24 * 3600 * 1000);
}

function yearsToExperienceLevel(years) {
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

function fallbackInferSearch(profile = {}) {
  const years = calculateYearsOfExperience(profile);
  const experience = yearsToExperienceLevel(years);

  const experiences = Array.isArray(profile.experience) ? profile.experience : [];
  const latestExp = experiences[0] || experiences[experiences.length - 1] || {};
  
  const role = latestExp.position 
    || latestExp.title 
    || latestExp.role 
    || (Array.isArray(profile.skills) && profile.skills[0]) 
    || 'Специалист';

  const rawCity = String(profile.location || '').trim();
  const city = KZ_CITIES.find((c) => new RegExp(c, 'i').test(rawCity)) || 'Алматы';

  const skills = (
    Array.isArray(profile.skills) && profile.skills.length
      ? profile.skills
      : String(latestExp.description || latestExp.responsibilities || profile.summary || '')
          .split(/[,\n;•\-]/)
          .map((s) => s.trim())
          .filter(Boolean)
  ).slice(0, 8);

  return { role, city, skills, experience };
}

/**
 * Infer job search parameters from profile
 */
export async function inferSearch(profile = {}, { lang = 'ru', overrideModel } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    return fallbackInferSearch(profile);
  }

  const model = pickModel({ complex: false, override: overrideModel });
  const systemPrompt = getSystemPrompt('searchInferrer', lang);

  const userPrompt = lang === 'en'
    ? `Interface language: ${lang}\nUser profile (JSON):\n${JSON.stringify(profile, null, 2)}\n\nResponse format:\n{"role":"string", "city":"string (KZ only)", "skills":["string",...], "experience":"noExperience|between1And3|between3And6|moreThan6"}`
    : lang === 'kk'
    ? `Интерфейс тілі: ${lang}\nПайдаланушы профилі (JSON):\n${JSON.stringify(profile, null, 2)}\n\nЖауап форматы:\n{"role":"string", "city":"string (тек ҚР)", "skills":["string",...], "experience":"noExperience|between1And3|between3And6|moreThan6"}`
    : `Язык интерфейса: ${lang}\nПрофиль пользователя (JSON):\n${JSON.stringify(profile, null, 2)}\n\nФормат ответа:\n{"role":"string", "city":"string (только РК)", "skills":["string",...], "experience":"noExperience|between1And3|between3And6|moreThan6"}`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.2,
      max_tokens: 500,
    });

    const json = tryParseJSON(text) || {};
    const fallback = fallbackInferSearch(profile);

    const role = String(json.role || '').trim() || fallback.role;

    let city = String(json.city || '').trim() || fallback.city;
    if (!KZ_CITIES.includes(city)) {
      const match = KZ_CITIES.find((c) => new RegExp(c, 'i').test(city));
      city = match || fallback.city;
    }

    const skills = Array.isArray(json.skills)
      ? json.skills.filter(Boolean).slice(0, 8)
      : fallback.skills;

    const validExp = ['noExperience', 'between1And3', 'between3And6', 'moreThan6'];
    const experience = validExp.includes(json.experience) 
      ? json.experience 
      : fallback.experience;

    return { role, city, skills, experience };
  } catch (error) {
    console.error('[AI] Infer search error:', error);
    return fallbackInferSearch(profile);
  }
}

/* ============================== Module Exports =============================== */

export default {
  MODELS,
  chatLLM,
  translateWithAI,
  translateBatch,
  summarizeProfile,
  recommendFromProfile,
  generateCoverLetter,
  suggestSkills,
  polishText,
  polishMany,
  inferSearch,
};