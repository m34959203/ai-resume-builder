// server/services/ai.js
// Node ESM (Node 18+). OpenRouter chat completions.
// ENV:
//   OPENROUTER_API_KEY=...
//   OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
//   ORIGIN_HEADER=https://your-domain
//   APP_TITLE=AI Resume Builder
//   OR_TIMEOUT_MS=30000

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';
export const MODELS = { primary: MODEL, complex: MODEL };

const DEFAULT_TIMEOUT = Math.max(5_000, Number(process.env.OR_TIMEOUT_MS || 30_000) || 30_000);

// --------------------------- utils ---------------------------
function ensureApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
  return key;
}

function baseHeaders() {
  const h = {
    Authorization: `Bearer ${ensureApiKey()}`,
    'Content-Type': 'application/json',
  };
  if (process.env.ORIGIN_HEADER) h['HTTP-Referer'] = process.env.ORIGIN_HEADER;
  if (process.env.APP_TITLE) h['X-Title'] = process.env.APP_TITLE;
  return h;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withTimeout(factory, ms = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error('Timeout')), ms);
  try { return await factory(ctrl.signal); } finally { clearTimeout(t); }
}

function tryParseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fence = /```json([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  return null;
}

function normLang(lang) {
  const v = String(lang || 'ru').toLowerCase();
  if (v === 'kz') return 'kk';
  if (v === 'en') return 'en';
  return v === 'kk' ? 'kk' : 'ru';
}

// RU/KK/EN selector with fallback to RU
function sFor(lang, ru, kk, en) {
  const L = normLang(lang);
  if (L === 'kk') return kk;
  if (L === 'en' && en != null) return en;
  return ru;
}

// ---------------------- low-level OpenRouter ----------------------
async function requestOpenRouter({ body, timeoutMs = DEFAULT_TIMEOUT }, { retries = 2 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await withTimeout(
      (signal) => fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: baseHeaders(),
        body: JSON.stringify(body),
        signal,
      }),
      timeoutMs
    );
    if (resp.ok) return resp;

    const st = resp.status;
    const retryAfter = Number(resp.headers?.get?.('Retry-After') || 0);
    const retriable = st === 429 || (st >= 500 && st < 600);

    if (retriable && attempt < retries) {
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(400 * 2 ** attempt, 3000);
      await delay(backoff); attempt += 1; continue;
    }
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenRouter error ${st}: ${text}`);
  }
}

async function openrouterChat({
  messages,
  model = MODEL,
  temperature = 0.2,
  max_tokens = 900,
  top_p = 0.9,
  response_format,
  timeoutMs = DEFAULT_TIMEOUT,
}) {
  const body = { model, messages, temperature, top_p, max_tokens, stream: false };
  if (response_format) body.response_format = response_format;
  const resp = await requestOpenRouter({ body, timeoutMs });
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  return typeof content === 'string' ? content : JSON.stringify(content);
}

async function openrouterChatSafe(args) {
  try {
    return await openrouterChat({ ...args, response_format: args.response_format ?? { type: 'json_object' } });
  } catch {
    return openrouterChat({ ...args, response_format: undefined });
  }
}

// -------------------------- public API --------------------------
export async function chatLLM({ messages, temperature, max_tokens, overrideModel } = {}) {
  return openrouterChat({ messages, model: overrideModel || MODEL, temperature, max_tokens });
}

// Simple translator (RU/KK/EN)
export async function translateText(text, { target = 'ru', overrideModel } = {}) {
  const T = normLang(target);
  const sys = sFor(
    T,
    'Ты профессиональный переводчик. Переведи текст на русский. Сохрани форматирование и верни только перевод.',
    'Сен кәсіби аудармашысың. Мәтінді қазақ тіліне аудар. Пішімін сақта, тек аударманы қайтар.',
    'You are a professional translator. Translate the text into English. Preserve formatting and return only the translation.'
  );
  const content = await openrouterChat({
    messages: [{ role: 'system', content: sys }, { role: 'user', content: String(text || '') }],
    model: overrideModel || MODEL,
    temperature: 0.2,
    max_tokens: Math.max(300, Math.min(1800, String(text || '').length * 2)),
  });
  return String(content).replace(/```[\s\S]*?```/g, '').trim();
}

export async function summarizeProfile(profile, opts = {}) {
  const L = normLang(opts.lang);
  const sys = sFor(
    L,
    'Ты помощник карьерного консультанта. Пиши кратко, деловым стилем. 3–4 предложения.',
    'Сен мансап кеңесшісінің көмекшісісің. Қысқа, іскер стильде жаз. 3–4 сөйлем.',
    'You are a career consultant assistant. Write briefly, business style. 3–4 sentences.'
  );
  const usr = sFor(
    L,
    `Профиль кандидата (JSON):\n${JSON.stringify(profile, null, 2)}\nСделай краткое саммари сильных сторон и фокуса. Без списков — цельный текст.`,
    `Кандидат профилі (JSON):\n${JSON.stringify(profile, null, 2)}\nКүшті жақтары мен кәсіби бағыты бойынша қысқаша түйін жаса. Тізімсіз — тұтас мәтін.`,
    `Candidate profile (JSON):\n${JSON.stringify(profile, null, 2)}\nWrite a brief summary of strengths and focus. No lists — a single paragraph.`
  );
  return openrouterChat({
    messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
    model: MODEL, temperature: 0.4, max_tokens: 220,
  });
}

export async function recommendFromProfile(profile, opts = {}) {
  const L = normLang(opts.lang);
  const sys = sFor(
    L,
    'Ты эксперт по трудоустройству. Всегда возвращай ТОЛЬКО минифицированный JSON без пояснений. Все строки на русском.',
    'Сен жұмысқа орналастыру мамансың. Әрқашан тек ықшам JSON қайтар, түсіндірмесіз. Барлық мәтін қазақ тілінде.',
    'You are an employment expert. Always return ONLY minified JSON with no explanations. All strings in English.'
  );
  const format = `{"professions":["string",...],"skillsToLearn":["string",...],"courses":[{"name":"string","duration":"string"},...],"matchScore":0}`;
  const expl = sFor(
    L,
    'Требования: professions=3–5; skillsToLearn=4–8; courses=2–4 без ссылок; matchScore=0–100. Ответ — ТОЛЬКО JSON.',
    'Талаптар: professions=3–5; skillsToLearn=4–8; courses=2–4 сілтемесіз; matchScore=0–100. Жауап — тек JSON.',
    'Requirements: professions=3–5; skillsToLearn=4–8; courses=2–4 without links; matchScore=0–100. Reply ONLY JSON.'
  );
  const usr = sFor(
    L,
    `Профиль кандидата:\n${JSON.stringify(profile, null, 2)}\nСформируй строго:\n${format}\n${expl}`,
    `Үміткер профилі:\n${JSON.stringify(profile, null, 2)}\nДәл мына түрде қайтар:\n${format}\n${expl}`,
    `Candidate profile:\n${JSON.stringify(profile, null, 2)}\nReturn exactly:\n${format}\n${expl}`
  );

  try {
    const txt = await openrouterChatSafe({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
      model: MODEL, temperature: 0.3, max_tokens: 600,
    });
    const json = tryParseJSON(txt);
    if (json) return json;
  } catch {}
  return sFor(
    L,
    {
      professions: ['Бизнес-аналитик', 'Проектный менеджер', 'Системный аналитик'],
      skillsToLearn: ['SQL', 'BPMN', 'Excel', 'Agile', 'Scrum', 'Jira'],
      courses: [{ name: 'Coursera — Excel: специализация', duration: '1–3 месяца' }, { name: 'Udemy — Практический бизнес-анализ', duration: '1–2 месяца' }],
      matchScore: 70, _note: 'fallback',
    },
    {
      professions: ['Бизнес-талдаушы', 'Жоба менеджері', 'Жүйелік талдаушы'],
      skillsToLearn: ['SQL', 'BPMN', 'Excel', 'Agile', 'Scrum', 'Jira'],
      courses: [{ name: 'Coursera — Excel: мамандану', duration: '1–3 ай' }, { name: 'Udemy — Іс тәжірибелік бизнес-талдау', duration: '1–2 ай' }],
      matchScore: 70, _note: 'fallback',
    },
    {
      professions: ['Business Analyst', 'Project Manager', 'Systems Analyst'],
      skillsToLearn: ['SQL', 'BPMN', 'Excel', 'Agile', 'Scrum', 'Jira'],
      courses: [{ name: 'Coursera — Excel Specialization', duration: '1–3 months' }, { name: 'Udemy — Practical Business Analysis', duration: '1–2 months' }],
      matchScore: 70, _note: 'fallback',
    }
  );
}

export async function generateCoverLetter({ vacancy, profile }, opts = {}) {
  const L = normLang(opts.lang);
  const sys = sFor(
    L,
    'Ты карьерный ассистент. Деловой стиль, 150–220 слов, без воды, с примерами достижений.',
    'Сен мансап ассистентісің. Іскер стиль, 150–220 сөз, артық сөсіз, жетістік мысалдарымен.',
    'You are a career assistant. Business tone, 150–220 words, concise, include concrete achievements.'
  );
  const usr = sFor(
    L,
    `Данные кандидата:\n${JSON.stringify(profile, null, 2)}\nВакансия (кратко):\n${JSON.stringify(vacancy, null, 2)}\nСделай персонализированное письмо: опыт → стек/достижения → мотивация. Заверши готовностью к собеседованию.`,
    `Үміткер деректері:\n${JSON.stringify(profile, null, 2)}\nВакансия (қысқаша):\n${JSON.stringify(vacancy, null, 2)}\nЖеке хат жаз: тәжірибе → технологиялар/жетістіктер → мотивация. Соңында сұхбатқа дайындық.`,
    `Candidate data:\n${JSON.stringify(profile, null, 2)}\nVacancy (brief):\n${JSON.stringify(vacancy, null, 2)}\nWrite a tailored cover letter: relevant experience → stack/achievements → motivation. End with interview readiness.`
  );
  try {
    const content = await openrouterChat({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
      model: MODEL, temperature: 0.5, max_tokens: 380,
    });
    return String(content).replace(/```[\s\S]*?```/g, '').trim();
  } catch {
    return sFor(
      L,
      'Готов обсудить детали вакансии и рассказать больше о релевантных проектах на собеседовании.',
      'Вакансияның егжей-тегжейін талқылауға дайынмын, сұхбатта тиісті жобалар туралы қосымша айтамын.',
      'I’m ready to discuss details and expand on relevant projects in an interview.'
    );
  }
}

export async function suggestSkills(profile, opts = {}) {
  const L = normLang(opts.lang);
  const sys = sFor(
    L,
    'Ты лаконичный ассистент. Отвечай списком через запятую, без пояснений.',
    'Сен қысқа жауап беретін ассистентсің. Тек үтірмен тізім, түсіндірмесіз.',
    'Be concise. Reply with a comma-separated list, no explanations.'
  );
  const usr = sFor(
    L,
    `Профиль:\n${JSON.stringify(profile, null, 2)}\nДай 6–8 навыков для развития (1–2 слова).`,
    `Профиль:\n${JSON.stringify(profile, null, 2)}\nДамытуға 6–8 дағды ұсын (1–2 сөз).`,
    `Profile:\n${JSON.stringify(profile, null, 2)}\nSuggest 6–8 skills to develop (one–two words each).`
  );
  try {
    const text = await openrouterChat({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
      model: MODEL, temperature: 0.3, max_tokens: 120,
    });
    return text.replace(/\n/g, ' ').split(',').map(s => s.trim()).filter(Boolean).slice(0, 8);
  } catch {
    return sFor(
      L,
      ['Коммуникация','Аналитика данных','TypeScript','SQL','Docker','Системное мышление'],
      ['Коммуникация','Деректер талдауы','TypeScript','SQL','Docker','Жүйелік ойлау'],
      ['Communication','Data Analysis','TypeScript','SQL','Docker','Systems Thinking']
    );
  }
}

export async function polishText(text, opts = {}) {
  const {
    lang = 'ru',
    mode = 'auto',
    overrideModel,
    maxBullets = 16,
  } = opts;
  const L = normLang(lang);
  const system = sFor(
    L,
    [
      'Ты — строгий редактор (русский).',
      'Исправляй орфографию/пунктуацию, не меняя смысл.',
      'Возвращай ТОЛЬКО JSON {"corrected":string,"bullets":string[]}.',
      'Режимы: paragraph | bullets | auto.',
    ].join(' '),
    [
      'Сен — мұқият редактор (қазақ тілі).',
      'Емле мен тыныс белгілерін түзет, мағынасы сақталсын.',
      'ТЕК JSON қайтар {"corrected":string,"bullets":string[]}.',
      'Режимдер: paragraph | bullets | auto.',
    ].join(' '),
    [
      'You are a careful editor (English).',
      'Fix spelling/punctuation without changing meaning.',
      'Return ONLY JSON {"corrected":string,"bullets":string[]}.',
      'Modes: paragraph | bullets | auto.',
    ].join(' ')
  );
  const user = JSON.stringify({ lang: L, mode, maxBullets, text: String(text || '') });

  let content;
  try {
    content = await openrouterChatSafe({
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      model: overrideModel || MODEL, temperature: 0.15, max_tokens: 700,
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

export async function polishMany(texts, opts = {}) {
  const arr = Array.isArray(texts) ? texts : [];
  const out = [];
  for (const t of arr) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await polishText(t, opts));
  }
  return out;
}

// -------------------- infer search (KZ cities) --------------------
const KZ_CITIES = [
  'Алматы','Астана','Шымкент','Караганда','Актобе','Тараз','Павлодар',
  'Усть-Каменогорск','Семей','Костанай','Кызылорда','Атырау','Актау',
  'Туркестан','Петропавловск','Талдыкорган','Кокшетау','Темиртау','Экибастуз','Рудный'
];

function yearsFromProfile(profile = {}) {
  const arr = Array.isArray(profile.experience) ? profile.experience : [];
  if (!arr.length) return 0;
  let ms = 0;
  for (const it of arr) {
    const s = it?.start || it?.from || it?.dateStart || it?.date_from || it?.date_start;
    const e = it?.end || it?.to || it?.dateEnd || it?.date_to || it?.date_end || new Date().toISOString().slice(0,10);
    const ds = s ? new Date(s) : null;
    const de = e ? new Date(e) : null;
    if (ds && de && !isNaN(+ds) && !isNaN(+de) && de > ds) ms += (+de - +ds);
    else ms += 365*24*3600*1000;
  }
  return ms / (365*24*3600*1000);
}

function hhExpFromYears(y) {
  if (y < 1) return 'noExperience';
  if (y < 3) return 'between1And3';
  if (y < 6) return 'between3And6';
  return 'moreThan6';
}

function fallbackInfer(profile = {}, lang = 'ru') {
  const expYears = yearsFromProfile(profile);
  const experience = hhExpFromYears(expYears);
  const items = Array.isArray(profile.experience) ? profile.experience : [];
  const latest = items[0] || items[items.length - 1] || {};
  const role =
    latest.position || latest.title || latest.role ||
    (Array.isArray(profile.skills) && profile.skills[0]) ||
    sFor(lang, 'Специалист', 'Маман', 'Specialist');

  const rawCity = String(profile.location || '').trim();
  let city = KZ_CITIES.find((c) => new RegExp(c, 'i').test(rawCity)) || 'Алматы';

  const skills =
    (Array.isArray(profile.skills) && profile.skills.length
      ? profile.skills
      : String(latest.description || latest.responsibilities || profile.summary || '')
          .split(/[,\n;•\-]/).map(s => s.trim()).filter(Boolean)).slice(0, 8);

  return { role, city, skills, experience };
}

export async function inferSearch(profile = {}, { lang = 'ru', overrideModel } = {}) {
  if (!process.env.OPENROUTER_API_KEY) return fallbackInfer(profile, lang);
  const L = normLang(lang);

  const sys = sFor(
    L,
    'Ты карьерный ассистент. Верни ТОЛЬКО валидный JSON-подсказки для поиска вакансий в Казахстане. Строки на русском.',
    'Сен мансап ассистентісің. Қазақстан бойынша іздеу үшін тек валидті JSON қайтар. Мәтін қазақ тілінде.',
    'You are a career assistant. Return ONLY valid JSON for Kazakhstan job search hints. Use English strings.'
  );

  const format = `{"role":"string","city":"string (KZ only)","skills":["string","..."],"experience":"noExperience|between1And3|between3And6|moreThan6"}`;

  const usr = sFor(
    L,
    `Профиль пользователя (JSON):\n${JSON.stringify(profile, null, 2)}\nТребования:\n- "city" — город РК (если другой — выбери крупный из списка).\n- "skills" — 3–8 навыков (1–2 слова).\nФормат:\n${format}`,
    `Пайдаланушы профилі (JSON):\n${JSON.stringify(profile, null, 2)}\nТалаптар:\n- "city" — тек Қазақстан қаласы.\n- "skills" — 3–8 қысқа дағды (1–2 сөз).\nПішім:\n${format}`,
    `User profile (JSON):\n${JSON.stringify(profile, null, 2)}\nRequirements:\n- "city" must be a Kazakhstan city.\n- "skills" 3–8 items (1–2 words).\nFormat:\n${format}`
  );

  try {
    const text = await openrouterChatSafe({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
      model: overrideModel || MODEL, temperature: 0.2, max_tokens: 500,
    });

    const json = tryParseJSON(text) || {};
    const fb = fallbackInfer(profile, L);

    const role = String(json.role || '').trim() || fb.role;

    let city = String(json.city || '').trim() || fb.city;
    if (!KZ_CITIES.includes(city)) {
      const match = KZ_CITIES.find((c) => new RegExp(c, 'i').test(city));
      city = match || fb.city;
    }

    const skills = Array.isArray(json.skills) ? json.skills.filter(Boolean).slice(0, 8) : fb.skills;
    const expValid = ['noExperience','between1And3','between3And6','moreThan6'];
    const experience = expValid.includes(json.experience) ? json.experience : fb.experience;

    return { role, city, skills, experience };
  } catch {
    return fallbackInfer(profile, L);
  }
}

// ------------------ default export ------------------
export default {
  MODELS,
  MODEL,
  chatLLM,
  summarizeProfile,
  recommendFromProfile,
  generateCoverLetter,
  suggestSkills,
  polishText,
  polishMany,
  inferSearch,
  translateText,
};
