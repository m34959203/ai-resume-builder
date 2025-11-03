// server/index.js
/* eslint-disable no-console */
'use strict';

/*
 * HeadHunter BFF / Proxy (Express)
 * - CORS и redirect из ENV
 * - Поиск вакансий (host=hh.kz|hh.ru, area по городу/areaId, опыт, salary=KZT)
 * - Кеш справочников, rate-limit, helmet, morgan, compression
 * - Дополнительно: passthrough к HH
 * - /api/polish, /api/polish/batch — полировка текста (опционально)
 * - /api/ai/infer-search — эвристика/LLM (опционально)
 * - /api/recommendations — AI рекомендации (опционально)
 * - ✅ /api/translate и ✅ /api/translate/batch — перевод с кешем (Libre/Google)
 * Требуется Node 18+ (встроенный fetch)
 */

const path = require('path');
const fs = require('fs');

/* ============================ ENV LOADING (SAFE) ============================ */
(() => {
  const isRender = !!process.env.RENDER;
  if (!isRender) {
    const rootEnv = path.resolve(__dirname, '..', '.env');
    const localEnv = path.resolve(__dirname, '.env');
    require('dotenv').config({ path: rootEnv, override: false });
    require('dotenv').config({ path: localEnv, override: false });
  }
})();

/* ================================== IMPORTS ================================= */
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const crypto = require('crypto');

/* =================================== ENV ==================================== */
const {
  PORT,
  NODE_ENV = (process.env.RENDER ? 'production' : 'development'),
  FRONT_ORIGINS,

  HH_USER_AGENT = 'AI Resume Builder/1.0 (dev) admin@example.com',
  HH_HOST = 'hh.kz',

  COOKIE_DOMAIN,
  COOKIE_SECURE,

  HH_TIMEOUT_MS = '15000',
  SEARCH_TTL_MS = '90000',
  SEARCH_STALE_MAX_MS = '900000',

  HH_RESUME_ID,

  HH_CLIENT_ID,
  OPENROUTER_API_KEY,

  /* ---------- перевод ---------- */
  TRANSLATE_PROVIDER = 'libre', // 'libre' | 'google'
  LIBRE_URL = 'https://libretranslate.com/translate',
  LIBRE_API_KEY,
  GOOGLE_TRANSLATE_KEY,
  TRANSLATE_TTL_MS = String(7 * 24 * 60 * 60 * 1000),
  TRANSLATE_MAX_CHARS = '4800',
} = process.env;

const isProd = NODE_ENV === 'production';
const TIMEOUT_MS = Math.max(1000, Number(HH_TIMEOUT_MS) || 15000);
const HH_API = 'https://api.hh.ru';
const TTL_TRANSLATE = Math.max(60_000, Number(TRANSLATE_TTL_MS) || 604_800_000);
const CHUNK_LIMIT = Math.max(500, Number(TRANSLATE_MAX_CHARS) || 4800);

/* ==================================== APP =================================== */
const app = express();
app.set('trust proxy', 1);
app.set('etag', false);
app.disable('x-powered-by');

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

// morgan
morgan.token('id', (req) => req.id);
app.use(morgan(isProd ? 'combined' : ':id :method :url :status :res[content-length] - :response-time ms'));

/* ================================== CORS ==================================== */
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
    if (!origin) {
      console.log('[CORS] Request without origin - allowed');
      return cb(null, true);
    }
    if (ALLOWED.includes(origin)) {
      console.log('[CORS] Allowed origin:', origin);
      return cb(null, true);
    }
    if (origin.includes('onrender.com')) {
      console.log('[CORS] Render domain allowed:', origin);
      return cb(null, true);
    }
    console.warn('[CORS] Rejected origin:', origin, 'Allowed:', ALLOWED);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
app.use(corsMw);
app.options('*', corsMw);

/* ================================== UTILS =================================== */
function bool(v) {
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// fetch с таймаутом (Node 18+)
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

/* ========================== In-memory cache (areas, search) ================== */
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
    set(key, value, ttlMs) {
      const now = Date.now();
      m.set(key, { value, expires: now + ttlMs });
    },
    clear: (k) => m.delete(k),
    _raw: m,
  };
})();

/* =============================== Опыт (HH codes) ============================ */
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

/* ====================== Алиасы городов и поиск areaId ======================= */
const cityAliases = {
  'нур-султан': 'астана',
  'астана': 'астана',
  'алма-ата': 'алматы',
  'алматы': 'алматы',
  'караганда': 'караганда',
};

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

/* ================================ Passthrough =============================== */
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

/* ======================= Утилиты нормализации вакансий ====================== */
const TAG_RE = /<\/?highlighttext[^>]*>/gi;
const HTML_RE = /<[^>]+>/g;
function stripTags(s) {
  const t = String(s || '');
  return t.replace(TAG_RE, '').replace(HTML_RE, '').trim();
}
function salaryToText(sal) {
  if (!sal || typeof sal !== 'object') return 'по договорённости';
  const { from, to, currency } = sal;
  const cur = currency || '';
  if (from && to) return `${Number(from).toLocaleString('ru-RU')} – ${Number(to).toLocaleString('ru-RU')} ${cur}`.trim();
  if (from) return `от ${Number(from).toLocaleString('ru-RU')} ${cur}`.trim();
  if (to) return `до ${Number(to).toLocaleString('ru-RU')} ${cur}`.trim();
  return 'по договорённости';
}
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
    'react','vue','angular','typescript','javascript','node.js','node','express',
    'python','django','flask','fastapi','sql','postgres','mysql','mongodb',
    'docker','kubernetes','k8s','git','ci/cd','aws','azure','gcp','java',
    'spring','kotlin','swift','figma','xd','photoshop','power','excel',
    'graphql','rest','redux','tailwind','sass','css','html','next.js','nuxt'
  ];
  const dictLower = new Set(DICT);
  tokens.forEach((t) => { const k = t.toLowerCase(); if (dictLower.has(k)) kw.add(k); });

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

/* ============= Кэш поиска (fresh/stale) + коалесинг параллельных запросов === */
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

/* =============================== RateLimit API ============================== */
app.use(
  ['/api/hh', '/api/polish', '/api/ai', '/api/recommendations', '/api/translate'],
  rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })
);

/* ============================== HH SEARCH API =============================== */
app.get('/api/hh/jobs/search', async (req, res) => {
  console.log('[HH Search] Query params:', req.query);
  console.log('[HH Search] Headers origin:', req.headers.origin);

  try {
    const q = req.query;
    const host = (q.host && String(q.host)) || HH_HOST;

    let text = q.text ? String(q.text).trim() : '';
    const city   = q.city ? String(q.city).trim() : '';
    const area   = q.area ? String(q.area).trim() : '';
    const exp    = normalizeExperience(q.experience ? String(q.experience) : '');
    const salary = q.salary ? Number(q.salary) : undefined;
    const only_with_salary = bool(q.only_with_salary);

    const per_page = Math.min(Math.max(toInt(q.per_page, 20), 1), 100);
    const page     = Math.max(toInt(q.page, 0), 0);

    let hasAnyFilter =
      !!(text || city || area || exp || (salary && salary > 0) || only_with_salary);

    if (!hasAnyFilter) {
      text = 'разработчик';
      hasAnyFilter = true;
      console.log('[HH Search] No filters → default text:', text);
    }

    let areaId = area;
    if (!areaId && city) areaId = (await findAreaIdByCity(city, host)) || '';

    const key = makeSearchKey({ host, text, areaId, exp, salary, only_with_salary, per_page, page });

    if (inflightSearches.has(key)) {
      console.log('[HH Search] Coalesced with inflight request for key');
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
        console.log('[HH Search] Served from fresh cache');
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
        console.warn('[HH Search] 429 received, retry-after:', retryAfter);
        const stale = getStaleFromCache(key);
        if (stale) {
          console.log('[HH Search] Served stale cache due to 429');
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
      console.warn('[HH Search] Error with status:', e.status, 'details:', e.details);
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

/* ========================= HH OAuth: me/resumes/respond ===================== */
function getHHAccessToken(req) {
  const fromCookie = req.cookies?.hh_access_token;
  const bearer = req.headers?.authorization;
  if (fromCookie) return String(fromCookie);
  if (bearer && /^Bearer\s+/i.test(bearer)) return bearer.replace(/^Bearer\s+/i, '').trim();
  return null;
}

app.get('/api/hh/me', async (req, res) => {
  const token = getHHAccessToken(req);
  if (!token) return res.status(401).json({ ok: false, reason: 'no_token' });

  const r = await fetchWithTimeout(`${HH_API}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Language': 'ru',
      'HH-User-Agent': HH_USER_AGENT,
      'User-Agent': HH_USER_AGENT,
    },
  }).catch((e) => ({ _err: e }));

  if (!r || r._err) return res.status(502).json({ ok: false, error: 'bad_gateway' });

  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) return res.status(r.status).json({ ok: false, status: r.status, details: data || null });

  res.json({ ok: true, me: { id: data?.id, email: data?.email, first_name: data?.first_name, last_name: data?.last_name } });
});

app.get('/api/hh/resumes', async (req, res) => {
  const token = getHHAccessToken(req);
  if (!token) return res.status(401).json({ error: 'not_authorized' });

  const r = await fetchWithTimeout(`${HH_API}/resumes/mine`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Language': 'ru',
      'HH-User-Agent': HH_USER_AGENT,
      'User-Agent': HH_USER_AGENT,
    },
  }).catch((e) => ({ _err: e }));

  if (!r || r._err) return res.status(502).json({ error: 'bad_gateway' });

  const txt = await r.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch {}
  if (!r.ok) return res.status(r.status).json({ error: 'hh_error', details: json || txt || null });

  res.json(json || { items: [] });
});

app.post('/api/hh/respond', async (req, res) => {
  const token = getHHAccessToken(req);
  if (!token) return res.status(401).json({ error: 'not_authorized' });

  const { vacancy_id, resume_id, message = '' } = req.body || {};
  const usedResumeId = resume_id || HH_RESUME_ID;

  if (!vacancy_id) return res.status(400).json({ error: 'vacancy_id_required' });
  if (!usedResumeId) return res.status(428).json({ error: 'resume_id_required' });

  const r = await fetchWithTimeout(`${HH_API}/negotiations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
      'HH-User-Agent': HH_USER_AGENT,
      'User-Agent': HH_USER_AGENT,
    },
    body: JSON.stringify({ vacancy_id, resume_id: usedResumeId, message }),
  }).catch((e) => ({ _err: e }));

  if (!r || r._err) return res.status(502).json({ error: 'bad_gateway' });

  const txt = await r.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch {}
  if (!r.ok) return res.status(r.status).json({ error: 'hh_error', details: json || txt || null });

  res.json({ ok: true, data: json });
});

/* ===================== AI: эвристика и рекомендации (опционально) ========== */
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
    (profile.city && String(profile.city).trim()) || '';
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

  return { role, city: normalizeCityName(city), experience: exp, skills, confidence };
}

// /api/polish
app.post('/api/polish', async (req, res) => {
  const { text = '', lang = 'ru', mode = 'auto' } = req.body || {};
  try {
    const aiPath = path.resolve(__dirname, 'services', 'ai.js');
    const hasAI = fs.existsSync(aiPath);
    if (!hasAI) {
      return res.json({ corrected: String(text || ''), bullets: [], fallback: true });
    }
    const { polishText } = await import(aiPath).catch(() => ({}));
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
    const aiPath = path.resolve(__dirname, 'services', 'ai.js');
    const hasAI = fs.existsSync(aiPath);
    if (!hasAI) {
      const arr = Array.isArray(texts) ? texts : [];
      return res.json({ results: arr.map((t) => ({ corrected: String(t || ''), bullets: [], fallback: true })) });
    }
    const { polishMany } = await import(aiPath).catch(() => ({}));
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

// /api/ai/infer-search — LLM (если есть) или эвристика
app.post('/api/ai/infer-search', async (req, res) => {
  try {
    const { profile = {}, lang = 'ru', overrideModel } = req.body || {};
    let out = null;
    try {
      const aiPath = path.resolve(__dirname, 'services', 'ai.js');
      if (fs.existsSync(aiPath)) {
        const mod = await import(aiPath).catch(() => ({}));
        if (typeof mod?.inferSearch === 'function') {
          out = await mod.inferSearch(profile, { lang, overrideModel });
        }
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

/* ============================ AI Рекомендации (опц.) ======================== */
(() => {
  const recPath = path.resolve(__dirname, 'routes', 'recommendations.js');
  if (fs.existsSync(recPath)) {
    app.use('/api/recommendations', require(recPath));
    console.log('✓ /api/recommendations mounted');
  } else {
    console.log('∙ /api/recommendations skipped (routes/recommendations.js not found)');
  }
})();

/* ============================== TRANSLATE API =============================== */
/**
 * POST /api/translate         -> { translated, translatedText, provider, cached }
 * POST /api/translate/batch   -> { translations, provider }
 *
 * - Разбивает текст на чанки, укладывается в лимиты провайдера
 * - Кеширует переводы в памяти (key: sha1(source|target|text)), TTL настраиваемый
 * - Совместимо с фронтом, который ждёт поле "translated"
 */
const translateCache = new Map(); // key -> { text, at }
const normLang = (l) => String(l || '').trim().toLowerCase();
const sameLang = (a, b) => normLang(a) && normLang(a) === normLang(b);

function chunkText(str, maxLen = CHUNK_LIMIT) {
  const s = String(str || '');
  if (s.length <= maxLen) return [s];
  const out = [];
  let i = 0;
  while (i < s.length) {
    out.push(s.slice(i, i + maxLen));
    i += maxLen;
  }
  return out;
}

async function translateViaLibre(text, sourceLang, targetLang) {
  const chunks = chunkText(text);
  const results = [];
  for (const q of chunks) {
    const r = await fetchWithTimeout(LIBRE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        q,
        source: sourceLang === 'auto' ? 'auto' : sourceLang || 'auto',
        target: targetLang,
        format: 'text',
        ...(LIBRE_API_KEY ? { api_key: LIBRE_API_KEY } : {}),
      }),
    });
    const payload = await r.json().catch(() => ({}));
    const t =
      payload?.translatedText ??
      payload?.translated_text ??
      payload?.result ??
      payload?.data?.translated ??
      '';
    results.push(String(t || ''));
  }
  return results.join('');
}

async function translateViaGoogle(text, sourceLang, targetLang) {
  if (!GOOGLE_TRANSLATE_KEY) throw new Error('Missing GOOGLE_TRANSLATE_KEY');
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(GOOGLE_TRANSLATE_KEY)}`;
  const chunks = chunkText(text, 4500);
  const results = [];
  for (const q of chunks) {
    const body = {
      q,
      target: targetLang,
      format: 'text',
      ...(sourceLang && sourceLang !== 'auto' ? { source: sourceLang } : {}),
    };
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await r.json().catch(() => ({}));
    const t = payload?.data?.translations?.[0]?.translatedText ?? '';
    results.push(String(t || ''));
  }
  return results.join('');
}

async function translateOne(text, sourceLang, targetLang, prefer = TRANSLATE_PROVIDER.toLowerCase()) {
  let providerUsed = prefer;
  try {
    if (providerUsed === 'google') return { provider: 'google', out: await translateViaGoogle(text, sourceLang, targetLang) };
    return { provider: 'libre', out: await translateViaLibre(text, sourceLang, targetLang) };
  } catch (e) {
    if (providerUsed === 'google') {
      console.warn('[translate] google failed, fallback libre:', e?.message || e);
      return { provider: 'libre', out: await translateViaLibre(text, sourceLang, targetLang) };
    }
    console.warn('[translate] libre failed:', e?.message || e);
    return { provider: 'error_fallback', out: text };
  }
}

app.post('/api/translate', async (req, res) => {
  try {
    const text = String(req.body?.text ?? '');
    const sourceLang = normLang(req.body?.sourceLang ?? 'auto');
    const targetLang = normLang(req.body?.targetLang ?? '');

    if (!targetLang) return res.status(400).json({ error: 'targetLang_required' });
    if (!text) return res.json({ translated: '', translatedText: '', provider: TRANSLATE_PROVIDER, cached: false });
    if (sameLang(sourceLang === 'auto' ? '' : sourceLang, targetLang)) {
      return res.json({ translated: text, translatedText: text, provider: 'noop', cached: false });
    }

    const key = crypto.createHash('sha1').update(`${sourceLang}|${targetLang}|${text}`).digest('hex');
    const cached = translateCache.get(key);
    if (cached && Date.now() - cached.at < TTL_TRANSLATE) {
      return res.json({ translated: cached.text, translatedText: cached.text, provider: 'cache', cached: true });
    }

    const { provider, out } = await translateOne(text, sourceLang, targetLang);
    translateCache.set(key, { text: out, at: Date.now() });
    return res.json({ translated: out, translatedText: out, provider, cached: false });
  } catch (e) {
    console.error('[translate] error:', e);
    const original = String(req.body?.text ?? '');
    return res.json({ translated: original, translatedText: original, provider: 'error_fallback', cached: false });
  }
});

/** batch-перевод: { texts: string[], sourceLang?, targetLang } -> { translations: string[], provider } */
app.post('/api/translate/batch', async (req, res) => {
  try {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.map((t) => String(t ?? '')) : [];
    const sourceLang = normLang(req.body?.sourceLang ?? 'auto');
    const targetLang = normLang(req.body?.targetLang ?? '');
    if (!targetLang) return res.status(400).json({ error: 'targetLang_required' });
    if (!texts.length) return res.json({ translations: [], provider: TRANSLATE_PROVIDER });

    // быстрый путь, если язык совпадает
    if (sameLang(sourceLang === 'auto' ? '' : sourceLang, targetLang)) {
      return res.json({ translations: texts, provider: 'noop' });
    }

    const out = new Array(texts.length);
    const tasks = [];
    const prefer = TRANSLATE_PROVIDER.toLowerCase();

    // кеш
    const keys = texts.map((t) => crypto.createHash('sha1').update(`${sourceLang}|${targetLang}|${t}`).digest('hex'));

    // предварительно заполним из кеша
    keys.forEach((k, i) => {
      const c = translateCache.get(k);
      if (c && Date.now() - c.at < TTL_TRANSLATE) out[i] = c.text;
    });

    // простая ограниченная конкуренция
    const CONCURRENCY = 4;
    let idx = 0;
    let providerUsed = prefer;

    async function worker() {
      while (idx < texts.length) {
        const i = idx++;
        if (out[i] != null) continue; // из кеша уже есть
        const { provider, out: translated } = await translateOne(texts[i], sourceLang, targetLang, prefer);
        providerUsed = providerUsed === prefer ? provider : providerUsed; // первый реально использованный
        out[i] = translated;
        translateCache.set(keys[i], { text: translated, at: Date.now() });
      }
    }

    for (let k = 0; k < CONCURRENCY; k++) tasks.push(worker());
    await Promise.all(tasks);

    return res.json({ translations: out, provider: providerUsed });
  } catch (e) {
    console.error('[translate/batch] error:', e);
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.map((t) => String(t ?? '')) : [];
    return res.json({ translations: texts, provider: 'error_fallback' });
  }
});

/* ============================== Health + misc =============================== */
app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(200).json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/version', (_req, res) => {
  try {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    res.json({ name: pkg.name, version: pkg.version, env: NODE_ENV, time: new Date().toISOString() });
  } catch {
    res.json({ name: 'server', version: 'unknown', env: NODE_ENV });
  }
});
// алиас, чтобы фронт мог обращаться к /version
app.get('/version', (_req, res) => {
  try {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    res.json({ name: pkg.name, version: pkg.version, env: NODE_ENV, time: new Date().toISOString() });
  } catch {
    res.json({ name: 'server', version: 'unknown', env: NODE_ENV });
  }
});

/* ==================== COMPAT: "/" с query → /api/hh/jobs/search ============= */
app.get('/', async (req, res, next) => {
  const q = req.query || {};
  const looksLikeSearch =
    q.text != null || q.city != null || q.area != null ||
    q.experience != null || q.salary != null || q.only_with_salary != null ||
    q.host != null || q.page != null || q.per_page != null;

  if (!looksLikeSearch) return next();

  const params = new URLSearchParams();
  if (q.text) params.set('text', String(q.text));
  if (q.city) params.set('city', String(q.city));
  if (q.area) params.set('area', String(q.area));
  if (q.experience) params.set('experience', String(q.experience));
  if (q.salary) params.set('salary', String(q.salary));
  if (q.only_with_salary) params.set('only_with_salary', 'true');
  if (q.page != null) params.set('page', String(q.page));
  if (q.per_page != null) params.set('per_page', String(q.per_page));
  params.set('host', String(q.host || HH_HOST || 'hh.kz'));

  const target = `/api/hh/jobs/search?${params.toString()}`;
  console.log('[COMPAT] Redirecting "/" search →', target);
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(307, target);
});

/* ============================ Корневая «инфо» страница ====================== */
app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.type('text').send(
    [
      'HH proxy is up ✅',
      'Useful endpoints:',
      ' - /healthz',
      ' - /api/version  (и /version)',
      ' - /api/hh/jobs/search?host=hh.kz&text=react&city=Астана&experience=1-3&per_page=5',
      ' - /api/hh/areas?host=hh.kz',
      ' - /api/hh/me',
      ' - /api/hh/resumes',
      ' - POST /api/hh/respond { vacancy_id, resume_id?, message? }',
      ' - POST /api/translate { text, sourceLang="auto", targetLang }  -> { translated }',
      ' - POST /api/translate/batch { texts[], sourceLang?, targetLang } -> { translations[] }',
      ' - /api/polish   (POST {text, lang, mode})',
      ' - /api/polish/batch   (POST {texts[], lang?, mode?})',
      ' - /api/ai/infer-search   (POST {profile, lang?, overrideModel?})',
      ' - /api/recommendations/generate   (POST {profile})',
      ' - /api/recommendations/improve    (POST {profile})',
      '',
      '⚠️ Hint: use /api/hh/jobs/search for vacancy queries',
    ].join('\n')
  );
});

/* ============================== Error handler =============================== */
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  const status = err.status || 500;
  res.status(status).json({ error: 'unhandled', message: err.message || 'Internal error' });
});

/* ================================== Start ================================== */
const port = Number(PORT) || 10000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ BFF running on 0.0.0.0:${port} (env: ${NODE_ENV})`);
  console.log('📍 RENDER:', !!process.env.RENDER);
  console.log('🌐 Allowed CORS:', ALLOWED.join(', '));
  console.log('🔑 HH_CLIENT_ID:', HH_CLIENT_ID ? '✓ set' : '✗ missing');
  console.log('🔑 OPENROUTER_API_KEY:', OPENROUTER_API_KEY ? '✓ set' : '✗ missing');
  console.log('🈯 TRANSLATE provider:', TRANSLATE_PROVIDER, '| Libre URL:', LIBRE_URL ? '✓' : '—', '| Google key:', GOOGLE_TRANSLATE_KEY ? '✓' : '—');
});

// Грейсфул шатдаун
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`[${sig}] shutting down...`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
});
