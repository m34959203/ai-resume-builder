/* eslint-disable no-console */
'use strict';

/**
 * External, optional providers
 */
let getCoursesExt = null;
try {
  ({ getCourses: getCoursesExt } = require('./courseAggregator'));
} catch {}

/* ============================== ENV & CONSTANTS ============================== */

const HH_HOST = (process.env.HH_HOST || 'hh.kz').trim();

const flag = (v, def = '0') =>
  ['1', 'true', 'yes', 'on'].includes(String(v ?? def).toLowerCase());

const DEBUG_LOGS = flag(process.env.RECS_DEBUG, '0');
const MAX_ROLES  = Math.max(1, Number(process.env.RECS_MAX_ROLES || 5));

const dbg = (...args) => { if (DEBUG_LOGS) console.log('[recommender]', ...args); };

/* ============================== SMALL HELPERS ================================ */

const lower = (s) => String(s || '').toLowerCase().trim();
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const uniq = (arr) => Array.from(new Set(arr || []));
const uniqBy = (arr, key) => {
  const seen = new Set(); const out = [];
  for (const x of arr || []) { const k = key(x); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
};

/* ============================== SKILLS LEXICON =============================== */

const SKILL_LEXICON = [
  // Data / BI / Analytics
  'Excel','MS Excel','Google Sheets','Looker Studio','Power Query','Power Pivot',
  'SQL','Postgres','MySQL','SQLite','NoSQL','MongoDB','Redis',
  'Power BI','DAX','Tableau','Qlik','Metabase',
  'Python','Pandas','NumPy','SciPy','Matplotlib','Seaborn','Plotly',
  'R','Statistics','A/B Testing','Experimentation','Hypothesis testing',
  'dbt','Apache Airflow','Airflow','Kafka','Apache Kafka','Spark','Apache Spark',
  'Hadoop','ClickHouse','BigQuery','Redshift','Athena','Glue','LookML',

  // FE
  'JavaScript','TypeScript','HTML','CSS','Sass','Less','React','Redux',
  'Next.js','Vite','Webpack','Babel','Vue','Nuxt','Angular','Tailwind','GraphQL',

  // BE
  'Node.js','Express','Nest.js','Django','Flask','FastAPI','Spring','Spring Boot',
  '.NET','ASP.NET','Laravel','PHP','Go','Golang','Java','Kotlin','C#','C++','Rust',

  // QA / Testing
  'Testing','Unit testing','Integration testing','E2E','Selenium','Cypress','Playwright',
  'Jest','Mocha','Chai','PyTest','JMeter','Postman','Swagger','Allure','Cucumber',

  // DevOps
  'Git','GitHub','GitLab','CI/CD','GitHub Actions','GitLab CI',
  'Docker','Kubernetes','Terraform','Ansible','NGINX','Linux','Bash','Helm',
  'Prometheus','Grafana',

  // Cloud
  'AWS','GCP','Azure','S3','EC2','Lambda','Cloud Functions','IAM','Networking',

  // DS/ML
  'TensorFlow','PyTorch','Keras','XGBoost','CatBoost','LightGBM',
  'Feature Engineering','MLflow',

  // PM/BA/Design/Marketing
  'Agile','Scrum','Kanban','Project Management','Risk Management','Stakeholder Management',
  'Requirements','UML','BPMN','Jira','Confluence','Presentation','Communication',
  'Roadmapping','Backlog','Figma','UI/UX','Prototyping','SEO','SMM','Digital Marketing',
  'Google Analytics',
];

const CANON = (() => {
  const map = {};
  const put = (aliases, canon) => aliases.forEach(a => map[lower(a)] = canon);

  // Data / BI
  put(['MS Excel','Excel'],'excel');
  put(['Google Sheets'],'google sheets');
  put(['Google Data Studio','Looker Studio'],'looker studio');
  put(['Power Query'],'power query'); put(['Power Pivot'],'power pivot');
  put(['SQL'],'sql'); put(['Postgres','PostgreSQL'],'postgres');
  put(['MySQL'],'mysql'); put(['SQLite'],'sqlite'); put(['NoSQL'],'nosql');
  put(['MongoDB'],'mongodb'); put(['Redis'],'redis');
  put(['Power BI'],'power bi'); put(['DAX'],'dax'); put(['Tableau'],'tableau');
  put(['Qlik'],'qlik'); put(['Metabase'],'metabase');
  put(['dbt'],'dbt'); put(['Airflow','Apache Airflow'],'airflow');
  put(['Kafka','Apache Kafka'],'kafka'); put(['Spark','Apache Spark'],'spark');
  put(['Hadoop'],'hadoop'); put(['ClickHouse'],'clickhouse');
  put(['BigQuery'],'bigquery'); put(['Redshift'],'redshift');
  put(['Athena'],'athena'); put(['Glue'],'glue'); put(['LookML'],'lookml');

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

  // QA
  put(['Testing'],'testing'); put(['Unit testing'],'unit testing');
  put(['Integration testing'],'integration testing'); put(['E2E'],'e2e');
  put(['Selenium'],'selenium'); put(['Cypress'],'cypress'); put(['Playwright'],'playwright');
  put(['Jest'],'jest'); put(['Mocha'],'mocha'); put(['Chai'],'chai');
  put(['PyTest','pytest'],'pytest'); put(['JMeter'],'jmeter');
  put(['Postman'],'postman'); put(['Swagger'],'swagger');
  put(['Allure'],'allure'); put(['Cucumber'],'cucumber');

  // DevOps
  put(['Git'],'git'); put(['GitHub'],'github'); put(['GitLab'],'gitlab');
  put(['CI/CD'],'ci/cd'); put(['GitHub Actions'],'github actions'); put(['GitLab CI'],'gitlab ci');
  put(['Docker'],'docker'); put(['Kubernetes'],'kubernetes'); put(['Terraform'],'terraform');
  put(['Ansible'],'ansible'); put(['NGINX','Nginx'],'nginx');
  put(['Linux'],'linux'); put(['Bash'],'bash'); put(['Helm'],'helm');
  put(['Prometheus'],'prometheus'); put(['Grafana'],'grafana');

  // Cloud
  put(['AWS'],'aws'); put(['GCP'],'gcp'); put(['Azure'],'azure');
  put(['S3'],'s3'); put(['EC2'],'ec2'); put(['Lambda'],'lambda');
  put(['Cloud Functions'],'cloud functions'); put(['IAM'],'iam');

  // DS/ML
  put(['TensorFlow'],'tensorflow'); put(['PyTorch'],'pytorch'); put(['Keras'],'keras');
  put(['XGBoost'],'xgboost'); put(['CatBoost'],'catboost'); put(['LightGBM'],'lightgbm');
  put(['Feature Engineering'],'feature engineering'); put(['MLflow'],'mlflow');

  // Soft/PM/BA/Design/Marketing
  put(['Agile'],'agile'); put(['Scrum'],'scrum'); put(['Kanban'],'kanban');
  put(['Project Management'],'project management'); put(['Risk Management'],'risk management');
  put(['Stakeholder Management'],'stakeholder management'); put(['Requirements'],'requirements');
  put(['UML'],'uml'); put(['BPMN'],'bpmn'); put(['Jira'],'jira'); put(['Confluence'],'confluence');
  put(['Presentation'],'presentation'); put(['Communication'],'communication');
  put(['Roadmapping'],'roadmapping'); put(['Backlog'],'backlog');
  put(['Figma'],'figma'); put(['UI/UX','UX/UI'],'ui/ux'); put(['Prototyping'],'prototyping');
  put(['SEO'],'seo'); put(['SMM'],'smm'); put(['Digital Marketing'],'digital marketing');
  put(['Google Analytics'],'google analytics');

  // Python/data libs
  put(['Python'],'python'); put(['Pandas'],'pandas'); put(['NumPy'],'numpy'); put(['SciPy'],'scipy');
  put(['Matplotlib'],'matplotlib'); put(['Seaborn'],'seaborn'); put(['Plotly'],'plotly');
  put(['R'],'r'); put(['Statistics'],'statistics'); put(['A/B Testing'],'a/b testing');

  return map;
})();

/* ============================== ROLES & CORES ================================= */

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
  'UI/UX Designer':      ['figma','ui/ux','prototyping','presentation'],
};

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

/* ============================== ADVANCED DIRECTIONS =========================== */

const ADVANCED_BY_ROLE = {
  'Frontend Developer': ['accessibility', 'performance', 'graphql', 'testing'],
  'Backend Developer': ['api design', 'sql optimization', 'caching', 'security'],
  'Fullstack Developer': ['system design', 'devops basics', 'testing'],
  'Data Analyst': ['sql optimization', 'a/b testing', 'power bi dax', 'python visualization'],
  'Data Scientist': ['feature engineering', 'model monitoring', 'mlops'],
  'ML Engineer': ['mlops', 'optimization', 'experiment tracking'],
  'Business Analyst': ['bpmn 2.0', 'prototyping', 'system analysis'],
  'System Analyst': ['system analysis', 'requirements elicitation', 'prototyping'],
  'Project Manager': ['people management', 'budgeting', 'roadmapping', 'metrics'],
  'DevOps Engineer': ['iac', 'observability', 'security'],
  'QA Engineer': ['automation', 'performance testing', 'ci/cd testing'],
  'Data Engineer': ['orchestration', 'stream processing', 'observability'],
  'Marketing Specialist': ['cro', 'email marketing', 'marketing analytics'],
  'UI/UX Designer': ['design systems', 'accessibility', 'motion basics'],
};

/* ============================== CORE LOGIC =================================== */

function hhSearchUrl(role, areaId) {
  const u = new URL(`https://${HH_HOST}/search/vacancy`);
  u.searchParams.set('text', role);
  if (areaId) u.searchParams.set('area', String(areaId));
  return u.toString();
}

function courseLinks(skill) {
  const q = encodeURIComponent(skill);
  return [
    { provider: 'Coursera', title: `${capital(skill)} — специализации`,     duration: '1–3 мес', url: `https://www.coursera.org/search?query=${q}` },
    { provider: 'Udemy',    title: `${capital(skill)} — практические курсы`, duration: '1–2 мес', url: `https://www.udemy.com/courses/search/?q=${q}` },
    { provider: 'Stepik',   title: `${capital(skill)} — русские курсы`,      duration: '2–8 нед', url: `https://stepik.org/search?query=${q}` },
  ];
}

function normalizeSkills(profile = {}) {
  const base = (Array.isArray(profile.skills) ? profile.skills : [])
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

function roleScoreBySkills(role, skillSet) {
  const core = CORE_SKILLS_BY_ROLE[role] || [];
  if (!core.length) return 0;
  let hit = 0;
  for (const s of core) if (skillSet.has(s)) hit++;
  return hit / core.length;
}

function guessRoles(profile = {}, focusRole = null) {
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

  const skills = normalizeSkills(profile);
  const sset = new Set(skills);
  const scored = Object.keys(CORE_SKILLS_BY_ROLE).map((role) => ({
    role, score: roleScoreBySkills(role, sset),
  })).sort((a, b) => b.score - a.score);

  const implicitTop = scored.filter(x => x.score >= 0.25).map(x => x.role);

  const merged = Array.from(new Set([...explicit, ...implicitTop]));

  const priorityOrder = [
    'Data Engineer','ML Engineer','Data Scientist','Backend Developer','Frontend Developer','Fullstack Developer',
    'QA Engineer','DevOps Engineer','Android Developer','iOS Developer','UI/UX Designer','Data Analyst',
    'System Analyst','Business Analyst','Project Manager','Marketing Specialist','Product Manager'
  ];
  merged.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));

  // если совсем пусто — возьмём топ по скору (даже если < 0.25)
  if (!merged.length) {
    const firstNonZero = scored.filter(x => x.score > 0).map(x => x.role).slice(0, 3);
    if (firstNonZero.length) return firstNonZero.slice(0, MAX_ROLES);
  }

  return merged.slice(0, MAX_ROLES);
}

function yearsOfExperience(profile = {}) {
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

function expBucket(y) {
  return (y < 1 ? 'noExperience' : y < 3 ? 'between1And3' : y < 6 ? 'between3And6' : 'moreThan6');
}

/* ============================== PUBLIC: buildRecommendations ================== */

async function buildRecommendations(profile = {}, opts = {}) {
  const t0 = Date.now();
  const areaId     = opts.areaId ?? null;
  const focusRole  = opts.focusRole || null;
  const seedSkills = Array.isArray(opts.seedSkills) ? opts.seedSkills : [];

  const mySkills = uniq([
    ...normalizeSkills(profile),
    ...seedSkills.map((s) => lower(CANON[lower(s)] || s)),
  ]);
  const mySet = new Set(mySkills);

  let roles = guessRoles(profile, focusRole);
  if (!roles.length) {
    // последний бэкап: попробуем вывести из наличия «ядерных» навыков
    if (['react','javascript','typescript','html','css'].some(s => mySet.has(s))) roles = ['Frontend Developer'];
    else if (['node','django','spring','dotnet','php','laravel'].some(s => mySet.has(s))) roles = ['Backend Developer'];
    else if (['sql','excel','power bi','tableau','python','pandas','numpy'].some(s => mySet.has(s))) roles = ['Data Analyst'];
    else if (['selenium','cypress','testing'].some(s => mySet.has(s))) roles = ['QA Engineer'];
  }
  roles = roles.slice(0, MAX_ROLES);

  // агрегируем спрос по ядру выбранных ролей (локальная эвристика)
  const coreFreq = new Map();
  const rolesAgg = [];
  for (const r of roles) {
    const core = CORE_SKILLS_BY_ROLE[r] || [];
    core.forEach(s => coreFreq.set(s, (coreFreq.get(s) || 0) + 1));
    const topLocal = core.slice(0, 5).map((name) => ({ name, freq: 1 }));
    rolesAgg.push({
      title: r,
      vacancies: 0,          // локальный режим: точных цифр рынка нет
      hhQuery: r,
      topSkills: topLocal,
      url: hhSearchUrl(r, areaId),
    });
  }

  const topDemand = [...coreFreq.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 20)
    .map(([name,freq])=>({ name, freq }));

  // GAP: навыки из спроса ролей, которых нет у пользователя
  let gaps = topDemand.filter(s => !mySet.has(s.name)).slice(0, 8);

  if (!gaps.length && rolesAgg.length) {
    const r0 = rolesAgg[0].title;
    const adv = (ADVANCED_BY_ROLE[r0] || ['communication','presentation'])
      .map(s => lower(s))
      .filter(s => !mySet.has(s));
    gaps = adv.map(n => ({ name: n, freq: 1, advanced: true })).slice(0, 6);
  }

  // курсы
  let courses = gaps.slice(0,3).flatMap(g => courseLinks(g.name));
  if (typeof getCoursesExt === 'function') {
    try {
      const keywords = gaps.slice(0, 6).map(g => g.name).join(', ');
      const ext = await getCoursesExt({ profile, gaps, keywords });
      if (Array.isArray(ext) && ext.length) courses = ext;
    } catch (e) { console.warn('[recommender/coursesExt]', e?.message || e); }
  }
  courses = uniqBy(courses, c => `${lower(c.provider)}|${lower(c.title)}|${c.url}`).slice(0, 12);

  // Счёт: совпадение по ядру + опыт
  const userYears  = yearsOfExperience(profile);
  const bucket     = expBucket(userYears);

  // fitSkills: доля ядра, покрытая пользователем, усреднённая по ролям
  let fitSkills = 0;
  if (roles.length) {
    const perRole = roles.map(r => {
      const core = CORE_SKILLS_BY_ROLE[r] || [];
      const hit = core.filter(s => mySet.has(s)).length;
      return core.length ? (hit / core.length) : 0;
    });
    fitSkills = perRole.reduce((a,b)=>a+b,0) / perRole.length;
  }

  // fitExp: грубая шкала по корзине опыта
  const bucketScore = { noExperience: 0.35, between1And3: 0.6, between3And6: 0.8, moreThan6: 1 }[bucket] || 0.5;

  // roleHit: есть ли вообще роли (как прокси наличия рынка)
  const roleHit = roles.length >= 3 ? 1 : roles.length === 2 ? 0.7 : roles.length === 1 ? 0.5 : 0.2;

  // profileBonus: бонус за заполненность профиля (позиция, навыки, описание)
  const hasPosition = String(profile.position || profile.targetTitle || '').trim().length >= 3;
  const hasSkillsList = mySkills.length >= 1;
  const hasSummary = String(profile.summary || '').trim().length >= 20;
  const profileBonus = (hasPosition ? 0.15 : 0) + (hasSkillsList ? 0.10 : 0) + (hasSummary ? 0.05 : 0);

  const scoreRaw = (fitSkills * 0.55 + bucketScore * 0.15 + roleHit * 0.10 + profileBonus) * 100;
  const marketFitScore = clamp(Math.round(scoreRaw), 10, 90);

  const t1 = Date.now();

  const data = {
    marketFitScore,
    marketScore: marketFitScore,
    roles: rolesAgg,
    professions: rolesAgg,
    growSkills: uniqBy(gaps.map(g => ({ name: g.name, demand: g.freq, gap: true })), x => x.name),
    skillsToGrow: gaps.map(g => capital(g.name)),
    courses,
    debug: {
      source: 'recommender-local',
      skillsDetected: mySkills,
      rolesGuessed: roles,
      focusRole: focusRole || undefined,
      seeded: seedSkills,
      areaUsed: areaId || null,
      userYears,
      timingsMs: { total: t1 - t0 }
    }
  };

  dbg('roles:', roles, 'score:', marketFitScore);
  return data;
}

/* ============================== PUBLIC: improveProfile ======================== */

function improveProfile(profile = {}) {
  const norm = (arr) => Array.from(new Set((arr || [])
    .map(String)
    .map(s => s.trim())
    .filter(Boolean)));

  // нормализуем skills (капитализация)
  const normalizedSkills = norm(profile.skills).map((s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : s
  );

  // превращаем summary в буллеты (если уместно)
  const bullets = [];
  const txt = String(profile.summary || '').trim();
  if (txt) {
    txt.split(/[\n\.]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(line => bullets.push(`• ${line}`));
  }

  const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
  return { updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
}

/* ============================== EXPORTS ====================================== */

module.exports = {
  /**
   * Build recommendations using local heuristics (no HH API / no LLM).
   * Returns the same shape as the market/LLM pipeline expects.
   */
  buildRecommendations,

  /**
   * Lightweight profile normalizer / improver.
   */
  improveProfile,
};
