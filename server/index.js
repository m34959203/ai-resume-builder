// server/index.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

// 🔧 ENV: локально читаем .env, на проде — тихо пропускаем
if (process.env.NODE_ENV !== 'production') {
  try { await import('dotenv/config'); } catch {}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📦 ROUTES & MIDDLEWARE
import translateRouter from './routes/translate.js';
import hhRouter from './routes/hh.js';
import recommendationsRouter from './routes/recommendations.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// ⚙️ CONFIG
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontOrigins: (process.env.FRONT_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map(s => s.trim()).filter(Boolean),
  clientDist: path.resolve(__dirname, '..', process.env.CLIENT_DIST || 'dist') // ⬅️ dist корня
};

// 🚀 APP
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// BODY
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🌐 CORS
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];
const allowedOrigins = config.frontOrigins.length ? config.frontOrigins : defaultOrigins;
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.includes('onrender.com')) return cb(null, true);
    if (origin.includes('vercel.app')) return cb(null, true);
    if (!config.isProduction && /^https?:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    console.warn(`⚠️ CORS rejected: ${origin}`);
    cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Request-ID','Accept-Language'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 📝 LOG
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

// 🚦 RATE LIMIT
app.use('/api', apiLimiter);

// 🏥 HEALTH
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    memory: process.memoryUsage()
  });
});
app.get('/ready', (_req, res) => res.json({ status: 'ready', timestamp: new Date().toISOString() }));
app.get('/alive', (_req, res) => res.json({ status: 'alive' }));

// 🛣️ API
app.use('/api/translate', translateRouter);
app.use('/api/hh', hhRouter);
app.use('/api/recommendations', recommendationsRouter);

// 🗂️ STATIC (отдаём собранный фронт, если dist существует)
app.use(express.static(config.clientDist, { maxAge: '1h', index: 'index.html' }));

// 🏠 ROOT (инфо) — если dist нет, покажем справку
app.get('/', (req, res, next) => {
  // если есть index.html — пусть fallback ниже отдаст его
  return next();
});

// SPA fallback — всё не-API ведём в index.html
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  const indexPath = path.join(config.clientDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next(); // если dist отсутствует, пойдём дальше на 404 handler
  });
});

// 🚫 ERRORS
app.use(notFoundHandler);
app.use(errorHandler);

// 🎬 START
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 AI Resume Builder Server v2.0.0');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${config.port}`);
  console.log(`📦 Serving dist from: ${config.clientDist}`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.length} configured`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server ready');
  console.log('═══════════════════════════════════════════════════════════');
});
server.timeout = 120000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// 🛑 GRACEFUL SHUTDOWN
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
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
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => { console.error('💥 Uncaught Exception:', err); shutdown('UNCAUGHT_EXCEPTION'); });
process.on('unhandledRejection', (reason) => { console.error('💥 Unhandled Rejection:', reason); shutdown('UNHANDLED_REJECTION'); });

export default app;
export { server, config };
