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

// ИИ (OpenRouter) — опционально
let ai = null;
try {
  ai = require('../services/ai'); // { recommendFromProfile, inferSearch, ... }
} catch {}

/* ================================== ENV & CONSTANTS ==================================== */
const HH_HOST = (process.env.HH_HOST || 'hh.kz').trim(); // используется для веб-ссылок
const HH_API  = 'https://api.hh.ru';                     // единый API для hh.ru/hh.kz
const USER_AGENT =
  process.env.HH_USER_AGENT || 'AI-Resume-Builder/1.0 (+github.com/m34959203/ai-resume-builder)';

const flag = (v, def = '0') =>
  ['1', 'true', 'yes', 'on'].includes(String(v ?? def).toLowerCase());

const USE_MARKET         = flag(process.env.RECS_USE_MARKET, '1'); // запросы к HH
const USE_LLM            = flag(process.env.RECS_USE_LLM, '1');    // подключать ИИ для усиления
const LLM_COMPLEX        = flag(process.env.RECS_LLM_COMPLEX, '0');
const DEBUG_LOGS         = flag(process.env.RECS_DEBUG, '0');

const MAX_ROLES          = Math.max(1, Number(process.env.RECS_MAX_ROLES || 5));
const SAMPLE_PAGES       = Math.max(1, Number(process.env.RECS_SAMPLE_PAGES || 2));
const PER_PAGE           = Math.max(1, Number(process.env.RECS_PER_PAGE || 50));
const VACANCY_SAMPLE_PER_ROLE = Math.max(1, Number(process.env.RECS_VACANCY_SAMPLE_PER_ROLE || 30));
const CACHE_TTL_MS       = Number(process.env.RECS_CACHE_TTL_MS || 180000);
const DETAIL_CONCURRENCY = Math.max(2, Number(process.env.RECS_DETAIL_CONCURRENCY || 6));
const FETCH_TIMEOUT_MS   = Math.max(3000, Number(process.env.RECS_FETCH_TIMEOUT_MS || 15000));

const dbg = (...args) => { if (DEBUG_LOGS) console.log('[recs]', ...args); };

/* ==================================== SMALL CACHE ======================================= */
const _cache = new Map();
const cacheGet = (k) => {
  const it = _cache.get(k);
  if (!it) return null;
  if (it.exp < Date.now()) { _cache.delete(k); return null; }
  return it.data;
};
const cacheSet = (k, v, ttl = CACHE_TTL_MS) => _cache.set(k, { exp: Date.now() + ttl, data: v });

/* ===================================== FETCH HELPERS ==================================== */
const hhHeaders = (extra = {}) => ({
  'User-Agent': USER_AGENT,
  'HH-User-Agent': USER_AGENT,
  'Accept': 'application/json',
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

      const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(4000, 400 * Math.pow(2, attempt));
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
  return getJsonCached(u.toString());
}
async function hhGetVacancy(id) {
  return getJsonCached(`${HH_API}/vacancies/${encodeURIComponent(id)}`);
}

/* ============================== NORMALIZATION & HEURISTICS ============================== */
const lower = (s) => String(s || '').toLowerCase().trim();
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uniqBy = (arr, key) => {
  const seen = new Set(); const out = [];
  for (const x of arr) { const k = key(x); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
};
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Расширенный лексикон навыков (для парсинга текста резюме/вакансий) */
const SKILL_LEXICON = [
  // Office / analytics
  'Excel','MS Excel','Google Sheets','Looker Studio','Power Query','Power Pivot',
  'SQL','Postgres','MySQL','SQLite','NoSQL','MongoDB','Redis',
  'Python','Pandas','NumPy','SciPy','Matplotlib','Seaborn','Plotly',
  'R','Statistics','A/B Testing','Experimentation','Hypothesis testing',

  // BI / data
  'Power BI','DAX','Tableau','Qlik','Metabase','dbt','Apache Airflow','Airflow','Kafka','Apache Kafka',
  'Spark','Apache Spark','Hadoop','ClickHouse','BigQuery','Redshift','Athena','Glue','LookML',

  // FE
  'JavaScript','TypeScript','HTML','CSS','Sass','Less','React','Redux','Next.js','Vite','Webpack','Babel',
  'Vue','Nuxt','Angular','Tailwind','GraphQL',

  // BE
  'Node.js','Express','Nest.js','Django','Flask','FastAPI','Spring','Spring Boot','.NET','ASP.NET','Laravel','PHP',
  'Go','Golang','Java','Kotlin','C#','C++','Rust',

  // Testing / QA
  'Testing','Unit testing','Integration testing','E2E','Selenium','Cypress','Playwright',
  'Jest','Mocha','Chai','PyTest','JMeter','Postman','Swagger','Allure','Cucumber',

  // DevOps
  'Git','GitHub','GitLab','CI/CD','GitHub Actions','GitLab CI',
  'Docker','Kubernetes','Terraform','Ansible','NGINX','Linux','Bash','Helm','Prometheus','Grafana',

  // Clouds
  'AWS','GCP','Azure','S3','EC2','Lambda','Cloud Functions','IAM','Networking',

  // DS/ML
  'TensorFlow','PyTorch','Keras','XGBoost','CatBoost','LightGBM','Feature Engineering','MLflow',

  // PM / BA / Design / Marketing
  'Agile','Scrum','Kanban','Project Management','Risk Management','Stakeholder Management',
  'Requirements','UML','BPMN','Jira','Confluence','Presentation','Communication',
  'Roadmapping','Backlog','Figma','UI/UX','Prototyping','SEO','SMM','Digital Marketing','Google Analytics',
];

/** Канонизация названий навыков */
const CANON = (() => {
  const map = {};
  const put = (aliases, canon) => aliases.forEach(a => map[lower(a)] = canon);

  // BI / analytics
  put(['MS Excel','Excel'],'excel');
  put(['Google Sheets'],'google sheets');
  put(['Google Data Studio','Looker Studio'],'looker studio');
  put(['Power Query'],'power query'); put(['Power Pivot'],'power pivot');
  put(['SQL'],'sql'); put(['Postgres','PostgreSQL'],'postgres');
  put(['MySQL'],'mysql'); put(['SQLite'],'sqlite');
  put(['NoSQL'],'nosql'); put(['MongoDB'],'mongodb'); put(['Redis'],'redis');
  put(['Power BI'],'power bi'); put(['DAX'],'dax'); put(['Tableau'],'tableau'); put(['Qlik'],'qlik'); put(['Metabase'],'metabase');
  put(['dbt'],'dbt'); put(['Airflow','Apache Airflow'],'airflow'); put(['Kafka','Apache Kafka'],'kafka');
  put(['Spark','Apache Spark'],'spark'); put(['Hadoop'],'hadoop'); put(['ClickHouse'],'clickhouse');
  put(['BigQuery'],'bigquery'); put(['Redshift'],'redshift'); put(['Athena'],'athena'); put(['Glue'],'glue');
  put(['LookML'],'lookml');

  // FE
  put(['JavaScript','JS'],'javascript'); put(['TypeScript','TS'],'typescript');
  put(['HTML'],'html'); put(['CSS'],'css'); put(['Sass'],'sass'); put(['Less'],'less');
  put(['React'],'react'); put(['Redux'],'redux'); put(['Next.js','Next'],'next');
  put(['Vite'],'vite'); put(['Webpack'],'webpack'); put(['Babel'],'babel');
  put(['Vue'],'vue'); put(['Nuxt'],'nuxt'); put(['Angular'],'angular');
  put(['Tailwind','TailwindCSS'],'tailwind'); put(['GraphQL'],'graphql');

  // BE
  put(['Node.js','Node'],'node'); put(['Express'],'express'); put(['Nest.js','Nest'],'nest');
  put(['Django'],'django'); put(['Flask'],'flask'); put(['FastAPI'],'fastapi');
  put(['Spring','Spring Boot'],'spring'); put(['.NET','ASP.NET'],'dotnet');
  put(['Laravel'],'laravel'); put(['PHP'],'php');
  put(['Go','Golang'],'go'); put(['Java'],'java'); put(['Kotlin'],'kotlin');
  put(['C#'],'csharp'); put(['C++'],'cpp'); put(['Rust'],'rust');

  // Testing / QA
  put(['Testing'],'testing'); put(['Unit testing'],'unit testing'); put(['Integration testing'],'integration testing'); put(['E2E'],'e2e');
  put(['Selenium'],'selenium'); put(['Cypress'],'cypress'); put(['Playwright'],'playwright');
  put(['Jest'],'jest'); put(['Mocha'],'mocha'); put(['Chai'],'chai'); put(['PyTest','pytest'],'pytest');
  put(['JMeter'],'jmeter'); put(['Postman'],'postman'); put(['Swagger'],'swagger');
  put(['Allure'],'allure'); put(['Cucumber'],'cucumber');

  // DevOps
  put(['Git'],'git'); put(['GitHub'],'github'); put(['GitLab'],'gitlab');
  put(['CI/CD'],'ci/cd'); put(['GitHub Actions'],'github actions'); put(['GitLab CI'],'gitlab ci');
  put(['Docker'],'docker'); put(['Kubernetes'],'kubernetes'); put(['Terraform'],'terraform'); put(['Ansible'],'ansible');
  put(['NGINX','Nginx'],'nginx'); put(['Linux'],'linux'); put(['Bash'],'bash'); put(['Helm'],'helm');
  put(['Prometheus'],'prometheus'); put(['Grafana'],'grafana');

  // Clouds
  put(['AWS'],'aws'); put(['GCP'],'gcp'); put(['Azure'],'azure');
  put(['S3'],'s3'); put(['EC2'],'ec2'); put(['Lambda'],'lambda');
  put(['Cloud Functions'],'cloud functions'); put(['IAM'],'iam');

  // DS/ML
  put(['TensorFlow'],'tensorflow'); put(['PyTorch'],'pytorch');
  put(['Keras'],'keras'); put(['XGBoost'],'xgboost'); put(['CatBoost'],'catboost'); put(['LightGBM'],'lightgbm');
  put(['Feature Engineering'],'feature engineering'); put(['MLflow'],'mlflow');

  // PM / BA / Design / Marketing
  put(['Agile'],'agile'); put(['Scrum'],'scrum'); put(['Kanban'],'kanban');
  put(['Project Management'],'project management'); put(['Risk Management'],'risk management');
  put(['Stakeholder Management'],'stakeholder management'); put(['Requirements'],'requirements');
  put(['UML'],'uml'); put(['BPMN'],'bpmn'); put(['Jira'],'jira'); put(['Confluence'],'confluence');
  put(['Presentation'],'presentation'); put(['Communication'],'communication');
  put(['Roadmapping'],'roadmapping'); put(['Backlog'],'backlog');
  put(['Figma'],'figma'); put(['UI/UX','UX/UI'],'ui/ux'); put(['Prototyping'],'prototyping');
  put(['SEO'],'seo'); put(['SMM'],'smm'); put(['Digital Marketing'],'digital marketing');
  put(['Google Analytics'],'google analytics');

  // Base langs/libs
  put(['Python'],'python'); put(['Pandas'],'pandas'); put(['NumPy'],'numpy'); put(['SciPy'],'scipy');
  put(['Matplotlib'],'matplotlib'); put(['Seaborn'],'seaborn'); put(['Plotly'],'plotly');
  put(['R'],'r'); put(['Statistics'],'statistics'); put(['A/B Testing'],'a/b testing');

  return map;
})();

/** Карта «ядро навыков по роли» — для скорингового выбора, если явных паттернов нет */
const CORE_SKILLS_BY_ROLE = {
  'Frontend Developer':  ['javascript','typescript','react','redux','html','css','next','vue','angular','webpack','vite','tailwind','graphql'],
  'Backend Developer':   ['node','express','nest','django','flask','fastapi','spring','dotnet','laravel','php','java','go','postgres','mysql','redis'],
  'Fullstack Developer': ['javascript','typescript','react','node','express','postgres','docker'],
  'Data Analyst':        ['sql','excel','power bi','tableau','python','pandas','numpy','dax','metabase','looker studio'],
  'Data Scientist':      ['python','pandas','numpy','scipy','tensorflow','pytorch','xgboost','lightgbm','mlflow','feature engineering'],
  'ML Engineer':         ['pytorch','tensorflow','mlflow','airflow','kafka','spark','docker','kubernetes','feature engineering'],
  'Data Engineer':       ['spark','kafka','airflow','dbt','hadoop','clickhouse','redshift','bigquery','python','sql','docker','kubernetes'],
  'QA Engineer':         ['testing','selenium','cypress','playwright','jest','pytest','postman','swagger','allure','cucumber','ci/cd'],
  'DevOps Engineer':     ['docker','kubernetes','helm','terraform','ansible','nginx','linux','bash','aws','gcp','azure','prometheus','grafana','ci/cd'],
  'Android Developer':   ['kotlin','java','gradle'],
  'iOS Developer':       ['swift','objective-c'],
  'System Analyst':      ['requirements','uml','bpmn','sql','jira','confluence'],
  'Business Analyst':    ['requirements','bpmn','uml','sql','presentation','communication','jira','confluence','agile','scrum'],
  'Project Manager':     ['project management','risk management','agile','scrum','kanban','roadmapping','stakeholder management','jira','confluence'],
  'Marketing Specialist':['seo','smm','digital marketing','google analytics','figma','presentation'],
  'UI/UX Designer':      ['figma','ui/ux','prototyping','presentation','graphql'], // last is neutral
};

/** Регэкспы для явного хита по тексту */
const ROLE_PATTERNS = [
  { title: 'Project Manager',      rx: /(project\s*manager|руководитель\s*проект(ов|а)|менеджер\s*проекта|\bpm\b)/i },
  { title: 'Product Manager',      rx: /(product\s*manager|продакт(\s*менеджер)?|\bpo\b)/i },
  { title: 'Business Analyst',     rx: /(business\s*analyst|бизнес[-\s]?аналитик)/i },
  { title: 'System Analyst',       rx: /(system\s*analyst|системн(ый|ого)\s*аналитик(а)?)/i },

  { title: 'Data Engineer',        rx: /(data\s*engineer|инженер\s*данных|etl|airflow|kafka|spark)/i },
  { title: 'Data Analyst',         rx: /(data\s*analyst|аналитик\s*данных)/i },
  { title: 'Data Scientist',       rx: /(data\s*scientist|учен(ый|ого)\s*данных|ml\s*research)/i },
  { title: 'ML Engineer',          rx: /(ml\s*engineer|machine\s*learning|ml-инженер|машинн(ого|ое)\s*обучени[яе])/i },
  { title: 'QA Engineer',          rx: /(qa\b|quality\s*assurance|тестировщик|инженер\s*по\s*тестированию)/i },

  { title: 'Frontend Developer',   rx: /(front[\s-]*end|фронт[\s-]*енд|react\b|javascript\s*developer|typescript\s*developer)/i },
  { title: 'Backend Developer',    rx: /(back[\s-]*end|бэк[\s-]*енд|серверн(ый|ая)\s*разработчик|node\.?js|django|spring|\.net|laravel|php)/i },
  { title: 'Fullstack Developer',  rx: /(full[\s-]*stack|фулл[\s-]*стек)/i },
  { title: 'DevOps Engineer',      rx: /(devops|дейвопс|ci\/cd\s*инженер|platform\s*engineer|sre)/i },

  { title: 'Android Developer',    rx: /(android\s*developer|kotlin|java\s+android)/i },
  { title: 'iOS Developer',        rx: /(ios\s*developer|swift|objective-?c)/i },

  { title: 'UI/UX Designer',       rx: /(ui\/ux|ux\/ui|product\s*designer|figma)/i },
  { title: 'Marketing Specialist', rx: /(marketing|маркетолог|smm|digital)/i },
];

/** Продвинутые направления развития по ролям (для GAP, если рынок дал мало сигналов) */
const ADVANCED_BY_ROLE = {
  'Frontend Developer': ['accessibility', 'performance', 'graphql', 'testing'],
  'Backend Developer': ['api design', 'sql optimization', 'caching', 'security'],
  'Fullstack Developer': ['system design', 'devops basics', 'testing'],
  'Data Analyst': ['sql optimization', 'a/b testing', 'power bi dax', 'python visualization'],
  'Data Scientist': ['feature engineering', 'model monitoring', 'mlops'],
  'ML Engineer': ['mlops', 'optimization', 'experiment tracking'],
  'Business Analyst': ['bpmn 2.0', 'prototyping', 'system analysis'],
  'System Analyst': ['system analysis', 'requirements elicitation', 'protoyping'],
  'Project Manager': ['people management', 'budgeting', 'roadmapping', 'metrics'],
  'DevOps Engineer': ['iac', 'observability', 'security'],
  'QA Engineer': ['automation', 'performance testing', 'ci/cd testing'],
  'Data Engineer': ['orchestration', 'stream processing', 'observability'],
  'Marketing Specialist': ['cro', 'email marketing', 'marketing analytics'],
  'UI/UX Designer': ['design systems', 'accessibility', 'motion basics'],
};

/** Канонизация навыков профиля + извлечение из свободного текста */
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
  ].join(' ').toLowerCase();

  const extra = SKILL_LEXICON.map((s) => s.toLowerCase()).filter((sk) => text.includes(sk));

  const out = new Set();
  [...base, ...extra].forEach((raw) => {
    const k = CANON[raw] || raw;
    if (k) out.add(k);
  });
  return Array.from(out);
}

function roleScoreBySkills(role, skillsSet) {
  const core = CORE_SKILLS_BY_ROLE[role] || [];
  if (!core.length) return 0;
  let hit = 0;
  for (const s of core) if (skillsSet.has(s)) hit++;
  return hit / core.length; // 0..1
}

/** Определение ролей */
function guessRoles(profile, focusRole) {
  if (focusRole) return [String(focusRole)];

  const hay = [
    String(profile.targetTitle || ''),
    String(profile.desiredRole || ''),
    String(profile.position || ''),
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map((e) => String(e.title || '')),
  ].join(' ');

  const explicit = [];
  for (const r of ROLE_PATTERNS) if (r.rx.test(hay)) explicit.push(r.title);

  // если в явном хите есть PM/BA — убедимся, что это не «забило» техроли при сильном тех-стеке
  const mySkills = normalizeSkills(profile);
  const sset = new Set(mySkills);
  const scored = Object.keys(CORE_SKILLS_BY_ROLE).map((role) => ({
    role,
    score: roleScoreBySkills(role, sset),
  })).sort((a, b) => b.score - a.score);

  const implicitTop = scored.filter(x => x.score >= 0.25).map(x => x.role); // порог вменяемого совпадения

  // объединяем: явные роли первыми, затем подсказанные по навыкам
  const merged = Array.from(new Set([...explicit, ...implicitTop]));

  // лёгкая приоритезация: если есть сильный dev/analyst, а BA/PM слабо подтверждены — dev/analyst выше
  const priorityOrder = [
    'Data Engineer','ML Engineer','Data Scientist','Backend Developer','Frontend Developer','Fullstack Developer',
    'QA Engineer','DevOps Engineer','Android Developer','iOS Developer','UI/UX Designer','Data Analyst',
    'System Analyst','Business Analyst','Project Manager','Marketing Specialist','Product Manager'
  ];
  merged.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));

  return merged.slice(0, MAX_ROLES);
}

/** Опыт */
function yearsOfExperience(profile) {
  const arr = Array.isArray(profile.experience) ? profile.experience : [];
  let ms = 0;
  for (const e of arr) {
    const start = e.start || e.from || e.dateStart || e.date_from;
    const end   = e.end || e.to || e.dateEnd || e.date_to || new Date().toISOString().slice(0, 10);
    if (!start) continue;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) ms += (b - a);
  }
  const years = ms / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.round(years * 10) / 10);
}
const expBucket = (y) => (y < 1 ? 'noExperience' : y < 3 ? 'between1And3' : y < 6 ? 'between3And6' : 'moreThan6');
const expMatchScore = (u, v) => {
  if (!v) return 0.5;
  if (u === v) return 1;
  const order = ['noExperience','between1And3','between3And6','moreThan6'];
  const d = Math.abs(order.indexOf(u) - order.indexOf(v));
  return d === 1 ? 0.7 : d === 2 ? 0.4 : 0.1;
};

/** Навыки из вакансии */
function extractSkillsFromVacancy(v) {
  const pool = [];
  const ks = Array.isArray(v.key_skills) ? v.key_skills.map(k => k.name) : [];
  pool.push(...ks);
  const txt = [v.name, v.snippet?.requirement, v.snippet?.responsibility, v.description]
    .map(x => String(x||'').toLowerCase()).join(' ');
  for (const s of SKILL_LEXICON) if (txt.includes(lower(s))) pool.push(s);
  const out = new Set();
  pool.map(s => lower(s)).forEach(raw => { const k = CANON[raw] || raw; if (k) out.add(k); });
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
    { provider: 'Coursera', title: `${capital(skill)} — специализации`,     duration: '1–3 мес', url: `https://www.coursera.org/search?query=${q}` },
    { provider: 'Udemy',    title: `${capital(skill)} — практические курсы`, duration: '1–2 мес', url: `https://www.udemy.com/courses/search/?q=${q}` },
    { provider: 'Stepik',   title: `${capital(skill)} — русские курсы`,      duration: '2–8 нед', url: `https://stepik.org/search?query=${q}` },
  ];
};

/* =============================== CORE RECOMMENDATIONS ENGINE ============================ */
async function buildRecommendationsSmart(profile = {}, opts = {}) {
  const t0 = Date.now();
  const areaId     = opts.areaId ?? null;
  const focusRole  = opts.focusRole || null;
  const seedSkills = Array.isArray(opts.seedSkills) ? opts.seedSkills : [];

  const mySkills = Array.from(
    new Set([...normalizeSkills(profile), ...seedSkills.map((s) => lower(CANON[lower(s)] || s))])
  );
  const mySet = new Set(mySkills);

  const userYears  = yearsOfExperience(profile);
  const userBucket = expBucket(userYears);

  // 1) роли
  let roles = guessRoles(profile, focusRole);
  if (!roles.length) {
    // минимальный бэкап по стеку
    if (mySkills.some(s => ['sql','excel','power bi','tableau','python','pandas','numpy'].includes(s))) roles = ['Data Analyst'];
    else if (mySkills.some(s => ['react','javascript','typescript','html','css'].includes(s))) roles = ['Frontend Developer'];
    else if (mySkills.some(s => ['node','django','spring','dotnet','php','laravel'].includes(s))) roles = ['Backend Developer'];
    else if (mySkills.some(s => ['selenium','cypress','testing'].includes(s))) roles = ['QA Engineer'];
  }
  roles = roles.slice(0, MAX_ROLES);

  // Если рынок отключен — не ходим в HH вовсе
  if (!USE_MARKET || !roles.length) {
    dbg('market disabled or no roles → fallback-engine');
    return fallbackRecommendations(profile, { focusRole, seedSkills });
  }

  // 2) собираем id вакансий по ролям (возможен второй проход без areaId, если ноль результатов)
  async function collectRoleStats(targetAreaId) {
    const roleStats = [];
    const allVacancyIds = [];
    for (const role of roles) {
      let ids = [];
      for (let p = 0; p < SAMPLE_PAGES; p++) {
        try {
          const page = await hhSearchVacancies({ text: role, area: targetAreaId, page: p, per_page: PER_PAGE });
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
    return { roleStats, allVacancyIds };
  }

  let { roleStats, allVacancyIds } = await collectRoleStats(areaId);
  const totalFound = roleStats.reduce((s, r) => s + r.count, 0);
  let relaxedArea = false;

  if (areaId && totalFound === 0) {
    dbg('no results for area → relaxing to global');
    ({ roleStats, allVacancyIds } = await collectRoleStats(null));
    relaxedArea = true;
  }

  // 3) детально вытягиваем вакансии
  const skillFreq = new Map();
  const expScores = [];
  const rolesAgg = [];

  for (const r of roleStats) {
    const target = r.ids.slice();
    const details = [];
    const workers = Array.from({ length: Math.min(DETAIL_CONCURRENCY, target.length) }, async () => {
      while (target.length) {
        const id = target.shift();
        try { details.push(await hhGetVacancy(id)); } catch {}
      }
    });
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
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
      .map(([name,freq])=>({ name, freq }));

    rolesAgg.push({
      title: r.role,
      vacancies: r.count,
      hhQuery: r.role,
      topSkills: topLocal,
      url: hhSearchUrl(r.role, relaxedArea ? null : areaId)
    });
  }

  // 4) общий спрос и GAP
  const topDemand = [...skillFreq.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,20)
    .map(([name,freq])=>({ name, freq }));

  let gaps = topDemand.filter(s => !mySet.has(s.name)).slice(0, 8);

  // если рынок не дал чистых гэпов — подложим дорожку развития по первой роли
  if (!gaps.length && rolesAgg.length) {
    const r0 = rolesAgg[0].title;
    const adv = (ADVANCED_BY_ROLE[r0] || ['communication','presentation'])
      .map(s => lower(s))
      .filter(s => !mySet.has(s));
    gaps = adv.map(n => ({ name: n, freq: 1, advanced: true })).slice(0, 6);
  }

  // Не дублируем seeded
  for (const seeded of seedSkills) {
    const n = lower(CANON[lower(seeded)] || seeded);
    if (!mySet.has(n) && !gaps.some(g => g.name === n)) gaps.push({ name: n, freq: 1, seed: true });
  }

  // 5) курсы
  let courses = gaps.slice(0,3).flatMap(g => courseLinks(g.name));
  if (typeof getCoursesExt === 'function') {
    try {
      const keywords = gaps.slice(0, 6).map(g => g.name).join(', ');
      const ext = await getCoursesExt({ profile, gaps, keywords });
      if (Array.isArray(ext) && ext.length) courses = ext;
    } catch (e) { console.warn('[courses/ext]', e?.message || e); }
  }
  courses = uniqBy(courses, c => `${lower(c.provider)}|${lower(c.title)}|${c.url}`).slice(0, 12);

  // 6) скоринг
  const demandSet = new Set(topDemand.map(s=>s.name));
  const overlap = mySkills.filter(s => demandSet.has(s)).length;
  const fitSkills = topDemand.length ? (overlap / topDemand.length) : 0;
  const fitExp    = expScores.length ? (expScores.reduce((a,b)=>a+b,0)/expScores.length) : 0.5;

  // хард-сигнал наличия рынка по ролям
  const roleHit   = rolesAgg.some(r => r.vacancies > 50) ? 1
                    : rolesAgg.some(r => r.vacancies > 20) ? 0.7
                    : rolesAgg.some(r => r.vacancies > 5)  ? 0.4 : 0.2;

  const scoreRaw = (fitSkills * 0.60 + fitExp * 0.25 + roleHit * 0.15) * 100;
  const marketFitScore = clamp(Math.round(scoreRaw), 10, 95);

  const t1 = Date.now();

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: rolesAgg.sort((a,b)=>b.vacancies - a.vacancies),
    professions: rolesAgg,
    growSkills: uniqBy(gaps.map(g => ({ name: g.name, demand: g.freq, gap: true })), x => x.name),
    skillsToGrow: gaps.map(g => capital(g.name)),
    courses,
    debug: {
      source: 'market',
      skillsDetected: mySkills,
      rolesGuessed: roles,
      focusRole: focusRole || undefined,
      seeded: seedSkills,
      areaUsed: relaxedArea ? null : areaId,
      relaxedArea,
      sampleVacancies: Array.from(new Set(allVacancyIds)).length,
      userYears,
      host: HH_HOST,
      timingsMs: { total: t1 - t0 }
    }
  };
}

/* ================================ LLM ENRICHMENT / MERGE ================================ */
function normalizeProfTitle(t) {
  const s = String(t || '').trim();
  if (!s) return '';
  return s.replace(/\s+/g, ' ').replace(/engineer/i,'Engineer').replace(/developer/i,'Developer');
}

function mergeRecs({ market, llm, areaId }) {
  if (!market && !llm) return null;
  if (market && !llm)  return market;
  if (!market && llm) {
    // привести LLM-ответ к единому формату фронта
    const profs = (llm.professions || []).map((p) => ({
      title: normalizeProfTitle(p),
      vacancies: 0,
      hhQuery: p,
      topSkills: [],
      url: hhSearchUrl(p, areaId),
    }));
    return {
      marketFitScore: clamp(Number(llm.matchScore || 40), 10, 95),
      marketScore: clamp(Number(llm.matchScore || 40), 10, 95),
      roles: profs,
      professions: profs,
      growSkills: (llm.skillsToLearn || []).map(n => ({ name: lower(n), demand: 1, gap: true })),
      skillsToGrow: (llm.skillsToLearn || []).map(capital),
      courses: llm.courses || [],
      debug: { source: 'llm-only' },
    };
  }

  // blend: объединяем без дубликатов
  const rolesMap = new Map();
  for (const r of market.roles || []) rolesMap.set(normalizeProfTitle(r.title), { ...r });
  for (const p of llm.professions || []) {
    const key = normalizeProfTitle(p);
    if (!key) continue;
    if (!rolesMap.has(key)) {
      rolesMap.set(key, { title: key, vacancies: 0, hhQuery: key, topSkills: [], url: hhSearchUrl(key, areaId) });
    }
  }
  const roles = Array.from(rolesMap.values()).slice(0, MAX_ROLES);

  const mySet = new Set((market.debug?.skillsDetected || []).map(lower));
  const growMarket = (market.growSkills || []).map(x => lower(x.name));
  const growLLM    = (llm.skillsToLearn || []).map(lower);

  // убираем «эхо» навыков пользователя
  const mergedGrow = uniqBy(
    [...growMarket, ...growLLM].filter((s) => s && !mySet.has(s)),
    (s) => s
  ).slice(0, 8);

  const courses = uniqBy(
    [...(market.courses || []), ...(llm.courses || [])],
    (c) => `${lower(c.provider || '')}|${lower(c.title || c.name || '')}|${c.url || ''}`
  ).slice(0, 12).map((c) => ({
    provider: c.provider || 'Course',
    title: c.title || c.name || 'Курс',
    duration: c.duration || '',
    url: c.url || '',
  }));

  const score = clamp(Math.round(((market.marketFitScore || 40) * 0.65) + ((llm.matchScore || 40) * 0.35)), 10, 95);

  return {
    marketFitScore: score,
    marketScore: score,
    roles,
    professions: roles,
    growSkills: mergedGrow.map((n) => ({ name: n, demand: 1, gap: true })),
    skillsToGrow: mergedGrow.map(capital),
    courses,
    debug: {
      source: 'blend',
      marketScore: market.marketFitScore,
      llmScore: llm.matchScore,
      llmUsed: true,
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
    if (has(['react','javascript','typescript','html','css','redux']))
      professions.push({ title: 'Frontend Developer', vacancies: 0, hhQuery: 'Frontend Developer', topSkills: [], url: hhSearchUrl('Frontend Developer', null) });
    if (has(['node','express','nest','dotnet','spring','django','flask','fastapi']))
      professions.push({ title: 'Backend Developer',  vacancies: 0, hhQuery: 'Backend Developer',  topSkills: [], url: hhSearchUrl('Backend Developer', null) });
    if (has(['sql','postgres','mysql','excel','pandas','power bi','tableau']))
      professions.push({ title: 'Data Analyst',       vacancies: 0, hhQuery: 'Data Analyst',       topSkills: [], url: hhSearchUrl('Data Analyst', null) });
    if (has(['tensorflow','pytorch','mlflow','feature engineering']))
      professions.push({ title: 'ML Engineer',        vacancies: 0, hhQuery: 'ML Engineer',        topSkills: [], url: hhSearchUrl('ML Engineer', null) });
    if (has(['selenium','cypress','playwright','testing','pytest']))
      professions.push({ title: 'QA Engineer',        vacancies: 0, hhQuery: 'QA Engineer',        topSkills: [], url: hhSearchUrl('QA Engineer', null) });
  }

  const basicGrow = skills.length
    ? ['communication','presentation']
    : ['agile','data analysis','digital marketing'];

  let courses = basicGrow.slice(0,2).flatMap(s => courseLinks(lower(s)));
  if (typeof getCoursesExt === 'function') {
    try {
      const ext = await getCoursesExt({
        profile,
        gaps: basicGrow.map(n => ({ name: lower(n) })),
        keywords: basicGrow.join(', ')
      });
      if (Array.isArray(ext) && ext.length) courses = ext;
    } catch (e) { console.warn('[courses/fallback]', e?.message || e); }
  }
  courses = uniqBy(courses, c => `${lower(c.provider)}|${lower(c.title)}|${c.url}`).slice(0, 12);

  const marketFitScore = clamp(20 + skills.length * 3, 10, 60);

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: professions,
    professions,
    growSkills: uniqBy(basicGrow.map(s => ({ name: lower(s), demand: 1, gap: true })), x => x.name),
    skillsToGrow: basicGrow.map(capital),
    courses,
    debug: { source: 'fallback', skillsDetected: skills, focusRole: focusRole || undefined, seeded: seedSkills }
  };
}

function fallbackImprove(profile = {}) {
  const uniq = (arr) => Array.from(new Set((arr || []).map(String).map(s => s.trim()).filter(Boolean)));
  const cap  = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const normalizedSkills = uniq(profile.skills).map(cap);
  const bullets = [];
  const txt = String(profile.summary || '').trim();
  if (txt) txt.split(/[\n\.]+/).map(s => s.trim()).filter(Boolean).forEach(line => bullets.push(`• ${line}`));
  const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
  return { ok: true, updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
}

/* ========================================== VALIDATION =================================== */
const MAX_PROFILE_SIZE = 50000;  // chars in JSON
const MAX_SKILLS = 50;
const MAX_ROLE_LENGTH = 200;

function validateReqBody(body) {
  const profile = body?.profile || {};
  const profileStr = JSON.stringify(profile);
  if (profileStr.length > MAX_PROFILE_SIZE) {
    return { error: 'Profile too large', status: 400 };
  }
  const focusRole = body?.focusRole || null;
  if (focusRole && String(focusRole).length > MAX_ROLE_LENGTH) {
    return { error: 'Focus role too long', status: 400 };
  }
  const seedSkills = Array.isArray(body?.seedSkills) ? body.seedSkills : [];
  if (seedSkills.length > MAX_SKILLS) {
    return { error: 'Too many seed skills', status: 400 };
  }
  return null;
}

/* ========================================== ROUTES ====================================== */
/**
 * POST /api/recommendations/generate
 * body: { profile, areaId?, focusRole?, seedSkills?[] }
 * resp: { ok, data: { marketFitScore, roles[], growSkills[], courses[], debug }, used: { market, llm }, timingsMs }
 */
router.post('/generate', async (req, res) => {
  const t0 = Date.now();
  try {
    const validationError = validateReqBody(req.body);
    if (validationError) {
      return res.status(validationError.status).json({ error: validationError.error });
    }

    const profile    = req.body?.profile || {};
    const areaId     = req.body?.areaId ?? null;
    const focusRole  = req.body?.focusRole || null;
    const seedSkills = Array.isArray(req.body?.seedSkills) ? req.body.seedSkills : [];

    // 0) Если есть внешний LLM — используем его (приоритет)
    if (typeof buildRecommendationsExt === 'function') {
      dbg('using external recommender (LLM)');
      const data = await buildRecommendationsExt(profile, { areaId, focusRole, seedSkills });
      return res.json({ ok: true, data, llm: true, timingsMs: { total: Date.now() - t0 } });
    }

    // 1) Рыночный двигатель
    let market = null;
    try {
      market = await buildRecommendationsSmart(profile, { areaId, focusRole, seedSkills });
    } catch (e) {
      console.error('[rec/generate smart failed]', e?.message || e);
    }

    // 2) LLM-усиление (если подключено и сервис доступен)
    let llm = null;
    if (USE_LLM && ai && typeof ai.recommendFromProfile === 'function') {
      try {
        llm = await ai.recommendFromProfile(profile, { complex: LLM_COMPLEX });
      } catch (e) {
        console.warn('[rec/llm] recommendFromProfile failed:', e?.message || e);
      }
    }

    // 3) Слияние
    let data = mergeRecs({ market, llm, areaId });
    if (!data) {
      // вообще ничего не получилось — жёсткий фолбэк
      data = await fallbackRecommendations(profile, { focusRole, seedSkills });
    }

    return res.json({
      ok: true,
      data,
      timingsMs: { total: Date.now() - t0 },
      used: { market: !!market, llm: !!llm }
    });
  } catch (e) {
    console.error('[rec/generate]', e);
    const data = await fallbackRecommendations(req.body?.profile || {}, {
      focusRole: req.body?.focusRole || null,
      seedSkills: req.body?.seedSkills || [],
    });
    return res.json({ ok: true, data, fallback: true, timingsMs: { total: Date.now() - t0 } });
  }
});

/**
 * POST /api/recommendations/analyze
 * body: { profile, areaId?, focusRole?, seedSkills?[] }
 * resp: { marketFitScore, roles[], growSkills[], courses[], debug }
 */
router.post('/analyze', async (req, res) => {
  try {
    const validationError = validateReqBody(req.body);
    if (validationError) {
      return res.status(validationError.status).json({ error: validationError.error });
    }

    const profile    = req.body?.profile || {};
    const areaId     = req.body?.areaId ?? null;
    const focusRole  = req.body?.focusRole || null;
    const seedSkills = Array.isArray(req.body?.seedSkills) ? req.body.seedSkills : [];

    const data = await buildRecommendationsSmart(profile, { areaId, focusRole, seedSkills });
    const { marketFitScore, roles, growSkills, courses, debug } = data;

    // при анализе можно добавить ИИ-подсказки по навыкам (не меняя скор)
    let llm = null;
    if (USE_LLM && ai && typeof ai.recommendFromProfile === 'function') {
      try { llm = await ai.recommendFromProfile(profile, { complex: false }); } catch {}
    }
    const llmSkills = Array.isArray(llm?.skillsToLearn) ? llm.skillsToLearn.slice(0, 6) : [];

    return res.json({
      marketFitScore,
      roles,
      growSkills: uniqBy(
        [...growSkills, ...llmSkills.map((n) => ({ name: lower(n), demand: 1, gap: true }))],
        (x) => x.name
      ),
      courses,
      debug: { ...(debug || {}), llmUsed: !!llm }
    });
  } catch (e) {
    console.error('[rec/analyze]', e);
    const data = await fallbackRecommendations(req.body?.profile || {}, {
      focusRole: req.body?.focusRole || null,
      seedSkills: req.body?.seedSkills || []
    });
    const { marketFitScore, roles, growSkills, courses, debug } = data;
    return res.json({ marketFitScore, roles, growSkills, courses, debug: { ...(debug||{}), degraded: true } });
  }
});

/**
 * POST /api/recommendations/improve
 * body: { profile }
 */
router.post('/improve', async (req, res) => {
  try {
    const validationError = validateReqBody(req.body);
    if (validationError) {
      return res.status(validationError.status).json({ error: validationError.error });
    }

    const profile = req.body?.profile || {};
    if (typeof improveProfileExt === 'function') {
      const { updated, changes } = await improveProfileExt(profile);
      return res.json({ ok: true, updated, changes, llm: true });
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
