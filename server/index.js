/* eslint-disable no-console */
'use strict';

/*
 * HeadHunter BFF / Proxy (Express)
 * - CORS и redirect из ENV
 * - Поиск вакансий (host=hh.kz|hh.ru, area по городу/areaId, опыт, salary=KZT)
 * - Кеш справочников, rate-limit, helmet, morgan, compression
 * - Дополнительно: passthrough к HH
 * - /api/polish, /api/polish/batch — полировка текста через OpenRouter (опционально)
 * - /api/ai/infer-search — эвристика/LLM
 * - /api/recommendations — AI рекомендации и улучшение резюме
 * Требуется Node 18+
 */

const path = require('path');
const fs = require('fs');

// Загружаем .env из корня проекта (и локальный рядом — если есть)
(() => {
  const rootEnv = path.resolve(__dirname, '..', '.env');
  const localEnv = path.resolve(__dirname, '.env');
  require('dotenv').config({ path: rootEnv });
  require('dotenv').config({ path: localEnv, override: true });
})();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const crypto = require('crypto');

/* -------- ENV -------- */
const {
  PORT = 8000,
  NODE_ENV = 'development',

  FRONT_ORIGINS,

  HH_OAUTH_HOST = 'https://hh.kz', // больше не используется, но оставим для совместимости
  HH_USER_AGENT = 'AI Resume Builder/1.0 (dev) admin@example.com',
  HH_HOST = 'hh.kz',

  COOKIE_DOMAIN,
  COOKIE_SECURE,

  HH_TIMEOUT_MS = '15000',
  SEARCH_TTL_MS = '90000',
  SEARCH_STALE_MAX_MS = '900000',
} = process.env;

const isProd = NODE_ENV === 'production';
const TIMEOUT_MS = Math.max(1000, Number(HH_TIMEOUT_MS) || 15000);

/* -------- App init -------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    hsts: isProd ? undefined : false,
  })
);

// request-id
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

// Morgan
morgan.token('id', (req) => req.id);
app.use(morgan(isProd ? 'combined' : ':id :method :url :status :response-time ms'));

/* -------- CORS -------- */
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:4180',
];
const ORIGINS = String(FRONT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED = ORIGINS.length ? ORIGINS : defaultOrigins;

const corsMw = cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
});
app.use(corsMw);
app.options('*', corsMw);

/* -------- Cookies -------- */
const baseCookieOpts = {
  httpOnly: true,
  secure: COOKIE_SECURE ? COOKIE_SECURE === 'true' : isProd,
  sameSite: 'lax',
  path: '/',
};
const COOKIE_OPTS =
  COOKIE_DOMAIN && COOKIE_DOMAIN !== 'localhost'
    ? { ...baseCookieOpts, domain: COOKIE_DOMAIN }
    : baseCookieOpts;

/* -------- Utils -------- */

const HH_API = 'https://api.hh.ru';

function bool(v) {
  if (typeof v === 'boolean') return v;
  if (v === undefined || v === null) return false;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// fetch с таймаутом
async function fetchWithTimeout(resource, options = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error('Fetch timeout')), ms);
  try {
    return await fetch(resource, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchJSON(url, opts = {}) {
  const r = await fetchWithTimeout(url, {
    ...opts,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'ru',
      'HH-User-Agent': HH_USER_AGENT,
      'User-Agent': HH_USER_AGENT,
      ...(opts.headers || {}),
    },
  });

  const txt = await r.text();
  const isJSON = (r.headers.get('content-type') || '').includes('application/json');
  let data = txt;
  try {
    if (isJSON && txt) data = JSON.parse(txt);
  } catch {}
  return { ok: r.ok, status: r.status, data, headers: r.headers };
}

// retry для 429/5xx
async function fetchJSONWithRetry(url, opts = {}, { retries = 2, minDelay = 400 } = {}) {
  let attempt = 0;
  while (true) {
    const res = await fetchJSON(url, opts);
    const retryAfter = Number(res.headers?.get?.('Retry-After') || 0);
    if (res.ok) return res;

    const shouldRetry =
      (res.status === 429 || (res.status >= 500 && res.status < 600)) && attempt < retries;

    if (!shouldRetry) return res;

    const delay =
      retryAfter > 0 ? retryAfter * 1000 : Math.min(minDelay * Math.pow(2, attempt), 3000);
    await new Promise((r) => setTimeout(r, delay));
    attempt += 1;
  }
}

// In-memory cache
const cache = (() => {
  const m = new Map();
  return {
    async getOrSet(key, ttlMs, producer) {
      const now = Date.now();
      const v = m.get(key);
      if (v && v.expires > now) return v.value;
      const value = await producer();
      m.set(key, { value, expires: now + ttlMs });
      return value;
    },
    clear: (k) => m.delete(k),
  };
})();

// опыты
const EXP_MAP_IN = {
  none: 'noExperience',
  '0-1': 'noExperience',
  '1-3': 'between1And3',
  '3-6': 'between3And6',
  '6+': 'moreThan6',
};
function normalizeExperience(val) {
  if (!val) return undefined;
  if (EXP_MAP_IN[val]) return EXP_MAP_IN[val];
  const allowed = new Set(['noExperience', 'between1And3', 'between3And6', 'moreThan6']);
  return allowed.has(val) ? val : undefined;
}

// Алиасы городов
const cityAliases = {
  'нур-султан': 'астана',
  'астана': 'астана',
  'алма-ата': 'алматы',
  'алматы': 'алматы',
  'караганда': 'караганда',
};

// areaId по городу
async function findAreaIdByCity(cityName, host) {
  if (!cityName) return undefined;

  const key = `areas:${host}`;
  const areas = await cache.getOrSet(key, 24 * 3600 * 1000, async () => {
    const { ok, data, status } = await fetchJSON(`${HH_API}/areas?host=${encodeURIComponent(host)}`);
    if (!ok) throw new Error(`areas ${status}`);
    return data;
  });

  const q0 = cityName.trim().toLowerCase();
  const q = cityAliases[q0] || q0;

  for (const country of areas) {
    for (const region of country.areas || []) {
      if ((region.name || '').toLowerCase() === q) return region.id;
      for (const city of region.areas || []) {
        if ((city.name || '').toLowerCase() === q) return city.id;
      }
    }
  }
  return undefined;
}

// Прокси
async function passthrough(url, req, res, extraHeaders = {}) {
  try {
    const r = await fetchWithTimeout(url, {
      method: req.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ru',
        'HH-User-Agent': HH_USER_AGENT,
        'User-Agent': HH_USER_AGENT,
        ...(extraHeaders || {}),
      },
    });

    res.status(r.status);
    r.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'content-encoding') return;
      res.setHeader(k, v);
    });
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    console.error('[proxy]', e);
    res.status(500).json({ error: 'proxy_failed', message: String(e.message || e) });
  }
}

// ====== утилиты для вакансий (очистка тегов) ======
const TAG_RE = /<\/?highlighttext[^>]*>/gi;   // спец. теги HH
const HTML_RE = /<[^>]+>/g;                   // любые теги
function stripTags(s) {
  const t = String(s || '');
  return t.replace(TAG_RE, '').replace(HTML_RE, '').trim();
}

// Человекочитаемая зарплата
function salaryToText(sal) {
  if (!sal || typeof sal !== 'object') return 'по договорённости';
  const { from, to, currency } = sal;
  const cur = currency || '';
  if (from && to) return `${Number(from).toLocaleString('ru-RU')} – ${Number(to).toLocaleString('ru-RU')} ${cur}`.trim();
  if (from) return `от ${Number(from).toLocaleString('ru-RU')} ${cur}`.trim();
  if (to) return `до ${Number(to).toLocaleString('ru-RU')} ${cur}`.trim();
  return 'по договорённости';
}

// Нормализация вакансии под фронт
function normalizeVacancy(v) {
  const parts = [];
  if (v?.snippet?.responsibility) parts.push(stripTags(v.snippet.responsibility));
  if (v?.snippet?.requirement)   parts.push(stripTags(v.snippet.requirement));
  const desc = parts.join('\n').trim();

  const kw = new Set();
  const sourceText = `${v?.name || ''} ${v?.snippet?.requirement || ''} ${v?.snippet?.responsibility || ''}`;
  const tokens = sourceText
    .replace(/[(){}\[\],.;:+/\\]/g, ' ')
    .split(/\s+/)
    .slice(0, 300)
    .map((t) => t.trim())
    .filter(Boolean);

  const DICT = [
    'react', 'vue', 'angular', 'typescript', 'javascript', 'node.js', 'node', 'express',
    'python', 'django', 'flask', 'fastapi', 'sql', 'postgres', 'mysql', 'mongodb',
    'docker', 'kubernetes', 'k8s', 'git', 'ci/cd', 'aws', 'azure', 'gcp', 'java',
    'spring', 'kotlin', 'swift', 'figma', 'xd', 'photoshop', 'power', 'excel',
    'graphql', 'rest', 'redux', 'tailwind', 'sass', 'css', 'html', 'next.js', 'nuxt'
  ];
  const dictLower = new Set(DICT);
  tokens.forEach((t) => {
    const k = t.toLowerCase();
    if (dictLower.has(k)) kw.add(k);
  });

  const salaryText = salaryToText(v.salary);
  return {
    id: v.id,
    title: stripTags(v.name),
    area: v.area?.name || '',
    employer: v.employer?.name || '',
    published_at: v.published_at,
    url: v.alternate_url,
    salary: salaryText,
    salary_raw: v.salary || null,
    experience: v.experience?.name || '',
    description: desc || '',
    keywords: Array.from(kw),
  };
}

/* ===== Короткий кэш поиска вакансий + коалесинг ===== */
const SEARCH_TTL = Math.max(5_000, Number(SEARCH_TTL_MS) || 90_000);
const SEARCH_STALE_MAX = Math.max(30_000, Number(SEARCH_STALE_MAX_MS) || 900_000);

const searchCache = new Map();      // key -> { at, value }
const inflightSearches = new Map(); // key -> Promise

function makeSearchKey({ host, text, areaId, exp, salary, only_with_salary, per_page, page }) {
  return JSON.stringify({
    host: String(host || ''),
    text: String(text || ''),
    areaId: String(areaId || ''),
    exp: String(exp || ''),
    salary: Number(salary || 0),
    ows: !!only_with_salary,
    per_page: Number(per_page || 20),
    page: Number(page || 0),
  });
}
function getFreshFromCache(key) {
  const v = searchCache.get(key);
  if (!v) return null;
  if (Date.now() - v.at < SEARCH_TTL) return v.value;
  return null;
}
function getStaleFromCache(key) {
  const v = searchCache.get(key);
  if (!v) return null;
  if (Date.now() - v.at < SEARCH_STALE_MAX) return v.value;
  return null;
}
function putCache(key, value) {
  searchCache.set(key, { at: Date.now(), value });
}

/* -------- RateLimit -------- */
app.use(
  ['/api/hh', '/api/polish', '/api/ai', '/api/recommendations'],
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* -------- Бизнес-роуты ---------- */
app.get('/api/hh/jobs/search', async (req, res) => {
  try {
    const q = req.query;
    const host = (q.host && String(q.host)) || HH_HOST;

    const text   = q.text ? String(q.text).trim() : '';
    const city   = q.city ? String(q.city).trim() : '';
    const area   = q.area ? String(q.area).trim() : '';
    const exp    = normalizeExperience(q.experience ? String(q.experience) : '');
    const salary = q.salary ? Number(q.salary) : undefined;
    const only_with_salary = bool(q.only_with_salary);

    const per_page = Math.min(Math.max(toInt(q.per_page, 20), 1), 100);
    const page     = Math.max(toInt(q.page, 0), 0);

    const hasAnyFilter =
      !!(text || city || area || exp || (salary && salary > 0) || only_with_salary);

    if (!hasAnyFilter) {
      return res.json({
        found: 0,
        page: 0,
        pages: 0,
        items: [],
        debug: { reason: 'empty_query_skipped', host },
      });
    }

    let areaId = area;
    if (!areaId && city) areaId = (await findAreaIdByCity(city, host)) || '';

    const key = makeSearchKey({ host, text, areaId, exp, salary, only_with_salary, per_page, page });

    if (inflightSearches.has(key)) {
      const out = await inflightSearches.get(key).catch((e) => { throw e; });
      return res.json(out);
    }

    const job = (async () => {
      const params = new URLSearchParams({
        per_page: String(per_page),
        page: String(page),
        currency: 'KZT',
        host: host,
      });
      if (text) params.set('text', text);
      if (areaId) params.set('area', areaId);
      if (exp) params.set('experience', exp);
      if (salary && salary > 0) {
        params.set('salary', String(salary));
        params.set('only_with_salary', 'true');
      } else if (only_with_salary) {
        params.set('only_with_salary', 'true');
      }

      const url = `${HH_API}/vacancies?${params.toString()}`;

      const fresh = getFreshFromCache(key);
      if (fresh) {
        return { ...fresh, debug: { ...(fresh.debug || {}), cached: true, stale: false } };
      }

      const { ok, status, data, headers } = await fetchJSONWithRetry(url);

      if (ok) {
        const items = (data.items || []).map(normalizeVacancy);
        const out = {
          found: data.found,
          page: data.page,
          pages: data.pages,
          items,
          debug: { host, areaId, exp, cached: false, stale: false },
        };
        putCache(key, out);
        return out;
      }

      const retryAfter = status === 429 ? Number(headers?.get?.('Retry-After') || 0) : 0;
      if (status === 429) {
        const stale = getStaleFromCache(key);
        if (stale) {
          return {
            ...stale,
            debug: { ...(stale.debug || {}), host, areaId, exp, cached: true, stale: true, retry_after: retryAfter },
          };
        }
      }

      const details = typeof data === 'string' ? data : (data?.message || data);
      const err = new Error('hh_bad_request');
      err.status = status;
      err.details = details;
      err.retry_after = retryAfter;
      throw err;
    })();

    inflightSearches.set(key, job);
    try {
      const out = await job;
      return res.json(out);
    } finally {
      inflightSearches.delete(key);
    }
  } catch (e) {
    if (e && e.status) {
      return res.status(e.status).json({
        error: 'hh_bad_request',
        status: e.status,
        retry_after: e.retry_after || 0,
        details: e.details,
      });
    }
    console.error('[jobs/search]', e);
    res.status(500).json({ error: 'proxy_failed', message: String(e.message || e) });
  }
});

// Сырой прокси поиска
app.get('/api/hh/vacancies', async (req, res) => {
  const params = new URLSearchParams(req.query);
  const url = `${HH_API}/vacancies?${params.toString()}`;
  await passthrough(url, req, res);
});

// Справочники (кэш)
app.get('/api/hh/areas', async (req, res) => {
  try {
    const host = (req.query.host && String(req.query.host)) || HH_HOST;
    const key = `areas:${host}`;
    const data = await cache.getOrSet(key, 24 * 3600 * 1000, async () => {
      const { ok, data, status } = await fetchJSON(`${HH_API}/areas?host=${encodeURIComponent(host)}`);
      if (!ok) throw new Error(`areas ${status}`);
      return data;
    });
    res.json(data);
  } catch (e) {
    console.error('[areas]', e);
    res.status(500).json({ error: 'areas_failed', message: String(e.message || e) });
  }
});

app.get('/api/hh/industries', async (req, res) => {
  const params = new URLSearchParams(req.query);
  const url = `${HH_API}/industries?${params.toString()}`;
  return passthrough(url, req, res);
});
app.get('/api/hh/salary/industries', async (req, res) => {
  const params = new URLSearchParams(req.query);
  const url = `${HH_API}/salary/industries?${params.toString()}`;
  return passthrough(url, req, res);
});
app.get('/api/hh/specializations', async (req, res) => {
  const params = new URLSearchParams(req.query);
  const url = `${HH_API}/specializations?${params.toString()}`;
  return passthrough(url, req, res);
});
app.get('/api/hh/dictionaries', async (req, res) => {
  const params = new URLSearchParams(req.query);
  const url = `${HH_API}/dictionaries?${params.toString()}`;
  return passthrough(url, req, res);
});

/* -------- AI: мягкая посадка -------- */
function calcYearsByExperience(profile = {}) {
  const items = Array.isArray(profile.experience) ? profile.experience : [];
  if (!items.length) return 0;

  let ms = 0;
  items.forEach((it) => {
    const start = it?.start || it?.from || it?.dateStart || it?.date_from;
    const end   = it?.end   || it?.to   || it?.dateEnd   || it?.date_to   || new Date().toISOString().slice(0, 10);
    const s = start ? new Date(start) : null;
    const e = end   ? new Date(end)   : null;
    if (s && !isNaN(+s) && e && !isNaN(+e) && e > s) ms += (+e - +s);
    else ms += 365 * 24 * 3600 * 1000;
  });
  return ms / (365 * 24 * 3600 * 1000);
}
function yearsToHHExp(years) {
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}
function deriveRoleFromProfile(profile = {}) {
  const items = Array.isArray(profile.experience) ? profile.experience : [];
  const latest = items[0] || items[items.length - 1] || null;
  const role = latest?.position || latest?.title || latest?.role || '';

  if (role) return String(role).trim();

  const skills = (profile.skills || []).map(String).filter(Boolean);
  if (skills.length) return skills.slice(0, 3).join(' ');
  const sum = String(profile?.summary || '').trim();
  if (sum) return sum.split(/\s+/).slice(0, 3).join(' ');
  return '';
}
function normalizeCityName(cityRaw = '') {
  const s = String(cityRaw || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function naiveInferSearch(profile = {}, { lang = 'ru' } = {}) {
  const role = deriveRoleFromProfile(profile);
  const years = calcYearsByExperience(profile);
  const exp = yearsToHHExp(years);

  const city =
    (profile.location && String(profile.location).trim()) ||
    (profile.city && String(profile.city).trim()) ||
    '';

  const skills = (Array.isArray(profile.skills) ? profile.skills : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 12);

  let c = 0;
  if (role) c += 0.4;
  if (city) c += 0.2;
  if (skills.length >= 3) c += 0.2;
  c += Math.min(0.2, years / 10);
  const confidence = Math.max(0.3, Math.min(0.95, c));

  return {
    role,
    city: normalizeCityName(city),
    experience: exp,
    skills,
    confidence,
  };
}

app.post('/api/polish', async (req, res) => {
  const { text = '', lang = 'ru', mode = 'auto' } = req.body || {};
  try {
    const { polishText } = await import('./services/ai.js').catch(() => ({}));
    if (typeof polishText !== 'function') {
      return res.json({ corrected: String(text || ''), bullets: [], fallback: true });
    }
    const out = await polishText(text, { lang, mode });
    return res.json(out);
  } catch (e) {
    console.error('[polish]', e);
    return res.json({ corrected: String(text || ''), bullets: [], error: 'polish_failed', fallback: true });
  }
});

app.post('/api/polish/batch', async (req, res) => {
  const { texts = [], lang = 'ru', mode = 'auto' } = req.body || {};
  try {
    const { polishMany } = await import('./services/ai.js').catch(() => ({}));
    if (typeof polishMany !== 'function') {
      const arr = Array.isArray(texts) ? texts : [];
      return res.json({ results: arr.map((t) => ({ corrected: String(t || ''), bullets: [], fallback: true })) });
    }
    const results = await polishMany(Array.isArray(texts) ? texts : [], { lang, mode });
    return res.json({ results });
  } catch (e) {
    console.error('[polish_batch]', e);
    const arr = Array.isArray(texts) ? texts : [];
    return res.json({ results: arr.map((t) => ({ corrected: String(t || ''), bullets: [], error: 'polish_failed', fallback: true })) });
  }
});

app.post('/api/ai/infer-search', async (req, res) => {
  try {
    const { profile = {}, lang = 'ru', overrideModel } = req.body || {};
    let out = null;
    try {
      const mod = await import('./services/ai.js').catch(() => ({}));
      if (typeof mod?.inferSearch === 'function') {
        out = await mod.inferSearch(profile, { lang, overrideModel });
      }
    } catch (e) {
      console.warn('[ai/infer-search] LLM unavailable, using heuristic:', e?.message || e);
    }

    if (!out || typeof out !== 'object') {
      out = naiveInferSearch(profile, { lang, overrideModel });
      out.fallback = true;
    }

    const search = {
      host: HH_HOST || 'hh.kz',
      text: out.role || '',
      city: out.city || '',
      experience: out.experience || '',
      per_page: 20,
      page: 0,
    };

    return res.json({ ...out, search });
  } catch (e) {
    console.error('[ai/infer-search] hard error, falling back:', e);
    const out = naiveInferSearch(req.body?.profile || {}, { lang: req.body?.lang || 'ru' });
    out.fallback = true;
    const search = {
      host: HH_HOST || 'hh.kz',
      text: out.role || '',
      city: out.city || '',
      experience: out.experience || '',
      per_page: 20,
      page: 0,
    };
    return res.json({ ...out, search });
  }
});

/* -------- AI Рекомендации / Улучшение резюме -------- */
app.use('/api/recommendations', require('./routes/recommendations'));

/* -------- Health + misc -------- */
app.get('/healthz', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/version', (_req, res) => {
  try {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    res.json({ name: pkg.name, version: pkg.version, env: NODE_ENV, time: new Date().toISOString() });
  } catch {
    res.json({ name: 'server', version: 'unknown', env: NODE_ENV });
  }
});

app.get('/', (req, res) => {
  res.type('text').send(
    [
      'HH proxy is up ✅',
      'Useful endpoints:',
      ' - /healthz',
      ' - /api/version',
      ' - /api/hh/jobs/search?host=hh.kz&text=react&city=Астана&experience=1-3&per_page=5',
      ' - /api/hh/areas?host=hh.kz',
      ' - /api/polish   (POST {text, lang, mode})',
      ' - /api/polish/batch   (POST {texts[], lang?, mode?})',
      ' - /api/ai/infer-search   (POST {profile, lang?, overrideModel?})',
      ' - /api/recommendations/generate   (POST {profile})',
      ' - /api/recommendations/improve    (POST {profile})',
    ].join('\n')
  );
});

/* -------- Error handler -------- */
app.use((err, req, res, _next) => {
  console.error('[unhandled]', err);
  const status = err.status || 500;
  res.status(status).json({ error: 'unhandled', message: err.message || 'Internal error' });
});

/* -------- Start -------- */
app.listen(Number(PORT), () => {
  console.log(`HH proxy listening on http://localhost:${PORT} (env: ${NODE_ENV})`);
  console.log('Allowed CORS:', ALLOWED.join(', '));
});
