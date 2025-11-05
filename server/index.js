/* eslint-disable no-console */
'use strict';

/**
 * AI Resume Builder - Backend Server
 * 
 * Функциональность:
 * - Прокси для HeadHunter API (поиск вакансий, справочники)
 * - AI-перевод текстов (Gemini 2.0 Flash) - 7 языков
 * - AI-анализ резюме (DeepSeek R1)
 * - AI-рекомендации для резюме
 * - Кэширование и оптимизация запросов
 * - Rate limiting и безопасность
 * 
 * @requires Node 18+
 */

const path = require('path');
const fs = require('fs');

/* ============================= ENV Configuration ============================= */
(() => {
  const isRender = !!process.env.RENDER;
  if (!isRender) {
    const rootEnv = path.resolve(__dirname, '..', '.env');
    const localEnv = path.resolve(__dirname, '.env');
    
    if (fs.existsSync(rootEnv)) {
      require('dotenv').config({ path: rootEnv, override: false });
    }
    if (fs.existsSync(localEnv)) {
      require('dotenv').config({ path: localEnv, override: true });
    }
  }
})();

/* ================================== Imports ================================== */
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const crypto = require('crypto');

/* =========================== Environment Variables =========================== */
const {
  PORT = '8000',
  NODE_ENV = (process.env.RENDER ? 'production' : 'development'),
  FRONT_ORIGINS,

  // HeadHunter
  HH_USER_AGENT = 'AI Resume Builder/2.0 (contact@airesume.app)',
  HH_HOST = 'hh.kz',
  HH_CLIENT_ID,
  HH_CLIENT_SECRET,
  HH_TIMEOUT_MS = '15000',

  // Cache settings
  SEARCH_TTL_MS = '90000',
  SEARCH_STALE_MAX_MS = '900000',
  AREAS_CACHE_TTL_MS = '86400000', // 24 hours

  // Cookies
  COOKIE_DOMAIN,
  COOKIE_SECURE,

  // OpenRouter для AI
  OPENROUTER_API_KEY,
  OPENROUTER_REFERER,
  OPENROUTER_TITLE,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS = '60000',
  RATE_LIMIT_MAX = '100',
} = process.env;

const isProd = NODE_ENV === 'production';
const TIMEOUT_MS = Math.max(1000, Number(HH_TIMEOUT_MS) || 15000);
const HH_API = 'https://api.hh.ru';

/* ============================= Express App Setup ============================= */
const app = express();

// Express settings
app.set('trust proxy', 1);
app.set('etag', false);
app.disable('x-powered-by');

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(compression());

// Helmet security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    hsts: isProd ? undefined : false,
  })
);

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Morgan logging
morgan.token('id', (req) => req.id);
const morganFormat = isProd
  ? ':id :remote-addr - :method :url :status :res[content-length] - :response-time ms'
  : ':id :method :url :status :res[content-length] - :response-time ms';

app.use(morgan(morganFormat));

/* ================================== CORS Setup ================================ */

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:4180',
  'http://localhost:8000',
];

const ORIGINS = String(FRONT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = ORIGINS.length ? ORIGINS : defaultOrigins;

const corsMw = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Allow Render.com domains
    if (origin.includes('onrender.com')) {
      return callback(null, true);
    }

    // Allow localhost with any port
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Log rejected origins in development
    if (!isProd) {
      console.warn('[CORS] Rejected origin:', origin);
      console.warn('[CORS] Allowed origins:', ALLOWED_ORIGINS);
    }
    
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24 hours
});

app.use(corsMw);
app.options('*', corsMw);

/* ============================== Utility Functions ============================= */

/**
 * Convert value to boolean
 */
function bool(v) {
  if (typeof v === 'boolean') return v;
  if (v === undefined || v === null) return false;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

/**
 * Convert to integer with fallback
 */
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(resource, options = {}, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch JSON with proper error handling
 */
async function fetchJSON(url, opts = {}) {
  const response = await fetchWithTimeout(url, {
    ...opts,
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'ru,en',
      'HH-User-Agent': HH_USER_AGENT,
      'User-Agent': HH_USER_AGENT,
      ...(opts.headers || {}),
    },
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJSON = contentType.includes('application/json');

  let data = text;
  if (isJSON && text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('[fetchJSON] JSON parse error:', err.message);
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    headers: response.headers,
  };
}

/**
 * Fetch with retry logic for 429/5xx errors
 */
async function fetchJSONWithRetry(url, opts = {}, { retries = 2, minDelay = 400 } = {}) {
  let attempt = 0;

  while (true) {
    const result = await fetchJSON(url, opts);
    const retryAfter = Number(result.headers?.get?.('Retry-After') || 0);

    if (result.ok) {
      return result;
    }

    const shouldRetry =
      (result.status === 429 || (result.status >= 500 && result.status < 600)) &&
      attempt < retries;

    if (!shouldRetry) {
      return result;
    }

    const delay = retryAfter > 0
      ? retryAfter * 1000
      : Math.min(minDelay * Math.pow(2, attempt), 3000);

    console.log(`[Retry] Attempt ${attempt + 1}/${retries + 1}, waiting ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempt += 1;
  }
}

/* ============================== Cache Implementation ========================== */

/**
 * Simple in-memory cache with TTL
 */
const cache = (() => {
  const store = new Map();

  return {
    async getOrSet(key, ttlMs, producer) {
      const now = Date.now();
      const cached = store.get(key);

      if (cached && cached.expires > now) {
        return cached.value;
      }

      const value = await producer();
      store.set(key, {
        value,
        expires: now + ttlMs,
        createdAt: now,
      });

      return value;
    },

    get(key) {
      const now = Date.now();
      const cached = store.get(key);
      
      if (cached && cached.expires > now) {
        return cached.value;
      }
      
      return null;
    },

    set(key, value, ttlMs) {
      const now = Date.now();
      store.set(key, {
        value,
        expires: now + ttlMs,
        createdAt: now,
      });
    },

    delete(key) {
      return store.delete(key);
    },

    clear() {
      store.clear();
    },

    size() {
      return store.size;
    },

    // Cleanup expired entries
    cleanup() {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, value] of store.entries()) {
        if (value.expires <= now) {
          store.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries`);
      }

      return cleaned;
    },
  };
})();

// Cleanup cache every 10 minutes
setInterval(() => cache.cleanup(), 10 * 60 * 1000);

/* ========================= Experience Level Mapping ========================== */

const EXPERIENCE_MAP = {
  'none': 'noExperience',
  '0-1': 'noExperience',
  '1-3': 'between1And3',
  '3-6': 'between3And6',
  '6+': 'moreThan6',
};

const ALLOWED_EXPERIENCE = new Set([
  'noExperience',
  'between1And3',
  'between3And6',
  'moreThan6',
]);

function normalizeExperience(value) {
  if (!value) return undefined;

  const mapped = EXPERIENCE_MAP[value];
  if (mapped) return mapped;

  return ALLOWED_EXPERIENCE.has(value) ? value : undefined;
}

/* ============================ City Search & Areas ============================ */

const CITY_ALIASES = {
  'нур-султан': 'астана',
  'астана': 'астана',
  'алма-ата': 'алматы',
  'алматы': 'алматы',
  'караганда': 'караганда',
  'шымкент': 'шымкент',
  'актобе': 'актобе',
  'тараз': 'тараз',
  'павлодар': 'павлодар',
  'усть-каменогорск': 'усть-каменогорск',
  'семей': 'семей',
  'костанай': 'костанай',
  'кызылорда': 'кызылорда',
  'атырау': 'атырау',
  'актау': 'актау',
  'москва': 'москва',
  'санкт-петербург': 'санкт-петербург',
};

async function findAreaIdByCity(cityName, host) {
  if (!cityName) return undefined;

  const cacheKey = `areas:${host}`;
  const cacheTime = Number(AREAS_CACHE_TTL_MS) || 86400000;

  const areas = await cache.getOrSet(cacheKey, cacheTime, async () => {
    const { ok, data, status } = await fetchJSON(
      `${HH_API}/areas?host=${encodeURIComponent(host)}`
    );
    
    if (!ok) {
      throw new Error(`Failed to fetch areas: ${status}`);
    }
    
    return data;
  });

  const normalizedCity = cityName.trim().toLowerCase();
  const searchCity = CITY_ALIASES[normalizedCity] || normalizedCity;

  // Search in areas hierarchy
  for (const country of areas) {
    // Check regions
    for (const region of country.areas || []) {
      if ((region.name || '').toLowerCase() === searchCity) {
        return region.id;
      }

      // Check cities
      for (const city of region.areas || []) {
        if ((city.name || '').toLowerCase() === searchCity) {
          return city.id;
        }
      }
    }
  }

  return undefined;
}

/* ========================== Vacancy Normalization ============================ */

const HTML_TAG_RE = /<\/?highlighttext[^>]*>/gi;
const HTML_ALL_RE = /<[^>]+>/g;

function stripHTML(text) {
  const str = String(text || '');
  return str.replace(HTML_TAG_RE, '').replace(HTML_ALL_RE, '').trim();
}

function formatSalary(salary) {
  if (!salary || typeof salary !== 'object') {
    return 'по договорённости';
  }

  const { from, to, currency = '' } = salary;

  if (from && to) {
    return `${Number(from).toLocaleString('ru-RU')} – ${Number(to).toLocaleString('ru-RU')} ${currency}`.trim();
  }

  if (from) {
    return `от ${Number(from).toLocaleString('ru-RU')} ${currency}`.trim();
  }

  if (to) {
    return `до ${Number(to).toLocaleString('ru-RU')} ${currency}`.trim();
  }

  return 'по договорённости';
}

function extractKeywords(vacancy) {
  const keywords = new Set();
  
  const sourceText = [
    vacancy?.name || '',
    vacancy?.snippet?.requirement || '',
    vacancy?.snippet?.responsibility || '',
  ].join(' ');

  const tokens = sourceText
    .replace(/[(){}\[\],.;:+/\\]/g, ' ')
    .split(/\s+/)
    .slice(0, 300)
    .map((t) => t.trim())
    .filter(Boolean);

  const TECH_DICTIONARY = [
    'react', 'vue', 'angular', 'typescript', 'javascript', 'node.js', 'node',
    'express', 'python', 'django', 'flask', 'fastapi', 'sql', 'postgres',
    'mysql', 'mongodb', 'docker', 'kubernetes', 'k8s', 'git', 'ci/cd',
    'aws', 'azure', 'gcp', 'java', 'spring', 'kotlin', 'swift', 'figma',
    'photoshop', 'graphql', 'rest', 'redux', 'tailwind', 'sass', 'css',
    'html', 'next.js', 'nuxt', 'webpack', 'vite', 'jest', 'testing',
  ];

  const dictSet = new Set(TECH_DICTIONARY);

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (dictSet.has(lower)) {
      keywords.add(lower);
    }
  });

  return Array.from(keywords);
}

function normalizeVacancy(vacancy) {
  const description = [
    stripHTML(vacancy?.snippet?.responsibility || ''),
    stripHTML(vacancy?.snippet?.requirement || ''),
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  return {
    id: vacancy.id,
    title: stripHTML(vacancy.name),
    area: vacancy.area?.name || '',
    employer: vacancy.employer?.name || '',
    published_at: vacancy.published_at,
    url: vacancy.alternate_url,
    salary: formatSalary(vacancy.salary),
    salary_raw: vacancy.salary || null,
    experience: vacancy.experience?.name || '',
    description: description || '',
    keywords: extractKeywords(vacancy),
  };
}

/* ======================= Search Cache with Coalescing ======================= */

const SEARCH_TTL = Math.max(5000, Number(SEARCH_TTL_MS) || 90000);
const SEARCH_STALE_MAX = Math.max(30000, Number(SEARCH_STALE_MAX_MS) || 900000);

const searchCache = new Map();
const inflightSearches = new Map();

function makeSearchKey(params) {
  const { host, text, areaId, exp, salary, only_with_salary, per_page, page } = params;
  
  return JSON.stringify({
    host: String(host || ''),
    text: String(text || ''),
    areaId: String(areaId || ''),
    exp: String(exp || ''),
    salary: Number(salary || 0),
    ows: Boolean(only_with_salary),
    per_page: Number(per_page || 20),
    page: Number(page || 0),
  });
}

function getCachedSearch(key, maxAge) {
  const cached = searchCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age < maxAge) {
    return cached.value;
  }

  return null;
}

function setCachedSearch(key, value) {
  searchCache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

/* ============================== Rate Limiting ================================ */

const apiLimiter = rateLimit({
  windowMs: Number(RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Rate limit exceeded' },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/healthz';
  },
});

app.use('/api/', apiLimiter);

/* ========================== HeadHunter API Routes ============================ */

/**
 * Job search endpoint
 * GET /api/hh/jobs/search
 */
app.get('/api/hh/jobs/search', async (req, res) => {
  const requestId = req.id;

  try {
    const query = req.query;
    const host = String(query.host || HH_HOST);

    let text = query.text ? String(query.text).trim() : '';
    const city = query.city ? String(query.city).trim() : '';
    const area = query.area ? String(query.area).trim() : '';
    const experience = normalizeExperience(query.experience);
    const salary = query.salary ? Number(query.salary) : undefined;
    const only_with_salary = bool(query.only_with_salary);

    const per_page = Math.min(Math.max(toInt(query.per_page, 20), 1), 100);
    const page = Math.max(toInt(query.page, 0), 0);

    // Default search text if no filters provided
    if (!text && !city && !area && !experience && !salary && !only_with_salary) {
      text = 'разработчик';
    }

    // Find area ID by city name
    let areaId = area;
    if (!areaId && city) {
      areaId = (await findAreaIdByCity(city, host)) || '';
    }

    // Create cache key
    const cacheKey = makeSearchKey({
      host,
      text,
      areaId,
      exp: experience,
      salary,
      only_with_salary,
      per_page,
      page,
    });

    // Check if request is already in flight
    if (inflightSearches.has(cacheKey)) {
      const result = await inflightSearches.get(cacheKey);
      return res.json(result);
    }

    // Create search promise
    const searchPromise = (async () => {
      // Check fresh cache
      const freshCache = getCachedSearch(cacheKey, SEARCH_TTL);
      if (freshCache) {
        return {
          ...freshCache,
          debug: { ...freshCache.debug, cached: true, stale: false },
        };
      }

      // Build HH API URL
      const params = new URLSearchParams({
        per_page: String(per_page),
        page: String(page),
        currency: 'KZT',
        host,
      });

      if (text) params.set('text', text);
      if (areaId) params.set('area', areaId);
      if (experience) params.set('experience', experience);
      if (salary && salary > 0) {
        params.set('salary', String(salary));
        params.set('only_with_salary', 'true');
      } else if (only_with_salary) {
        params.set('only_with_salary', 'true');
      }

      const url = `${HH_API}/vacancies?${params.toString()}`;

      // Fetch from HH API
      const { ok, status, data, headers } = await fetchJSONWithRetry(url);

      if (ok) {
        const items = (data.items || []).map(normalizeVacancy);
        const result = {
          found: data.found || 0,
          page: data.page || 0,
          pages: data.pages || 0,
          items,
          debug: { host, areaId, experience, cached: false, stale: false },
        };

        setCachedSearch(cacheKey, result);
        return result;
      }

      // Handle rate limiting with stale cache
      if (status === 429) {
        const retryAfter = Number(headers?.get?.('Retry-After') || 0);

        const staleCache = getCachedSearch(cacheKey, SEARCH_STALE_MAX);
        if (staleCache) {
          return {
            ...staleCache,
            debug: {
              ...staleCache.debug,
              cached: true,
              stale: true,
              retry_after: retryAfter,
            },
          };
        }
      }

      // Error response
      const details = typeof data === 'string' ? data : (data?.message || data);
      const error = new Error('HH API error');
      error.status = status;
      error.details = details;
      error.retry_after = status === 429 ? Number(headers?.get?.('Retry-After') || 0) : 0;
      throw error;
    })();

    // Store inflight promise
    inflightSearches.set(cacheKey, searchPromise);

    try {
      const result = await searchPromise;
      return res.json(result);
    } finally {
      inflightSearches.delete(cacheKey);
    }
  } catch (error) {
    console.error(`[${requestId}] Search error:`, error);

    if (error.status) {
      return res.status(error.status).json({
        error: 'hh_error',
        status: error.status,
        retry_after: error.retry_after || 0,
        details: error.details,
      });
    }

    return res.status(500).json({
      error: 'search_failed',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * Get areas (countries/regions/cities)
 * GET /api/hh/areas
 */
app.get('/api/hh/areas', async (req, res) => {
  try {
    const host = String(req.query.host || HH_HOST);
    const cacheKey = `areas:${host}`;
    const cacheTime = Number(AREAS_CACHE_TTL_MS) || 86400000;

    const data = await cache.getOrSet(cacheKey, cacheTime, async () => {
      const { ok, data, status } = await fetchJSON(
        `${HH_API}/areas?host=${encodeURIComponent(host)}`
      );

      if (!ok) {
        throw new Error(`Failed to fetch areas: ${status}`);
      }

      return data;
    });

    res.json(data);
  } catch (error) {
    console.error('[Areas] Error:', error);
    res.status(500).json({
      error: 'areas_failed',
      message: error.message || 'Failed to fetch areas',
    });
  }
});

/**
 * Passthrough endpoints for HH API
 */
async function proxyToHH(path, req, res) {
  try {
    const params = new URLSearchParams(req.query);
    const url = `${HH_API}${path}?${params.toString()}`;

    const response = await fetchWithTimeout(url, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'ru,en',
        'HH-User-Agent': HH_USER_AGENT,
        'User-Agent': HH_USER_AGENT,
      },
    });

    res.status(response.status);
    
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(`[Proxy ${path}] Error:`, error);
    res.status(500).json({
      error: 'proxy_failed',
      message: error.message || 'Proxy request failed',
    });
  }
}

app.get('/api/hh/vacancies', (req, res) => proxyToHH('/vacancies', req, res));
app.get('/api/hh/industries', (req, res) => proxyToHH('/industries', req, res));
app.get('/api/hh/specializations', (req, res) => proxyToHH('/specializations', req, res));
app.get('/api/hh/dictionaries', (req, res) => proxyToHH('/dictionaries', req, res));

/* ============================ Mount AI Routes ================================ */

/**
 * Check if file exists
 */
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Mount translation routes
 */
const translatePath = path.resolve(__dirname, 'routes', 'translate.js');
if (checkFileExists(translatePath)) {
  try {
    const translateRouter = require(translatePath);
    app.use('/api/translate', translateRouter);
    console.log('✓ Mounted /api/translate');
  } catch (error) {
    console.error('✗ Failed to mount /api/translate:', error.message);
  }
} else {
  console.log('∙ /api/translate not available (file not found)');
}

/**
 * Mount recommendations routes
 */
const recommendationsPath = path.resolve(__dirname, 'routes', 'recommendations.js');
if (checkFileExists(recommendationsPath)) {
  try {
    const recommendationsRouter = require(recommendationsPath);
    app.use('/api/recommendations', recommendationsRouter);
    console.log('✓ Mounted /api/recommendations');
  } catch (error) {
    console.error('✗ Failed to mount /api/recommendations:', error.message);
  }
} else {
  console.log('∙ /api/recommendations not available (file not found)');
}

/**
 * Mount HH auth routes
 */
const hhAuthPath = path.resolve(__dirname, 'routes', 'hh.js');
if (checkFileExists(hhAuthPath)) {
  try {
    const hhRouter = require(hhAuthPath);
    app.use('/api/auth/hh', hhRouter);
    console.log('✓ Mounted /api/auth/hh');
  } catch (error) {
    console.error('✗ Failed to mount /api/auth/hh:', error.message);
  }
} else {
  console.log('∙ /api/auth/hh not available (file not found)');
}

/* ============================= Health & Status =============================== */

/**
 * Health check endpoint
 * GET /health or /healthz
 */
app.get(['/health', '/healthz'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: NODE_ENV,
    node: process.version,
    cache: {
      size: cache.size(),
      searches: searchCache.size,
      inflight: inflightSearches.size,
    },
    services: {
      translation: checkFileExists(translatePath),
      recommendations: checkFileExists(recommendationsPath),
      hhAuth: checkFileExists(hhAuthPath),
      hh: true,
    },
  });
});

/**
 * Version endpoint
 * GET /api/version
 */
app.get('/api/version', (_req, res) => {
  try {
    const pkgPath = path.resolve(__dirname, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    res.json({
      name: pkg.name || 'ai-resume-backend',
      version: pkg.version || '1.0.0',
      environment: NODE_ENV,
      node: process.version,
      timestamp: new Date().toISOString(),
      features: {
        translation: checkFileExists(translatePath),
        recommendations: checkFileExists(recommendationsPath),
        hhOAuth: checkFileExists(hhAuthPath),
      },
    });
  } catch (error) {
    res.json({
      name: 'ai-resume-backend',
      version: 'unknown',
      environment: NODE_ENV,
      node: process.version,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Root endpoint with API documentation
 * GET /
 */
app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('text/plain').send(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   AI Resume Builder - Backend API                         ║
║   Version: 2.0.0                                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Status: ✅ Running
Environment: ${NODE_ENV}
Node: ${process.version}

═══════════════════════════════════════════════════════════════
  Available Endpoints
═══════════════════════════════════════════════════════════════

Health & Status:
  GET  /health                   - Health check
  GET  /healthz                  - Health check (alias)
  GET  /api/version              - Version info

HeadHunter API:
  GET  /api/hh/jobs/search       - Search job vacancies
  GET  /api/hh/areas             - Get areas/cities hierarchy
  GET  /api/hh/vacancies         - Raw vacancies endpoint
  GET  /api/hh/industries        - Get industries list
  GET  /api/hh/specializations   - Get specializations
  GET  /api/hh/dictionaries      - Get all dictionaries

Translation (Gemini 2.0 Flash):
  GET  /api/translate/languages  - Get supported languages
  POST /api/translate            - Translate single text
  POST /api/translate/batch      - Batch translate texts
  POST /api/translate/resume     - Translate resume data
  POST /api/translate/vacancies  - Translate vacancies
  POST /api/translate/detect     - Detect language

AI Recommendations (DeepSeek R1):
  POST /api/recommendations/analyze    - Analyze resume
  POST /api/recommendations/improve    - Improve content
  POST /api/recommendations/generate   - Generate content

═══════════════════════════════════════════════════════════════
  Example Requests
═══════════════════════════════════════════════════════════════

Search jobs in Almaty:
  GET /api/hh/jobs/search?text=react&city=Алматы&experience=1-3

Translate text:
  POST /api/translate
  Body: {
    "text": "Hello World",
    "targetLanguage": "ru"
  }

Analyze resume:
  POST /api/recommendations/analyze
  Body: {
    "resumeData": {...},
    "language": "en"
  }

═══════════════════════════════════════════════════════════════
  Configuration
═══════════════════════════════════════════════════════════════

CORS Origins: ${ALLOWED_ORIGINS.join(', ')}
HH Client: ${HH_CLIENT_ID ? '✓ Configured' : '✗ Missing'}
OpenRouter: ${OPENROUTER_API_KEY ? '✓ Configured' : '✗ Missing'}

For issues, check server logs or contact support.
  `.trim());
});

/* ============================== Error Handling =============================== */

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api/hh/jobs/search',
      'GET /api/hh/areas',
      'POST /api/translate',
      'POST /api/recommendations/analyze',
    ],
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', {
    id: req.id,
    path: req.path,
    error: err.message,
    stack: isProd ? undefined : err.stack,
  });

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: err.name || 'server_error',
    message,
    requestId: req.id,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

/* ================================ Server Start =============================== */

const PORT_NUMBER = Number(PORT) || 8000;

const server = app.listen(PORT_NUMBER, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║   🚀 AI Resume Builder - Backend Server                   ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Server:      http://0.0.0.0:${PORT_NUMBER}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`🌍 Node:        ${process.version}`);
  console.log(`🔧 Platform:    ${process.platform}`);
  console.log('');
  console.log('Configuration:');
  console.log(`  🌐 CORS Origins:    ${ALLOWED_ORIGINS.slice(0, 3).join(', ')}${ALLOWED_ORIGINS.length > 3 ? '...' : ''}`);
  console.log(`  🔑 HH Client:       ${HH_CLIENT_ID ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  🔑 OpenRouter:      ${OPENROUTER_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  🔄 Rate Limit:      ${RATE_LIMIT_MAX} req/${RATE_LIMIT_WINDOW_MS}ms`);
  console.log('');
  console.log('Features:');
  console.log('  ✓ Job search & caching');
  console.log('  ✓ Rate limiting');
  console.log('  ✓ CORS & Security');
  console.log(`  ${checkFileExists(path.resolve(__dirname, 'services', 'ai.js')) ? '✓' : '✗'} AI Service`);
  console.log(`  ${checkFileExists(translatePath) ? '✓' : '✗'} Translation (7 languages)`);
  console.log(`  ${checkFileExists(recommendationsPath) ? '✓' : '✗'} AI Recommendations`);
  console.log('');
  console.log('Ready to accept requests! 🎉');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

/**
 * Graceful shutdown
 */
const gracefulShutdown = (signal) => {
  console.log('');
  console.log(`[${signal}] Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✓ HTTP server closed');
    console.log('✓ Cleanup complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('✗ Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;