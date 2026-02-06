'use strict';

/*
 * AI Resume Builder — BFF (CommonJS)
 * - Без ESM: никаких import/top-level await
 * - Роуты: /api/hh, /api/recommendations (+ health)
 * - Встроенный /api/ai/infer-search для фронта
 * - ✅ Честная прокся /api/hh/jobs/search — не «глотает» ошибки HH
 * - ✅ Маппинг experience → HH-коды (none/0-1 не отправляем) — для старых фронтов
 * - ✅ Корректный CORS (Render/Vercel/Netlify + ENV), универсальный preflight
 * - ✅ Проброс HH-User-Agent, реферера; детальная диагностика
 * - ✅ Лог флагов рекомендаций (RECS_*)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const process = require('process');
const crypto = require('crypto');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch {}
}

// Опциональные зависимости
let compression = null;
let helmet = null;
let rateLimit = null;
try { compression = require('compression'); } catch {}
try { helmet = require('helmet'); } catch {}
try { rateLimit = require('express-rate-limit'); } catch {}

/* ────────────────────────────────────────────────────────────
 * CONFIG
 * ──────────────────────────────────────────────────────────── */
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontOrigins: (process.env.FRONT_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  // HH требует «честный» UA; дублируем в HH-User-Agent
  hhUserAgent: process.env.HH_USER_AGENT
    || 'AI-Resume-Builder/1.0 (+https://ai-resume-frontend-nepa.onrender.com)',
  hhTimeoutMs: Number(process.env.HH_TIMEOUT_MS || 12000),
  corsDebug: String(process.env.CORS_DEBUG || '0').toLowerCase() === '1',
};

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

// Динамические origin'ы из окружения платформ
const runtimeOrigins = [
  process.env.RENDER_EXTERNAL_URL,                            // https://<app>.onrender.com
  process.env.FRONTEND_URL,                                   // произвольный кастомный
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.NETLIFY_URL && `https://${process.env.NETLIFY_URL}`,
  process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
].filter(Boolean);

let allowedOrigins = [
  ...new Set([ ...defaultOrigins, ...config.frontOrigins, ...runtimeOrigins ]),
];

const __dirnameResolved = __dirname || path.dirname(require.main?.filename || '');

/* ──────────────────────────────────────────────────────────── */
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('etag', false);

/* Безопасность/сжатие */
if (helmet) app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'data:', 'blob:', 'https://api.hh.ru', 'https://generativelanguage.googleapis.com', 'https://www.googleapis.com', ...allowedOrigins],
      fontSrc: ["'self'", 'data:'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
if (compression) app.use(compression());

/* Rate limiting */
if (rateLimit) {
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/ai/', rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/recommendations/', rateLimit({ windowMs: 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false }));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ────────────────────────────────────────────────────────────
 * X-Request-ID для трассировки
 * ──────────────────────────────────────────────────────────── */
function genReqId() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}
app.use((req, res, next) => {
  const rid = req.headers['x-request-id'] || genReqId();
  req.id = rid;
  res.setHeader('X-Request-ID', rid);
  next();
});

/* ────────────────────────────────────────────────────────────
 * CORS
 * ──────────────────────────────────────────────────────────── */
function originAllowed(origin) {
  if (!origin) return true; // curl/SSR/health
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (allowedOrigins.includes(origin)) return true;
    if (host.endsWith('onrender.com')) return true;
    if (host.endsWith('vercel.app'))  return true;
    if (host.endsWith('netlify.app')) return true;
    if (host.endsWith('.railway.app') || host.endsWith('.up.railway.app')) return true;
    if (host.endsWith('.zhezu.kz') || host === 'zhezu.kz') return true;
    if (!config.isProduction && (host === 'localhost' || host === '127.0.0.1')) return true;
  } catch {}
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    const ok = originAllowed(origin);
    if (config.corsDebug) console.log(`[CORS] ${ok ? 'ALLOW' : 'BLOCK'} ${origin || '(no-origin)'}`);
    ok ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Source-HH-URL'],
  maxAge: 86400,
};

// Ставим ДО любых роутов
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Универсальный preflight (подстраховка — даже если что-то бросит до cors())
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  if (req.method === 'OPTIONS') {
    const o = req.headers.origin;
    if (originAllowed(o)) {
      res.setHeader('Access-Control-Allow-Origin', o || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With, X-Request-ID'
      );
      return res.status(204).end();
    }
  }
  next();
});

/* ────────────────────────────────────────────────────────────
 * ЛОГИ
 * ──────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const s = res.statusCode;
    const e = s >= 500 ? '❌' : s >= 400 ? '⚠️' : '✅';
    const origin = req.headers.origin ? ` [${req.headers.origin}]` : '';
    console.log(`${e} ${req.method} ${req.path}${origin} - ${s} - ${ms}ms (rid=${req.id})`);
  });
  next();
});

/* ────────────────────────────────────────────────────────────
 * HEALTH / VERSION
 * ──────────────────────────────────────────────────────────── */
function healthPayload() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    memory: typeof process.memoryUsage === 'function' ? process.memoryUsage() : {},
  };
}
app.get('/health', (_req, res) => res.json(healthPayload()));
app.head('/health', (_req, res) => res.status(200).end());
app.get('/healthz', (_req, res) => res.json(healthPayload()));
app.get('/ready', (_req, res) => res.json({ status: 'ready', timestamp: new Date().toISOString() }));
app.get('/alive', (_req, res) => res.json({ status: 'alive' }));

app.get('/version', (_req, res) => {
  let version = '0.0.0';
  try {
    const pkgPath = path.join(__dirnameResolved, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg && pkg.version) version = String(pkg.version);
    }
  } catch {}
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '';
  res.json({ version, commit });
});

/* Быстрый health HH с пингом и таймаутом */
app.get('/api/health/hh', async (_req, res) => {
  const t0 = Date.now();
  try {
    const r = await fetch('https://api.hh.ru/status', {
      headers: { 'User-Agent': config.hhUserAgent, 'HH-User-Agent': config.hhUserAgent, 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(config.hhTimeoutMs),
    });
    const txt = await r.text().catch(() => '');
    res
      .status(r.status)
      .set('Content-Type', 'application/json; charset=utf-8')
      .send(JSON.stringify({
        ok: r.ok,
        status: r.status,
        latency_ms: Date.now() - t0,
        body: txt.slice(0, 1000),
      }));
  } catch (e) {
    res.status(500).json({
      ok: false,
      status: 500,
      latency_ms: Date.now() - t0,
      error: String(e?.message || e),
    });
  }
});

/* ────────────────────────────────────────────────────────────
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И МОНТАЖ РОУТЕРОВ
 * ──────────────────────────────────────────────────────────── */
function safeUseRouter(mountPath, localPath) {
  try {
    const mod = require(localPath);
    const router = mod?.default || mod?.router || mod;
    if (router && typeof router === 'function') {
      app.use(mountPath, router);
      console.log(`✓ Mounted ${mountPath} from ${localPath}`);
    } else {
      console.warn(`⚠️ Router at ${localPath} has unexpected export, skipping`);
    }
  } catch (e) {
    console.warn(`⚠️ Router ${localPath} not found or failed to load: ${e?.message}`);
  }
}

function normalizeText(s) { return String(s || '').trim(); }
function bestDate(obj, keys = []) {
  for (const k of keys) {
    const d = obj && obj[k] ? new Date(obj[k]) : null;
    if (d && !isNaN(+d)) return d;
  }
  return null;
}
function pickLatestExperience(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return null;
  const scored = items.map((it, i) => {
    const end = bestDate(it, ['end','to','dateEnd','date_to']);
    const start = bestDate(it, ['start','from','dateStart','date_from']);
    const endScore = end ? +end : Number.MAX_SAFE_INTEGER - i;
    const startScore = start ? +start : 0;
    return { it, endScore, startScore };
  }).sort((a,b) => (b.endScore - a.endScore) || (b.startScore - a.startScore));
  return scored[0]?.it || items[0];
}
function deriveRole(profile) {
  const explicit = normalizeText(
    profile?.position || profile?.desiredRole || profile?.desiredPosition || profile?.targetRole || profile?.objective || ''
  );
  if (explicit) return explicit;
  const latest = pickLatestExperience(profile);
  const role = normalizeText(latest?.position || latest?.title || latest?.role || '');
  if (role) return role;
  const skills = (profile?.skills || []).map(String).map(s => s.trim()).filter(Boolean);
  if (skills.length) return skills.slice(0, 3).join(' ');
  const sum = normalizeText(profile?.summary);
  if (sum) return sum.split(/\s+/).slice(0, 3).join(' ');
  return '';
}
function calcExperienceCategory(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return 'none';
  let ms = 0;
  for (const it of items) {
    const start = bestDate(it, ['start','from','dateStart','date_from']);
    const end = bestDate(it, ['end','to','dateEnd','date_to']) || new Date();
    if (start && end && end > start) ms += (+end - +start);
    else ms += 365 * 24 * 3600 * 1000;
  }
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years < 1) return '0-1';
  if (years < 3) return '1-3';
  if (years < 6) return '3-6';
  return '6+';
}
function uniqCI(arr = []) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const k = String(v || '').trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(String(v).trim());
  }
  return out;
}

/* ────────────────────────────────────────────────────────────
 * AI helper: /api/ai/infer-search (простая эвристика)
 * ──────────────────────────────────────────────────────────── */
app.post('/api/ai/infer-search', (req, res) => {
  try {
    const profile = req.body?.profile || {};
    if (JSON.stringify(profile).length > 50000) {
      return res.status(400).json({ error: 'Profile too large' });
    }
    const role = deriveRole(profile);
    const city = normalizeText(profile?.location);
    const exp = calcExperienceCategory(profile);
    const skills = uniqCI((Array.isArray(profile?.skills) ? profile.skills : []).map(String)).slice(0, 12);
    const confidence =
      (role ? 0.4 : 0) +
      (city ? 0.2 : 0) +
      (skills.length >= 4 ? 0.2 : skills.length ? 0.1 : 0) +
      (exp !== 'none' ? 0.2 : 0);
    return res.json({
      role,
      city: city || undefined,
      experience: exp,   // 'none' | '0-1' | '1-3' | '3-6' | '6+'
      skills,
      confidence: Math.max(0.5, Math.min(0.95, confidence || 0.6)),
    });
  } catch (e) {
    console.error('infer-search error:', e);
    res.status(500).json({ error: 'infer-failed' });
  }
});

/* ────────────────────────────────────────────────────────────
 * HH: Честная прокся /api/hh/jobs/search (не «глотает» ошибки)
 * ──────────────────────────────────────────────────────────── */
const hhInline = express.Router();

function isValidYMD(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function toBool(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return ['1','true','yes','on'].includes(s);
}
function cleanParams(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && (v.trim() === '' || v === 'undefined' || v === 'null')) continue;
    out[k] = v;
  }
  return out;
}
function pickCurrencyByHost(host) {
  const h = String(host || '').toLowerCase();
  return h === 'hh.kz' ? 'KZT' : 'RUR';
}
function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

/* Маппинг «наш опыт» → коды HH (или опустить фильтр) */
function mapExperienceToHH(val) {
  if (!val) return undefined;
  const s = String(val).trim();
  if (['noExperience','between1And3','between3And6','moreThan6'].includes(s)) return s; // уже HH-код
  if (s === '1-3') return 'between1And3';
  if (s === '3-6') return 'between3And6';
  if (s === '6+')  return 'moreThan6';
  if (s === 'none' || s === '0-1') return undefined; // безопасно — не фильтруем
  return undefined;
}

function buildVacanciesUrl(params = {}) {
  const {
    text = '',
    area,
    specialization,
    professional_role,   // альтернатива specialization
    experience,
    employment,
    schedule,
    currency,
    salary,
    only_with_salary,
    search_period,       // в днях
    date_from,
    order_by,            // 'relevance' | 'publication_time'
    page = 0,
    per_page = 20,
    host,                // для валюты/диагностики
  } = params;

  const q = new URLSearchParams();
  if (text) q.set('text', String(text));
  q.set('per_page', String(clamp(per_page, 1, 100)));
  q.set('page', String(clamp(page, 0, 1000)));
  if (area) q.set('area', String(area));
  if (specialization) q.set('specialization', String(specialization));
  if (professional_role) q.set('professional_role', String(professional_role));

  const expHH = mapExperienceToHH(experience);
  if (expHH) q.set('experience', expHH);

  if (employment) q.set('employment', String(employment));
  if (schedule) q.set('schedule', String(schedule));

  const curr = currency || pickCurrencyByHost(host);
  if (curr) q.set('currency', String(curr));

  if (salary != null && String(salary).trim() !== '') q.set('salary', String(salary).replace(/[^\d]/g, ''));
  if (only_with_salary != null) q.set('only_with_salary', toBool(only_with_salary) ? 'true' : 'false');

  if (search_period != null) {
    const sp = clamp(search_period, 1, 30);
    if (sp) q.set('search_period', String(sp));
  }

  if (date_from && isValidYMD(date_from)) q.set('date_from', date_from);
  if (order_by) q.set('order_by', String(order_by)); // publication_time | relevance

  return `https://api.hh.ru/vacancies?${q.toString()}`;
}

hhInline.get('/jobs/search', async (req, res) => {
  const safe = cleanParams(req.query);
  const url = buildVacanciesUrl(safe);

  // пробрасываем диагностический заголовок с исходным URL HH
  res.set('X-Source-HH-URL', url);

  try {
    const headers = {
      'User-Agent': config.hhUserAgent,
      'HH-User-Agent': config.hhUserAgent, // 👈 критично для HH
      'Accept': 'application/json',
      'Accept-Language': req.headers['accept-language'] || 'ru-RU,ru;q=0.9,en;q=0.8',
      'X-Request-ID': req.id,
      ...(req.headers.referer ? { Referer: req.headers.referer } : {}),
    };
    if (req.headers['x-no-cache']) headers['Cache-Control'] = 'no-cache';

    const r = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(config.hhTimeoutMs),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error(`[hh/jobs/search] HH API error: ${r.status}`, errText.slice(0, 500));
      return res.status(r.status).json({
        ok: false,
        error: 'HH_API_ERROR',
        status: r.status,
      });
    }

    const txt = await r.text();
    let data = null;
    try { data = JSON.parse(txt); } catch {
      console.error('[hh/jobs/search] Bad JSON from HH API', txt.slice(0, 500));
      return res.status(502).json({
        ok: false,
        error: 'HH_BAD_PAYLOAD',
        status: 502,
      });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  } catch (e) {
    const isAbort = /aborted|AbortError|The operation was aborted|timeout/i.test(String(e?.message || e));
    console.error('[hh/jobs/search] fatal', e);
    return res.status(isAbort ? 504 : 500).json({
      ok: false,
      error: isAbort ? 'BFF_TIMEOUT' : 'BFF_ERROR',
      message: String(e?.message || e),
    });
  }
});

/* Монтируем «честную» проксю ДО внешнего роутера — перехватываем старый багованный */
app.use('/api/hh', hhInline);

/* ────────────────────────────────────────────────────────────
 * РОУТЫ HH и РЕКОМЕНДАЦИЙ (остальные точки, areas/me/…)
 * ──────────────────────────────────────────────────────────── */
function mountRoutes() {
  // Основные
  safeUseRouter('/api/hh', path.join(__dirnameResolved, 'routes', 'hh.js'));
  safeUseRouter('/api/recommendations', path.join(__dirnameResolved, 'routes', 'recommendations.js'));
  safeUseRouter('/api/courses', path.join(__dirnameResolved, 'routes', 'courses.js'));

  // Бэкап-монтаж без /api (на случай старых ссылок со фронта)
  safeUseRouter('/hh', path.join(__dirnameResolved, 'routes', 'hh.js'));
  safeUseRouter('/recommendations', path.join(__dirnameResolved, 'routes', 'recommendations.js'));
  safeUseRouter('/courses', path.join(__dirnameResolved, 'routes', 'courses.js'));
}
mountRoutes();

/* ────────────────────────────────────────────────────────────
 * STATIC FILES + SPA FALLBACK (production on Plesk/hoster.kz)
 * ──────────────────────────────────────────────────────────── */
const distPath = path.join(__dirnameResolved, '..', 'dist');
const hasDistDir = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

if (config.isProduction && hasDistDir) {
  // Serve built frontend assets with long-term caching
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    index: 'index.html',  // serve index.html for /
  }));

  // SPA fallback: non-API GET requests → index.html (hash router, but just in case)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });

  console.log(`📂 Serving static files from ${distPath}`);
} else {
  // Dev/API-only mode: show server info at root
  app.get('/', (_req, res) => {
    res.type('text/plain; charset=utf-8').send(`
╔════════════════════════════════════════════════════╗
║      AI RESUME BUILDER - SERVER (CommonJS)        ║
╚════════════════════════════════════════════════════╝

✅ Server is running

Health:
  GET  /health
  GET  /healthz
  GET  /ready
  GET  /alive
  GET  /version
  GET  /api/health/hh

HeadHunter:
  GET  /api/hh/jobs/search
  GET  /api/hh/areas
  GET  /api/hh/suggest-areas?text=almaty
  GET  /api/hh/me
  GET  /api/hh/resumes
  POST /api/hh/respond

Recommendations:
  POST /api/recommendations/generate
  POST /api/recommendations/analyze
  POST /api/recommendations/improve

Courses:
  GET  /api/courses/search?skills=React,TypeScript&limit=12

AI helpers:
  POST /api/ai/infer-search
`.trim());
  });
}

/* ────────────────────────────────────────────────────────────
 * ERRORS — добавляем CORS даже при ошибках/404
 * ──────────────────────────────────────────────────────────── */
app.use((req, res) => {
  const o = req.headers.origin;
  if (originAllowed(o)) {
    res.setHeader('Access-Control-Allow-Origin', o || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
});

app.use((err, req, res, _next) => {
  console.error('💥 Unhandled error:', err);
  const o = req.headers.origin;
  if (originAllowed(o)) {
    res.setHeader('Access-Control-Allow-Origin', o || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  const status = err?.statusCode || err?.status || 500;
  res.status(status).json({ ok: false, error: err?.message || 'Internal Server Error' });
});

/* ────────────────────────────────────────────────────────────
 * START + ENV LOGS
 * ──────────────────────────────────────────────────────────── */
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 AI Resume Builder Server (CommonJS)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${config.port}`);

  allowedOrigins = [...new Set(allowedOrigins)];
  console.log(`🔒 CORS Origins (${allowedOrigins.length}):`);
  for (const o of allowedOrigins) console.log(`   - ${o}`);
  console.log('───────────────────────────────────────────────────────────');

  const flag = (v, d='0') => ['1','true','yes','on'].includes(String(v ?? d).toLowerCase());
  const rec = {
    HH_HOST: process.env.HH_HOST || 'hh.kz',
    USE_MARKET: flag(process.env.RECS_USE_MARKET, '1'),
    USE_LLM: flag(process.env.RECS_USE_LLM, '1'),
    LLM_COMPLEX: flag(process.env.RECS_LLM_COMPLEX, '0'),
    DEBUG: flag(process.env.RECS_DEBUG, '0'),
    MAX_ROLES: Number(process.env.RECS_MAX_ROLES || 5),
    SAMPLE_PAGES: Number(process.env.RECS_SAMPLE_PAGES || 2),
    PER_PAGE: Number(process.env.RECS_PER_PAGE || 50),
  };
  console.log('🎛  Recommendations flags:');
  Object.entries(rec).forEach(([k,v]) => console.log(`   ${k} = ${v}`));
  console.log('───────────────────────────────────────────────────────────');

  console.log(`🪪 HH User-Agent: ${config.hhUserAgent}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server ready');
  console.log('═══════════════════════════════════════════════════════════');
});
server.timeout = 120000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

/* Грейсфул-шатдаун */
function shutdown(sig) {
  console.log(`\n↘ Received ${sig}, closing server…`);
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
module.exports.server = server;
module.exports.config = config;
