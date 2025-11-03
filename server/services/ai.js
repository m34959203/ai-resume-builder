// server/services/ai.js
// Node ESM. Требуется Node 18+ (в Node 22 есть встроенный fetch).
// Работает через OpenRouter: https://openrouter.ai
//
// ENV:
//   OPENROUTER_API_KEY=<ключ OpenRouter>
//   OPENROUTER_MODEL_PRIMARY=google/gemma-3-12b-it:free     (опц. переопределение primary)
//   OPENROUTER_MODEL_COMPLEX=deepseek/deepseek-r1:free      (опц. переопределение complex)
//   ORIGIN_HEADER=<https://ваш-домен>                       (опционально — попадёт в HTTP-Referer)
//   APP_TITLE=AI Resume Builder                              (опционально — попадёт в X-Title)
//   OR_TIMEOUT_MS=30000                                      (опционально — таймаут, мс)
//
// Модели по умолчанию:
//   - Быстрая/дешевая:  google/gemma-3-12b-it:free
//   - «Сложная»/рассуждения: deepseek/deepseek-r1:free
//
// Экспортирует:
//   MODELS, chatLLM, summarizeProfile, recommendFromProfile,
//   generateCoverLetter, suggestSkills,
//   polishText, polishMany,
//   inferSearch  ← извлечение "должность • город (KZ) • навыки • опыт" из резюме
//
// 🔤 Новое: все генераторы принимают opts.lang ('ru' | 'kk' | 'en') и формируют результат на нужном языке.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const MODELS = {
  primary: process.env.OPENROUTER_MODEL_PRIMARY || 'google/gemma-3-12b-it:free',
  complex: process.env.OPENROUTER_MODEL_COMPLEX || 'deepseek/deepseek-r1:free',
};

const DEFAULT_TIMEOUT = Math.max(
  5_000,
  Number(process.env.OR_TIMEOUT_MS || 30_000) || 30_000
);

/* =============================== Lang helpers =============================== */

function normalizeLang(l) {
  const v = String(l || '').trim().toLowerCase();
  if (!v) return 'ru';
  if (['ru', 'rus', 'ru-ru'].includes(v)) return 'ru';
  if (['kk', 'kz', 'kaz', 'kk-kz'].includes(v)) return 'kk';
  if (['en', 'eng', 'en-us', 'en-gb'].includes(v)) return 'en';
  return 'ru';
}

function i18n(langRaw) {
  const lang = normalizeLang(langRaw);

  const L = {
    ru: {
      youAre: 'Ты',
      careerAssistant: 'карьерный ассистент',
      editor: 'строгий редактор на русском языке',
      jsonOnly: 'Всегда возвращай ТОЛЬКО минифицированный JSON, без комментариев и пояснений.',
      returnOnlyJson: 'Ответ — ТОЛЬКО JSON, БЕЗ текста.',
      summary_sys:
        'Ты помощник карьерного консультанта. Пиши кратко, по-деловому, на русском. Максимум 3–4 предложения.',
      cover_sys:
        'Ты карьерный ассистент. Пиши на русском, деловым стилем, 150–220 слов, без воды, с примерами достижений.',
      cover_rules: [
        'Обращение без "Здравствуйте, меня зовут".',
        '2–3 абзаца: релевантный опыт → стек и достижения → мотивация/fit.',
        'В конце 1 предложение про готовность к собеседованию.',
      ].join('\n'),
      suggest_sys:
        'Ты лаконичный ассистент по развитию навыков. Отвечай только списком, через запятую, без пояснений. Пиши на русском.',
      rec_sys:
        'Ты эксперт по трудоустройству. Пиши на русском. Всегда возвращай ТОЛЬКО минифицированный JSON, без комментариев и пояснений. Все строковые значения — на русском.',
      rec_format: `Сформируй объект JSON строго такого вида:
{
  "professions": ["string", ...],
  "skillsToLearn": ["string", ...],
  "courses": [{"name":"string","duration":"string"}, ...],
  "matchScore": 0
}
Где:
- "professions" — 3–5 подходящих ролей.
- "skillsToLearn" — 4–8 ключевых навыков для роста.
- "courses" — 2–4 курса ({"name","duration"}, без ссылок).
- "matchScore" — целое 0–100 о соответствии рынку.
Ответ — ТОЛЬКО JSON, БЕЗ текста.`,
      polish_system: [
        'Ты — строгий редактор. Пиши на русском.',
        'Исправляй орфографию и пунктуацию, не меняя смысл.',
        'Следи за пробелами вокруг тире и запятых, единообразие кавычек.',
        'Возвращай ТОЛЬКО JSON без лишнего текста.',
        'Схема: {"corrected": string, "bullets": string[]}.',
        'Режимы: "paragraph" — цельный текст; "bullets" — короткие пункты; "auto" — сохранить формат автора.',
      ].join(' '),
      infer_sys:
        'Ты карьерный ассистент. По JSON резюме верни ТОЛЬКО валидный JSON-объект подсказки для поиска вакансий в Казахстане. Все строковые значения — на русском.',
      infer_format: `Формат ответа:
{
  "role": "string",
  "city": "string (KZ only)",
  "skills": ["string", "..."],
  "experience": "noExperience|between1And3|between3And6|moreThan6"
}
experience ∈ {"noExperience","between1And3","between3And6","moreThan6"}.
city — только один город Казахстана (если в профиле другой — выбери подходящий из списка крупных городов РК).
skills — 3–8 основных навыков (одно-двухсловные, без лишних слов).`,
      fallback_cover:
        'Готов обсудить детали вакансии и буду рад рассказать больше о релевантных проектах на собеседовании.',
      fallback_professions: ['Frontend-разработчик', 'Full Stack-разработчик', 'Инженер-программист'],
      fallback_skillsLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
      fallback_courses: [
        { name: 'Coursera — Специализация по React', duration: '3 месяца' },
        { name: 'Udemy — Полный курс веб-разработки', duration: '2 месяца' },
      ],
      fallback_suggest: ['Коммуникации', 'Аналитика данных', 'TypeScript', 'SQL', 'Docker', 'Design Systems'],
    },
    kk: {
      youAre: 'Сен',
      careerAssistant: 'мансап бойынша кеңесші көмекшісісің',
      editor: 'мұқият редакторсың, қазақ тілінде жаза бер',
      jsonOnly: 'Әрқашан ТЕК қана ықшам JSON қайтар.',
      returnOnlyJson: 'Жауап — ТЕК JSON, артық мәтінсіз.',
      summary_sys:
        'Сен мансап кеңесшісінің көмекшісісің. Қазақ тілінде қысқа әрі іскерлік стильде жаз. Ең көбі 3–4 сөйлем.',
      cover_sys:
        'Сен мансап көмекшісісің. Қазақ тілінде, іскерлік стильде, 150–220 сөз. Артық су сөзсіз, нақты жетістіктермен.',
      cover_rules: [
        'Сәлемдесусіз және "Менің атым ..." дегенсіз.',
        '2–3 абзац: релевантты тәжірибе → технологиялық стек және жетістіктер → мотивация/сәйкестік.',
        'Соңында — әңгімелесуге дайын екенің туралы бір сөйлем.',
      ].join('\n'),
      suggest_sys:
        'Сен дағдыларды дамытуға арналған ықшам көмекшісің. Тек үтір арқылы тізіммен жауап бер, түсіндірмесіз. Қазақ тілінде жаз.',
      rec_sys:
        'Сен жұмысқа орналастыру бойынша сарапшысың. Қазақ тілінде жаз. Әрқашан ТЕК ықшам JSON қайтар. Барлық жолдар — қазақ тілінде.',
      rec_format: `JSON мынадай болсын:
{
  "professions": ["string", ...],
  "skillsToLearn": ["string", ...],
  "courses": [{"name":"string","duration":"string"}, ...],
  "matchScore": 0
}
Талаптар: мамандықтар — 3–5; дамыту керек дағдылар — 4–8; курстар — 2–4 (атауы мен ұзақтығы, сілтемесіз); matchScore — 0–100.
Жауап — ТЕК JSON.`,
      polish_system: [
        'Сен — мұқият редакторсың. Қазақ тілінде жаз.',
        'Емле мен пунктуацияны дұрыстап, мағынаны өзгертпе.',
        'Тырнақша мен сызықша аралығындағы бос орындарды біріздендір.',
        'Артық мәтінсіз ТЕК JSON қайтар.',
        'Схема: {"corrected": string, "bullets": string[]}.',
      ].join(' '),
      infer_sys:
        'Сен мансап көмекшісісің. Тек Қазақстан қалалары бойынша іздеу үшін JSON-ны қайтар. Жолдар қазақ тілінде.',
      infer_format: `Пішім:
{
  "role": "string",
  "city": "string (KZ only)",
  "skills": ["string", "..."],
  "experience": "noExperience|between1And3|between3And6|moreThan6"
}
experience — осы тізімнен; city — Қазақстан қаласы; skills — 3–8 қысқа атау.`,
      fallback_cover:
        'Вакансияның егжей-тегжейін талқылауға дайынмын, сұхбатта релевантты жобалар туралы толық айта аламын.',
      fallback_professions: ['Frontend әзірлеуші', 'Full Stack әзірлеуші', 'Бағдарламалық жасақтама инженері'],
      fallback_skillsLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
      fallback_courses: [
        { name: 'Coursera — React мамандану бағдарламасы', duration: '3 ай' },
        { name: 'Udemy — Толық веб-әзірлеу курсы', duration: '2 ай' },
      ],
      fallback_suggest: ['Коммуникация', 'Деректерді талдау', 'TypeScript', 'SQL', 'Docker', 'Design Systems'],
    },
    en: {
      youAre: 'You are a',
      careerAssistant: 'career assistant',
      editor: 'strict copy-editor in English',
      jsonOnly: 'Always return ONLY compact JSON, without comments or explanations.',
      returnOnlyJson: 'Return ONLY JSON, NO prose.',
      summary_sys:
        'You are a career advisor assistant. Write concisely, business tone, in English. Max 3–4 sentences.',
      cover_sys:
        'You are a career assistant. Write in English, business tone, 150–220 words, no fluff, with concrete achievements.',
      cover_rules: [
        'No greeting like "Hello, my name is...".',
        '2–3 paragraphs: relevant experience → stack & achievements → motivation/fit.',
        'End with one sentence about interview readiness.',
      ].join('\n'),
      suggest_sys:
        'You are a concise skills coach. Answer only as a comma-separated list, no explanations. Use English.',
      rec_sys:
        'You are a job market expert. Use English. Always return ONLY compact JSON. All string values must be in English.',
      rec_format: `Produce JSON of the form:
{
  "professions": ["string", ...],
  "skillsToLearn": ["string", ...],
  "courses": [{"name":"string","duration":"string"}, ...],
  "matchScore": 0
}
Rules: 3–5 professions; 4–8 skills to learn; 2–4 courses (name & duration, no links); matchScore is 0–100.
Return ONLY JSON.`,
      polish_system: [
        'You are a strict copy-editor. Use English.',
        'Fix spelling and punctuation without changing meaning.',
        'Normalize spaces around dashes/commas and quotes.',
        'Return ONLY JSON.',
        'Schema: {"corrected": string, "bullets": string[]}.',
      ].join(' '),
      infer_sys:
        'You are a career assistant. From resume JSON, return ONLY a valid JSON object for job search in Kazakhstan. All strings must be in English.',
      infer_format: `Response format:
{
  "role": "string",
  "city": "string (KZ only)",
  "skills": ["string", "..."],
  "experience": "noExperience|between1And3|between3And6|moreThan6"
}
experience must be one of the listed values; city must be a city in Kazakhstan; skills are 3–8 short items.`,
      fallback_cover:
        'I am ready to discuss details and will be glad to share more about relevant projects during the interview.',
      fallback_professions: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'],
      fallback_skillsLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
      fallback_courses: [
        { name: 'Coursera — React Specialization', duration: '3 months' },
        { name: 'Udemy — Complete Web Development', duration: '2 months' },
      ],
      fallback_suggest: ['Communication', 'Data Analysis', 'TypeScript', 'SQL', 'Docker', 'Design Systems'],
    },
  };

  return L[lang] || L.ru;
}

/* ============================= Common utilities ============================= */

function ensureApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Create .env with your key (OPENROUTER_API_KEY=...).'
    );
  }
  return key;
}

function pickModel({ complex = false, override } = {}) {
  return override || (complex ? MODELS.complex : MODELS.primary);
}

function baseHeaders() {
  const headers = {
    Authorization: `Bearer ${ensureApiKey()}`,
    'Content-Type': 'application/json',
  };
  // Рекомендации OpenRouter для аналитики/квот:
  if (process.env.ORIGIN_HEADER) headers['HTTP-Referer'] = process.env.ORIGIN_HEADER;
  if (process.env.APP_TITLE) headers['X-Title'] = process.env.APP_TITLE;
  return headers;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout(fetchFactory, ms = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error('Timeout')), ms);
  try {
    const res = await fetchFactory(ctrl.signal);
    return res;
  } finally {
    clearTimeout(t);
  }
}

// Попытка распарсить JSON даже из «зашумленного» ответа
function tryParseJSON(text) {
  if (!text) return null;

  // как есть
  try {
    return JSON.parse(text);
  } catch {}

  // ```json ... ```
  const fence = /```json([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }

  // первый { .. последняя }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
}

/* ============================== OpenRouter core ============================= */

/**
 * Внутренний запрос к OpenRouter с ретраями на 429/5xx и поддержкой response_format.
 */
async function requestOpenRouter({ body, timeoutMs = DEFAULT_TIMEOUT }, { retries = 2 } = {}) {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await withTimeout(
      (signal) =>
        fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: baseHeaders(),
          body: JSON.stringify(body),
          signal,
        }),
      timeoutMs
    );

    if (resp.ok) {
      return resp;
    }

    const status = resp.status;
    const retryAfter = Number(resp.headers?.get?.('Retry-After') || 0);
    const isRetriable = status === 429 || (status >= 500 && status < 600);

    if (attempt < retries && isRetriable) {
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(400 * 2 ** attempt, 3000);
      await delay(backoff);
      attempt += 1;
      continue;
    }

    const text = await resp.text().catch(() => '');
    throw new Error(`OpenRouter error ${status}: ${text}`);
  }
}

/**
 * Низкоуровневый вызов OpenRouter (без стрима).
 * Если передан response_format и модель его не поддерживает (или вернула 400),
 * openrouterChatSafe() ниже отретраит без него.
 */
async function openrouterChat({
  messages,
  model,
  temperature = 0.2,
  max_tokens = 900,
  top_p = 0.9,
  reasoning = undefined, // напр. { effort: 'medium' }
  response_format = undefined, // напр. { type: 'json_object' }
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

  const resp = await requestOpenRouter({ body, timeoutMs });
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/** Безопасный вызов: пробуем JSON-формат, при ошибке ретраим без него */
async function openrouterChatSafe(args) {
  try {
    return await openrouterChat({
      ...args,
      response_format: args.response_format ?? { type: 'json_object' },
    });
  } catch {
    return openrouterChat({ ...args, response_format: undefined });
  }
}

/* =============================== High-level API ============================= */

export async function chatLLM({
  messages,
  complex = false,
  overrideModel,
  temperature,
  max_tokens,
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

/* ============================= Specialized tools ============================ */

export async function summarizeProfile(profile, opts = {}) {
  const lang = normalizeLang(opts.lang);
  const L = i18n(lang);
  const model = pickModel({ complex: false, override: opts.overrideModel });

  const sys = L.summary_sys;
  const usr = `${lang === 'en' ? 'Candidate profile (JSON):' : lang === 'kk' ? 'Кандидат профилі (JSON):' : 'Профиль кандидата (JSON):'}
${JSON.stringify(profile, null, 2)}

${lang === 'en'
    ? 'Create a concise summary of strengths and focus. No lists — a single short paragraph.'
    : lang === 'kk'
    ? 'Күшті жақтары мен кәсіби фокусын қысқаша сипатта. Тізімсіз — бір абзац.'
    : 'Сделай краткое саммари сильных сторон и фокуса кандидата. Без списков — один абзац.'}`;

  return openrouterChat({
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ],
    model,
    temperature: 0.4,
    max_tokens: 220,
  });
}

/**
 * Возвращает объект (строки — на выбранном языке):
 * { professions: string[], skillsToLearn: string[], courses: { name, duration }[], matchScore: number }
 */
export async function recommendFromProfile(profile, opts = {}) {
  const lang = normalizeLang(opts.lang);
  const L = i18n(lang);

  const complex = !!opts.complex;
  const model = pickModel({ complex, override: opts.overrideModel });

  const sys = L.rec_sys;
  const usr = `${lang === 'en' ? 'User profile:' : lang === 'kk' ? 'Пайдаланушы профилі:' : 'Профиль пользователя:'}
${JSON.stringify(profile, null, 2)}

${L.rec_format}`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      model,
      temperature: complex ? 0.6 : 0.3,
      max_tokens: 650,
      reasoning: complex ? { effort: 'medium' } : undefined,
    });

    const json = tryParseJSON(text);
    if (json) return json;
  } catch {}

  // fallback (локализованный)
  return {
    professions: i18n(lang).fallback_professions.slice(),
    skillsToLearn: i18n(lang).fallback_skillsLearn.slice(),
    courses: i18n(lang).fallback_courses.map((c) => ({ ...c })),
    matchScore: 70,
    _note: 'fallback: model error or non-JSON',
  };
}

export async function generateCoverLetter({ vacancy, profile }, opts = {}) {
  const lang = normalizeLang(opts.lang);
  const L = i18n(lang);

  const complex = !!opts.complex;
  const model = pickModel({ complex, override: opts.overrideModel });

  const sys = L.cover_sys;
  const usr = `${lang === 'en' ? 'Candidate data:' : lang === 'kk' ? 'Кандидат туралы деректер:' : 'Данные кандидата:'}
${JSON.stringify(profile, null, 2)}

${lang === 'en' ? 'Vacancy (brief):' : lang === 'kk' ? 'Вакансия (қысқаша):' : 'Вакансия (кратко):'}
${JSON.stringify(vacancy, null, 2)}

${lang === 'en' ? 'Task: produce a personalized cover letter.' : lang === 'kk' ? 'Тапсырма: дараланған ілеспе хат құрастыр.' : 'Задача: сделай персонализированное сопроводительное письмо.'}
${lang === 'en' ? 'Rules:' : lang === 'kk' ? 'Ережелер:' : 'Требования к формату:'}
${L.cover_rules}`;

  try {
    const content = await openrouterChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      model,
      temperature: 0.5,
      max_tokens: 380,
      reasoning: complex ? { effort: 'low' } : undefined,
    });

    return String(content).replace(/```[\s\S]*?```/g, '').trim();
  } catch {
    // короткий фолбэк (локализованный)
    return i18n(lang).fallback_cover;
  }
}

export async function suggestSkills(profile, opts = {}) {
  const lang = normalizeLang(opts.lang);
  const L = i18n(lang);
  const model = pickModel({ complex: false, override: opts.overrideModel });

  const sys = L.suggest_sys;
  const usr = `${lang === 'en' ? 'Profile:' : lang === 'kk' ? 'Профиль:' : 'Профиль:'}
${JSON.stringify(profile, null, 2)}
${lang === 'en'
    ? 'Give 6–8 short skills to develop (1–2 words), comma-separated, no explanations.'
    : lang === 'kk'
    ? 'Дамытуға 6–8 қысқа дағдыны (1–2 сөз) үтірмен бөліп жаз, түсіндірмесіз.'
    : 'Дай 6–8 навыков для развития (одно-двухсловные названия), перечисли через запятую, без пояснений.'}`;

  try {
    const text = await openrouterChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      model,
      temperature: 0.3,
      max_tokens: 120,
    });

    return text
      .replace(/\n/g, ' ')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return i18n(lang).fallback_suggest.slice(0, 8);
  }
}

/* ============================ Text polishing (LLM) ========================== */
/**
 * Полировка текста: аккуратная орфография/пунктуация + опциональная раскладка в буллеты.
 * Возвращает { corrected: string, bullets: string[] }.
 *
 * @param {string} text
 * @param {object} opts
 *  - lang: 'ru' | 'kk' | 'en' (по умолчанию 'ru' — ЯЗЫК ВЫВОДА)
 *  - mode: 'auto' | 'paragraph' | 'bullets'
 *  - complex: boolean (форсировать complex-модель)
 *  - overrideModel: string (любой openrouter id)
 *  - maxBullets: number (ограничение длины массива bullets)
 */
export async function polishText(text, opts = {}) {
  const {
    lang: langRaw = 'ru',
    mode = 'auto',
    complex = (mode === 'bullets') || String(text || '').length > 600,
    overrideModel,
    maxBullets = 16,
  } = opts;

  const lang = normalizeLang(langRaw);
  const L = i18n(lang);
  const model = pickModel({ complex, override: overrideModel });

  const system = L.polish_system;

  const user = JSON.stringify({
    lang,
    mode,
    maxBullets,
    text: String(text || ''),
  });

  let content;
  try {
    content = await openrouterChatSafe({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model,
      temperature: complex ? 0.2 : 0.1,
      max_tokens: 700,
      reasoning: complex ? { effort: 'low' } : undefined,
    });
  } catch {
    // если совсем нет ответа — вернём исходный текст
    return { corrected: String(text || ''), bullets: [] };
  }

  const json = tryParseJSON(content);
  const corrected =
    json && typeof json.corrected === 'string' ? json.corrected : String(text || '');
  let bullets = Array.isArray(json?.bullets) ? json.bullets.filter(Boolean) : [];

  if (maxBullets && bullets.length > maxBullets) {
    bullets = bullets.slice(0, maxBullets);
  }

  // локальная нормализация пробелов/тире
  const norm = (s) =>
    String(s ?? '')
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

  return { corrected: norm(corrected), bullets: bullets.map(norm) };
}

/**
 * Пакетная полировка. Принимает массив строк, возвращает массив объектов
 * [{ corrected, bullets }, ...] (с сохранением порядка).
 * В free-тарифе лучше не распараллеливать.
 */
export async function polishMany(texts, opts = {}) {
  const arr = Array.isArray(texts) ? texts : [];
  const out = [];
  for (const t of arr) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await polishText(t, opts));
  }
  return out;
}

/* ===================== Search inference (KZ cities only) ==================== */

// Базовый список городов РК. Используем как whitelist (исключаем РФ и др.)
const KZ_CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар',
  'Усть-Каменогорск', 'Семей', 'Костанай', 'Кызылорда', 'Атырау', 'Актау',
  'Туркестан', 'Петропавловск', 'Талдыкорган', 'Кокшетау', 'Темиртау',
  'Экибастуз', 'Рудный'
];

function yearsFromProfile(profile = {}) {
  const arr = Array.isArray(profile.experience) ? profile.experience : [];
  if (!arr.length) return 0;
  let ms = 0;
  for (const it of arr) {
    const s =
      it?.start || it?.from || it?.dateStart || it?.date_from || it?.date_start;
    const e =
      it?.end ||
      it?.to ||
      it?.dateEnd ||
      it?.date_to ||
      it?.date_end ||
      new Date().toISOString().slice(0, 10);
    const ds = s ? new Date(s) : null;
    const de = e ? new Date(e) : null;
    if (ds && de && !isNaN(+ds) && !isNaN(+de) && de > ds) ms += +de - +ds;
    else ms += 365 * 24 * 3600 * 1000; // 1 год по умолчанию
  }
  return ms / (365 * 24 * 3600 * 1000);
}

function hhExpFromYears(years) {
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

function fallbackInfer(profile = {}) {
  const expYears = yearsFromProfile(profile);
  const experience = hhExpFromYears(expYears);

  const items = Array.isArray(profile.experience) ? profile.experience : [];
  const latest = items[0] || items[items.length - 1] || {};
  const role =
    latest.position ||
    latest.title ||
    latest.role ||
    (Array.isArray(profile.skills) && profile.skills[0]) ||
    'Специалист';

  const rawCity = String(profile.location || '').trim();
  let city =
    KZ_CITIES.find((c) => new RegExp(c, 'i').test(rawCity)) || 'Алматы';

  const skills =
    (Array.isArray(profile.skills) && profile.skills.length
      ? profile.skills
      : String(
          latest.description ||
            latest.responsibilities ||
            profile.summary ||
            ''
        )
          .split(/[,\n;•\-]/)
          .map((s) => s.trim())
          .filter(Boolean)
    ).slice(0, 8);

  return { role, city, skills, experience };
}

/**
 * inferSearch(profile, {lang}) → { role, city, skills[], experience }
 * city — всегда из Казахстана (если исходный город не из KZ, выбираем ближайший крупный).
 * Строковые значения — на выбранном языке (насколько возможно).
 */
export async function inferSearch(profile = {}, { lang = 'ru', overrideModel } = {}) {
  const langN = normalizeLang(lang);
  const L = i18n(langN);

  // Если нет ключа — сразу вернём эвристику (она на RU)
  if (!process.env.OPENROUTER_API_KEY) return fallbackInfer(profile);

  const complex = false; // здесь хватает "быстрой" модели
  const model = pickModel({ complex, override: overrideModel });

  const sys = L.infer_sys;
  const usr = `${langN === 'en' ? 'Interface language:' : langN === 'kk' ? 'Интерфейс тілі:' : 'Язык интерфейса:'} ${langN}
${langN === 'en' ? 'User profile (JSON):' : langN === 'kk' ? 'Пайдаланушы профилі (JSON):' : 'Профиль пользователя (JSON):'}
${JSON.stringify(profile, null, 2)}

${L.infer_format}`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      model,
      temperature: 0.2,
      max_tokens: 500,
    });

    const json = tryParseJSON(text) || {};
    const fb = fallbackInfer(profile);

    const role = String(json.role || '').trim() || fb.role;

    let city = String(json.city || '').trim() || fb.city;
    if (!KZ_CITIES.includes(city)) {
      const match = KZ_CITIES.find((c) => new RegExp(c, 'i').test(city));
      city = match || fb.city;
    }

    const skills = Array.isArray(json.skills)
      ? json.skills.filter(Boolean).slice(0, 8)
      : fb.skills;

    const expValid = ['noExperience', 'between1And3', 'between3And6', 'moreThan6'];
    const experience = expValid.includes(json.experience) ? json.experience : fb.experience;

    return { role, city, skills, experience };
  } catch {
    return fallbackInfer(profile);
  }
}

/* =================================== Export ================================= */

export default {
  MODELS,
  chatLLM,
  summarizeProfile,
  recommendFromProfile,
  generateCoverLetter,
  suggestSkills,
  polishText,
  polishMany,
  inferSearch,
};
