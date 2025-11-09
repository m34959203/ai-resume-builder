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

/* ================================== ENV & CONSTANTS ==================================== */
const HH_HOST = (process.env.HH_HOST || 'hh.kz').trim();
const HH_API = 'https://api.hh.ru';
const USER_AGENT =
  process.env.HH_USER_AGENT || 'AI-Resume-Builder/1.0 (+github.com/m34959203/ai-resume-builder)';

const SAMPLE_PAGES = Math.max(1, Number(process.env.RECS_SAMPLE_PAGES || 2)); // страниц листинга на роль
const PER_PAGE = Math.max(1, Number(process.env.RECS_PER_PAGE || 50));        // вакансий на страницу
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
  'Accept-Language': 'ru-RU,ru;q=0.9',
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
      const retriable = (r.status === 429 || (r.status >= 500 && r.status < 600)) && attempt < retries;
      if (!retriable) return r;

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

async function hhSearchVacancies({ text, area, page = 0, per_page = PER_PAGE }) {
  const u = new URL(`${HH_API}/vacancies`);
  if (text) u.searchParams.set('text', text);
  if (area) u.searchParams.set('area', String(area));
  u.searchParams.set('per_page', String(per_page));
  u.searchParams.set('page', String(page));
  // host параметр HH API не использует; оставляем только text/area/pagination
  return getJsonCached(u.toString());
}
async function hhGetVacancy(id) {
  return getJsonCached(`${HH_API}/vacancies/${encodeURIComponent(id)}`);
}

/* ============================== NORMALIZATION & HEURISTICS ============================== */
// Расширенный лексикон навыков: рус/англ + популярные синонимы (чтобы чаще ловить спрос)
const SKILL_LEXICON = [
  // Office / analytics
  'Excel', 'MS Excel', 'Google Sheets', 'Looker Studio', 'Power Query', 'Power Pivot',
  'SQL', 'Postgres', 'MySQL', 'SQLite', 'NoSQL', 'MongoDB', 'Redis',
  'Python', 'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn', 'Plotly',
  'R', 'Statistics', 'A/B Testing', 'Experimentation', 'Hypothesis testing',

  // BI / data
  'Power BI', 'DAX', 'Tableau', 'Qlik', 'Metabase',

  // FE
  'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Sass', 'Less', 'React', 'Redux', 'Next.js', 'Vite', 'Webpack', 'Babel',
  'Vue', 'Nuxt', 'Angular',

  // BE
  'Node.js', 'Express', 'Nest.js', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', '.NET', 'ASP.NET', 'Laravel', 'PHP',

  // Testing / QA
  'Testing', 'Unit testing', 'Integration testing', 'E2E', 'Selenium', 'Cypress', 'Playwright',
  'Jest', 'Mocha', 'Chai', 'PyTest', 'JMeter', 'Postman', 'Swagger',

  // DevOps
  'Git', 'GitHub', 'GitLab', 'CI/CD', 'GitHub Actions', 'GitLab CI',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'NGINX', 'Linux', 'Bash',

  // Clouds
  'AWS', 'GCP', 'Azure', 'S3', 'EC2', 'Lambda', 'BigQuery', 'Cloud Functions',

  // PM / BA
  'Agile', 'Scrum', 'Kanban', 'Project Management', 'Risk Management', 'Stakeholder Management',
  'Requirements', 'UML', 'BPMN', 'Jira', 'Confluence', 'Presentation', 'Communication',
  'Roadmapping', 'Backlog',

  // Design/Marketing
  'Figma', 'UI/UX', 'Prototyping', 'SEO', 'SMM', 'Digital Marketing', 'Google Analytics',
];

const CANON = {
  // BI / analytics
  'ms excel': 'excel', 'excel': 'excel',
  'google sheets': 'google sheets',
  'google data studio': 'looker studio', 'looker studio': 'looker studio',
  'power query': 'power query', 'power pivot': 'power pivot',
  'sql': 'sql', 'postgres': 'postgres', 'mysql': 'mysql', 'sqlite': 'sqlite',
  'mongodb': 'mongodb', 'redis': 'redis',
  'power bi': 'power bi', 'dax': 'dax', 'tableau': 'tableau', 'qlik': 'qlik', 'metabase': 'metabase',
  'python': 'python', 'pandas': 'pandas', 'numpy': 'numpy', 'scipy': 'scipy',
  'matplotlib': 'matplotlib', 'seaborn': 'seaborn', 'plotly': 'plotly',
  'r': 'r', 'statistics': 'statistics', 'a/b testing': 'a/b testing',

  // FE
  'javascript': 'javascript', 'js': 'javascript',
  'typescript': 'typescript', 'ts': 'typescript',
  'html': 'html', 'css': 'css', 'sass': 'sass', 'less': 'less',
  'react': 'react', 'redux': 'redux', 'next.js': 'next', 'next': 'next',
  'vite': 'vite', 'webpack': 'webpack', 'babel': 'babel',
  'vue': 'vue', 'nuxt': 'nuxt', 'angular': 'angular',

  // BE
  'node.js': 'node', 'node': 'node', 'express': 'express', 'nest.js': 'nest', 'nest': 'nest',
  'django': 'django', 'flask': 'flask', 'fastapi': 'fastapi',
  'spring': 'spring', 'spring boot': 'spring', '.net': '.net', 'asp.net': '.net',
  'laravel': 'laravel', 'php': 'php',

  // Testing / QA
  'testing': 'testing', 'unit testing': 'unit testing', 'integration testing': 'integration testing', 'e2e': 'e2e',
  'selenium': 'selenium', 'cypress': 'cypress', 'playwright': 'playwright',
  'jest': 'jest', 'mocha': 'mocha', 'chai': 'chai', 'pytest': 'pytest',
  'jmeter': 'jmeter', 'postman': 'postman', 'swagger': 'swagger',

  // DevOps
  'git': 'git', 'github': 'github', 'gitlab': 'gitlab',
  'ci/cd': 'ci/cd', 'github actions': 'github actions', 'gitlab ci': 'gitlab ci',
  'docker': 'docker', 'kubernetes': 'kubernetes',
  'terraform': 'terraform', 'ansible': 'ansible',
  'nginx': 'nginx', 'linux': 'linux', 'bash': 'bash',

  // Cloud
  'aws': 'aws', 'gcp': 'gcp', 'azure': 'azure', 's3': 's3', 'ec2': 'ec2', 'lambda': 'lambda',
  'bigquery': 'bigquery', 'cloud functions': 'cloud functions',

  // PM / BA
  'agile': 'agile', 'scrum': 'scrum', 'kanban': 'kanban',
  'project management': 'project management', 'risk management': 'risk management',
  'stakeholder management': 'stakeholder management', 'requirements': 'requirements',
  'uml': 'uml', 'bpmn': 'bpmn', 'jira': 'jira', 'confluence': 'confluence',
  'presentation': 'presentation', 'communication': 'communication',
  'roadmapping': 'roadmapping', 'backlog': 'backlog',

  // Design/Marketing
  'figma': 'figma', 'ui/ux': 'ui/ux', 'ux/ui': 'ui/ux',
  'prototyping': 'prototyping', 'seo': 'seo', 'smm': 'smm',
  'digital marketing': 'digital marketing', 'google analytics': 'google analytics',
};

const ROLE_PATTERNS = [
  // BA/PM включаем только при явных совпадениях в тексте профиля
  { title: 'Project Manager',      rx: /(project\s*manager|руководитель\s*проект(ов|а)|менеджер\s*проекта|pm\b)/i },
  { title: 'Product Manager',      rx: /(product\s*manager|продакт(\s*менеджер)?|po\b)/i },
  { title: 'Business Analyst',     rx: /(business\s*analyst|бизнес[-\s]?аналитик)/i },

  // Эвристики под инженерные роли
  { title: 'Data Analyst',         rx: /(data\s*analyst|аналитик\s*данных)/i },
  { title: 'Data Scientist',       rx: /(data\s*scientist|учен(ый|ого)\s*данных)/i },
  { title: 'ML Engineer',          rx: /(ml\s*engineer|machine\s*learning|ml-инженер|машинн(ого|ое)\s*обучени[яе])/i },
  { title: 'QA Engineer',          rx: /(qa\b|quality\s*assurance|тестировщик|инженер\s*по\s*тестированию)/i },
  { title: 'Frontend Developer',   rx: /(front[\s-]*end|фронт[\s-]*енд|react\b|javascript\s*developer)/i },
  { title: 'Backend Developer',    rx: /(back[\s-]*end|бэк[\s-]*енд|серверн(ый|ая)\s*разработчик|node\.?js|django|spring|\.net)/i },
  { title: 'Fullstack Developer',  rx: /(full[\s-]*stack|фулл[\s-]*стек)/i },
  { title: 'DevOps Engineer',      rx: /(devops|дейвопс|ci\/cd\s*инженер|platform\s*engineer)/i },
  { title: 'Marketing Specialist', rx: /(marketing|маркетолог|smm|digital)/i },
];

const ADVANCED_BY_ROLE = {
  'Frontend Developer': ['Accessibility', 'Performance', 'GraphQL', 'Testing'],
  'Backend Developer': ['API Design', 'SQL Optimization', 'Caching', 'Security'],
  'Fullstack Developer': ['System Design', 'DevOps basics', 'Testing'],
  'Data Analyst': ['SQL Optimization', 'A/B Testing', 'Power BI DAX', 'Python Visualization'],
  'Data Scientist': ['Feature Engineering', 'Model Monitoring', 'MLOps'],
  'ML Engineer': ['MLOps', 'Optimization', 'Experiment Tracking'],
  'Business Analyst': ['BPMN 2.0', 'Prototyping', 'System Analysis'],
  'Project Manager': ['People Management', 'Budgeting', 'Roadmapping', 'Metrics'],
  'DevOps Engineer': ['IaC', 'Observability', 'Security'],
  'QA Engineer': ['Automation', 'Performance testing', 'CI/CD testing'],
  'Marketing Specialist': ['CRO', 'Email Marketing', 'Marketing Analytics'],
};

const lower = (s) => String(s || '').toLowerCase().trim();
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uniqBy = (arr, key) => {
  const seen = new Set(); const out = [];
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k); out.push(x);
  }
  return out;
};

function normalizeSkills(profile) {
  const base = (Array.isArray(profile?.skills) ? profile.skills : [])
    .flatMap((s) => String(s || '').split(/[,/;|]+/))
    .map((s) => lower(s))
    .filter(Boolean);

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

function guessRoles(profile, focusRole) {
  if (focusRole) return [String(focusRole)];

  const hay = [
    String(profile.targetTitle || ''),
    String(profile.desiredRole || ''),
    String(profile.position || ''),
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map((e) =>
      String(e.title || '')
    ),
  ].join(' ');

  const roles = [];
  for (const r of ROLE_PATTERNS) if (r.rx.test(hay)) roles.push(r.title);

  const skills = normalizeSkills(profile);
  const has = (arr) => arr.some((s) => skills.includes(s));

  if (!roles.length) {
    if (has(['react', 'javascript', 'typescript', 'html', 'css', 'redux'])) roles.push('Frontend Developer');
    if (has(['node', 'express', 'nest', '.net', 'spring', 'django', 'flask', 'fastapi', 'postgres', 'mysql'])) roles.push('Backend Developer');
    if (has(['sql', 'excel', 'power bi', 'tableau', 'python', 'pandas', 'numpy'])) roles.push('Data Analyst');
    if (has(['python', 'pandas', 'numpy', 'scipy', 'tensorflow', 'pytorch'])) roles.push('Data Scientist');
    if (has(['ml', 'mlops', 'tensorflow', 'pytorch'])) roles.push('ML Engineer');
    if (has(['selenium', 'cypress', 'playwright', 'testing', 'pytest', 'jmeter', 'postman'])) roles.push('QA Engineer');
    if (has(['docker', 'kubernetes', 'ci/cd', 'terraform', 'ansible'])) roles.push('DevOps Engineer');
  }

  return Array.from(new Set(roles)).slice(0, 4);
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
const expBucket = (y) =>
  y < 1 ? 'noExperience' : y < 3 ? 'between1And3' : y < 6 ? 'between3And6' : 'moreThan6';
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
    .map((s) => lower(s))
    .forEach((raw) => {
      const k = CANON[raw] || raw;
      if (k) out.add(k);
    });
  return Array.from(out);
}

const hhSearchUrl = (role, areaId) => {
  const u = new URL(`https://${HH_HOST}/search/vacancy`);
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
  const focusRole = opts.focusRole || null;
  const seedSkills = Array.isArray(opts.seedSkills) ? opts.seedSkills : [];
  const mySkills = Array.from(
    new Set([...normalizeSkills(profile), ...seedSkills.map((s) => lower(CANON[lower(s)] || s))])
  );

  const userYears = yearsOfExperience(profile);
  const userBucket = expBucket(userYears);

  // 1) роли
  let roles = guessRoles(profile, focusRole);
  if (!roles.length) {
    if (mySkills.some((s) => ['sql', 'excel', 'power bi', 'tableau', 'python', 'pandas', 'numpy'].includes(s)))
      roles = ['Data Analyst'];
    else if (mySkills.some((s) => ['react', 'javascript', 'typescript', 'html', 'css'].includes(s)))
      roles = ['Frontend Developer'];
    else if (mySkills.some((s) => ['node', 'django', 'spring', '.net'].includes(s)))
      roles = ['Backend Developer'];
    else if (mySkills.some((s) => ['selenium', 'cypress', 'testing'].includes(s)))
      roles = ['QA Engineer'];
  }

  // 2) собираем id вакансий по ролям (страницы листинга)
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
    roleStats.push({
      role,
      count: ids.length,
      ids: ids.slice(0, VACANCY_SAMPLE_PER_ROLE),
    });
  }

  // 3) детально вытягиваем вакансии и считаем частоты навыков/соответствие опыта
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
      const vb = v.experience?.id || null; // 'noExperience'|'between1And3'|'between3And6'|'moreThan6'
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
      url: hhSearchUrl(r.role, areaId),
    });
  }

  // 4) общий спрос и GAP: спрос минус мои навыки
  const topDemand = [...skillFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, freq]) => ({ name, freq }));

  const mySet = new Set(mySkills);
  let gaps = topDemand.filter((s) => !mySet.has(s.name)).slice(0, 8);

  // если рынок не дал «чистых» гэпов — подложим дорожку развития по первой роли
  if (!gaps.length && rolesAgg.length) {
    const r0 = rolesAgg[0].title;
    const adv = (ADVANCED_BY_ROLE[r0] || ['Communication', 'Presentation'])
      .map((s) => lower(s))
      .filter((s) => !mySet.has(s));
    gaps = adv.map((n) => ({ name: n, freq: 1, advanced: true })).slice(0, 6);
  }

  // добавим подсказанные seedSkills в самый хвост, но не дублируем
  for (const seeded of seedSkills) {
    const n = lower(CANON[lower(seeded)] || seeded);
    if (!mySet.has(n) && !gaps.some((g) => g.name === n)) gaps.push({ name: n, freq: 1, seed: true });
  }

  // 5) курсы по гэпам
  let courses = gaps.slice(0, 3).flatMap((g) => courseLinks(g.name));
  if (typeof getCoursesExt === 'function') {
    try {
      const keywords = gaps.slice(0, 6).map((g) => g.name).join(', ');
      const ext = await getCoursesExt({ profile, gaps, keywords });
      if (Array.isArray(ext) && ext.length) courses = ext;
    } catch (e) {
      console.warn('[courses/ext]', e?.message || e);
    }
  }
  courses = uniqBy(courses, (c) => `${lower(c.provider)}|${lower(c.title)}|${c.url}`).slice(0, 12);

  // 6) скоринг market-fit
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

  // нормализованный ответ (под фронт)
  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: rolesAgg.sort((a, b) => b.vacancies - a.vacancies),
    professions: rolesAgg,
    growSkills: uniqBy(
      gaps.map((g) => ({ name: g.name, demand: g.freq, gap: true })),
      (x) => x.name
    ),
    skillsToGrow: gaps.map((g) => capital(g.name)),
    courses,
    debug: {
      skillsDetected: mySkills,
      rolesGuessed: roles,
      focusRole: focusRole || undefined,
      seeded: seedSkills,
      areaUsed: areaId,
      sampleVacancies: Array.from(new Set(allVacancyIds)).length,
      userYears,
      host: HH_HOST,
    },
  };
}

/* ======================================== FALLBACKS ===================================== */
async function fallbackRecommendations(profile = {}, opts = {}) {
  const focusRole = opts.focusRole || null;
  const seedSkills = Array.isArray(opts.seedSkills) ? opts.seedSkills : [];
  const skills = Array.from(
    new Set([...normalizeSkills(profile), ...seedSkills.map((s) => lower(CANON[lower(s)] || s))])
  );

  const professions = [];
  const has = (arr) => arr.some((s) => skills.includes(s));

  if (focusRole) {
    professions.push({ title: focusRole, vacancies: 0, hhQuery: focusRole, topSkills: [], url: hhSearchUrl(focusRole, null) });
  } else {
    if (has(['react', 'javascript', 'typescript', 'html', 'css', 'redux']))
      professions.push({
        title: 'Frontend Developer',
        vacancies: 0,
        hhQuery: 'Frontend Developer',
        topSkills: [],
        url: hhSearchUrl('Frontend Developer', null),
      });
    if (has(['node', 'express', 'nest', '.net', 'spring', 'django', 'flask', 'fastapi']))
      professions.push({
        title: 'Backend Developer',
        vacancies: 0,
        hhQuery: 'Backend Developer',
        topSkills: [],
        url: hhSearchUrl('Backend Developer', null),
      });
    if (has(['sql', 'postgres', 'mysql', 'excel', 'data', 'pandas', 'power bi', 'tableau']))
      professions.push({
        title: 'Data Analyst',
        vacancies: 0,
        hhQuery: 'Data Analyst',
        topSkills: [],
        url: hhSearchUrl('Data Analyst', null),
      });
    if (has(['selenium', 'cypress', 'playwright', 'testing', 'pytest']))
      professions.push({
        title: 'QA Engineer',
        vacancies: 0,
        hhQuery: 'QA Engineer',
        topSkills: [],
        url: hhSearchUrl('QA Engineer', null),
      });
  }

  const basicGrow = skills.length ? ['Communication', 'Presentation'] : ['Agile', 'Data Analysis', 'Digital Marketing'];

  let courses = basicGrow.slice(0, 2).flatMap((s) => courseLinks(lower(s)));
  if (typeof getCoursesExt === 'function') {
    try {
      const ext = await getCoursesExt({
        profile,
        gaps: basicGrow.map((n) => ({ name: lower(n) })),
        keywords: basicGrow.join(', '),
      });
      if (Array.isArray(ext) && ext.length) courses = ext;
    } catch (e) {
      console.warn('[courses/fallback]', e?.message || e);
    }
  }

  const marketFitScore = Math.max(10, Math.min(60, 20 + skills.length * 3));

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: professions,
    professions,
    growSkills: uniqBy(
      basicGrow.map((s) => ({ name: lower(s), demand: 1, gap: true })),
      (x) => x.name
    ),
    skillsToGrow: basicGrow,
    courses,
    debug: { fallback: true, skillsDetected: skills, focusRole: focusRole || undefined, seeded: seedSkills },
  };
}

function fallbackImprove(profile = {}) {
  const uniq = (arr) =>
    Array.from(new Set((arr || []).map(String).map((s) => s.trim()).filter(Boolean)));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const normalizedSkills = uniq(profile.skills).map(cap);
  const bullets = [];
  const txt = String(profile.summary || '').trim();
  if (txt) txt
    .split(/[\n\.]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => bullets.push(`• ${line}`));
  const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
  return { ok: true, updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
}

/* ========================================== ROUTES ====================================== */
router.post('/generate', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId = req.body?.areaId ?? null;
    const focusRole = req.body?.focusRole || null;
    const seedSkills = Array.isArray(req.body?.seedSkills) ? req.body.seedSkills : [];

    if (typeof buildRecommendationsExt === 'function') {
      const data = await buildRecommendationsExt(profile, { areaId, focusRole, seedSkills });
      return res.json({ ok: true, data });
    }

    let data;
    try {
      data = await buildRecommendationsSmart(profile, { areaId, focusRole, seedSkills });
    } catch (e) {
      console.error('[rec/generate smart failed]', e);
      data = await fallbackRecommendations(profile, { focusRole, seedSkills });
    }
    return res.json({ ok: true, data });
  } catch (e) {
    console.error('[rec/generate]', e);
    const data = await fallbackRecommendations(req.body?.profile || {}, {
      focusRole: req.body?.focusRole || null,
      seedSkills: req.body?.seedSkills || [],
    });
    return res.json({ ok: true, data, fallback: true });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId = req.body?.areaId ?? null;
    const focusRole = req.body?.focusRole || null;
    const seedSkills = Array.isArray(req.body?.seedSkills) ? req.body.seedSkills : [];

    const data = await buildRecommendationsSmart(profile, { areaId, focusRole, seedSkills });
    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({ marketFitScore, roles, growSkills, courses, debug });
  } catch (e) {
    console.error('[rec/analyze]', e);
    const data = await fallbackRecommendations(req.body?.profile || {}, {
      focusRole: req.body?.focusRole || null,
      seedSkills: req.body?.seedSkills || [],
    });
    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({
      marketFitScore,
      roles,
      growSkills,
      courses,
      debug: { ...(debug || {}), degraded: true },
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
