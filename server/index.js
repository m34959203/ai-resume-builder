'use strict';

/*
 * AI Resume Builder — BFF (CommonJS)
 * - Без ESM: никаких import/top-level await
 * - Роуты: /api/hh, /api/recommendations (+ health)
 * - Встроенный /api/ai/infer-search для фронта
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const process = require('process');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch {}
}

// Опциональные зависимости (не падаем, если не установлены)
let compression = null;
let helmet = null;
try { compression = require('compression'); } catch {}
try { helmet = require('helmet'); } catch {}

// ────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontOrigins: (process.env.FRONT_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

const __dirnameResolved = __dirname || path.dirname(require.main?.filename || '');

// ────────────────────────────────────────────────────────────
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

if (helmet) app.use(helmet({ contentSecurityPolicy: false }));
if (compression) app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ────────────────────────────────────────────────────────────
// CORS
// ────────────────────────────────────────────────────────────
const allowedOrigins = config.frontOrigins.length > 0 ? config.frontOrigins : defaultOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // SSR/health/локальные curl
    try {
      const url = new URL(origin);
      const host = url.hostname || '';
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (host.endsWith('onrender.com')) return callback(null, true);
      if (host.endsWith('vercel.app')) return callback(null, true);
      if (!config.isProduction && /^localhost$/.test(host)) return callback(null, true);
    } catch {}
    console.warn(`⚠️ CORS rejected: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  /**
   * ВАЖНО:
   * Не задаём allowedHeaders вручную — тогда пакет `cors`
   * отразит всё из Access-Control-Request-Headers (включая x-no-cache).
   * Если хотите зафиксировать список — добавьте 'X-No-Cache' и др.
   */
  // allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept-Language', 'X-No-Cache'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Кэширование префлайтов и корректный Vary
app.use((req, res, next) => {
  // Помогаем CDN и браузерам корректно кэшировать ответы CORS
  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  next();
});

// ────────────────────────────────────────────────────────────
// ЛОГИ
// ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const s = res.statusCode;
    const e = s >= 500 ? '❌' : s >= 400 ? '⚠️' : '✅';
    const origin = req.headers.origin ? ` [${req.headers.origin}]` : '';
    console.log(`${e} ${req.method} ${req.path}${origin} - ${s} - ${ms}ms`);
  });
  next();
});

// ────────────────────────────────────────────────────────────
// HEALTH / VERSION
// ────────────────────────────────────────────────────────────
function healthPayload() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    memory: typeof process.memoryUsage === 'function' ? process.memoryUsage() : {},
  };
}
app.get('/health', (req, res) => res.json(healthPayload()));
// 👇 alias для Render и фронта
app.get('/healthz', (req, res) => res.json(healthPayload()));
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
  const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '';
  res.json({ version, commit });
});

// ────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// AI helper: /api/ai/infer-search (простая эвристика)
// ────────────────────────────────────────────────────────────
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
  const explicit = normalizeText(profile?.position || profile?.desiredRole || profile?.desiredPosition || profile?.targetRole || profile?.objective || '');
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
app.post('/api/ai/infer-search', (req, res) => {
  try {
    const profile = req.body?.profile || {};
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

// ────────────────────────────────────────────────────────────
// РОУТЫ HH и РЕКОМЕНДАЦИЙ
// ────────────────────────────────────────────────────────────
safeUseRouter('/api/hh', path.join(__dirnameResolved, 'routes', 'hh.js'));
safeUseRouter('/api/recommendations', path.join(__dirnameResolved, 'routes', 'recommendations.js'));

// Бэкап-монтаж без /api (на случай старых ссылок со фронта)
safeUseRouter('/hh', path.join(__dirnameResolved, 'routes', 'hh.js'));
safeUseRouter('/recommendations', path.join(__dirnameResolved, 'routes', 'recommendations.js'));

// ────────────────────────────────────────────────────────────
// ROOT
// ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
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

HeadHunter:
  GET  /api/hh/jobs/search
  GET  /api/hh/areas
  GET  /api/hh/suggest-areas?text=almaty
  GET  /api/hh/me
  GET  /api/hh/resumes
  POST /api/hh/respond

Recommendations:
  POST /api/recommendations/generate

AI helpers:
  POST /api/ai/infer-search
`.trim());
});

// ────────────────────────────────────────────────────────────
// ERRORS
// ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
});

app.use((err, req, res, _next) => {
  console.error('💥 Unhandled error:', err);
  const status = err?.statusCode || err?.status || 500;
  res.status(status).json({ ok: false, error: err?.message || 'Internal Server Error' });
});

// ────────────────────────────────────────────────────────────
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 AI Resume Builder Server (CommonJS)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${config.port}`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.length} configured`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server ready');
  console.log('═══════════════════════════════════════════════════════════');
});
server.timeout = 120000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

module.exports = app;
module.exports.server = server;
module.exports.config = config;
