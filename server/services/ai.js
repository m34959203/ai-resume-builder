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
// Дополнительно для переводчика (используется самим translator.js):
//   API_KEY_DEEPSEEK / DEEPSEEK_API_KEY=<ключ DeepSeek>
//   DEEPSEEK_MODEL=deepseek-chat
//
// Модели по умолчанию:
//   - Быстрая/дешевая:  google/gemma-3-12b-it:free
//   - «Сложная»/рассуждения: deepseek/deepseek-r1:free
//
// Экспортирует:
//   MODELS, chatLLM, summarizeProfile, recommendFromProfile,
//   generateCoverLetter, suggestSkills,
//   polishText, polishMany,
//   inferSearch,
//   translateText, translateMany       ← НОВОЕ: прокси к DeepSeek-переводчику

import translator from './translator.js'; // CommonJS → ESM default interop (module.exports как default)

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const MODELS = {
  primary: process.env.OPENROUTER_MODEL_PRIMARY || 'google/gemma-3-12b-it:free',
  complex: process.env.OPENROUTER_MODEL_COMPLEX || 'deepseek/deepseek-r1:free',
};

const DEFAULT_TIMEOUT = Math.max(
  5_000,
  Number(process.env.OR_TIMEOUT_MS || 30_000) || 30_000
);

// ------------------------- Вспомогательные утилиты ----------------------------

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

// ------------------------- Низкоуровневый вызов OpenRouter --------------------

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

// ----------------------- Универсальная прокси-функция -------------------------

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

// ---------------------------- Специализированные ИИ ---------------------------

export async function summarizeProfile(profile, opts = {}) {
  const model = pickModel({ complex: false, override: opts.overrideModel });
  const sys =
    'Ты помощник карьерного консультанта. Пиши кратко, по-деловому, на русском. Максимум 3–4 предложения.';
  const usr = `Профиль кандидата (JSON):
${JSON.stringify(profile, null, 2)}

Сделай краткое саммари сильных сторон и фокуса кандидата. Без списков и маркировок — цельный текст.`;

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
 * Возвращает объект:
 * { professions: string[], skillsToLearn: string[], courses: { name, duration }[], matchScore: number }
 */
export async function recommendFromProfile(profile, opts = {}) {
  const complex = !!opts.complex;
  const model = pickModel({ complex, override: opts.overrideModel });

  const sys =
    'Ты эксперт по трудоустройству. Всегда возвращай ТОЛЬКО минифицированный JSON, без комментариев и пояснений.';
  const usr = `Вот профиль кандидата:
${JSON.stringify(profile, null, 2)}

Сформируй объект JSON строго такого вида:
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
Ответ — ТОЛЬКО JSON, БЕЗ текста.`;

  try {
    const text = await openrouterChatSafe({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      model,
      temperature: complex ? 0.6 : 0.3,
      max_tokens: 600,
      reasoning: complex ? { effort: 'medium' } : undefined,
    });

    const json = tryParseJSON(text);
    if (json) return json;
  } catch {}

  // fallback
  return {
    professions: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'],
    skillsToLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
    courses: [
      { name: 'Coursera — React Специализация', duration: '3 месяца' },
      { name: 'Udemy — Complete Web Development', duration: '2 месяца' },
    ],
    matchScore: 70,
    _note: 'fallback: model error or non-JSON',
  };
}

export async function generateCoverLetter({ vacancy, profile }, opts = {}) {
  const complex = !!opts.complex;
  const model = pickModel({ complex, override: opts.overrideModel });

  const sys =
    'Ты карьерный ассистент. Пиши на русском, деловым стилем, 150–220 слов, без воды, с примерами достижений.';
  const usr = `Данные кандидата:
${JSON.stringify(profile, null, 2)}

Вакансия (кратко):
${JSON.stringify(vacancy, null, 2)}

Задача: сделай персонализированное сопроводительное письмо.
Требования к формату:
- Обращение без "Здравствуйте, меня зовут".
- 2–3 абзаца: релевантный опыт → стек и достижения → мотивация/fit.
- В конце 1 предложение про готовность к собеседованию.`;

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
    // короткий фолбэк
    return 'Готов обсудить детали вакансии и буду рад рассказать больше о релевантных проектах на собеседовании.';
  }
}

export async function suggestSkills(profile, opts = {}) {
  const model = pickModel({ complex: false, override: opts.overrideModel });
  const sys =
    'Ты лаконичный ассистент по развитию навыков. Отвечай только списком, через запятую, без пояснений.';
  const usr = `Профиль:
${JSON.stringify(profile, null, 2)}
Дай 6–8 навыков для развития (одно-двухсловные названия), без пояснений.`;

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
    return ['Коммуникации', 'Аналитика данных', 'TypeScript', 'SQL', 'Docker', 'Design Systems'];
  }
}

// --------------------- Полировка текста (DeepSeek/Gemma через OpenRouter) -----

/**
 * Полировка текста: аккуратная орфография/пунктуация + опциональная раскладка в буллеты.
 * Возвращает { corrected: string, bullets: string[] }.
 *
 * @param {string} text
 * @param {object} opts
 *  - lang: 'ru' | 'en' (по умолчанию 'ru')
 *  - mode: 'auto' | 'paragraph' | 'bullets'
 *  - complex: boolean (форсировать complex-модель)
 *  - overrideModel: string (любой openrouter id)
 *  - maxBullets: number (ограничение длины массива bullets)
 */
export async function polishText(text, opts = {}) {
  const {
    lang = 'ru',
    mode = 'auto',
    complex = (mode === 'bullets') || String(text || '').length > 600,
    overrideModel,
    maxBullets = 16,
  } = opts;

  const model = pickModel({ complex, override: overrideModel });

  const system = [
    'Ты — строгий редактор на русском языке.',
    'Исправляй орфографию и пунктуацию, не меняя смысл.',
    'Следи за пробелами вокруг тире и запятых, единообразие кавычек.',
    'Возвращай ТОЛЬКО JSON без лишнего текста.',
    'Схема: {"corrected": string, "bullets": string[]}.',
    'Режимы: "paragraph" — цельный текст; "bullets" — короткие пункты; "auto" — сохранить формат автора.',
  ].join(' ');

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

// -------------------- Инференс поискового запроса из резюме (KZ only) --------

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
 * inferSearch(profile) → { role, city, skills[], experience }
 * city — всегда из Казахстана (если исходный город не из KZ, выбираем ближайший крупный).
 */
export async function inferSearch(profile = {}, { lang = 'ru', overrideModel } = {}) {
  // Если нет ключа — сразу вернём эвристику
  if (!process.env.OPENROUTER_API_KEY) return fallbackInfer(profile);

  const complex = false; // здесь хватает "быстрой" модели
  const model = pickModel({ complex, override: overrideModel });

  const sys =
`Ты карьерный ассистент. По JSON резюме верни ТОЛЬКО валидный JSON-объект подсказки для поиска вакансий в Казахстане.
experience ∈ {"noExperience","between1And3","between3And6","moreThan6"}.
city — только один город Казахстана (если в профиле другой — выбери подходящий из списка крупных городов РК).
skills — 3–8 основных навыков (одно-двухсловные, без лишних слов).`;

  const usr =
`Язык интерфейса: ${lang}
Профиль пользователя (JSON):
${JSON.stringify(profile, null, 2)}

Формат ответа:
{
  "role": "string",
  "city": "string (KZ only)",
  "skills": ["string", "..."],
  "experience": "noExperience|between1And3|between3And6|moreThan6"
}`;

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

// ---------------------- DeepSeek Translator: публичные прокси -----------------

/**
 * Прокси к DeepSeek-переводчику.
 * translateText(text, { target, source='auto', html=false, temperature, model, ... })
 * Возвращает объект { ok, translated, provider, chunks, cached, ... }.
 */
export async function translateText(text, options = {}) {
  // translator сам обрабатывает отсутствие API-ключа (мягкий фолбэк: вернёт исходный текст)
  return translator.translateText(text, options);
}

/**
 * Пакетный перевод массива строк. Возвращает массив результатов translateText().
 */
export async function translateMany(texts, options = {}) {
  return translator.translateMany(texts, options);
}

// ---------------------------- Экспорт по умолчанию ----------------------------

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
  translateText,   // ← интеграция translator
  translateMany,   // ← интеграция translator
};
