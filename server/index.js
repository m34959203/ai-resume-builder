import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// ============================================
// 🔧 ENVIRONMENT
// ============================================
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 📦 ROUTES & MIDDLEWARE
// ============================================
import translateRouter from './routes/translate.js';
import hhRouter from './routes/hh.js';
import recommendationsRouter from './routes/recommendations.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// ============================================
// ⚙️ CONFIGURATION
// ============================================
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // CORS origins
  frontOrigins: (process.env.FRONT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};

// ============================================
// 🚀 EXPRESS APP
// ============================================
const app = express();

// Trust proxy
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ============================================
// 🛡️ BASIC MIDDLEWARE
// ============================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// 🌐 CORS
// ============================================

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const allowedOrigins = config.frontOrigins.length > 0 
  ? config.frontOrigins 
  : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    // Разрешить запросы без origin (Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Проверка в белом списке
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Разрешить *.onrender.com
    if (origin.includes('onrender.com')) {
      return callback(null, true);
    }

    // Разрешить *.vercel.app
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // В development разрешить localhost с любым портом
    if (!config.isProduction && origin.match(/^https?:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    console.warn(`⚠️ CORS rejected: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Request-ID', 
    'Accept-Language'
  ],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 часа
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================
// 📝 REQUEST LOGGING
// ============================================

app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    
    console.log(
      `${statusEmoji} ${req.method} ${req.path} - ${status} - ${duration}ms`
    );
  });
  
  next();
});

// ============================================
// 🚦 RATE LIMITING
// ============================================

app.use('/api', apiLimiter);

// ============================================
// 🏥 HEALTH CHECKS
// ============================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    memory: process.memoryUsage(),
  });
});

/**
 * Readiness probe
 */
app.get('/ready', (req, res) => {
  res.json({ 
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

/**
 * Liveness probe
 */
app.get('/alive', (req, res) => {
  res.json({ status: 'alive' });
});

// ============================================
// 🛣️ API ROUTES
// ============================================

// Translation API
app.use('/api/translate', translateRouter);

// HeadHunter API
app.use('/api/hh', hhRouter);

// Recommendations API
app.use('/api/recommendations', recommendationsRouter);

// ============================================
// 🏠 ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`
╔═══════════════════════════════════════════════════════════════╗
║           AI RESUME BUILDER - SERVER                          ║
║                    Version 2.0.0                              ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server is running

📚 AVAILABLE ENDPOINTS:

Health:
  GET  /health                      - Health check
  GET  /ready                       - Readiness probe
  GET  /alive                       - Liveness probe

Translation API:
  POST /api/translate/text          - Translate text
       { text, targetLang, context }
  
  POST /api/translate/resume        - Translate resume
       { resumeData, targetLang }
  
  POST /api/translate/vacancies     - Translate vacancies
       { vacancies, targetLang }
  
  GET  /api/translate/health        - Translation service health

HeadHunter API:
  GET  /api/hh/jobs/search          - Search vacancies
       ?text=react&city=Almaty
  
  GET  /api/hh/areas                - Get areas
  GET  /api/hh/me                   - Get current user (auth)

Recommendations:
  POST /api/recommendations/generate - Generate recommendations
       { profile }

📊 STATISTICS:
  Uptime: ${Math.floor(process.uptime())}s
  Environment: ${config.nodeEnv}
  Node: ${process.version}

🌐 ALLOWED ORIGINS:
  ${allowedOrigins.join('\n  ')}
  `.trim());
});

// ============================================
// 🚫 ERROR HANDLING
// ============================================

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// ============================================
// 🎬 SERVER START
// ============================================

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 AI Resume Builder Server v2.0.0');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${config.port}`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.length} configured`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✓' : '✗'}`);
  console.log(`🔑 HH Client: ${process.env.HH_CLIENT_ID ? '✓' : '✗'}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Server ready');
  console.log('═══════════════════════════════════════════════════════════');
});

// Таймауты для AI запросов
server.timeout = 120000; // 2 минуты
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

  // Форсированное завершение через 10 секунд
  setTimeout(() => {
    console.error('⚠️ Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ============================================
// 📤 EXPORT
// ============================================

export default app;
export { server, config };