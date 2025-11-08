// server/index.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

// ⬇️ .env в dev (в проде переменные приходят от платформы)
if (process.env.NODE_ENV !== 'production') {
  try { await import('dotenv/config'); } catch {}
}

// Опциональные зависимости (не падаем, если не установлены)
let compression = null;
let helmet = null;
try { ({ default: compression } = await import('compression')); } catch {}
try { ({ default: helmet } = await import('helmet')); } catch {}

// ============================================
// 🔧 PATHS
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// ⚙️ CONFIGURATION
// ============================================
const config = {
  port: Number.parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontOrigins: (process.env.FRONT_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  // эвристика: разрешаем onrender / vercel домены
  allowRenderVercel: true,
};

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// ============================================
// 📦 ROUTES & MIDDLEWARE
// ============================================
import translateRouter from './routes/translate.js';
import hhRouter from './routes/hh.js';
import recommendationsRouter from './routes/recommendations.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// ============================================
// 🚀 EXPRESS APP
// ============================================
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Безопасность/сжатие — если установлены
if (helmet) {
  // CSP выключен (SPA с внешними скриптами/стилями), CORP смягчаем
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'no-referrer' },
  }));
}
if (compression) app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// 🆔 REQUEST ID + LOGGING
// ============================================
app.use((req, res, next) => {
  const existing = req.get('X-Request-ID');
  const id = existing || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  res.setHeader('X-Request-ID', id);
  req.requestId = id;
  next();
});

app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const s = res.statusCode;
    const e = s >= 500 ? '❌' : s >= 400 ? '⚠️' : '✅';
    console.log(`${e} [${req.requestId}] ${req.method} ${req.path} - ${s} - ${ms}ms`);
  });
  next();
});

// ============================================
// 🌐 CORS
// ============================================
const allowedOrigins = config.frontOrigins.length > 0 ? config.frontOrigins : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    // Разрешить запросы без origin (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    if (config.allowRenderVercel) {
      if (/\.onrender\.com$/.test(new URL(origin).hostname)) return callback(null, true);
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return callback(null, true);
    }

    // В development разрешить любой localhost:порт
    if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️ CORS rejected: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept-Language'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================
// 🚦 RATE LIMITING
// ============================================
app.use('/api', apiLimiter);

// ============================================
// 🏥 HEALTH
// ============================================
function noCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

app.get('/health', (req, res) => {
  noCache(res);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    memory: process.memoryUsage(),
  });
});
app.get('/ready', (_req, res) => {
  noCache(res);
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});
app.get('/alive', (_req, res) => {
  noCache(res);
  res.json({ status: 'alive' });
});

// Небольшой debug-эндпоинт для быстрой диагностики ключей
app.get('/api/debug', (_req, res) => {
  const masked = s => (s ? s.slice(0, 4) + '***' + s.slice(-4) : null);
  res.json({
    hh: {
      client_id: Boolean(process.env.HH_CLIENT_ID),
      client_secret: Boolean(process.env.HH_CLIENT_SECRET),
    },
    ai: {
      openrouter_key: Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_DEEPSEEK),
      openrouter_model: process.env.OPENROUTER_MODEL || null,
      deepseek_key: Boolean(process.env.API_KEY_DEEPSEEK),
    },
    translate: process.env.TRANSLATE_URL || 'argos (встроенный)',
    masked: {
      OPENROUTER_API_KEY: masked(process.env.OPENROUTER_API_KEY),
      API_KEY_DEEPSEEK: masked(process.env.API_KEY_DEEPSEEK),
    }
  });
});

// ============================================
// 🛣️ API ROUTES
// ============================================
// Alias: некоторые клиенты шлют сразу /api/recommendations (без /generate)
app.post('/api/recommendations', (req, res) => {
  // 307 — сохраняет метод и тело при редиректе
  res.redirect(307, '/api/recommendations/generate');
});

app.use('/api/translate', translateRouter);
app.use('/api/hh',        hhRouter);
app.use('/api/recommendations', recommendationsRouter);

// ============================================
// 🏠 ROOT ENDPOINT
// ============================================
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`
╔═══════════════════════════════════════════════════════════════╗
║                AI RESUME BUILDER - SERVER v2.1.0             ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server is running

Health:
  GET  /health
  GET  /ready
  GET  /alive

Debug:
  GET  /api/debug

Translation:
  POST /api/translate/text
  POST /api/translate/resume
  POST /api/translate/vacancies
  GET  /api/translate/health

HeadHunter:
  POST /api/hh/jobs/search
  GET  /api/hh/areas
  GET  /api/hh/suggest-areas?text=almaty
  GET  /api/hh/me
  GET  /api/hh/resumes
  POST /api/hh/respond

Recommendations:
  POST /api/recommendations            (alias → 307 → /api/recommendations/generate)
  POST /api/recommendations/generate
`.trim());
});

// ============================================
// 🚫 ERRORS
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// 🎬 START
// ============================================
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 AI Resume Builder Server v2.1.0');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${config.port}`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.length} configured`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`🔑 HH Client: ${process.env.HH_CLIENT_ID ? '✓' : '✗'}`);
  console.log(`🤖 OpenRouter: ${(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_DEEPSEEK) ? '✓' : '✗'}`);
  console.log(`🧠 DeepSeek: ${process.env.API_KEY_DEEPSEEK ? '✓' : '✗'}`);
  console.log(`🛰 Translate: ${process.env.TRANSLATE_URL || 'default (argos)'}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server ready');
  console.log('═══════════════════════════════════════════════════════════');
});

// Современные таймауты (Node 18+)
server.timeout = 120000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// ============================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================
let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[${signal}] Gracefully shutting down...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('⚠️ Forced shutdown');
    process.exit(1);
  }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
export { server, config };
