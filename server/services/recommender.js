/* eslint-disable no-console */
'use strict';

/**
 * LLM-провайдер для рекомендаций.
 * Работает через OpenRouter (DeepSeek по умолчанию).
 * Если ключа нет — кидает исключение, а роутер уйдёт в эвристику.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.REC_MODEL || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';

const OPENROUTER_KEY =
  process.env.OPENROUTER_API_KEY_DEEPSEEK ||
  process.env.OPENROUTER_API_KEY_DEEPSEEK2 ||
  process.env.OPENROUTER_API_KEY ||
  '';

const REFERER = process.env.OPENROUTER_REFERER || 'https://github.com/m34959203/ai-resume-builder';
const X_TITLE = process.env.OPENROUTER_TITLE || 'AI Resume Builder';

/** Безопасный вызов LLM, требуем JSON-ответ */
async function askLLMJSON(messages, temperature = 0.2) {
  if (!OPENROUTER_KEY) throw new Error('OPENROUTER_API_KEY is missing');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': REFERER,
      'X-Title': X_TITLE,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages
    })
  });

  const data = await res.json().catch(() => ({}));
  const text = data?.choices?.[0]?.message?.content?.trim?.() || '{}';
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('[recommender/llm] bad JSON:', text.slice(0, 200));
    throw e;
  }
}

/** Нормализация безопасного ответа */
function normalizeLLM(out, profile) {
  const roles = (Array.isArray(out.roles) ? out.roles : [])
    .map(r => (typeof r === 'string' ? { title: r } : r))
    .filter(Boolean)
    .slice(0, 4);

  const grow = (Array.isArray(out.growSkills) ? out.growSkills
              : Array.isArray(out.skillsToGrow) ? out.skillsToGrow.map(n => ({ name: n }))
              : [])
    .map(s => (typeof s === 'string' ? { name: s } : s))
    .filter(s => s && s.name);

  const userSkills = new Set(
    (Array.isArray(profile?.skills) ? profile.skills : [])
      .map(s => (typeof s === 'string' ? s : (s?.name || s?.title || '')))
      .map(s => String(s).trim().toLowerCase())
      .filter(Boolean)
  );

  const growFiltered = grow.filter(s => !userSkills.has(String(s.name).toLowerCase()));

  const coursesRaw = Array.isArray(out.courses) ? out.courses : [];
  const courses = coursesRaw.map(c =>
    typeof c === 'string' ? { title: c, provider: '', url: c } : c
  );

  const score = Math.max(10, Math.min(95, Number(out.marketFitScore || out.score || 0)));

  return {
    marketFitScore: Math.round(score || 25),
    roles,
    growSkills: growFiltered,
    courses,
    debug: { source: 'llm', rawScore: out.marketFitScore ?? out.score ?? null }
  };
}

/** Публичный API — строим рекомендации профилю */
exports.buildRecommendations = async function buildRecommendations(profile, { areaId } = {}) {
  const system = [
    'You are a senior career coach for the CIS market (Kazakhstan/Russia).',
    'Return ONLY JSON with keys: roles[], growSkills[], courses[], marketFitScore (0..100).',
    'roles[]: up to 4 objects: { "title": "Data Analyst", "url"?: "https://hh.kz/search/vacancy?text=Data%20Analyst&area=<areaId>" }',
    'growSkills[]: up to 8 objects: { "name": "Pandas" } — only skills the user does NOT have yet.',
    'courses[]: up to 9 items: { "provider": "Stepik|Coursera|Udemy|YouTube", "title": "...", "url": "https://..." }',
    'marketFitScore: conservative estimate (15..95) based on skill overlap and experience.',
    'Prefer Russian names in titles; use globally recognizable skill names in latin (SQL, Pandas, React).',
  ].join(' ');

  const user = {
    role: profile?.position || profile?.desiredRole || profile?.targetRole || '',
    location: profile?.location || '',
    experience: Array.isArray(profile?.experience) ? profile.experience : [],
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    summary: profile?.summary || ''
  };

  const areaParam = areaId ? String(areaId) : '';

  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: JSON.stringify({
        profile: user,
        areaId: areaParam,
        instructions: {
          maxRoles: 4, maxGrowSkills: 8, maxCourses: 9,
          avoidDuplicatesWithProfile: true
        }
      })
    }
  ];

  const raw = await askLLMJSON(messages, 0.15);
  const data = normalizeLLM(raw, profile);

  // добавим HH-ссылки, если есть areaId
  if (areaParam && Array.isArray(data.roles)) {
    for (const r of data.roles) {
      if (!r.url && r.title) {
        const u = new URL('https://hh.kz/search/vacancy');
        u.searchParams.set('text', r.title);
        u.searchParams.set('area', areaParam);
        r.url = u.toString();
      }
    }
  }

  return data;
};

/** Улучшение профиля (по желанию) */
exports.improveProfile = async function improveProfile(profile) {
  if (!OPENROUTER_KEY) return { updated: profile, changes: { llm: false } };

  const sys = 'Rewrite and polish resume summary in Russian. Return JSON: { "summary": "...", "bullets": ["..."] }.';
  const msg = [
    { role: 'system', content: sys },
    { role: 'user', content: JSON.stringify({ summary: profile?.summary || '', role: profile?.position || '' }) }
  ];
  const raw = await askLLMJSON(msg, 0.2);
  const updated = {
    ...profile,
    summary: raw.summary || profile.summary,
    bullets: Array.isArray(raw.bullets) ? raw.bullets.map(s => `• ${s}`) : (profile.bullets || [])
  };
  return { updated, changes: { llm: true, summary: Boolean(raw.summary), bullets: (raw.bullets || []).length } };
};
