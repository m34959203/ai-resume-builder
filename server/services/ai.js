/**
 * AI Service - OpenRouter Integration
 * 
 * Provides AI-powered features for resume building:
 * - Text translation (Gemini 2.0 Flash) - EN, KK, RU
 * - Resume analysis (DeepSeek R1) - Deep reasoning
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
  // DeepSeek R1 - для анализа резюме, сложных рекомендаций, глубокого мышления
  reasoning: process.env.OPENROUTER_MODEL_COMPLEX || 'deepseek/deepseek-r1:free',
  
  // Gemini 2.0 Flash - для быстрого перевода и простых задач
  translation: process.env.OPENROUTER_MODEL_TRANSLATE || 'google/gemini-2.0-flash-exp:free',
  
  // Основная модель для стандартных задач
  primary: process.env.OPENROUTER_MODEL_PRIMARY || 'google/gemini-2.0-flash-exp:free',
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
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  zh: 'Chinese (中文)',
};

const SYSTEM_PROMPTS = {
  en: {
    translator: 'You are a professional translator specializing in resume and business content. Translate accurately and naturally from one language to another, preserving professional tone, formatting, and context. Return ONLY the translated text without explanations.',
    
    summarizer: 'You are an expert career consultant assistant. Write concise, professional summaries in English. Maximum 3-4 sentences. Focus on key strengths, experience, and career goals.',
    
    recommender: 'You are a career development expert with deep knowledge of job markets. Always return ONLY valid, minified JSON without comments, explanations, or markdown formatting.',
    
    coverLetter: 'You are a professional career assistant specializing in cover letters. Write in English, business style, 150-220 words. Focus on achievements and specific examples. No generic phrases.',
    
    skillSuggester: 'You are a concise skill development advisor. Reply only with a comma-separated list of skills. No explanations, no numbering, no additional text.',
    
    textPolisher: 'You are a strict English editor. Fix grammar, spelling, and punctuation while preserving the original meaning and professional tone.',
    
    searchInferrer: 'You are a career assistant. Analyze the resume and return ONLY a valid JSON object for job search parameters in Kazakhstan job market.',
    
    analyzer: 'You are an expert resume analyst. Provide detailed, actionable feedback on resume content, structure, and optimization for ATS systems.',
  },
  kk: {
    translator: 'Сіз резюме және іскери мазмұнға маманданған кәсіби аудармашысыз. Бір тілден екінші тілге кәсіби үнді, форматты және контекстті сақтай отырып дәл және табиғи аударыңыз. Түсініктемелерсіз ТЕК аударылған мәтінді қайтарыңыз.',
    
    summarizer: 'Сіз мансап кеңесшісінің сарапшысыз. Қазақ тілінде қысқа, кәсіби түйіндемелер жазыңыз. Максимум 3-4 сөйлем. Негізгі күшті жақтарға, тәжірибеге және мансаптық мақсаттарға назар аударыңыз.',
    
    recommender: 'Сіз жұмыс нарығы туралы терең білімі бар мансапты дамыту сарапшысыз. Әрқашан түсініктемелерсіз, түсіндірмелерсіз немесе markdown форматтаусыз ТЕК жарамды, минификацияланған JSON қайтарыңыз.',
    
    coverLetter: 'Сіз сүйемелдеу хаттарына маманданған кәсіби мансап көмекшісісіз. Қазақ тілінде, іскерлік стильде, 150-220 сөз жазыңыз. Жетістіктер мен нақты мысалдарға назар аударыңыз. Жалпы фразалар жоқ.',
    
    skillSuggester: 'Сіз дағдыларды дамыту бойынша қысқаша кеңесші боласыз. Тек үтірмен бөлінген дағдылар тізімімен жауап беріңіз. Түсініктемелер жоқ, нөмірлеу жоқ, қосымша мәтін жоқ.',
    
    textPolisher: 'Сіз қатаң қазақ тілінің редакторысыз. Түпнұсқа мағынасы мен кәсіби үнді сақтай отырып грамматиканы, орфографияны және пунктуацияны түзетіңіз.',
    
    searchInferrer: 'Сіз мансап көмекшісісіз. Резюмені талдаңыз және Қазақстан жұмыс нарығындағы жұмыс іздеу параметрлері үшін ТЕК жарамды JSON объектін қайтарыңыз.',
    
    analyzer: 'Сіз резюмені талдау сарапшысыз. ATS жүйелері үшін резюме мазмұны, құрылымы және оңтайландыру бойынша егжей-тегжейлі, іс-қимылды кері байланыс беріңіз.',
  },
  ru: {
    translator: 'Ты профессиональный переводчик, специализирующийся на резюме и деловом контенте. Переводи точно и естественно с одного языка на другой, сохраняя профессиональный тон, форматирование и контекст. Возвращай ТОЛЬКО переведенный текст без пояснений.',
    
    summarizer: 'Ты эксперт-консультант по карьере. Пиши краткие, профессиональные резюме на русском языке. Максимум 3-4 предложения. Фокус на ключевых сильных сторонах, опыте и карьерных целях.',
    
    recommender: 'Ты эксперт по развитию карьеры с глубоким знанием рынка труда. Всегда возвращай ТОЛЬКО валидный, минифицированный JSON без комментариев, пояснений или markdown форматирования.',
    
    coverLetter: 'Ты профессиональный карьерный ассистент, специализирующийся на сопроводительных письмах. Пиши на русском, деловым стилем, 150-220 слов. Фокус на достижениях и конкретных примерах. Без общих фраз.',
    
    skillSuggester: 'Ты лаконичный советник по развитию навыков. Отвечай только списком навыков через запятую. Без пояснений, без нумерации, без дополнительного текста.',
    
    textPolisher: 'Ты строгий редактор русского языка. Исправляй грамматику, орфографию и пунктуацию, сохраняя исходный смысл и профессиональный тон.',
    
    searchInferrer: 'Ты карьерный ассистент. Проанализируй резюме и верни ТОЛЬКО валидный JSON-объект для параметров поиска работы на рынке труда Казахстана.',
    
    analyzer: 'Ты эксперт по анализу резюме. Предоставь детальную, actionable обратную связь по содержанию резюме, структуре и оптимизации для ATS-систем.',
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
 * Pick appropriate model based on task type
 */
function pickModel({ task = 'default', complex = false, override } = {}) {
  if (override) return override;
  
  // Выбор модели в зависимости от задачи
  switch (task) {
    case 'translate':
      return MODELS.translation; // Gemini 2.0 Flash для перевода
    
    case 'analyze':
    case 'recommend':
    case 'reason':
      return MODELS.reasoning; // DeepSeek R1 для анализа и рассуждений
    
    case 'simple':
    case 'polish':
    case 'summarize':
      return MODELS.primary; // Gemini для простых задач
    
    default:
      return complex ? MODELS.reasoning : MODELS.primary;
  }
}

/**
 * Build request headers
 */
function baseHeaders() {
  const headers = {
    Authorization: `Bearer ${ensureApiKey()}`,
    'Content-Type': 'application/json',
  };

  const referer = process.env.OPENROUTER_REFERER || process.env.ORIGIN_HEADER;
  if (referer) {
    headers['HTTP-Referer'] = referer;
  }

  const title = process.env.OPENROUTER_TITLE || process.env.APP_TITLE;
  if (title) {
    headers['X-Title'] = title;
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

  // Try finding first [ to last ]
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1));
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
  task = 'default',
  complex = false,
  overrideModel,
  temperature,
  max_tokens,
  language = 'ru',
}) {
  const model = pickModel({ task, complex, override: overrideModel });
  
  return openrouterChat({
    messages,
    model,
    temperature,
    max_tokens,
    reasoning: (task === 'analyze' || task === 'reason' || complex) 
      ? { effort: 'medium' } 
      : undefined,
  });
}

/* ============================= Translation =================================== */

/**
 * Translate text using Gemini 2.0 Flash
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code (optional)
 * @returns {Promise<string>} Translated text
 */
export async function translateWithAI(text, targetLanguage = 'en', sourceLanguage = 'auto') {
  if (!text || !text.trim()) return '';

  const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const sourceLangName = sourceLanguage === 'auto' 
    ? 'the source language'
    : (LANGUAGE_NAMES[sourceLanguage] || sourceLanguage);

  const systemPrompt = getSystemPrompt('translator', targetLanguage);
  const userPrompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. Preserve formatting, professional tone, and context. Return ONLY the translation:\n\n${text}`;

  try {
    const model = pickModel({ task: 'translate' }); // Gemini 2.0 Flash
    
    const translated = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.2, // Низкая температура для точности
      max_tokens: Math.min(4000, Math.max(500, text.length * 2)),
      timeoutMs: 25000,
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
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const results = [];
  
  for (const text of texts) {
    if (!text || !text.trim()) {
      results.push(text);
      continue;
    }

    try {
      const translated = await translateWithAI(text, targetLanguage, sourceLanguage);
      results.push(translated);
      
      // Небольшая задержка между запросами
      if (results.length < texts.length) {
        await delay(150);
      }
    } catch (error) {
      console.error('[AI] Batch translate item error:', error);
      results.push(text); // Use original on error
    }
  }

  return results;
}

/**
 * Optimized batch translation (combines multiple texts into one request)
 */
export async function translateBatchOptimized(texts, targetLanguage = 'en', sourceLanguage = 'auto') {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  
  // Для малого количества используем обычный метод
  if (texts.length <= 2) {
    return translateBatch(texts, targetLanguage, sourceLanguage);
  }

  try {
    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage === 'auto' 
      ? 'the source language'
      : (LANGUAGE_NAMES[sourceLanguage] || sourceLanguage);

    // Создаем пронумерованный список
    const numberedTexts = texts.map((text, idx) => 
      `[${idx + 1}] ${text}`
    ).join('\n\n');

    const systemPrompt = getSystemPrompt('translator', targetLanguage);
    const userPrompt = `Translate the following numbered texts from ${sourceLangName} to ${targetLangName}. Preserve the numbering format [1], [2], etc. Return translations in the same numbered format:\n\n${numberedTexts}`;

    const model = pickModel({ task: 'translate' });
    
    const response = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.2,
      max_tokens: 4000,
      timeoutMs: 30000,
    });

    // Парсим ответ
    const translatedTexts = [];
    for (let i = 0; i < texts.length; i++) {
      const regex = new RegExp(`\\[${i + 1}\\]\\s*([\\s\\S]*?)(?=\\n\\[${i + 2}\\]|$)`, 'm');
      const match = response.match(regex);
      
      if (match && match[1]) {
        translatedTexts.push(normalizeText(match[1].trim()));
      } else {
        // Fallback: переводим индивидуально
        const translated = await translateWithAI(texts[i], targetLanguage, sourceLanguage);
        translatedTexts.push(translated);
      }
    }

    return translatedTexts;
  } catch (error) {
    console.error('[AI] Optimized batch translation failed, falling back:', error);
    return translateBatch(texts, targetLanguage, sourceLanguage);
  }
}

/* ========================= Resume AI Functions (DeepSeek R1) ================= */

/**
 * Analyze resume using DeepSeek R1 (deep reasoning)
 */
export async function analyzeResume(resumeData, { language = 'ru', overrideModel } = {}) {
  const model = pickModel({ task: 'analyze', override: overrideModel }); // DeepSeek R1
  const systemPrompt = getSystemPrompt('analyzer', language);

  const userPrompt = language === 'en'
    ? `Analyze this resume comprehensively:\n\n${JSON.stringify(resumeData, null, 2)}\n\nProvide:\n1. Overall assessment (1-10 score)\n2. Key strengths (3-5 points)\n3. Areas for improvement (3-5 points)\n4. ATS optimization suggestions\n5. Recommended next steps`
    : language === 'kk'
    ? `Бұл резюмені жан-жақты талдаңыз:\n\n${JSON.stringify(resumeData, null, 2)}\n\nБеріңіз:\n1. Жалпы бағалау (1-10 балл)\n2. Негізгі күшті жақтар (3-5 тармақ)\n3. Жақсарту салалары (3-5 тармақ)\n4. ATS оңтайландыру ұсыныстары\n5. Ұсынылатын келесі қадамдар`
    : `Проанализируй это резюме комплексно:\n\n${JSON.stringify(resumeData, null, 2)}\n\nПредоставь:\n1. Общую оценку (балл 1-10)\n2. Ключевые сильные стороны (3-5 пунктов)\n3. Области для улучшения (3-5 пунктов)\n4. Рекомендации по оптимизации для ATS\n5. Рекомендуемые следующие шаги`;

  try {
    const analysis = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.4,
      max_tokens: 2000,
      reasoning: { effort: 'high' }, // Deep reasoning для анализа
    });

    return normalizeText(analysis);
  } catch (error) {
    console.error('[AI] Resume analysis error:', error);
    return language === 'en'
      ? 'Unable to analyze resume at this time. Please try again later.'
      : language === 'kk'
      ? 'Қазіргі уақытта резюмені талдау мүмкін емес. Кейінірек қайталап көріңіз.'
      : 'Не удалось проанализировать резюме. Попробуйте позже.';
  }
}

/**
 * Generate profile summary
 */
export async function summarizeProfile(profile, { language = 'ru', overrideModel } = {}) {
  const model = pickModel({ task: 'summarize', override: overrideModel });
  const systemPrompt = getSystemPrompt('summarizer', language);

  const userPrompt = language === 'en'
    ? `Candidate profile:\n${JSON.stringify(profile, null, 2)}\n\nCreate a compelling 3-4 sentence professional summary highlighting their key strengths, experience, and career focus. Write as a cohesive paragraph.`
    : language === 'kk'
    ? `Үміткердің профилі:\n${JSON.stringify(profile, null, 2)}\n\nОлардың негізгі күшті жақтарын, тәжірибесін және мансаптық бағытын көрсететін 3-4 сөйлемді кәсіби түйіндеме жасаңыз. Бүтін абзац ретінде жазыңыз.`
    : `Профиль кандидата:\n${JSON.stringify(profile, null, 2)}\n\nСоздай убедительное профессиональное резюме из 3-4 предложений, подчеркивающее ключевые сильные стороны, опыт и карьерный фокус. Пиши цельным абзацем.`;

  try {
    const summary = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.5,
      max_tokens: 250,
    });

    return normalizeText(summary);
  } catch (error) {
    console.error('[AI] Summarize error:', error);
    return language === 'en' 
      ? 'Experienced professional with diverse skill set and proven track record of success.'
      : language === 'kk'
      ? 'Әртүрлі дағдылары және дәлелденген жетістіктері бар тәжірибелі маман.'
      : 'Опытный специалист с разносторонними навыками и подтвержденными достижениями.';
  }
}

/**
 * Generate career recommendations using DeepSeek R1
 */
export async function recommendFromProfile(profile, { language = 'ru', complex = true, overrideModel } = {}) {
  const model = pickModel({ task: 'recommend', complex, override: overrideModel }); // DeepSeek R1
  const systemPrompt = getSystemPrompt('recommender', language);

  const schemaExample = {
    professions: ["string", "..."],
    skillsToLearn: ["string", "..."],
    courses: [{ name: "string", duration: "string" }],
    matchScore: 0
  };

  const userPrompt = language === 'en'
    ? `Analyze this candidate profile and provide career recommendations:\n\n${JSON.stringify(profile, null, 2)}\n\nReturn ONLY valid JSON with this exact structure:\n${JSON.stringify(schemaExample, null, 2)}\n\nWhere:\n- professions: 3-5 suitable job roles\n- skillsToLearn: 4-8 key skills for career growth\n- courses: 2-4 relevant courses (name and duration only, no URLs)\n- matchScore: integer 0-100 indicating market fit\n\nResponse must be valid JSON only, no markdown, no explanations.`
    : language === 'kk'
    ? `Бұл үміткер профилін талдаңыз және мансаптық ұсыныстар беріңіз:\n\n${JSON.stringify(profile, null, 2)}\n\nМынадай нақты құрылымы бар ТЕК жарамды JSON қайтарыңыз:\n${JSON.stringify(schemaExample, null, 2)}\n\nМұнда:\n- professions: 3-5 қолайлы жұмыс рөлдері\n- skillsToLearn: мансаптық өсу үшін 4-8 негізгі дағды\n- courses: 2-4 тиісті курс (тек атауы мен ұзақтығы, URL жоқ)\n- matchScore: нарыққа сәйкестікті көрсететін 0-100 бүтін сан\n\nЖауап тек жарамды JSON болуы керек, markdown жоқ, түсініктемелер жоқ.`
    : `Проанализируй профиль кандидата и предоставь карьерные рекомендации:\n\n${JSON.stringify(profile, null, 2)}\n\nВерни ТОЛЬКО валидный JSON со строго такой структурой:\n${JSON.stringify(schemaExample, null, 2)}\n\nГде:\n- professions: 3-5 подходящих ролей\n- skillsToLearn: 4-8 ключевых навыков для роста\n- courses: 2-4 курса (только название и длительность, без URL)\n- matchScore: целое число 0-100 о соответствии рынку\n\nОтвет должен быть только валидным JSON, без markdown, без пояснений.`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.4,
      max_tokens: 800,
      reasoning: complex ? { effort: 'medium' } : undefined,
    });

    const json = tryParseJSON(text);
    
    if (json && json.professions && json.skillsToLearn) {
      return json;
    }

    throw new Error('Invalid JSON structure');
  } catch (error) {
    console.error('[AI] Recommend error:', error);
    
    // Fallback
    return {
      professions: language === 'en'
        ? ['Software Engineer', 'Full Stack Developer', 'Frontend Developer']
        : language === 'kk'
        ? ['Бағдарламалық қамтамасыз ету инженері', 'Full Stack әзірлеуші', 'Frontend әзірлеуші']
        : ['Инженер-программист', 'Full Stack разработчик', 'Frontend разработчик'],
      skillsToLearn: language === 'en'
        ? ['TypeScript', 'React', 'Node.js', 'Docker', 'GraphQL', 'Testing']
        : language === 'kk'
        ? ['TypeScript', 'React', 'Node.js', 'Docker', 'GraphQL', 'Тестілеу']
        : ['TypeScript', 'React', 'Node.js', 'Docker', 'GraphQL', 'Тестирование'],
      courses: [
        { 
          name: language === 'en' ? 'Full Stack Web Development' : language === 'kk' ? 'Full Stack веб-әзірлеу' : 'Full Stack веб-разработка',
          duration: language === 'en' ? '3 months' : language === 'kk' ? '3 ай' : '3 месяца'
        },
        { 
          name: language === 'en' ? 'Advanced JavaScript' : language === 'kk' ? 'Жетілдірілген JavaScript' : 'Продвинутый JavaScript',
          duration: language === 'en' ? '2 months' : language === 'kk' ? '2 ай' : '2 месяца'
        },
      ],
      matchScore: 70,
    };
  }
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter(
  { vacancy, profile },
  { language = 'ru', complex = false, overrideModel } = {}
) {
  const model = pickModel({ task: complex ? 'reason' : 'simple', override: overrideModel });
  const systemPrompt = getSystemPrompt('coverLetter', language);

  const userPrompt = language === 'en'
    ? `Candidate:\n${JSON.stringify(profile, null, 2)}\n\nVacancy:\n${JSON.stringify(vacancy, null, 2)}\n\nWrite a personalized, professional cover letter (150-220 words).\n\nStructure:\n- Opening: Why this role interests you (no "Hello, my name is")\n- Body: Relevant experience and specific achievements\n- Closing: Motivation and interview availability\n\nFocus on concrete examples and measurable results.`
    : language === 'kk'
    ? `Үміткер:\n${JSON.stringify(profile, null, 2)}\n\nБос орын:\n${JSON.stringify(vacancy, null, 2)}\n\nЖекелендірілген, кәсіби сүйемелдеу хатын жазыңыз (150-220 сөз).\n\nҚұрылым:\n- Ашылу: Бұл рөл неге қызықтырады ("Сәлем, менің атым" жоқ)\n- Негізгі бөлім: Тиісті тәжірибе және нақты жетістіктер\n- Жабылу: Мотивация және сұхбат қол жетімділігі\n\nНақты мысалдар мен өлшенетін нәтижелерге назар аударыңыз.`
    : `Кандидат:\n${JSON.stringify(profile, null, 2)}\n\nВакансия:\n${JSON.stringify(vacancy, null, 2)}\n\nНапиши персонализированное профессиональное сопроводительное письмо (150-220 слов).\n\nСтруктура:\n- Вступление: Почему интересна эта роль (без "Здравствуйте, меня зовут")\n- Основная часть: Релевантный опыт и конкретные достижения\n- Заключение: Мотивация и готовность к собеседованию\n\nФокус на конкретных примерах и измеримых результатах.`;

  try {
    const content = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.6,
      max_tokens: 450,
      reasoning: complex ? { effort: 'low' } : undefined,
    });

    return normalizeText(content.replace(/```[\s\S]*?```/g, ''));
  } catch (error) {
    console.error('[AI] Cover letter error:', error);
    
    return language === 'en'
      ? 'I am very interested in this position and believe my experience aligns well with your requirements. I would be happy to discuss the opportunity in more detail during an interview.'
      : language === 'kk'
      ? 'Мен бұл лауазымға өте қызығушылық танытамын және менің тәжірибем сіздің талаптарыңызға жақсы сәйкес келеді деп ойлаймын. Сұхбат кезінде мүмкіндікті толығырақ талқылауға қуаныштымын.'
      : 'Я очень заинтересован в этой позиции и считаю, что мой опыт хорошо соответствует вашим требованиям. Буду рад обсудить возможность более подробно на собеседовании.';
  }
}

/**
 * Suggest skills for development
 */
export async function suggestSkills(profile, { language = 'ru', overrideModel } = {}) {
  const model = pickModel({ task: 'simple', override: overrideModel });
  const systemPrompt = getSystemPrompt('skillSuggester', language);

  const userPrompt = language === 'en'
    ? `Based on this profile:\n${JSON.stringify(profile, null, 2)}\n\nSuggest 6-8 relevant skills to learn for career growth. Reply with a comma-separated list only (e.g., "TypeScript, Docker, GraphQL"). No explanations, no numbers, no additional text.`
    : language === 'kk'
    ? `Осы профильге негізделген:\n${JSON.stringify(profile, null, 2)}\n\nМансаптық өсу үшін үйрену керек 6-8 тиісті дағдыны ұсыныңыз. Тек үтірмен бөлінген тізіммен жауап беріңіз (мысалы, "TypeScript, Docker, GraphQL"). Түсініктемелер жоқ, сандар жоқ, қосымша мәтін жоқ.`
    : `На основе этого профиля:\n${JSON.stringify(profile, null, 2)}\n\nПредложи 6-8 релевантных навыков для изучения и карьерного роста. Ответь только списком через запятую (например, "TypeScript, Docker, GraphQL"). Без пояснений, без номеров, без дополнительного текста.`;

  try {
    const text = await openrouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.4,
      max_tokens: 150,
    });

    const skills = text
      .replace(/\n/g, ' ')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    return skills.length > 0 ? skills : getFallbackSkills(language);
  } catch (error) {
    console.error('[AI] Suggest skills error:', error);
    return getFallbackSkills(language);
  }
}

function getFallbackSkills(language) {
  const fallbacks = {
    en: ['Communication', 'Data Analysis', 'TypeScript', 'SQL', 'Docker', 'Design Systems', 'Agile', 'Testing'],
    kk: ['Қарым-қатынас', 'Деректерді талдау', 'TypeScript', 'SQL', 'Docker', 'Дизайн жүйелері', 'Agile', 'Тестілеу'],
    ru: ['Коммуникации', 'Анализ данных', 'TypeScript', 'SQL', 'Docker', 'Design Systems', 'Agile', 'Тестирование'],
  };
  
  return fallbacks[language] || fallbacks.ru;
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
  const model = pickModel({ task: 'polish', complex: shouldUseComplex, override: overrideModel });

  const systemPrompt = getSystemPrompt('textPolisher', lang);
  const fullSystemPrompt = `${systemPrompt}\n\nAlways return ONLY valid JSON without extra text, code blocks, or markdown. Schema: {"corrected": string, "bullets": string[]}\n\nModes:\n- "paragraph": keep as solid text\n- "bullets": convert to short bullet points\n- "auto": preserve author's format`;

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
      temperature: 0.1,
      max_tokens: 800,
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
    
    // Небольшая задержка
    if (results.length < texts.length) {
      await delay(200);
    }
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

  const rawCity = String(profile.location || profile.city || '').trim();
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

  const model = pickModel({ task: 'simple', override: overrideModel });
  const systemPrompt = getSystemPrompt('searchInferrer', lang);

  const schemaExample = {
    role: "string",
    city: "string (Kazakhstan cities only)",
    skills: ["string"],
    experience: "noExperience|between1And3|between3And6|moreThan6"
  };

  const userPrompt = lang === 'en'
    ? `Analyze this profile and infer job search parameters for Kazakhstan job market:\n\n${JSON.stringify(profile, null, 2)}\n\nReturn ONLY valid JSON with this structure:\n${JSON.stringify(schemaExample, null, 2)}\n\nKazakhstan cities: ${KZ_CITIES.join(', ')}`
    : lang === 'kk'
    ? `Бұл профильді талдаңыз және Қазақстан жұмыс нарығы үшін жұмыс іздеу параметрлерін анықтаңыз:\n\n${JSON.stringify(profile, null, 2)}\n\nМынадай құрылымы бар ТЕК жарамды JSON қайтарыңыз:\n${JSON.stringify(schemaExample, null, 2)}\n\nҚазақстан қалалары: ${KZ_CITIES.join(', ')}`
    : `Проанализируй профиль и выведи параметры поиска работы для рынка труда Казахстана:\n\n${JSON.stringify(profile, null, 2)}\n\nВерни ТОЛЬКО валидный JSON с такой структурой:\n${JSON.stringify(schemaExample, null, 2)}\n\nГорода Казахстана: ${KZ_CITIES.join(', ')}`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.3,
      max_tokens: 600,
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
  translateBatchOptimized,
  analyzeResume,
  summarizeProfile,
  recommendFromProfile,
  generateCoverLetter,
  suggestSkills,
  polishText,
  polishMany,
  inferSearch,
};