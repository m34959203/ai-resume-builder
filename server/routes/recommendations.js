/* eslint-disable no-console */
'use strict';

const express = require('express');
const router = express.Router();

/* ============================== OPTIONAL EXTERNAL SERVICES ============================== */
// Если есть «умные» сервисы, используем их; иначе — наш встроенный движок.
let buildRecommendationsExt = null;
let improveProfileExt = null;
let getCoursesExt = null;
try { ({ buildRecommendations: buildRecommendationsExt, improveProfile: improveProfileExt } = require('../services/recommender')); } catch {}
try { ({ getCourses: getCoursesExt } = require('../services/courseAggregator')); } catch {}

/* ================================== ENV & CONSTANTS ==================================== */
const HH_HOST = (process.env.HH_HOST || 'hh.kz').trim(); // hh.kz | hh.ru
const HH_API  = 'https://api.hh.ru';
const USER_AGENT = process.env.HH_USER_AGENT || 'AI-Resume-Builder/1.0 (+github.com)';
const SAMPLE_PAGES = Math.max(1, Number(process.env.RECS_SAMPLE_PAGES || 2));      // страниц на роль
const PER_PAGE     = Math.max(1, Number(process.env.RECS_PER_PAGE || 50));         // вакансий на страницу
const VACANCY_SAMPLE_PER_ROLE = Math.max(1, Number(process.env.RECS_VACANCY_SAMPLE_PER_ROLE || 30)); // детальный парс
const CACHE_TTL_MS = Number(process.env.RECS_CACHE_TTL_MS || 3 * 60 * 1000);       // кэш HH 3 минуты
const DETAIL_CONCURRENCY = Math.max(2, Number(process.env.RECS_DETAIL_CONCURRENCY || 6)); // одновременных детальных запросов
const FETCH_TIMEOUT_MS = Math.max(3000, Number(process.env.RECS_FETCH_TIMEOUT_MS || 15000));

/* ==================================== SMALL CACHE ======================================= */
const _cache = new Map(); // key -> { exp, data }
function cacheGet(key) {
  const it = _cache.get(key);
  if (!it) return null;
  if (it.exp < Date.now()) { _cache.delete(key); return null; }
  return it.data;
}
function cacheSet(key, data, ttl = CACHE_TTL_MS) {
  _cache.set(key, { exp: Date.now() + ttl, data });
}

/* ===================================== FETCH HELPERS ==================================== */

function hhHeaders(extra = {}) {
  return {
    'User-Agent': USER_AGENT,
    'HH-User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Accept-Language': 'ru',
    ...extra,
  };
}

function withTimeout(promise, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error('timeout')), ms);
  return promise(ctrl.signal).finally(() => clearTimeout(t));
}

/** единый JSON fetch с ретраями для 429/5xx и поддержкой Retry-After */
async function fetchJSON(url, { method = 'GET', headers = {}, body, retries = 2 } = {}) {
  const doFetch = async (signal) => {
    const res = await fetch(url, { method, headers: hhHeaders(headers), body, signal });
    const text = await res.text();
    let data = text;
    try { if ((res.headers.get('content-type') || '').includes('application/json')) data = text ? JSON.parse(text) : null; } catch {}
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  };

  let attempt = 0;
  while (true) {
    try {
      const r = await withTimeout((signal) => doFetch(signal), FETCH_TIMEOUT_MS);
      if (r.ok) return r;

      const status = r.status;
      const retryAfter = Number(r.headers?.get?.('Retry-After') || 0);
      const shouldRetry = (status === 429 || (status >= 500 && status < 600)) && attempt < retries;

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
  if (host) u.searchParams.set('host', host);         // <-- правильный способ указать сайт HH
  return getJsonCached(u.toString());
}

async function hhGetVacancy(id) {
  const url = `${HH_API}/vacancies/${encodeURIComponent(id)}`;
  return getJsonCached(url);
}

/* ============================== NORMALIZATION & HEURISTICS ============================== */

const SKILL_LEXICON = [
  // Mgmt / BA
  'Agile','Scrum','Kanban','Project Management','Risk Management','Stakeholder Management',
  'Presentation','Communication','Requirements','UML','BPMN','Jira','Confluence',
  // Data / BI
  'Excel','Power BI','Tableau','SQL','Python','R','Pandas','NumPy','Statistics','A/B Testing',
  // Frontend / Dev
  'JavaScript','TypeScript','HTML','CSS','Sass','React','Redux','Node.js','Express','Git','REST','GraphQL','Testing','Webpack','Vite',
  // Design / Marketing
  'Figma','UI/UX','Digital Marketing','SEO','SMM','Google Analytics','Copywriting',
];

const CANON = {
  js: 'javascript', 'javascript': 'javascript', 'react.js': 'react', react: 'react',
  ts: 'typescript', typescript: 'typescript',
  'node.js': 'node', node: 'node', express: 'express',
  html: 'html', css: 'css', sass: 'sass',
  redux: 'redux', webpack: 'webpack', vite: 'vite',
  python: 'python', pandas: 'pandas', numpy: 'numpy',
  'powerbi': 'power bi', 'power bi': 'power bi', tableau: 'tableau', excel: 'excel',
  sql: 'sql',
  jira: 'jira', confluence: 'confluence',
  graphql: 'graphql', rest: 'rest',
  'ui/ux': 'ui/ux', 'ux/ui': 'ui/ux',
  'a/b testing': 'a/b testing', testing: 'testing',
  agile: 'agile', scrum: 'scrum', kanban: 'kanban',
  communication: 'communication', presentation: 'presentation',
  requirements: 'requirements', uml: 'uml', bpmn: 'bpmn',
  'risk management': 'risk management', 'stakeholder management': 'stakeholder management',
  'digital marketing': 'digital marketing', seo: 'seo', smm: 'smm',
};

const ROLE_PATTERNS = [
  { title: 'Project Manager',     rx: /(project\s*manager|руководитель\s*проектов|менеджер\s*проекта|pm)/i },
  { title: 'Business Analyst',    rx: /(business\s*analyst|бизнес[-\s]?аналитик)/i },
  { title: 'Marketing Specialist',rx: /(marketing|маркетолог|smm|digital)/i },
  { title: 'Data Analyst',        rx: /(data\s*analyst|аналитик\s*данных)/i },
  { title: 'Frontend Developer',  rx: /(frontend|react|javascript\s*developer)/i },
  { title: 'Product Manager',     rx: /(product\s*manager|продакт)/i },
  { title: 'QA Engineer',         rx: /(qa|тестировщик|quality\s*assurance)/i },
];

const ADVANCED_BY_ROLE = {
  'Frontend Developer': ['Accessibility', 'Performance', 'GraphQL', 'Testing'],
  'Data Analyst': ['SQL Optimization', 'A/B Testing', 'Power BI DAX', 'Python Visualization'],
  'Business Analyst': ['BPMN 2.0', 'Prototyping', 'System Analysis'],
  'Project Manager': ['People Management', 'Budgeting', 'Roadmapping', 'Metrics'],
  'Marketing Specialist': ['CRO', 'Email Marketing', 'Marketing Analytics'],
};

/** унификация/выделение навыков из профиля */
function normalizeSkills(profile) {
  const base = (Array.isArray(profile.skills) ? profile.skills : [])
    .flatMap(s => String(s || '').split(/[,/;|]+/))
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase());

  const text = [
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map(e => [e.title, e.description].map(x => String(x||'')).join(' ')),
    ...(Array.isArray(profile.education) ? profile.education : []).map(e => [e.degree, e.major, e.specialization].map(x => String(x||'')).join(' ')),
  ].join(' ').toLowerCase();

  const extra = SKILL_LEXICON
    .map(s => s.toLowerCase())
    .filter(sk => text.includes(sk));

  // канонизация
  const canon = new Set();
  [...base, ...extra].forEach((raw) => {
    const k = CANON[raw] || raw;
    if (k) canon.add(k);
  });
  return Array.from(canon);
}

function guessRoles(profile) {
  const hay = [
    String(profile.targetTitle || ''),
    String(profile.desiredRole || ''),
    String(profile.position || ''),
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map(e => String(e.title || '')),
  ].join(' ');
  const roles = [];
  for (const r of ROLE_PATTERNS) if (r.rx.test(hay)) roles.push(r.title);
  // fallback по навыкам
  const skillsLower = normalizeSkills(profile);
  if (!roles.length) {
    if (skillsLower.some(s => ['react','javascript','typescript','html','css'].includes(s))) roles.push('Frontend Developer');
    if (skillsLower.some(s => ['sql','excel','python','power bi','tableau','pandas'].includes(s))) roles.push('Data Analyst');
    if (skillsLower.some(s => ['requirements','uml','bpmn','jira','confluence'].includes(s))) roles.push('Business Analyst');
  }
  if (!roles.length) roles.push('Business Analyst', 'Project Manager');
  // уникализируем и ограничиваем
  return Array.from(new Set(roles)).slice(0, 3);
}

function yearsOfExperience(profile) {
  const arr = Array.isArray(profile.experience) ? profile.experience : [];
  let ms = 0;
  for (const e of arr) {
    const start = e.start || e.from || e.dateStart || e.date_from;
    const end   = e.end || e.to || e.dateEnd || e.date_to || new Date().toISOString().slice(0,10);
    if (!start) continue;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) ms += (b - a);
  }
  const years = ms / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.round(years * 10) / 10);
}

function expBucket(years) {
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

function expMatchScore(userBucket, vacBucket) {
  if (!vacBucket) return 0.5;
  if (userBucket === vacBucket) return 1;
  const order = ['noExperience','between1And3','between3And6','moreThan6'];
  const du = order.indexOf(userBucket);
  const dv = order.indexOf(vacBucket);
  const d = Math.abs(du - dv);
  return d === 1 ? 0.7 : d === 2 ? 0.4 : 0.1;
}

function extractSkillsFromVacancy(vac) {
  const pool = [];
  const ks = Array.isArray(vac.key_skills) ? vac.key_skills.map(k => k.name) : [];
  pool.push(...ks);
  const txt = [
    vac.name, vac.snippet?.requirement, vac.snippet?.responsibility, vac.description
  ].map(x => String(x||'').toLowerCase()).join(' ');
  for (const s of SKILL_LEXICON) {
    const t = s.toLowerCase();
    if (txt.includes(t)) pool.push(s);
  }
  // канонизируем
  const out = new Set();
  pool.map(s => String(s || '').toLowerCase()).forEach((raw) => {
    const k = CANON[raw] || raw;
    if (k) out.add(k);
  });
  return Array.from(out);
}

function capital(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function hhSearchUrl(role, areaId, host = HH_HOST) {
  const u = new URL(`https://${host}/search/vacancy`);
  u.searchParams.set('text', role);
  if (areaId) u.searchParams.set('area', String(areaId));
  return u.toString();
}

function courseLinks(skill) {
  const q = encodeURIComponent(skill);
  return [
    { provider: 'Coursera', title: `${capital(skill)} — специализации`,  duration: '1–3 мес', url: `https://www.coursera.org/search?query=${q}` },
    { provider: 'Udemy',    title: `${capital(skill)} — практические курсы`, duration: '1–2 мес', url: `https://www.udemy.com/courses/search/?q=${q}` },
    { provider: 'Stepik',   title: `${capital(skill)} — русские курсы`,  duration: '2–8 нед', url: `https://stepik.org/search?query=${q}` },
  ];
}

/* =============================== CORE RECOMMENDATIONS ENGINE ============================ */
/** Строит рекомендации на основе профиля и живых вакансий HH */
async function buildRecommendationsSmart(profile = {}, opts = {}) {
  const areaId = opts.areaId ?? null;

  const mySkills = normalizeSkills(profile);
  const userYears = yearsOfExperience(profile);
  const userBucket = expBucket(userYears);
  const roles = guessRoles(profile);

  // 1) Поиск вакансий по ролям
  const roleStats = [];
  const allVacancyIds = [];

  for (const role of roles) {
    let ids = [];
    for (let p = 0; p < SAMPLE_PAGES; p++) {
      try {
        const page = await hhSearchVacancies({ text: role, area: areaId, page: p, per_page: PER_PAGE, host: HH_HOST });
        const pageIds = (page.items || []).map(v => v.id);
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

  // 2) Детали вакансий (ограничим конкурентность)
  const skillFreq = new Map();
  const expScores = [];
  const rolesAgg = [];

  const queue = [];
  for (const r of roleStats) {
    const target = r.ids.slice();
    const details = [];

    const run = async () => {
      while (target.length) {
        const id = target.shift();
        try { details.push(await hhGetVacancy(id)); } catch {}
      }
    };
    queue.push(run);
    // выполняем пачками по DETAIL_CONCURRENCY
    if (queue.length >= DETAIL_CONCURRENCY) {
      await Promise.all(queue.splice(0, queue.length).map(fn => fn()));
    }

    // Когда наполнили details — соберём локальные частоты
    const localSkills = new Map();
    for (const v of details) {
      const sArr = extractSkillsFromVacancy(v);
      for (const s of sArr) {
        skillFreq.set(s, (skillFreq.get(s) || 0) + 1);
        localSkills.set(s, (localSkills.get(s) || 0) + 1);
      }
      const vb = v.experience?.id || null; // 'between1And3' etc.
      expScores.push(expMatchScore(userBucket, vb));
    }
    const topLocal = [...localSkills.entries()]
      .sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([name,freq])=>({ name, freq }));

    rolesAgg.push({
      title: r.role,
      vacancies: r.count,
      hhQuery: r.role,
      topSkills: topLocal,
      url: hhSearchUrl(r.role, areaId, HH_HOST),
    });
  }
  // добить хвост очереди (если что-то осталось)
  if (queue.length) await Promise.all(queue.map(fn => fn()));

  // 3) Общий спрос по навыкам + GAP
  const topDemand = [...skillFreq.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 20)
    .map(([name,freq])=>({ name, freq }));

  const mySet = new Set(mySkills);
  let gaps = topDemand.filter(s => !mySet.has(s.name)).slice(0, 8);

  // если GAP пуст — предложим «продвинутые» навыки для лучшей роли
  if (!gaps.length && rolesAgg.length) {
    const r0 = rolesAgg[0].title;
    const adv = (ADVANCED_BY_ROLE[r0] || ['Communication','Presentation']).map(s => s.toLowerCase());
    gaps = adv.map(n => ({ name: n, freq: 1, advanced: true })).slice(0, 6);
  }

  // 4) Курсы
  let courses = gaps.slice(0,3).flatMap(g => courseLinks(g.name));
  if (typeof getCoursesExt === 'function') {
    try {
      const keywords = gaps.slice(0, 6).map(g => g.name).join(', ');
      courses = await getCoursesExt({ profile, gaps, keywords });
    } catch (e) { console.warn('[courses/ext]', e?.message || e); }
  }

  // 5) Оценка соответствия рынку
  const demandSet = new Set(topDemand.map(s=>s.name));
  const overlap = mySkills.filter(s => demandSet.has(s)).length;
  const fitSkills = topDemand.length ? (overlap / topDemand.length) : 0;
  const fitExp = expScores.length ? (expScores.reduce((a,b)=>a+b,0)/expScores.length) : 0.5;
  const roleHit = rolesAgg.some(r => r.vacancies > 50) ? 1
                : rolesAgg.some(r => r.vacancies > 20) ? 0.7
                : rolesAgg.some(r => r.vacancies > 5)  ? 0.4 : 0.2;

  const scoreRaw = (fitSkills * 0.60 + fitExp * 0.25 + roleHit * 0.15) * 100;
  const marketFitScore = Math.max(10, Math.min(95, Math.round(scoreRaw)));

  // 6) Итог (двойные поля — для совместимости со старым UI)
  const skillsToGrow = gaps.map(g => capital(g.name));

  const data = {
    marketFitScore,              // новое имя
    marketScore: marketFitScore, // совместимость со старым UI
    roles: rolesAgg,             // новое имя
    professions: rolesAgg,       // совместимость со старым UI
    growSkills: gaps.map(g => ({ name: g.name, demand: g.freq, gap: true })),
    skillsToGrow,
    courses,
    debug: {
      skillsDetected: mySkills,
      rolesGuessed: roles,
      areaUsed: areaId,
      sampleVacancies: Array.from(new Set(allVacancyIds)).length,
      userYears,
      host: HH_HOST,
    }
  };

  return data;
}

/* ======================================== FALLBACKS ===================================== */
async function fallbackRecommendations(profile = {}) {
  const skills = normalizeSkills(profile);
  const sLow = skills;

  const professions = [];
  if (sLow.some(s => /react|javascript|typescript|html|css/.test(s))) {
    professions.push({ title: 'Frontend Developer', vacancies: 0, hhQuery: 'Frontend Developer', topSkills: [], url: hhSearchUrl('Frontend Developer', null) });
  }
  if (sLow.some(s => /python|django|flask|fastapi/.test(s))) {
    professions.push({ title: 'Python Developer', vacancies: 0, hhQuery: 'Python Developer', topSkills: [], url: hhSearchUrl('Python Developer', null) });
  }
  if (sLow.some(s => /sql|postgres|mysql|excel|data|pandas/.test(s))) {
    professions.push({ title: 'Data Analyst', vacancies: 0, hhQuery: 'Data Analyst', topSkills: [], url: hhSearchUrl('Data Analyst', null) });
  }
  if (!professions.length) {
    professions.push({ title: 'Business Analyst', vacancies: 0, hhQuery: 'Business Analyst', topSkills: [], url: hhSearchUrl('Business Analyst', null) });
    professions.push({ title: 'Project Manager',  vacancies: 0, hhQuery: 'Project Manager',  topSkills: [], url: hhSearchUrl('Project Manager',  null) });
  }

  let courses = [
    { provider: 'Coursera', title: 'React Specialization',           duration: '3 месяца', url: 'https://www.coursera.org/' },
    { provider: 'Udemy',    title: 'Complete Web Development',       duration: '2 месяца', url: 'https://www.udemy.com/' },
    { provider: 'Stepik',   title: 'Python для начинающих',          duration: '1 месяц',  url: 'https://stepik.org/' },
  ];
  if (typeof getCoursesExt === 'function') {
    try { courses = await getCoursesExt(profile); } catch (e) { console.warn('[courses/fallback]', e?.message || e); }
  }

  const basicGrow = skills.length
    ? ['Communication','Presentation','Critical thinking']
    : ['Agile','Data Analysis','Digital Marketing'];

  const data = {
    marketFitScore: 65,
    marketScore: 65,
    roles: professions,
    professions,
    growSkills: basicGrow.map(s => ({ name: s.toLowerCase(), demand: 1, gap: true })),
    skillsToGrow: basicGrow,
    courses,
    debug: { fallback: true }
  };
  return data;
}

function fallbackImprove(profile = {}) {
  const uniq = (arr) => Array.from(new Set((arr || []).map(String).map(s => s.trim()).filter(Boolean)));
  const cap  = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const normalizedSkills = uniq(profile.skills).map(cap);
  const bullets = [];
  const txt = String(profile.summary || '').trim();
  if (txt) {
    txt.split(/[\n\.]+/).map(s => s.trim()).filter(Boolean)
      .forEach(line => bullets.push(`• ${line}`));
  }
  const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
  return { ok: true, updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
}

/* ========================================== ROUTES ====================================== */

// POST /api/recommendations/generate  — старый контракт (ok + data)
router.post('/generate', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId  = req.body?.areaId ?? null;

    if (typeof buildRecommendationsExt === 'function') {
      const data = await buildRecommendationsExt(profile, { areaId });
      return res.json({ ok: true, data });
    }

    let data;
    try {
      data = await buildRecommendationsSmart(profile, { areaId });
    } catch (e) {
      console.error('[rec/generate smart failed]', e);
      data = await fallbackRecommendations(profile);
    }
    return res.json({ ok: true, data });
  } catch (e) {
    console.error('[rec/generate]', e);
    const data = await fallbackRecommendations(req.body?.profile || {});
    return res.json({ ok: true, data, fallback: true });
  }
});

// POST /api/recommendations/analyze  — новый «плоский» контракт (прямо поля)
router.post('/analyze', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId  = req.body?.areaId ?? null;
    let data = await buildRecommendationsSmart(profile, { areaId });
    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({ marketFitScore, roles, growSkills, courses, debug });
  } catch (e) {
    console.error('[rec/analyze]', e);
    const data = await fallbackRecommendations(req.body?.profile || {});
    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({ marketFitScore, roles, growSkills, courses, debug: { ...(debug||{}), degraded: true } });
  }
});

// POST /api/recommendations/improve — улучшение/нормализация профиля
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
