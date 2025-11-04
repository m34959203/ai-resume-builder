/* eslint-disable no-console */
'use strict';

const express = require('express');
const router = express.Router();

/* ============================== OPTIONAL EXTERNAL SERVICES ============================== */
let buildRecommendationsExt = null;
let improveProfileExt = null;
let getCoursesExt = null;
try {
  ({ buildRecommendations: buildRecommendationsExt, improveProfile: improveProfileExt } =
    require('../services/recommender'));
} catch {}
try {
  ({ getCourses: getCoursesExt } = require('../services/courseAggregator'));
} catch {}

/* ================ OPTIONAL TRANSLATOR (DeepSeek / generic) ================= */
let translator = null;
// ожидаемые функции: normalizeLang, translateMany, translateBatch, translateText
try {
  translator = require('../services/translator');
} catch {}

/* ================================== ENV & CONSTANTS ==================================== */
const HH_HOST = (process.env.HH_HOST || 'hh.kz').trim();
const HH_API = 'https://api.hh.ru';
const USER_AGENT = process.env.HH_USER_AGENT || 'AI-Resume-Builder/1.0 (+github.com)';

const SAMPLE_PAGES = Math.max(1, Number(process.env.RECS_SAMPLE_PAGES || 2));
const PER_PAGE = Math.max(1, Number(process.env.RECS_PER_PAGE || 50));
const VACANCY_SAMPLE_PER_ROLE = Math.max(1, Number(process.env.RECS_VACANCY_SAMPLE_PER_ROLE || 30));
const CACHE_TTL_MS = Number(process.env.RECS_CACHE_TTL_MS || 180000);
const DETAIL_CONCURRENCY = Math.max(2, Number(process.env.RECS_DETAIL_CONCURRENCY || 6));
const FETCH_TIMEOUT_MS = Math.max(3000, Number(process.env.RECS_FETCH_TIMEOUT_MS || 15000));

/* ==================================== SMALL CACHE ======================================= */
const _cache = new Map();
const cacheGet = (k) => {
  const it = _cache.get(k);
  if (!it) return null;
  if (it.exp < Date.now()) {
    _cache.delete(k);
    return null;
  }
  return it.data;
};
const cacheSet = (k, v, ttl = CACHE_TTL_MS) => _cache.set(k, { exp: Date.now() + ttl, data: v });

/* ===================================== FETCH HELPERS ==================================== */
const hhHeaders = (extra = {}) => ({
  'User-Agent': USER_AGENT,
  'HH-User-Agent': USER_AGENT,
  Accept: 'application/json',
  'Accept-Language': 'ru', // данные HH оставляем на русском — это стабильнее для парсинга
  ...extra,
});
function withTimeout(pf, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error('timeout')), ms);
  return pf(ctrl.signal).finally(() => clearTimeout(t));
}
async function fetchJSON(url, { method = 'GET', headers = {}, body, retries = 2 } = {}) {
  const doFetch = async (signal) => {
    const res = await fetch(url, { method, headers: hhHeaders(headers), body, signal });
    const text = await res.text();
    let data = text;
    try {
      if ((res.headers.get('content-type') || '').includes('application/json')) {
        data = text ? JSON.parse(text) : null;
      }
    } catch {}
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  };
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const r = await withTimeout((signal) => doFetch(signal), FETCH_TIMEOUT_MS);
      if (r.ok) return r;
      const retryAfter = Number(r.headers?.get?.('Retry-After') || 0);
      const shouldRetry = (r.status === 429 || (r.status >= 500 && r.status < 600)) && attempt < retries;
      if (!shouldRetry) return r;
      const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(3000, 400 * Math.pow(2, attempt));
      await new Promise((res) => setTimeout(res, delay));
      attempt += 1;
    } catch (e) {
      if (attempt >= retries) throw e;
      await new Promise((res) => setTimeout(res, 400 * Math.pow(2, attempt)));
      attempt += 1;
    }
  }
}
async function getJsonCached(url) {
  const hit = cacheGet(url);
  if (hit) return hit;
  const { ok, status, data } = await fetchJSON(url);
  if (!ok) throw new Error(`HTTP ${status} for ${url}`);
  cacheSet(url, data);
  return data;
}
async function hhSearchVacancies({ text, area, page = 0, per_page = PER_PAGE, host = HH_HOST }) {
  const u = new URL(`${HH_API}/vacancies`);
  if (text) u.searchParams.set('text', text);
  if (area) u.searchParams.set('area', String(area));
  u.searchParams.set('per_page', String(per_page));
  u.searchParams.set('page', String(page));
  if (host) u.searchParams.set('host', host);
  return getJsonCached(u.toString());
}
async function hhGetVacancy(id) {
  return getJsonCached(`${HH_API}/vacancies/${encodeURIComponent(id)}`);
}

/* ============================== NORMALIZATION & HEURISTICS ============================== */
const SKILL_LEXICON = [
  'Agile',
  'Scrum',
  'Kanban',
  'Project Management',
  'Risk Management',
  'Stakeholder Management',
  'Presentation',
  'Communication',
  'Requirements',
  'UML',
  'BPMN',
  'Jira',
  'Confluence',
  'Excel',
  'Power BI',
  'Tableau',
  'SQL',
  'Python',
  'R',
  'Pandas',
  'NumPy',
  'Statistics',
  'A/B Testing',
  'JavaScript',
  'TypeScript',
  'HTML',
  'CSS',
  'Sass',
  'React',
  'Redux',
  'Node.js',
  'Express',
  'Git',
  'REST',
  'GraphQL',
  'Testing',
  'Webpack',
  'Vite',
  'Figma',
  'UI/UX',
  'Digital Marketing',
  'SEO',
  'SMM',
  'Google Analytics',
  'Copywriting',
];
const CANON = {
  js: 'javascript',
  javascript: 'javascript',
  'react.js': 'react',
  react: 'react',
  ts: 'typescript',
  typescript: 'typescript',
  'node.js': 'node',
  node: 'node',
  express: 'express',
  html: 'html',
  css: 'css',
  sass: 'sass',
  redux: 'redux',
  webpack: 'webpack',
  vite: 'vite',
  python: 'python',
  pandas: 'pandas',
  numpy: 'numpy',
  powerbi: 'power bi',
  'power bi': 'power bi',
  tableau: 'tableau',
  excel: 'excel',
  sql: 'sql',
  jira: 'jira',
  confluence: 'confluence',
  graphql: 'graphql',
  rest: 'rest',
  'ui/ux': 'ui/ux',
  'ux/ui': 'ui/ux',
  'a/b testing': 'a/b testing',
  testing: 'testing',
  agile: 'agile',
  scrum: 'scrum',
  kanban: 'kanban',
  communication: 'communication',
  presentation: 'presentation',
  requirements: 'requirements',
  uml: 'uml',
  bpmn: 'bpmn',
  'risk management': 'risk management',
  'stakeholder management': 'stakeholder management',
  'digital marketing': 'digital marketing',
  seo: 'seo',
  smm: 'smm',
};
const ROLE_PATTERNS = [
  { title: 'Project Manager', rx: /(project\s*manager|руководитель\s*проектов|менеджер\s*проекта|pm)/i },
  { title: 'Business Analyst', rx: /(business\s*analyst|бизнес[-\s]?аналитик)/i },
  { title: 'Marketing Specialist', rx: /(marketing|маркетолог|smm|digital)/i },
  { title: 'Data Analyst', rx: /(data\s*analyst|аналитик\s*данных)/i },
  { title: 'Frontend Developer', rx: /(frontend|react|javascript\s*developer)/i },
  { title: 'Product Manager', rx: /(product\s*manager|продакт)/i },
  { title: 'QA Engineer', rx: /(qa|тестировщик|quality\s*assurance)/i },
]; // ← массив закрыт

const ADVANCED_BY_ROLE = {
  'Frontend Developer': ['Accessibility', 'Performance', 'GraphQL', 'Testing'],
  'Data Analyst': ['SQL Optimization', 'A/B Testing', 'Power BI DAX', 'Python Visualization'],
  'Business Analyst': ['BPMN 2.0', 'Prototyping', 'System Analysis'],
  'Project Manager': ['People Management', 'Budgeting', 'Roadmapping', 'Metrics'],
  'Marketing Specialist': ['CRO', 'Email Marketing', 'Marketing Analytics'],
};

function normalizeSkills(profile) {
  const base = (Array.isArray(profile?.skills) ? profile.skills : [])
    .flatMap((s) => String(s || '').split(/[,/;|]+/))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const text = [
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map((e) =>
      [e.title, e.description].map((x) => String(x || '')).join(' ')
    ),
    ...(Array.isArray(profile.education) ? profile.education : []).map((e) =>
      [e.degree, e.major, e.specialization].map((x) => String(x || '')).join(' ')
    ),
  ]
    .join(' ')
    .toLowerCase();
  const extra = SKILL_LEXICON.map((s) => s.toLowerCase()).filter((sk) => text.includes(sk));
  const out = new Set();
  [...base, ...extra].forEach((raw) => {
    const k = CANON[raw] || raw;
    if (k) out.add(k);
  });
  return Array.from(out);
}

function guessRoles(profile) {
  const hay = [
    String(profile.targetTitle || ''),
    String(profile.desiredRole || ''),
    String(profile.position || ''),
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map((e) => String(e.title || '')),
  ].join(' ');
  const roles = [];
  for (const r of ROLE_PATTERNS) if (r.rx.test(hay)) roles.push(r.title);
  const skills = normalizeSkills(profile);
  if (!roles.length) {
    if (skills.some((s) => ['react', 'javascript', 'typescript', 'html', 'css'].includes(s)))
      roles.push('Frontend Developer');
    if (skills.some((s) => ['sql', 'excel', 'python', 'power bi', 'tableau', 'pandas'].includes(s)))
      roles.push('Data Analyst');
    if (skills.some((s) => ['requirements', 'uml', 'bpmn', 'jira', 'confluence'].includes(s)))
      roles.push('Business Analyst');
  }
  if (!roles.length) roles.push('Business Analyst', 'Project Manager');
  return Array.from(new Set(roles)).slice(0, 3);
}

function yearsOfExperience(profile) {
  const arr = Array.isArray(profile.experience) ? profile.experience : [];
  let ms = 0;
  for (const e of arr) {
    const start = e.start || e.from || e.dateStart || e.date_from;
    const end = e.end || e.to || e.dateEnd || e.date_to || new Date().toISOString().slice(0, 10);
    if (!start) continue;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) ms += b - a;
  }
  const years = ms / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.round(years * 10) / 10);
}
const expBucket = (y) => (y < 1 ? 'noExperience' : y < 3 ? 'between1And3' : y < 6 ? 'between3And6' : 'moreThan6');
const expMatchScore = (u, v) => {
  if (!v) return 0.5;
  if (u === v) return 1;
  const order = ['noExperience', 'between1And3', 'between3And6', 'moreThan6'];
  const d = Math.abs(order.indexOf(u) - order.indexOf(v));
  return d === 1 ? 0.7 : d === 2 ? 0.4 : 0.1;
};

function extractSkillsFromVacancy(v) {
  const pool = [];
  const ks = Array.isArray(v.key_skills) ? v.key_skills.map((k) => k.name) : [];
  pool.push(...ks);
  const txt = [v.name, v.snippet?.requirement, v.snippet?.responsibility, v.description]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');
  for (const s of SKILL_LEXICON) if (txt.includes(s.toLowerCase())) pool.push(s);
  const out = new Set();
  pool
    .map((s) => String(s || '').toLowerCase())
    .forEach((raw) => {
      const k = CANON[raw] || raw;
      if (k) out.add(k);
    });
  return Array.from(out);
}

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const hhSearchUrl = (role, areaId, host = HH_HOST) => {
  const u = new URL(`https://${host}/search/vacancy`);
  u.searchParams.set('text', role);
  if (areaId) u.searchParams.set('area', String(areaId));
  return u.toString();
};
const courseLinks = (skill) => {
  const q = encodeURIComponent(skill);
  return [
    {
      provider: 'Coursera',
      title: `${capital(skill)} — специализации`,
      duration: '1–3 мес',
      url: `https://www.coursera.org/search?query=${q}`,
    },
    {
      provider: 'Udemy',
      title: `${capital(skill)} — практические курсы`,
      duration: '1–2 мес',
      url: `https://www.udemy.com/courses/search/?q=${q}`,
    },
    {
      provider: 'Stepik',
      title: `${capital(skill)} — русские курсы`,
      duration: '2–8 нед',
      url: `https://stepik.org/search?query=${q}`,
    },
  ];
};

/* =============================== CORE RECOMMENDATIONS ENGINE ============================ */
async function buildRecommendationsSmart(profile = {}, opts = {}) {
  const areaId = opts.areaId ?? null;
  const mySkills = normalizeSkills(profile);
  const userYears = yearsOfExperience(profile);
  const userBucket = expBucket(userYears);
  const roles = guessRoles(profile);

  const roleStats = [];
  const allVacancyIds = [];

  for (const role of roles) {
    let ids = [];
    for (let p = 0; p < SAMPLE_PAGES; p++) {
      try {
        const page = await hhSearchVacancies({
          text: role,
          area: areaId,
          page: p,
          per_page: PER_PAGE,
          host: HH_HOST,
        });
        const pageIds = (page.items || []).map((v) => v.id);
        ids.push(...pageIds);
        if (typeof page.pages === 'number' && p >= page.pages - 1) break;
      } catch (e) {
        console.warn('[HH search failed]', e?.message || e);
        break;
      }
    }
    ids = Array.from(new Set(ids));
    allVacancyIds.push(...ids);
    roleStats.push({ role, count: ids.length, ids: ids.slice(0, VACANCY_SAMPLE_PER_ROLE) });
  }

  const skillFreq = new Map();
  const expScores = [];
  const rolesAgg = [];

  for (const r of roleStats) {
    const target = r.ids.slice();
    const details = [];
    const workers = Array.from(
      { length: Math.min(DETAIL_CONCURRENCY, target.length) },
      async () => {
        while (target.length) {
          const id = target.shift();
          try {
            details.push(await hhGetVacancy(id));
          } catch {}
        }
      }
    );
    await Promise.all(workers);

    const localSkills = new Map();
    for (const v of details) {
      const sArr = extractSkillsFromVacancy(v);
      for (const s of sArr) {
        skillFreq.set(s, (skillFreq.get(s) || 0) + 1);
        localSkills.set(s, (localSkills.get(s) || 0) + 1);
      }
      const vb = v.experience?.id || null;
      expScores.push(expMatchScore(userBucket, vb));
    }
    const topLocal = [...localSkills.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, freq]) => ({ name, freq }));
    rolesAgg.push({
      title: r.role,
      vacancies: r.count,
      hhQuery: r.role,
      topSkills: topLocal,
      url: hhSearchUrl(r.role, areaId, HH_HOST),
    });
  }

  const topDemand = [...skillFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, freq]) => ({ name, freq }));
  const mySet = new Set(mySkills);
  let gaps = topDemand.filter((s) => !mySet.has(s.name)).slice(0, 8);
  if (!gaps.length && rolesAgg.length) {
    const r0 = rolesAgg[0].title;
    const adv = (ADVANCED_BY_ROLE[r0] || ['Communication', 'Presentation']).map((s) =>
      s.toLowerCase()
    );
    gaps = adv.map((n) => ({ name: n, freq: 1, advanced: true })).slice(0, 6);
  }

  let courses = gaps.slice(0, 3).flatMap((g) => courseLinks(g.name));
  if (typeof getCoursesExt === 'function') {
    try {
      const keywords = gaps.slice(0, 6).map((g) => g.name).join(', ');
      courses = await getCoursesExt({ profile, gaps, keywords });
    } catch (e) {
      console.warn('[courses/ext]', e?.message || e);
    }
  }

  const demandSet = new Set(topDemand.map((s) => s.name));
  const overlap = mySkills.filter((s) => demandSet.has(s)).length;
  const fitSkills = topDemand.length ? overlap / topDemand.length : 0;
  const fitExp = expScores.length ? expScores.reduce((a, b) => a + b, 0) / expScores.length : 0.5;
  const roleHit = rolesAgg.some((r) => r.vacancies > 50)
    ? 1
    : rolesAgg.some((r) => r.vacancies > 20)
    ? 0.7
    : rolesAgg.some((r) => r.vacancies > 5)
    ? 0.4
    : 0.2;

  const scoreRaw = (fitSkills * 0.6 + fitExp * 0.25 + roleHit * 0.15) * 100;
  const marketFitScore = Math.max(10, Math.min(95, Math.round(scoreRaw)));

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: rolesAgg,
    professions: rolesAgg,
    growSkills: gaps.map((g) => ({ name: g.name, demand: g.freq, gap: true })),
    skillsToGrow: gaps.map((g) => capital(g.name)),
    courses,
    debug: {
      skillsDetected: mySkills,
      rolesGuessed: roles,
      areaUsed: areaId,
      sampleVacancies: Array.from(new Set(allVacancyIds)).length,
      userYears,
      host: HH_HOST,
    },
  };
}

/* ======================================== FALLBACKS ===================================== */
async function fallbackRecommendations(profile = {}) {
  const skills = normalizeSkills(profile);
  const professions = [];
  if (skills.some((s) => /react|javascript|typescript|html|css/.test(s)))
    professions.push({
      title: 'Frontend Developer',
      vacancies: 0,
      hhQuery: 'Frontend Developer',
      topSkills: [],
      url: hhSearchUrl('Frontend Developer', null),
    });
  if (skills.some((s) => /python|django|flask|fastapi/.test(s)))
    professions.push({
      title: 'Python Developer',
      vacancies: 0,
      hhQuery: 'Python Developer',
      topSkills: [],
      url: hhSearchUrl('Python Developer', null),
    });
  if (skills.some((s) => /sql|postgres|mysql|excel|data|pandas/.test(s)))
    professions.push({
      title: 'Data Analyst',
      vacancies: 0,
      hhQuery: 'Data Analyst',
      topSkills: [],
      url: hhSearchUrl('Data Analyst', null),
    });
  if (!professions.length) {
    professions.push({
      title: 'Business Analyst',
      vacancies: 0,
      hhQuery: 'Business Analyst',
      topSkills: [],
      url: hhSearchUrl('Business Analyst', null),
    });
    professions.push({
      title: 'Project Manager',
      vacancies: 0,
      hhQuery: 'Project Manager',
      topSkills: [],
      url: hhSearchUrl('Project Manager', null),
    });
  }
  let courses = [
    { provider: 'Coursera', title: 'React Specialization', duration: '3 месяца', url: 'https://www.coursera.org/' },
    { provider: 'Udemy', title: 'Complete Web Development', duration: '2 месяца', url: 'https://www.udemy.com/' },
    { provider: 'Stepik', title: 'Python для начинающих', duration: '1 месяц', url: 'https://stepik.org/' },
  ];
  if (typeof getCoursesExt === 'function') {
    try {
      courses = await getCoursesExt(profile);
    } catch (e) {
      console.warn('[courses/fallback]', e?.message || e);
    }
  }
  const basicGrow = skills.length
    ? ['Communication', 'Presentation', 'Critical thinking']
    : ['Agile', 'Data Analysis', 'Digital Marketing'];
  return {
    marketFitScore: 65,
    marketScore: 65,
    roles: professions,
    professions,
    growSkills: basicGrow.map((s) => ({ name: s.toLowerCase(), demand: 1, gap: true })),
    skillsToGrow: basicGrow,
    courses,
    debug: { fallback: true },
  };
}
function fallbackImprove(profile = {}) {
  const uniq = (arr) =>
    Array.from(new Set((arr || []).map(String).map((s) => s.trim()).filter(Boolean)));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const normalizedSkills = uniq(profile.skills).map(cap);
  const bullets = [];
  const txt = String(profile.summary || '').trim();
  if (txt) txt.split(/[\n\.]+/).map((s) => s.trim()).filter(Boolean).forEach((line) => bullets.push(`• ${line}`));
  const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
  return { ok: true, updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
}

/* ============================= TRANSLATION UTILITIES (safe) ============================= */
const normalizeLangSafe = (raw) => {
  const v = String(raw || '').toLowerCase();
  if (translator?.normalizeLang) return translator.normalizeLang(v);
  if (v.startsWith('kk') || v === 'kz') return 'kk';
  if (v.startsWith('en')) return 'en';
  return 'ru';
};
const needTranslate = (to) => !!to && to !== 'auto' && normalizeLangSafe(to) !== 'ru';

async function translateManySafe(texts, { to }) {
  const arr = Array.isArray(texts) ? texts : [];
  if (!arr.length) return [];
  const lang = normalizeLangSafe(to);
  if (!needTranslate(lang)) return arr.slice();

  try {
    if (translator?.translateMany) {
      return await translator.translateMany(arr, { to: lang });
    }
    if (translator?.translateBatch) {
      return await translator.translateBatch(arr, { to: lang });
    }
  } catch (e) {
    console.warn('[translator/many] fallback to single', e?.message || e);
  }

  if (translator?.translateText) {
    const out = [];
    for (const t of arr) {
      // eslint-disable-next-line no-await-in-loop
      out.push(await translator.translateText(String(t || ''), { to: lang }).catch(() => String(t || '')));
    }
    return out;
  }

  return arr.slice();
}

/**
 * Перевести полезные для пользователя поля в пэйлоаде рекомендаций:
 * - roles[].title, roles[].hhQuery
 * - skillsToGrow[] (строки)
 * - growSkills[].name
 * - courses[].title
 *
 * Возвращает новый объект. Если перевод недоступен — возвращает исходный.
 */
async function translateRecommendationsPayload(payload, to) {
  const lang = normalizeLangSafe(to);
  if (!needTranslate(lang)) return { ...payload, lang: 'ru', translated: false };

  try {
    const clone = JSON.parse(JSON.stringify(payload || {}));
    // roles
    if (Array.isArray(clone.roles) && clone.roles.length) {
      const roleTitles = clone.roles.map((r) => String(r?.title || ''));
      const roleQueries = clone.roles.map((r) => String(r?.hhQuery || ''));
      const [tTitles, tQueries] = await Promise.all([
        translateManySafe(roleTitles, { to: lang }),
        translateManySafe(roleQueries, { to: lang }),
      ]);
      clone.roles = clone.roles.map((r, i) => ({
        ...r,
        title: tTitles[i] || r.title,
        hhQuery: tQueries[i] || r.hhQuery,
      }));
      // alias professions (сохраняем согласованность)
      if (Array.isArray(clone.professions)) {
        clone.professions = clone.roles;
      }
    }

    // skillsToGrow: строки
    if (Array.isArray(clone.skillsToGrow) && clone.skillsToGrow.length) {
      const tSkills = await translateManySafe(
        clone.skillsToGrow.map((s) => String(s || '')),
        { to: lang }
      );
      clone.skillsToGrow = tSkills.map((s) => String(s || ''));
    }

    // growSkills[].name
    if (Array.isArray(clone.growSkills) && clone.growSkills.length) {
      const names = clone.growSkills.map((g) => String(g?.name || ''));
      const tNames = await translateManySafe(names, { to: lang });
      clone.growSkills = clone.growSkills.map((g, i) => ({ ...g, name: tNames[i] || g.name }));
    }

    // courses[].title  (provider/duration/url оставляем как есть)
    if (Array.isArray(clone.courses) && clone.courses.length) {
      const ctitles = clone.courses.map((c) => String(c?.title || ''));
      const tC = await translateManySafe(ctitles, { to: lang });
      clone.courses = clone.courses.map((c, i) => ({ ...c, title: tC[i] || c.title }));
    }

    clone.lang = lang;
    clone.translated = true;
    return clone;
  } catch (e) {
    console.warn('[recommendations/translate] failed:', e?.message || e);
    return { ...(payload || {}), lang, translated: false };
  }
}

/* ========================================== ROUTES ====================================== */
router.post('/generate', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId = req.body?.areaId ?? null;
    const langReq =
      req.body?.lang || req.query?.lang || req.headers['x-language'] || profile?.lang || 'ru';
    const lang = normalizeLangSafe(langReq);

    if (typeof buildRecommendationsExt === 'function') {
      const dataOrig = await buildRecommendationsExt(profile, { areaId });
      const data = await translateRecommendationsPayload(dataOrig, lang);
      return res.json({ ok: true, data, lang, translated: data.translated === true });
    }

    let dataOrig;
    try {
      dataOrig = await buildRecommendationsSmart(profile, { areaId });
    } catch (e) {
      console.error('[rec/generate smart failed]', e);
      dataOrig = await fallbackRecommendations(profile);
    }

    const data = await translateRecommendationsPayload(dataOrig, lang);
    return res.json({ ok: true, data, lang, translated: data.translated === true });
  } catch (e) {
    console.error('[rec/generate]', e);
    const lang = normalizeLangSafe(req.body?.lang || req.query?.lang || req.headers['x-language']);
    const base = await fallbackRecommendations(req.body?.profile || {});
    const data = await translateRecommendationsPayload(base, lang);
    return res.json({ ok: true, data, lang, translated: data.translated === true, fallback: true });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId = req.body?.areaId ?? null;
    const langReq =
      req.body?.lang || req.query?.lang || req.headers['x-language'] || profile?.lang || 'ru';
    const lang = normalizeLangSafe(langReq);

    const dataOrig = await buildRecommendationsSmart(profile, { areaId });
    const data = await translateRecommendationsPayload(dataOrig, lang);

    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({
      marketFitScore,
      roles,
      growSkills,
      courses,
      debug,
      lang,
      translated: data.translated === true,
    });
  } catch (e) {
    console.error('[rec/analyze]', e);
    const lang = normalizeLangSafe(req.body?.lang || req.query?.lang || req.headers['x-language']);
    const base = await fallbackRecommendations(req.body?.profile || {});
    const data = await translateRecommendationsPayload(base, lang);
    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({
      marketFitScore,
      roles,
      growSkills,
      courses,
      debug: { ...(debug || {}), degraded: true },
      lang,
      translated: data.translated === true,
    });
  }
});

router.post('/improve', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    if (typeof improveProfileExt === 'function') {
      const { updated, changes } = await improveProfileExt(profile);
      return res.json({ ok: true, updated, changes });
    }
    const out = fallbackImprove(profile);
    return res.json(out);
  } catch (e) {
    console.error('[rec/improve]', e);
    const out = fallbackImprove(req.body?.profile || {});
    return res.json(out);
  }
});

module.exports = router;
