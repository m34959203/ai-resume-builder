import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

// ⬇️ .env локально (в проде переменные приходят от платформы — импорт не обязателен)
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
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
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
if (helmet) app.use(helmet({ contentSecurityPolicy: false }));
if (compression) app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// 🌐 CORS
// ============================================
const allowedOrigins = config.frontOrigins.length > 0 ? config.frontOrigins : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    // Разрешить запросы без origin (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.includes('onrender.com')) return callback(null, true);
    if (origin.includes('vercel.app')) return callback(null, true);

    // В development разрешить любой localhost:порт
    if (!config.isProduction && /^https?:\/\/localhost:\d+$/.test(origin)) return callback(null, true);

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
// 📝 REQUEST LOGGING (лаконично)
// ============================================
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const s = res.statusCode;
    const e = s >= 500 ? '❌' : s >= 400 ? '⚠️' : '✅';
    console.log(`${e} ${req.method} ${req.path} - ${s} - ${ms}ms`);
  });
  next();
});

// ============================================
// 🚦 RATE LIMITING
// ============================================
app.use('/api', apiLimiter);

// ============================================
// 🏥 HEALTH
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    memory: process.memoryUsage(),
  });
});
app.get('/ready', (_req, res) => res.json({ status: 'ready', timestamp: new Date().toISOString() }));
app.get('/alive', (_req, res) => res.json({ status: 'alive' }));

// ============================================
// 🛣️ API ROUTES
// ============================================
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
║                AI RESUME BUILDER - SERVER v2.0.0             ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server is running

Health:
  GET  /health
  GET  /ready
  GET  /alive

Translation:
  POST /api/translate/text
  POST /api/translate/resume
  POST /api/translate/vacancies
  GET  /api/translate/health

HeadHunter:
  GET  /api/hh/jobs/search
  GET  /api/hh/areas
  GET  /api/hh/suggest-areas?text=almaty
  GET  /api/hh/me
  GET  /api/hh/resumes
  POST /api/hh/respond

Recommendations:
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
  console.log('🚀 AI Resume Builder Server v2.0.0');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${config.port}`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.length} configured`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`🔑 HH Client: ${process.env.HH_CLIENT_ID ? '✓' : '✗'}`);
  console.log(`🛰 Translate: ${process.env.TRANSLATE_URL || 'default (argos)'}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server ready');
  console.log('═══════════════════════════════════════════════════════════');
});
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
