/**
 * Recommendations Router
 * 
 * Provides AI-powered career recommendations:
 * - Job market analysis
 * - Skill gap detection
 * - Course recommendations
 * - Profile improvement suggestions
 * 
 * Supports: EN, KK, RU
 * 
 * @module routes/recommendations
 */

'use strict';

const express = require('express');
const router = express.Router();

/* ============================= Optional Services ============================= */

let aiService = null;
let buildRecommendationsExt = null;
let improveProfileExt = null;
let getCoursesExt = null;

// Try to import AI service
try {
  aiService = require('../services/ai');
  console.log('✓ AI service loaded');
} catch (error) {
  console.log('∙ AI service not available');
}

// Try to import external recommender
try {
  const ext = require('../services/recommender');
  buildRecommendationsExt = ext.buildRecommendations;
  improveProfileExt = ext.improveProfile;
  console.log('✓ External recommender loaded');
} catch (error) {
  console.log('∙ External recommender not available');
}

// Try to import course aggregator
try {
  const courses = require('../services/courseAggregator');
  getCoursesExt = courses.getCourses;
  console.log('✓ Course aggregator loaded');
} catch (error) {
  console.log('∙ Course aggregator not available');
}

/* ============================== Configuration ================================ */

const HH_HOST = (process.env.HH_HOST || 'hh.kz').trim();
const HH_API = 'https://api.hh.ru';
const USER_AGENT = process.env.HH_USER_AGENT || 'AI-Resume-Builder/2.0 (+github.com)';

const SAMPLE_PAGES = Math.max(1, Number(process.env.RECS_SAMPLE_PAGES || 2));
const PER_PAGE = Math.max(1, Number(process.env.RECS_PER_PAGE || 50));
const VACANCY_SAMPLE_PER_ROLE = Math.max(1, Number(process.env.RECS_VACANCY_SAMPLE_PER_ROLE || 30));
const CACHE_TTL_MS = Number(process.env.RECS_CACHE_TTL_MS || 180000);
const DETAIL_CONCURRENCY = Math.max(2, Number(process.env.RECS_DETAIL_CONCURRENCY || 6));
const FETCH_TIMEOUT_MS = Math.max(3000, Number(process.env.RECS_FETCH_TIMEOUT_MS || 15000));

/* ================================= Cache ===================================== */

const cache = new Map();

const cacheGet = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (item.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
};

const cacheSet = (key, value, ttl = CACHE_TTL_MS) => {
  cache.set(key, {
    data: value,
    expires: Date.now() + ttl,
    createdAt: Date.now(),
  });
};

// Cleanup cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    if (value.expires <= now) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired recommendation entries`);
  }
}, 5 * 60 * 1000);

/* ============================= Localization ================================== */

const TRANSLATIONS = {
  en: {
    professions: {
      'Project Manager': 'Project Manager',
      'Business Analyst': 'Business Analyst',
      'Marketing Specialist': 'Marketing Specialist',
      'Data Analyst': 'Data Analyst',
      'Frontend Developer': 'Frontend Developer',
      'Backend Developer': 'Backend Developer',
      'Full Stack Developer': 'Full Stack Developer',
      'Product Manager': 'Product Manager',
      'QA Engineer': 'QA Engineer',
      'UI/UX Designer': 'UI/UX Designer',
      'Python Developer': 'Python Developer',
    },
    skills: {
      common: ['Communication', 'Problem Solving', 'Teamwork', 'Time Management', 'Leadership'],
      technical: ['Programming', 'Data Analysis', 'System Design', 'Testing', 'Documentation'],
    },
    messages: {
      analyzing: 'Analyzing your profile...',
      generating: 'Generating recommendations...',
      error: 'Failed to generate recommendations',
    },
  },
  
  kk: {
    professions: {
      'Project Manager': 'Жоба менеджері',
      'Business Analyst': 'Бизнес-аналитик',
      'Marketing Specialist': 'Маркетинг маманы',
      'Data Analyst': 'Деректер аналитигі',
      'Frontend Developer': 'Frontend әзірлеуші',
      'Backend Developer': 'Backend әзірлеуші',
      'Full Stack Developer': 'Full Stack әзірлеуші',
      'Product Manager': 'Өнім менеджері',
      'QA Engineer': 'QA инженері',
      'UI/UX Designer': 'UI/UX дизайнері',
      'Python Developer': 'Python әзірлеуші',
    },
    skills: {
      common: ['Қарым-қатынас', 'Мәселелерді шешу', 'Командалық жұмыс', 'Уақытты басқару', 'Көшбасшылық'],
      technical: ['Программалау', 'Деректерді талдау', 'Жүйені жобалау', 'Тестілеу', 'Құжаттама'],
    },
    messages: {
      analyzing: 'Профиліңіз талданып жатыр...',
      generating: 'Ұсыныстар жасалуда...',
      error: 'Ұсыныстарды жасау сәтсіз аяқталды',
    },
  },
  
  ru: {
    professions: {
      'Project Manager': 'Менеджер проектов',
      'Business Analyst': 'Бизнес-аналитик',
      'Marketing Specialist': 'Маркетолог',
      'Data Analyst': 'Аналитик данных',
      'Frontend Developer': 'Frontend разработчик',
      'Backend Developer': 'Backend разработчик',
      'Full Stack Developer': 'Full Stack разработчик',
      'Product Manager': 'Продакт-менеджер',
      'QA Engineer': 'QA инженер',
      'UI/UX Designer': 'UI/UX дизайнер',
      'Python Developer': 'Python разработчик',
    },
    skills: {
      common: ['Коммуникация', 'Решение проблем', 'Работа в команде', 'Управление временем', 'Лидерство'],
      technical: ['Программирование', 'Анализ данных', 'Проектирование систем', 'Тестирование', 'Документация'],
    },
    messages: {
      analyzing: 'Анализируем ваш профиль...',
      generating: 'Генерируем рекомендации...',
      error: 'Не удалось сгенерировать рекомендации',
    },
  },
};

/**
 * Get translation for key
 */
const t = (language, key) => {
  const lang = TRANSLATIONS[language] || TRANSLATIONS.ru;
  const keys = key.split('.');
  let value = lang;
  
  for (const k of keys) {
    value = value?.[k];
    if (!value) return key;
  }
  
  return value;
};

/**
 * Translate profession name
 */
const translateProfession = (profession, language) => {
  const lang = TRANSLATIONS[language] || TRANSLATIONS.ru;
  return lang.professions[profession] || profession;
};

/* ============================== Fetch Helpers ================================ */

const hhHeaders = (extra = {}) => ({
  'User-Agent': USER_AGENT,
  'HH-User-Agent': USER_AGENT,
  'Accept': 'application/json',
  'Accept-Language': 'ru,en',
  ...extra,
});

function withTimeout(promiseFactory, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  return promiseFactory(controller.signal).finally(() => clearTimeout(timeoutId));
}

async function fetchJSON(url, { method = 'GET', headers = {}, body, retries = 2 } = {}) {
  const doFetch = async (signal) => {
    const response = await fetch(url, {
      method,
      headers: hhHeaders(headers),
      body,
      signal,
    });

    const text = await response.text();
    let data = text;

    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') && text) {
        data = JSON.parse(text);
      }
    } catch (error) {
      console.error('[fetchJSON] Parse error:', error.message);
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  };

  let attempt = 0;

  while (true) {
    try {
      const result = await withTimeout(
        (signal) => doFetch(signal),
        FETCH_TIMEOUT_MS
      );

      if (result.ok) return result;

      const retryAfter = Number(result.headers?.get?.('Retry-After') || 0);
      const shouldRetry = 
        (result.status === 429 || (result.status >= 500 && result.status < 600)) &&
        attempt < retries;

      if (!shouldRetry) return result;

      const delay = retryAfter > 0
        ? retryAfter * 1000
        : Math.min(3000, 400 * Math.pow(2, attempt));

      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    } catch (error) {
      if (attempt >= retries) throw error;
      
      await new Promise((resolve) => 
        setTimeout(resolve, 400 * Math.pow(2, attempt))
      );
      attempt += 1;
    }
  }
}

async function getJsonCached(url) {
  const cached = cacheGet(url);
  if (cached) return cached;

  const { ok, status, data } = await fetchJSON(url);
  
  if (!ok) {
    throw new Error(`HTTP ${status} for ${url}`);
  }

  cacheSet(url, data);
  return data;
}

async function hhSearchVacancies({ text, area, page = 0, per_page = PER_PAGE, host = HH_HOST }) {
  const url = new URL(`${HH_API}/vacancies`);
  
  if (text) url.searchParams.set('text', text);
  if (area) url.searchParams.set('area', String(area));
  url.searchParams.set('per_page', String(per_page));
  url.searchParams.set('page', String(page));
  if (host) url.searchParams.set('host', host);

  return getJsonCached(url.toString());
}

async function hhGetVacancy(id) {
  return getJsonCached(`${HH_API}/vacancies/${encodeURIComponent(id)}`);
}

/* ========================== Skill & Role Detection =========================== */

const SKILL_LEXICON = [
  'Agile', 'Scrum', 'Kanban', 'Project Management', 'Risk Management', 'Stakeholder Management',
  'Presentation', 'Communication', 'Requirements', 'UML', 'BPMN', 'Jira', 'Confluence',
  'Excel', 'Power BI', 'Tableau', 'SQL', 'Python', 'R', 'Pandas', 'NumPy', 'Statistics', 'A/B Testing',
  'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Sass', 'React', 'Vue', 'Angular', 'Redux', 'Node.js',
  'Express', 'NestJS', 'Git', 'REST', 'GraphQL', 'Testing', 'Jest', 'Cypress', 'Webpack', 'Vite',
  'Figma', 'Sketch', 'Adobe XD', 'UI/UX', 'Photoshop', 'Digital Marketing', 'SEO', 'SMM',
  'Google Analytics', 'Copywriting', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'MongoDB', 'PostgreSQL',
];

const SKILL_CANONICAL = {
  'js': 'javascript',
  'javascript': 'javascript',
  'react.js': 'react',
  'react': 'react',
  'ts': 'typescript',
  'typescript': 'typescript',
  'node.js': 'node',
  'node': 'node',
  'express': 'express',
  'html': 'html',
  'css': 'css',
  'sass': 'sass',
  'scss': 'sass',
  'redux': 'redux',
  'webpack': 'webpack',
  'vite': 'vite',
  'python': 'python',
  'pandas': 'pandas',
  'numpy': 'numpy',
  'powerbi': 'power bi',
  'power bi': 'power bi',
  'tableau': 'tableau',
  'excel': 'excel',
  'sql': 'sql',
  'jira': 'jira',
  'confluence': 'confluence',
  'graphql': 'graphql',
  'rest': 'rest',
  'ui/ux': 'ui/ux',
  'ux/ui': 'ui/ux',
  'a/b testing': 'a/b testing',
  'testing': 'testing',
  'agile': 'agile',
  'scrum': 'scrum',
  'kanban': 'kanban',
  'communication': 'communication',
  'presentation': 'presentation',
  'docker': 'docker',
  'kubernetes': 'kubernetes',
  'k8s': 'kubernetes',
  'aws': 'aws',
  'azure': 'azure',
  'mongodb': 'mongodb',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
};

const ROLE_PATTERNS = [
  { title: 'Project Manager', rx: /(project\s*manager|руководитель\s*проектов|менеджер\s*проекта|жоба\s*менеджері|pm)/i },
  { title: 'Business Analyst', rx: /(business\s*analyst|бизнес[-\s]?аналитик)/i },
  { title: 'Marketing Specialist', rx: /(marketing|маркетолог|маркетинг|smm|digital)/i },
  { title: 'Data Analyst', rx: /(data\s*analyst|аналитик\s*данных|деректер\s*аналитигі)/i },
  { title: 'Frontend Developer', rx: /(frontend|фронтенд|react|vue|angular|javascript\s*developer)/i },
  { title: 'Backend Developer', rx: /(backend|бекенд|node|python|java\s*developer)/i },
  { title: 'Full Stack Developer', rx: /(full\s*stack|fullstack|фулстек)/i },
  { title: 'Product Manager', rx: /(product\s*manager|продакт|өнім\s*менеджері)/i },
  { title: 'QA Engineer', rx: /(qa|тестировщик|тестілеуші|quality\s*assurance)/i },
  { title: 'UI/UX Designer', rx: /(ui\/ux|ux\/ui|дизайнер|designer)/i },
];

const ADVANCED_BY_ROLE = {
  'Frontend Developer': ['Accessibility', 'Performance', 'GraphQL', 'Testing', 'TypeScript'],
  'Backend Developer': ['Microservices', 'Docker', 'Kubernetes', 'Redis', 'Message Queues'],
  'Data Analyst': ['SQL Optimization', 'A/B Testing', 'Power BI DAX', 'Python Visualization', 'Statistics'],
  'Business Analyst': ['BPMN 2.0', 'Prototyping', 'System Analysis', 'Stakeholder Management'],
  'Project Manager': ['People Management', 'Budgeting', 'Roadmapping', 'Metrics', 'Agile'],
  'Marketing Specialist': ['CRO', 'Email Marketing', 'Marketing Analytics', 'SEO', 'Content Strategy'],
  'Product Manager': ['Product Strategy', 'User Research', 'Roadmapping', 'Metrics', 'A/B Testing'],
  'QA Engineer': ['Test Automation', 'CI/CD', 'Performance Testing', 'Security Testing'],
  'UI/UX Designer': ['User Research', 'Prototyping', 'Design Systems', 'Usability Testing'],
};

/**
 * Normalize skills from profile
 */
function normalizeSkills(profile) {
  const baseSkills = (Array.isArray(profile?.skills) ? profile.skills : [])
    .flatMap((s) => String(s || '').split(/[,/;|]+/))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  const text = [
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map((e) =>
      [e.title, e.position, e.description, e.responsibilities].map((x) => String(x || '')).join(' ')
    ),
    ...(Array.isArray(profile.education) ? profile.education : []).map((e) =>
      [e.degree, e.major, e.specialization, e.field].map((x) => String(x || '')).join(' ')
    ),
  ].join(' ').toLowerCase();

  const extraSkills = SKILL_LEXICON
    .map((s) => s.toLowerCase())
    .filter((skill) => text.includes(skill));

  const uniqueSkills = new Set();
  
  [...baseSkills, ...extraSkills].forEach((raw) => {
    const canonical = SKILL_CANONICAL[raw] || raw;
    if (canonical) uniqueSkills.add(canonical);
  });

  return Array.from(uniqueSkills);
}

/**
 * Guess suitable roles from profile
 */
function guessRoles(profile) {
  const haystack = [
    String(profile.targetTitle || ''),
    String(profile.desiredRole || ''),
    String(profile.position || ''),
    String(profile.summary || ''),
    ...(Array.isArray(profile.experience) ? profile.experience : []).map((e) => 
      String(e.title || e.position || '')
    ),
  ].join(' ');

  const roles = [];

  for (const rolePattern of ROLE_PATTERNS) {
    if (rolePattern.rx.test(haystack)) {
      roles.push(rolePattern.title);
    }
  }

  // Skill-based role detection
  if (!roles.length) {
    const skills = normalizeSkills(profile);

    if (skills.some((s) => ['react', 'javascript', 'typescript', 'html', 'css', 'vue', 'angular'].includes(s))) {
      roles.push('Frontend Developer');
    }

    if (skills.some((s) => ['node', 'python', 'java', 'express', 'django', 'flask'].includes(s))) {
      roles.push('Backend Developer');
    }

    if (skills.some((s) => ['sql', 'excel', 'python', 'power bi', 'tableau', 'pandas', 'statistics'].includes(s))) {
      roles.push('Data Analyst');
    }

    if (skills.some((s) => ['requirements', 'uml', 'bpmn', 'jira', 'confluence', 'agile'].includes(s))) {
      roles.push('Business Analyst');
    }

    if (skills.some((s) => ['ui/ux', 'figma', 'sketch', 'adobe xd', 'photoshop'].includes(s))) {
      roles.push('UI/UX Designer');
    }
  }

  // Default roles if nothing detected
  if (!roles.length) {
    roles.push('Business Analyst', 'Project Manager');
  }

  return Array.from(new Set(roles)).slice(0, 3);
}

/**
 * Calculate years of experience
 */
function calculateYearsOfExperience(profile) {
  const experiences = Array.isArray(profile.experience) ? profile.experience : [];
  let totalMs = 0;

  for (const exp of experiences) {
    const start = exp.start || exp.from || exp.dateStart || exp.date_from;
    const end = exp.end || exp.to || exp.dateEnd || exp.date_to || new Date().toISOString().slice(0, 10);

    if (!start) continue;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime) {
      totalMs += (endTime - startTime);
    }
  }

  const years = totalMs / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.round(years * 10) / 10);
}

const experienceBucket = (years) => {
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
};

const experienceMatchScore = (userBucket, vacancyBucket) => {
  if (!vacancyBucket) return 0.5;
  if (userBucket === vacancyBucket) return 1;

  const order = ['noExperience', 'between1And3', 'between3And6', 'moreThan6'];
  const distance = Math.abs(order.indexOf(userBucket) - order.indexOf(vacancyBucket));

  if (distance === 1) return 0.7;
  if (distance === 2) return 0.4;
  return 0.1;
};

/**
 * Extract skills from vacancy
 */
function extractSkillsFromVacancy(vacancy) {
  const pool = [];

  const keySkills = Array.isArray(vacancy.key_skills) 
    ? vacancy.key_skills.map((k) => k.name) 
    : [];
  pool.push(...keySkills);

  const text = [
    vacancy.name,
    vacancy.snippet?.requirement,
    vacancy.snippet?.responsibility,
    vacancy.description,
  ]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');

  for (const skill of SKILL_LEXICON) {
    if (text.includes(skill.toLowerCase())) {
      pool.push(skill);
    }
  }

  const uniqueSkills = new Set();
  
  pool
    .map((s) => String(s || '').toLowerCase())
    .forEach((raw) => {
      const canonical = SKILL_CANONICAL[raw] || raw;
      if (canonical) uniqueSkills.add(canonical);
    });

  return Array.from(uniqueSkills);
}

/**
 * Generate HH search URL
 */
const generateHHSearchUrl = (role, areaId, host = HH_HOST) => {
  const url = new URL(`https://${host}/search/vacancy`);
  url.searchParams.set('text', role);
  if (areaId) url.searchParams.set('area', String(areaId));
  return url.toString();
};

/**
 * Generate course links
 */
const generateCourseLinks = (skill, language = 'ru') => {
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const query = encodeURIComponent(skill);

  const courses = {
    en: [
      {
        provider: 'Coursera',
        title: `${capitalize(skill)} - Specializations`,
        duration: '1-3 months',
        url: `https://www.coursera.org/search?query=${query}`,
      },
      {
        provider: 'Udemy',
        title: `${capitalize(skill)} - Practical Courses`,
        duration: '1-2 months',
        url: `https://www.udemy.com/courses/search/?q=${query}`,
      },
      {
        provider: 'edX',
        title: `${capitalize(skill)} - Professional Certificate`,
        duration: '2-4 months',
        url: `https://www.edx.org/search?q=${query}`,
      },
    ],
    kk: [
      {
        provider: 'Coursera',
        title: `${capitalize(skill)} - Мамандандырулар`,
        duration: '1-3 ай',
        url: `https://www.coursera.org/search?query=${query}`,
      },
      {
        provider: 'Udemy',
        title: `${capitalize(skill)} - Практикалық курстар`,
        duration: '1-2 ай',
        url: `https://www.udemy.com/courses/search/?q=${query}`,
      },
      {
        provider: 'Stepik',
        title: `${capitalize(skill)} - Онлайн курстар`,
        duration: '2-8 апта',
        url: `https://stepik.org/search?query=${query}`,
      },
    ],
    ru: [
      {
        provider: 'Coursera',
        title: `${capitalize(skill)} — специализации`,
        duration: '1-3 мес',
        url: `https://www.coursera.org/search?query=${query}`,
      },
      {
        provider: 'Udemy',
        title: `${capitalize(skill)} — практические курсы`,
        duration: '1-2 мес',
        url: `https://www.udemy.com/courses/search/?q=${query}`,
      },
      {
        provider: 'Stepik',
        title: `${capitalize(skill)} — русские курсы`,
        duration: '2-8 нед',
        url: `https://stepik.org/search?query=${query}`,
      },
    ],
  };

  return courses[language] || courses.ru;
};

/* ====================== Core Recommendations Engine ========================== */

/**
 * Build smart recommendations based on market analysis
 */
async function buildSmartRecommendations(profile = {}, { areaId = null, language = 'ru' } = {}) {
  const mySkills = normalizeSkills(profile);
  const userYears = calculateYearsOfExperience(profile);
  const userBucket = experienceBucket(userYears);
  const roles = guessRoles(profile);

  const roleStats = [];
  const allVacancyIds = [];

  // Collect vacancies for each role
  for (const role of roles) {
    let ids = [];

    for (let page = 0; page < SAMPLE_PAGES; page++) {
      try {
        const searchResult = await hhSearchVacancies({
          text: role,
          area: areaId,
          page,
          per_page: PER_PAGE,
          host: HH_HOST,
        });

        const pageIds = (searchResult.items || []).map((v) => v.id);
        ids.push(...pageIds);

        if (typeof searchResult.pages === 'number' && page >= searchResult.pages - 1) {
          break;
        }
      } catch (error) {
        console.warn(`[HH search failed for ${role}]`, error?.message || error);
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

  const skillFrequency = new Map();
  const experienceScores = [];
  const rolesAggregated = [];

  // Analyze vacancy details
  for (const roleStat of roleStats) {
    const vacancyIds = roleStat.ids.slice();
    const details = [];

    // Parallel fetch with concurrency limit
    const workers = Array.from(
      { length: Math.min(DETAIL_CONCURRENCY, vacancyIds.length) },
      async () => {
        while (vacancyIds.length) {
          const id = vacancyIds.shift();
          
          try {
            const vacancy = await hhGetVacancy(id);
            details.push(vacancy);
          } catch (error) {
            console.warn(`[Vacancy ${id} fetch failed]`, error?.message);
          }
        }
      }
    );

    await Promise.all(workers);

    const localSkills = new Map();

    for (const vacancy of details) {
      const skills = extractSkillsFromVacancy(vacancy);
      
      for (const skill of skills) {
        skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
        localSkills.set(skill, (localSkills.get(skill) || 0) + 1);
      }

      const vacancyExp = vacancy.experience?.id || null;
      experienceScores.push(experienceMatchScore(userBucket, vacancyExp));
    }

    const topLocalSkills = [...localSkills.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, freq]) => ({ name, freq }));

    rolesAggregated.push({
      title: translateProfession(roleStat.role, language),
      titleOriginal: roleStat.role,
      vacancies: roleStat.count,
      hhQuery: roleStat.role,
      topSkills: topLocalSkills,
      url: generateHHSearchUrl(roleStat.role, areaId, HH_HOST),
    });
  }

  // Calculate skill gaps
  const topDemandSkills = [...skillFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, freq]) => ({ name, freq }));

  const mySkillsSet = new Set(mySkills);
  let skillGaps = topDemandSkills
    .filter((s) => !mySkillsSet.has(s.name))
    .slice(0, 8);

  // Add advanced skills if no gaps found
  if (!skillGaps.length && rolesAggregated.length) {
    const primaryRole = rolesAggregated[0].titleOriginal;
    const advancedSkills = (ADVANCED_BY_ROLE[primaryRole] || ['Communication', 'Presentation'])
      .map((s) => s.toLowerCase());
    
    skillGaps = advancedSkills
      .map((name) => ({ name, freq: 1, advanced: true }))
      .slice(0, 6);
  }

  // Generate course recommendations
  let courses = skillGaps
    .slice(0, 3)
    .flatMap((gap) => generateCourseLinks(gap.name, language));

  // Use external course service if available
  if (typeof getCoursesExt === 'function') {
    try {
      const keywords = skillGaps.slice(0, 6).map((g) => g.name).join(', ');
      courses = await getCoursesExt({ profile, gaps: skillGaps, keywords, language });
    } catch (error) {
      console.warn('[External courses failed]', error?.message || error);
    }
  }

  // Calculate market fit score
  const demandSet = new Set(topDemandSkills.map((s) => s.name));
  const overlap = mySkills.filter((s) => demandSet.has(s)).length;
  
  const fitSkills = topDemandSkills.length ? (overlap / topDemandSkills.length) : 0;
  const fitExp = experienceScores.length
    ? experienceScores.reduce((a, b) => a + b, 0) / experienceScores.length
    : 0.5;
  
  const roleHit = rolesAggregated.some((r) => r.vacancies > 50)
    ? 1
    : rolesAggregated.some((r) => r.vacancies > 20)
    ? 0.7
    : rolesAggregated.some((r) => r.vacancies > 5)
    ? 0.4
    : 0.2;

  const scoreRaw = (fitSkills * 0.60 + fitExp * 0.25 + roleHit * 0.15) * 100;
  const marketFitScore = Math.max(10, Math.min(95, Math.round(scoreRaw)));

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: rolesAggregated,
    professions: rolesAggregated,
    growSkills: skillGaps.map((g) => ({
      name: g.name,
      demand: g.freq,
      gap: true,
      advanced: g.advanced || false,
    })),
    skillsToGrow: skillGaps.map((g) => 
      g.name.charAt(0).toUpperCase() + g.name.slice(1)
    ),
    courses,
    debug: {
      skillsDetected: mySkills,
      rolesGuessed: roles,
      areaUsed: areaId,
      sampleVacancies: Array.from(new Set(allVacancyIds)).length,
      userYears,
      userBucket,
      host: HH_HOST,
      language,
    },
  };
}

/* ============================== Fallbacks ==================================== */

/**
 * Fallback recommendations when API fails
 */
async function getFallbackRecommendations(profile = {}, { language = 'ru' } = {}) {
  const skills = normalizeSkills(profile);
  const professions = [];

  // Detect professions based on skills
  if (skills.some((s) => /react|javascript|typescript|html|css|vue|angular/.test(s))) {
    professions.push({
      title: translateProfession('Frontend Developer', language),
      titleOriginal: 'Frontend Developer',
      vacancies: 0,
      hhQuery: 'Frontend Developer',
      topSkills: [],
      url: generateHHSearchUrl('Frontend Developer', null),
    });
  }

  if (skills.some((s) => /python|django|flask|fastapi|node/.test(s))) {
    professions.push({
      title: translateProfession('Backend Developer', language),
      titleOriginal: 'Backend Developer',
      vacancies: 0,
      hhQuery: 'Backend Developer',
      topSkills: [],
      url: generateHHSearchUrl('Backend Developer', null),
    });
  }

  if (skills.some((s) => /sql|postgres|mysql|excel|data|pandas|tableau|power bi/.test(s))) {
    professions.push({
      title: translateProfession('Data Analyst', language),
      titleOriginal: 'Data Analyst',
      vacancies: 0,
      hhQuery: 'Data Analyst',
      topSkills: [],
      url: generateHHSearchUrl('Data Analyst', null),
    });
  }

  // Default professions
  if (!professions.length) {
    professions.push({
      title: translateProfession('Business Analyst', language),
      titleOriginal: 'Business Analyst',
      vacancies: 0,
      hhQuery: 'Business Analyst',
      topSkills: [],
      url: generateHHSearchUrl('Business Analyst', null),
    });
    
    professions.push({
      title: translateProfession('Project Manager', language),
      titleOriginal: 'Project Manager',
      vacancies: 0,
      hhQuery: 'Project Manager',
      topSkills: [],
      url: generateHHSearchUrl('Project Manager', null),
    });
  }

  let courses = generateCourseLinks('JavaScript', language);

  // Try external course service
  if (typeof getCoursesExt === 'function') {
    try {
      courses = await getCoursesExt({ profile, language });
    } catch (error) {
      console.warn('[Fallback courses failed]', error?.message);
    }
  }

  const basicSkillGaps = skills.length
    ? t(language, 'skills.common')
    : t(language, 'skills.technical');

  return {
    marketFitScore: 65,
    marketScore: 65,
    roles: professions,
    professions,
    growSkills: basicSkillGaps.map((name) => ({
      name: name.toLowerCase(),
      demand: 1,
      gap: true,
    })),
    skillsToGrow: basicSkillGaps,
    courses,
    debug: { fallback: true, language },
  };
}

/**
 * Fallback profile improvement
 */
function fallbackImproveProfile(profile = {}, { language = 'ru' } = {}) {
  const unique = (arr) =>
    Array.from(new Set((arr || []).map(String).map((s) => s.trim()).filter(Boolean)));
  
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  
  const normalizedSkills = unique(profile.skills || []).map(capitalize);
  
  const bullets = [];
  const summary = String(profile.summary || '').trim();
  
  if (summary) {
    summary
      .split(/[\n.]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((line) => bullets.push(`• ${line}`));
  }

  const updated = {
    ...profile,
    skills: normalizedSkills,
    bullets,
    summary: summary || undefined,
  };

  return {
    ok: true,
    updated,
    changes: {
      skillsCount: normalizedSkills.length,
      bulletsCount: bullets.length,
      language,
    },
  };
}

/* ================================ API Routes ================================= */

/**
 * POST /api/recommendations/generate
 * Generate career recommendations
 */
router.post('/generate', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId = req.body?.areaId ?? null;
    const language = req.body?.language || 'ru';

    console.log(`[Recommendations] Generating for language: ${language}`);

    // Try external recommender first
    if (typeof buildRecommendationsExt === 'function') {
      try {
        const data = await buildRecommendationsExt(profile, { areaId, language });
        return res.json({ ok: true, data, source: 'external' });
      } catch (error) {
        console.warn('[External recommender failed]', error?.message);
      }
    }

    // Try smart recommendations
    let data;
    try {
      data = await buildSmartRecommendations(profile, { areaId, language });
      return res.json({ ok: true, data, source: 'smart' });
    } catch (error) {
      console.error('[Smart recommendations failed]', error);
      data = await getFallbackRecommendations(profile, { language });
      return res.json({ ok: true, data, source: 'fallback' });
    }
  } catch (error) {
    console.error('[Recommendations generate]', error);
    
    const language = req.body?.language || 'ru';
    const data = await getFallbackRecommendations(req.body?.profile || {}, { language });
    
    return res.json({
      ok: true,
      data,
      source: 'fallback',
      error: error.message,
    });
  }
});

/**
 * POST /api/recommendations/analyze
 * Analyze profile and return market data
 */
router.post('/analyze', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const areaId = req.body?.areaId ?? null;
    const language = req.body?.language || 'ru';

    const data = await buildSmartRecommendations(profile, { areaId, language });
    
    const { marketFitScore, roles, growSkills, courses, debug } = data;

    return res.json({
      marketFitScore,
      roles,
      growSkills,
      courses,
      debug,
    });
  } catch (error) {
    console.error('[Recommendations analyze]', error);
    
    const language = req.body?.language || 'ru';
    const data = await getFallbackRecommendations(req.body?.profile || {}, { language });
    
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

/**
 * POST /api/recommendations/improve
 * Improve profile content
 */
router.post('/improve', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const language = req.body?.language || 'ru';

    // Try external improver
    if (typeof improveProfileExt === 'function') {
      try {
        const { updated, changes } = await improveProfileExt(profile, { language });
        return res.json({ ok: true, updated, changes, source: 'external' });
      } catch (error) {
        console.warn('[External improver failed]', error?.message);
      }
    }

    // Try AI service
    if (aiService && typeof aiService.summarizeProfile === 'function') {
      try {
        const summary = await aiService.summarizeProfile(profile, { language });
        const skills = await aiService.suggestSkills(profile, { language });
        
        const updated = {
          ...profile,
          summary,
          skills: [...(profile.skills || []), ...skills].slice(0, 20),
        };

        return res.json({
          ok: true,
          updated,
          changes: { summary: true, skills: skills.length },
          source: 'ai',
        });
      } catch (error) {
        console.warn('[AI improve failed]', error?.message);
      }
    }

    // Fallback
    const result = fallbackImproveProfile(profile, { language });
    return res.json({ ...result, source: 'fallback' });
    
  } catch (error) {
    console.error('[Recommendations improve]', error);
    
    const language = req.body?.language || 'ru';
    const result = fallbackImproveProfile(req.body?.profile || {}, { language });
    
    return res.json({ ...result, source: 'fallback', error: error.message });
  }
});

/**
 * POST /api/recommendations/skills
 * Get skill suggestions
 */
router.post('/skills', async (req, res) => {
  try {
    const profile = req.body?.profile || {};
    const language = req.body?.language || 'ru';

    // Try AI service
    if (aiService && typeof aiService.suggestSkills === 'function') {
      const skills = await aiService.suggestSkills(profile, { language });
      return res.json({ ok: true, skills, source: 'ai' });
    }

    // Fallback to role-based suggestions
    const roles = guessRoles(profile);
    const primaryRole = roles[0] || 'Business Analyst';
    const suggestions = ADVANCED_BY_ROLE[primaryRole] || t(language, 'skills.common');

    return res.json({ ok: true, skills: suggestions, source: 'fallback' });
    
  } catch (error) {
    console.error('[Recommendations skills]', error);
    
    const language = req.body?.language || 'ru';
    const fallbackSkills = t(language, 'skills.common');
    
    return res.json({
      ok: true,
      skills: fallbackSkills,
      source: 'fallback',
      error: error.message,
    });
  }
});

/**
 * GET /api/recommendations/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    services: {
      ai: !!aiService,
      externalRecommender: !!buildRecommendationsExt,
      externalImprover: !!improveProfileExt,
      courseAggregator: !!getCoursesExt,
    },
    cache: {
      size: cache.size,
    },
    config: {
      samplePages: SAMPLE_PAGES,
      perPage: PER_PAGE,
      concurrency: DETAIL_CONCURRENCY,
      cacheTTL: CACHE_TTL_MS,
    },
  });
});

module.exports = router;