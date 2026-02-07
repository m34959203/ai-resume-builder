// src/services/bff/recommendations.js — AI recommendations with local fallbacks

import { safeFetchJSON } from './http';
import { normalizeHost } from './normalize';
import { resolveAreaId } from './areas';
import { API_TIMEOUT_MS } from './env';

/* -------------------- ЛОКАЛЬНЫЕ GAP/РОЛИ/КУРСЫ (фолбэк) -------------------- */

const CANON = (s) => {
  const k = String(s || '').toLowerCase().trim();
  const map = {
    'ms excel': 'excel', excel: 'excel',
    'google sheets': 'google sheets',
    'looker studio': 'looker studio', 'google data studio': 'looker studio',
    'power query': 'power query', 'power pivot': 'power pivot',
    sql: 'sql', postgres: 'postgres', mysql: 'mysql', sqlite: 'sqlite',
    mongodb: 'mongodb', redis: 'redis',
    'power bi': 'power bi', dax: 'dax', tableau: 'tableau', qlik: 'qlik', metabase: 'metabase',
    python: 'python', pandas: 'pandas', numpy: 'numpy', scipy: 'scipy',
    matplotlib: 'matplotlib', seaborn: 'seaborn', plotly: 'plotly',
    javascript: 'javascript', js: 'javascript', typescript: 'typescript', ts: 'typescript',
    html: 'html', css: 'css', sass: 'sass', less: 'less',
    react: 'react', redux: 'redux', 'next.js': 'next', next: 'next', vite: 'vite', webpack: 'webpack', babel: 'babel',
    vue: 'vue', nuxt: 'nuxt', angular: 'angular',
    'node.js': 'node', node: 'node', express: 'express', 'nest.js': 'nest', nest: 'nest',
    django: 'django', flask: 'flask', fastapi: 'fastapi',
    spring: 'spring', '.net': '.net', 'asp.net': '.net', laravel: 'laravel', php: 'php',
    testing: 'testing', selenium: 'selenium', cypress: 'cypress', playwright: 'playwright',
    jest: 'jest', mocha: 'mocha', chai: 'chai', pytest: 'pytest',
    jmeter: 'jmeter', postman: 'postman', swagger: 'swagger',
    git: 'git', 'github actions': 'github actions', 'gitlab ci': 'gitlab ci', 'ci/cd': 'ci/cd',
    docker: 'docker', kubernetes: 'kubernetes', terraform: 'terraform', ansible: 'ansible',
    nginx: 'nginx', linux: 'linux', bash: 'bash',
    aws: 'aws', gcp: 'gcp', azure: 'azure',
    agile: 'agile', scrum: 'scrum', kanban: 'kanban',
    figma: 'figma', 'ui/ux': 'ui/ux',
  };
  return map[k] || k;
};

function normSkillsArray(arr) {
  const out = [];
  const seen = new Set();
  (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === 'string' ? x : (x?.name || x?.title || '')))
    .map((s) => CANON(s))
    .filter(Boolean)
    .forEach((s) => { if (!seen.has(s)) { seen.add(s); out.push(s); } });
  return out;
}

function localCourseLinks(skill) {
  const q = encodeURIComponent(skill);
  return [
    { provider: 'Coursera', title: `${skill} — специализации`,    duration: '1–3 мес', url: `https://www.coursera.org/search?query=${q}` },
    { provider: 'Udemy',    title: `${skill} — практические курсы`, duration: '1–2 мес', url: `https://www.udemy.com/courses/search/?q=${q}` },
    { provider: 'Stepik',   title: `${skill} — русские курсы`,    duration: '2–8 нед', url: `https://stepik.org/search?query=${q}` },
  ];
}

function localGuessRoles(profile) {
  const txt = [
    String(profile?.targetTitle || ''),
    String(profile?.desiredRole || ''),
    String(profile?.position || ''),
    String(profile?.summary || ''),
    ...(Array.isArray(profile?.experience) ? profile.experience : []).map((e) => String(e?.title || '')),
  ].join(' ').toLowerCase();

  const roles = [];
  const push = (r) => { if (!roles.includes(r)) roles.push(r); };

  // Fullstack (before frontend/backend to add related roles)
  if (/(full[\s-]*stack|фулл[\s-]*стек)/i.test(txt)) {
    push('Full Stack Developer');
    push('Frontend Developer');
    push('Backend Developer');
  }
  if (/(front[\s-]*end|фронт[\s-]*енд|react|javascript\s*developer)/i.test(txt)) push('Frontend Developer');
  if (/(back[\s-]*end|бэк[\s-]*енд|node\.?js|django|spring|\.net|laravel|php)/i.test(txt)) push('Backend Developer');
  if (/(qa|тестировщик|quality\s*assurance|инженер\s*по\s*тестированию)/i.test(txt)) push('QA Engineer');
  if (/(data\s*analyst|аналитик\s*данных|аналитик)/i.test(txt)) push('Data Analyst');
  if (/(data\s*scientist|ml\s*engineer|machine\s*learning)/i.test(txt)) push('Data Scientist');
  if (/(devops|ci\/cd|sre|platform\s*engineer)/i.test(txt)) push('DevOps Engineer');
  if (/(project\s*manager|менеджер\s*проект|руководитель\s*проект)/i.test(txt)) push('Project Manager');
  if (/(ui\/ux|ux\/ui|product\s*designer|figma|дизайн)/i.test(txt)) push('UI/UX Designer');

  const skills = normSkillsArray(profile?.skills);
  const has = (xs) => xs.some((s) => skills.includes(CANON(s)));

  if (!roles.length) {
    if (has(['react','javascript','typescript','html','css'])) push('Frontend Developer');
    if (has(['node','django','spring','.net','laravel','php'])) push('Backend Developer');
    if (has(['sql','excel','power bi','tableau','python','pandas','numpy'])) push('Data Analyst');
    if (has(['selenium','cypress','playwright','testing'])) push('QA Engineer');
    if (has(['docker','kubernetes','terraform','ansible'])) push('DevOps Engineer');
  }
  return roles.slice(0, 5);
}

/** Карта стартовых навыков по ролям — для случая, когда у пользователя нет навыков */
const ROLE_STARTER_SKILLS_BFF = {
  'full stack': ['javascript', 'typescript', 'react', 'node', 'postgres', 'docker', 'git', 'testing'],
  'fullstack': ['javascript', 'typescript', 'react', 'node', 'postgres', 'docker', 'git', 'testing'],
  'frontend': ['javascript', 'typescript', 'react', 'next', 'tailwind', 'redux', 'jest', 'git'],
  'backend': ['node', 'postgres', 'docker', 'redis', 'git', 'ci/cd', 'sql', 'testing'],
  'devops': ['docker', 'kubernetes', 'terraform', 'ci/cd', 'linux', 'aws', 'prometheus', 'grafana'],
  'data analyst': ['sql', 'python', 'pandas', 'power bi', 'excel', 'tableau', 'statistics'],
  'data scientist': ['python', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'sql', 'mlflow'],
  'qa': ['selenium', 'cypress', 'playwright', 'postman', 'sql', 'git', 'ci/cd', 'jest'],
  'тестировщик': ['selenium', 'cypress', 'playwright', 'postman', 'sql', 'git', 'ci/cd'],
  'designer': ['figma', 'prototyping', 'ui/ux', 'accessibility'],
  'project manager': ['agile', 'scrum', 'jira', 'confluence', 'roadmapping'],
  'аналитик': ['sql', 'python', 'pandas', 'power bi', 'excel', 'tableau'],
};

function localGapFrom(profile) {
  const mine = new Set(normSkillsArray(profile?.skills));
  const suggestions = [];

  // Аналитика / Python+SQL+Excel
  if (mine.has('python') || mine.has('sql') || mine.has('excel')) {
    ['pandas', 'numpy', 'etl', 'power bi', 'tableau', 'scikit-learn', 'data visualization'].forEach((s) => {
      const k = CANON(s); if (!mine.has(k)) suggestions.push(k);
    });
  }

  // Фронтенд
  if (['react','javascript','typescript','html','css'].some((s) => mine.has(s))) {
    ['redux', 'testing', 'jest', 'playwright', 'performance', 'accessibility', 'graphql'].forEach((s) => {
      const k = CANON(s); if (!mine.has(k)) suggestions.push(k);
    });
  }

  // Бэкенд
  if (['node','django','spring','.net'].some((s) => mine.has(s))) {
    ['api design','sql optimization','caching','security','docker','kubernetes'].forEach((s) => {
      const k = CANON(s); if (!mine.has(k)) suggestions.push(k);
    });
  }

  // Базовые инженерные
  ['git', 'github actions', 'ci/cd'].forEach((s) => { const k = CANON(s); if (!mine.has(k)) suggestions.push(k); });

  // Если навыков нет или suggestions пустые — подсказываем по позиции/роли
  if (suggestions.length === 0 || mine.size === 0) {
    const roleTxt = [
      String(profile?.position || ''),
      String(profile?.targetTitle || ''),
      String(profile?.desiredRole || ''),
    ].join(' ').toLowerCase();

    for (const [key, skills] of Object.entries(ROLE_STARTER_SKILLS_BFF)) {
      if (roleTxt.includes(key)) {
        skills.forEach((s) => {
          const k = CANON(s) || s;
          if (!mine.has(k) && !suggestions.includes(k)) suggestions.push(k);
        });
        break;
      }
    }
  }

  // Уникализация
  const out = [];
  const seen = new Set();
  for (const s of suggestions) { if (!seen.has(s)) { seen.add(s); out.push(s); } }
  return out.slice(0, 8);
}

function localRecommendations(profile) {
  const roles = localGuessRoles(profile);
  const grow = localGapFrom(profile);
  const courses = grow.slice(0, 3).flatMap((s) => localCourseLinks(s));
  // простой скоринг от заполненности
  const base = normSkillsArray(profile?.skills).length;
  const marketFitScore = Math.max(10, Math.min(70, 25 + base * 4));
  const roleObj = (r) => ({ title: r, vacancies: 0, hhQuery: r, url: `https://hh.kz/search/vacancy?text=${encodeURIComponent(r)}` });

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: roles.map(roleObj),
    professions: roles.map(roleObj),
    growSkills: grow.map((n) => ({ name: n, demand: 1, gap: true })),
    skillsToGrow: grow.map((s) => s[0].toUpperCase() + s.slice(1)),
    courses,
    debug: { fallback: 'client-local', skillsDetected: normSkillsArray(profile?.skills) }
  };
}

/* -------------------- Вспомогательное для рекомендаций -------------------- */

function extractSkills(profile = {}) {
  const raw = (Array.isArray(profile.skills) ? profile.skills : [])
    .map((s) => (typeof s === 'string' ? s : (s?.name || s?.title || s?.skill || '')))
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const v of raw) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function marketFit(profile = {}) {
  const hasAnything =
    (profile.summary && profile.summary.trim().length > 0) ||
    (Array.isArray(profile.skills) && profile.skills.length > 0) ||
    (Array.isArray(profile.experience) && profile.experience.length > 0) ||
    (Array.isArray(profile.education) && profile.education.length > 0);
  if (!hasAnything) return 0;

  let score = 0;
  const roleText = String(profile.position || profile.title || '').trim();
  if (roleText.length >= 3) score += Math.min(10, Math.floor(roleText.split(/\s+/).length * 2));

  const uniqSkills = Array.from(new Set((profile.skills || []).map((s) => String(s).trim()).filter(Boolean)));
  score += Math.min(30, uniqSkills.length * 3);

  const items = Array.isArray(profile.experience) ? profile.experience : [];
  let ms = 0;
  for (const it of items) {
    const start = it?.start || it?.from || it?.dateStart || it?.date_from;
    const end   = it?.end || it?.to || it?.dateEnd || it?.date_to || new Date().toISOString();
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e && e > s) ms += (+e - +s);
  }
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years >= 6) score += 35;
  else if (years >= 3) score += 25;
  else if (years >= 1) score += 15;
  else if (years > 0) score += 5;

  const sumLen = String(profile.summary || '').trim().length;
  if (sumLen >= 200) score += 10;
  else if (sumLen >= 120) score += 7;
  else if (sumLen >= 60) score += 5;
  else if (sumLen >= 20) score += 2;

  if (Array.isArray(profile.education) && profile.education.length) score += 8;
  if (String(profile.location || '').trim()) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Универсальный нормализатор ответа рекомендаций → единый контракт (roles/growSkills/courses) */
function normalizeRecPayload(payload, profile) {
  const raw =
    payload && typeof payload === 'object'
      ? (payload.data && payload.ok !== undefined ? payload.data : payload)
      : {};

  // роли (как объекты с title; если строки — оборачиваем)
  let roles = Array.isArray(raw.roles) ? raw.roles
           : Array.isArray(raw.professions) ? raw.professions
           : [];
  roles = roles
    .map(r => (typeof r === 'string' ? { title: r } : r))
    .filter(Boolean)
    .map(r => ({
      title: r.title || r.name || '',
      url: r.url || (r.title ? `https://hh.kz/search/vacancy?text=${encodeURIComponent(r.title)}` : ''),
      hhQuery: r.hhQuery || r.title || '',
      vacancies: Number.isFinite(+r.vacancies) ? +r.vacancies : undefined
    }))
    .filter(r => r.title);

  // навыки для развития → массив объектов { name, ... }
  const growArr =
    (Array.isArray(raw.growSkills) ? raw.growSkills : null) ??
    (Array.isArray(raw.skillsToGrow) ? raw.skillsToGrow.map(n => ({ name: n })) : null) ??
    (Array.isArray(raw.skillsToLearn) ? raw.skillsToLearn.map(n => ({ name: n })) : null) ??
    [];
  let growSkills = growArr
    .map(s => (typeof s === 'string' ? { name: s } : s))
    .filter(s => s && s.name);

  // фильтруем дубли с тем, что уже есть в профиле
  const userSkills = new Set(extractSkills(profile).map(s => s.toLowerCase()));
  growSkills = growSkills.filter(s => !userSkills.has(String(s.name).toLowerCase()));

  // если GAP пуст — подстрахуемся локальным вычислением
  if (!growSkills.length) {
    const localGrow = localGapFrom(profile);
    growSkills = localGrow.map((n) => ({ name: n, demand: 1, gap: true }));
  }

  // курсы → нормализуем { name, duration, url, provider, cover, description, learners, channel }
  let courses = Array.isArray(raw.courses) ? raw.courses
             : Array.isArray(raw.recommendedCourses) ? raw.recommendedCourses
             : Array.isArray(raw.courseRecommendations) ? raw.courseRecommendations
             : [];
  courses = courses.map((c) => {
    if (typeof c === 'string') return { name: c, duration: '', url: c };
    const name = [c?.provider, c?.title].filter(Boolean).join(' — ') || c?.name || '';
    const duration = c?.duration || '';
    const url = c?.url || c?.link || '';
    return name ? {
      name, duration, url,
      provider: c?.provider || '',
      cover: c?.cover || '',
      description: c?.description || '',
      learners: c?.learners || 0,
      channel: c?.channel || '',
      source: c?.source || '',
    } : null;
  }).filter(Boolean);

  // если курсов нет — сгенерируем по GAP
  if (!courses.length && growSkills.length) {
    courses = growSkills.slice(0, 3).flatMap((g) => localCourseLinks(String(g.name))).map((c) => ({
      name: [c.provider, c.title].filter(Boolean).join(' — '),
      duration: c.duration || '',
      url: c.url || '',
      provider: c.provider || '',
      cover: '',
      description: '',
      learners: 0,
      channel: '',
      source: 'local-fallback',
    }));
  }

  // оценка соответствия
  const market = raw.marketFitScore ?? raw.marketScore ?? raw.score ?? marketFit(profile);

  // если не пришли роли — подскажем локально
  if (!roles.length) {
    const localRoles = localGuessRoles(profile).map((r) => ({
      title: r,
      hhQuery: r,
      url: `https://hh.kz/search/vacancy?text=${encodeURIComponent(r)}`
    }));
    roles = localRoles;
  }

  // окончательный контракт
  return {
    marketFitScore: Number.isFinite(+market) ? Math.max(0, Math.min(100, Math.round(+market))) : marketFit(profile),
    roles,                // объекты { title, url?, hhQuery?, vacancies? }
    growSkills,           // объекты { name, ... }
    courses,              // объекты { name, duration, url }
    // поля-скидки для совместимости с старым UI
    professions: roles,
    skillsToGrow: growSkills.map(s => s.name),
    skillsToLearn: growSkills.map(s => s.name),
    debug: raw.debug || {},
  };
}

/* -------------------- AI: рекомендации -------------------- */

export async function fetchRecommendations(profile, opts = {}) {
  // попытка резолва areaId по городу
  let areaId = opts.areaId ?? null;
  if (!areaId && opts.city) {
    const resolved = await resolveAreaId(opts.city, normalizeHost()).catch(() => null);
    if (resolved?.id) areaId = resolved.id;
  }

  const body = {
    profile,
    areaId: areaId ?? null,
    sig: opts.sig || undefined,
    ts: typeof opts.ts === 'number' ? opts.ts : Date.now(),
    lang: opts.lang || undefined,
    expand: opts.expand || undefined,
    meta: opts.meta || undefined,
    focusRole: opts.focusRole || undefined,
    seedSkills: opts.seedSkills || undefined,
  };

  // 1) Основной путь
  try {
    const resp = await safeFetchJSON('/recommendations/generate', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
      noDedupe: true,
      timeoutMs: opts.timeoutMs ?? API_TIMEOUT_MS,
    });
    return normalizeRecPayload(resp, profile);
  } catch (e1) {
    // 2) Старый путь "analyze"
    try {
      const resp = await safeFetchJSON('/recommendations/analyze', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body,
        noDedupe: true,
        timeoutMs: opts.timeoutMs ?? API_TIMEOUT_MS,
      });
      return normalizeRecPayload(resp, profile);
    } catch (e2) {
      // 3) Умный клиентский фолбэк (реальный GAP + курсы)
      return localRecommendations(profile);
    }
  }
}

export async function generateRecommendations(profile, opts = {}) {
  return fetchRecommendations(profile, opts);
}

export async function improveProfileAI(profile, opts = {}) {
  const body = { profile, sig: opts.sig || undefined, ts: typeof opts.ts === 'number' ? opts.ts : Date.now() };
  try {
    const resp = await safeFetchJSON('/recommendations/improve', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
      noDedupe: true,
    });
    if (resp && resp.ok && resp.updated) return resp; // унификация
    return resp || { ok: true, updated: profile, changes: {} };
  } catch {
    // локальная минимальная нормализация
    const uniq = (arr) => Array.from(new Set((arr || []).map(String).map((s) => s.trim()).filter(Boolean)));
    const cap  = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const normalizedSkills = uniq(profile.skills).map(cap);
    const bullets = [];
    const txt = String(profile.summary || '').trim();
    if (txt) txt.split(/[\n\.]+/).map((s) => s.trim()).filter(Boolean).forEach((line) => bullets.push(`• ${line}`));
    const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
    return { ok: true, updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
  }
}
