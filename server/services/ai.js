// server/services/ai.js
/* eslint-disable no-console */
/*
  CommonJS (require) версия — совместима с текущими роутами.
  Требуется Node 18+ (в Node 18+ есть глобальный fetch).

  ENV:
    OPENROUTER_API_KEY=...
    OPENROUTER_MODEL_PRIMARY=google/gemma-3-12b-it:free
    OPENROUTER_MODEL_COMPLEX=deepseek/deepseek-r1:free
    OPENROUTER_BASE_URL=https://openrouter.ai/api/v1           (опц.)
    OPENROUTER_REFERER=http://localhost:5173                   (опц.)
    OPENROUTER_TITLE=AI Resume Builder                         (опц.)

    ORIGIN_HEADER=<https://ваш-домен>  // альтернативное имя для Referer
    APP_TITLE=AI Resume Builder         // альтернативное имя для X-Title
    OR_TIMEOUT_MS=30000
*/

'use strict';

const BASE_URL =
  (process.env.OPENROUTER_BASE_URL && process.env.OPENROUTER_BASE_URL.trim()) ||
  'https://openrouter.ai/api/v1';

const OPENROUTER_URL = `${BASE_URL.replace(/\/+$/, '')}/chat/completions`;

const MODELS = {
  primary: process.env.OPENROUTER_MODEL_PRIMARY || 'google/gemma-3-12b-it:free',
  complex: process.env.OPENROUTER_MODEL_COMPLEX || 'deepseek/deepseek-r1:free',
};

const DEFAULT_TIMEOUT = Math.max(5_000, Number(process.env.OR_TIMEOUT_MS || 30_000) || 30_000);

/* ----------------------- helpers ----------------------- */

function ensureApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
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
  // Имена переменных поддерживаем оба варианта
  const referer = process.env.OPENROUTER_REFERER || process.env.ORIGIN_HEADER;
  const title = process.env.OPENROUTER_TITLE || process.env.APP_TITLE;
  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-Title'] = title;
  return headers;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout(factory, ms = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error('Timeout')), ms);
  try {
    return await factory(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

// Попробовать распарсить JSON даже если вокруг «шум»
function tryParseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const fence = /```json([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1 && e > s) {
    try {
      return JSON.parse(text.slice(s, e + 1));
    } catch {}
  }
  return null;
}

/* ------------------ OpenRouter low-level ------------------ */

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

    if (resp.ok) return resp;

    const status = resp.status;
    const retryAfter = Number(resp.headers?.get?.('Retry-After') || 0);
    const retriable = status === 429 || (status >= 500 && status < 600);

    if (attempt < retries && retriable) {
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(3000, 400 * 2 ** attempt);
      await delay(backoff);
      attempt += 1;
      continue;
    }

    const text = await resp.text().catch(() => '');
    throw new Error(`OpenRouter error ${status}: ${text}`);
  }
}

async function openrouterChat({
  messages,
  model,
  temperature = 0.2,
  max_tokens = 900,
  top_p = 0.9,
  reasoning = undefined,
  response_format = undefined,
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
  const data = await resp.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content ?? '';
  return typeof content === 'string' ? content : JSON.stringify(content);
}

// Сначала просим JSON-ответ, при ошибке — повтор без response_format
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

/* ------------------ High-level universal proxy ------------------ */

async function chatLLM({ messages, complex = false, overrideModel, temperature, max_tokens }) {
  const model = pickModel({ complex, override: overrideModel });
  return openrouterChat({
    messages,
    model,
    temperature,
    max_tokens,
    reasoning: complex ? { effort: 'medium' } : undefined,
  });
}

/* ------------------ Domain helpers ------------------ */

async function summarizeProfile(profile, opts = {}) {
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
 * Возвращает:
 * { professions: string[], skillsToLearn: string[], courses: [{name,duration}], matchScore: number }
 */
async function recommendFromProfile(profile, opts = {}) {
  const complex = !!opts.complex;
  const model = pickModel({ complex, override: opts.overrideModel });

  const sys =
    'Ты эксперт по трудоустройству. Всегда возвращай ТОЛЬКО минифицированный JSON, без пояснений.';
  const usr = `Профиль:
${JSON.stringify(profile, null, 2)}

Верни JSON ровно вида:
{
  "professions": ["string", ...],
  "skillsToLearn": ["string", ...],
  "courses": [{"name":"string","duration":"string"}, ...],
  "matchScore": 0
}
Без текста вне JSON.`;

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

  return {
    professions: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer'],
    skillsToLearn: ['TypeScript', 'Node.js', 'Docker', 'GraphQL'],
    courses: [
      { name: 'Coursera — React Специализация', duration: '3 месяца' },
      { name: 'Udemy — Complete Web Development', duration: '2 месяца' },
    ],
    matchScore: 70,
    _note: 'fallback',
  };
}

async function generateCoverLetter({ vacancy, profile }, opts = {}) {
  const complex = !!opts.complex;
  const model = pickModel({ complex, override: opts.overrideModel });

  const sys =
    'Ты карьерный ассистент. Пиши на русском, деловым стилем, 150–220 слов, без воды, с примерами достижений.';
  const usr = `Кандидат:
${JSON.stringify(profile, null, 2)}

Вакансия:
${JSON.stringify(vacancy, null, 2)}

Задача: персонализированное сопроводительное письмо (2–3 абзаца).`;

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
    return 'Готов обсудить детали вакансии и рассказать больше о релевантных проектах на собеседовании.';
  }
}

async function suggestSkills(profile, opts = {}) {
  const model = pickModel({ complex: false, override: opts.overrideModel });
  const sys =
    'Ты ассистент по развитию навыков. Отвечай только списком через запятую, без пояснений.';
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

    return String(text)
      .replace(/\n/g, ' ')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return ['Коммуникации', 'Аналитика данных', 'TypeScript', 'SQL', 'Docker', 'Design Systems'];
  }
}

/* --------------------- Полировка текста --------------------- */

async function polishText(text, opts = {}) {
  const {
    lang = 'ru',
    mode = 'auto',
    complex = mode === 'bullets' || String(text || '').length > 600,
    overrideModel,
    maxBullets = 16,
  } = opts;

  const model = pickModel({ complex, override: overrideModel });

  const system = [
    'Ты — строгий редактор на русском языке.',
    'Исправляй орфографию и пунктуацию, не меняя смысл.',
    'Возвращай ТОЛЬКО JSON {"corrected": string, "bullets": string[]}.',
    'Режимы: "paragraph" — цельный текст; "bullets" — короткие пункты; "auto" — сохранить формат автора.',
  ].join(' ');

  const user = JSON.stringify({ lang, mode, maxBullets, text: String(text || '') });

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
    return { corrected: String(text || ''), bullets: [] };
  }

  const json = tryParseJSON(content);
  const corrected = json && typeof json.corrected === 'string' ? json.corrected : String(text || '');
  let bullets = Array.isArray(json?.bullets) ? json.bullets.filter(Boolean) : [];
  if (maxBullets && bullets.length > maxBullets) bullets = bullets.slice(0, maxBullets);

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

async function polishMany(texts, opts = {}) {
  const arr = Array.isArray(texts) ? texts : [];
  const out = [];
  for (const t of arr) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await polishText(t, opts));
  }
  return out;
}

/* -------------------- Инференс подсказки поиска (KZ) -------------------- */

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
    const s = it?.start || it?.from || it?.dateStart || it?.date_from || it?.date_start;
    const e =
      it?.end || it?.to || it?.dateEnd || it?.date_to || it?.date_end || new Date().toISOString().slice(0, 10);
    const ds = s ? new Date(s) : null;
    const de = e ? new Date(e) : null;
    if (ds && de && !Number.isNaN(+ds) && !Number.isNaN(+de) && de > ds) ms += +de - +ds;
    else ms += 365 * 24 * 3600 * 1000; // default 1y
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
  let city = KZ_CITIES.find((c) => new RegExp(c, 'i').test(rawCity)) || 'Алматы';

  const skills =
    (Array.isArray(profile.skills) && profile.skills.length
      ? profile.skills
      : String(latest.description || latest.responsibilities || profile.summary || '')
          .split(/[,\n;•\-]/)
          .map((s) => s.trim())
          .filter(Boolean)
    ).slice(0, 8);

  return { role, city, skills, experience };
}

async function inferSearch(profile = {}, { lang = 'ru', overrideModel } = {}) {
  if (!process.env.OPENROUTER_API_KEY) return fallbackInfer(profile);

  const model = pickModel({ complex: false, override: overrideModel });

  const sys =
`Ты карьерный ассистент. По JSON резюме верни ТОЛЬКО валидный JSON-объект подсказки для поиска вакансий в Казахстане.
experience ∈ {"noExperience","between1And3","between3And6","moreThan6"}.
city — только один город Казахстана (если в профиле другой — выбери подходящий из списка крупных городов РК).
skills — 3–8 основных навыков.`;

  const usr =
`Язык интерфейса: ${lang}
Профиль пользователя (JSON):
${JSON.stringify(profile, null, 2)}

Формат:
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

/* ------------------ exports ------------------ */

module.exports = {
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
