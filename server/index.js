#!/usr/bin/env node
'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 AI RESUME BUILDER - BFF/PROXY SERVER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Функционал:
 * - HeadHunter API Proxy (поиск вакансий, OAuth, отклики)
 * - AI переводы и рекомендации (Gemini, DeepSeek)
 * - Многоязычность (RU/KZ/EN)
 * - Кэширование с stale-while-revalidate
 * - Rate limiting
 * - Structured logging
 * - Graceful shutdown
 * 
 * @version 2.0.0
 * @requires Node.js 18+
 */

const path = require('path');
const fs = require('fs');

/* ═══════════════════════════════════════════════════════════════════════════
   🔧 ENVIRONMENT LOADING
   ═══════════════════════════════════════════════════════════════════════════ */

(() => {
  const isRender = !!process.env.RENDER;
  const isVercel = !!process.env.VERCEL;
  const isProduction = process.env.NODE_ENV === 'production';

  // В production на хостингах переменные уже есть в окружении
  if (!isRender && !isVercel && !isProduction) {
    const rootEnv = path.resolve(__dirname, '..', '.env');
    const localEnv = path.resolve(__dirname, '.env');
    
    require('dotenv').config({ path: rootEnv, override: false });
    require('dotenv').config({ path: localEnv, override: false });
  }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   📦 IMPORTS
   ═══════════════════════════════════════════════════════════════════════════ */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

// Утилиты
const logger = require('./utils/logger');
const { createRateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { validateEnv } = require('./utils/validation');
const cacheService = require('./services/cache');

// Роуты
const hhRoutes = require('./routes/hh');
const translateRoutes = require('./routes/translate');
const aiRoutes = require('./routes/ai');
const recommendationsRoutes = require('./routes/recommendations');

/* ═══════════════════════════════════════════════════════════════════════════
   ⚙️ CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const config = {
  // Основные настройки
  port: parseInt(process.env.PORT || '10000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // CORS
  frontOrigins: (process.env.FRONT_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  
  // HeadHunter
  hh: {
    apiUrl: 'https://api.hh.ru',
    host: process.env.HH_HOST || 'hh.kz',
    userAgent: process.env.HH_USER_AGENT || 'AI Resume Builder/2.0 (contact@example.com)',
    clientId: process.env.HH_CLIENT_ID,
    clientSecret: process.env.HH_CLIENT_SECRET,
    redirectUri: process.env.HH_REDIRECT_URI,
    timeout: parseInt(process.env.HH_TIMEOUT_MS || '15000', 10),
    defaultResumeId: process.env.HH_RESUME_ID,
  },
  
  // AI сервисы
  ai: {
    gemini: {
      apiKey: process.env.VITE_GEMINI_API_KEY,
      model: 'google/gemini-2.0-flash-exp:free',
    },
    deepseek: {
      apiKey: process.env.VITE_DEEPSEEK_API_KEY,
      model: 'deepseek-chat',
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
    },
  },
  
  // Кэширование
  cache: {
    searchTTL: parseInt(process.env.SEARCH_TTL_MS || '90000', 10),
    searchStaleMax: parseInt(process.env.SEARCH_STALE_MAX_MS || '900000', 10),
    areasTTL: 24 * 3600 * 1000, // 24 часа
    translationTTL: 7 * 24 * 3600 * 1000, // 7 дней
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
    maxAIRequests: parseInt(process.env.RATE_LIMIT_AI_MAX || '10', 10),
  },
  
  // Cookies
  cookie: {
    domain: process.env.COOKIE_DOMAIN,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
  },
  
  // Monitoring
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    sentryDsn: process.env.SENTRY_DSN,
  },
};

// Валидация обязательных переменных
try {
  validateEnv(config);
  logger.info('✓ Environment validation passed');
} catch (error) {
  logger.error('✗ Environment validation failed:', error.message);
  if (config.isProduction) {
    process.exit(1);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   🚀 EXPRESS APP SETUP
   ═══════════════════════════════════════════════════════════════════════════ */

const app = express();

// Trust proxy (для Render, Vercel, etc)
app.set('trust proxy', 1);
app.set('etag', false);
app.disable('x-powered-by');

/* ═══════════════════════════════════════════════════════════════════════════
   🛡️ SECURITY MIDDLEWARE
   ═══════════════════════════════════════════════════════════════════════════ */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    hsts: config.isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  })
);

/* ═══════════════════════════════════════════════════════════════════════════
   📝 BASIC MIDDLEWARE
   ═══════════════════════════════════════════════════════════════════════════ */

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(compression());

// Request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Powered-By', 'AI Resume Builder');
  next();
});

// Request Logger
app.use(requestLogger);

/* ═══════════════════════════════════════════════════════════════════════════
   🌐 CORS CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

const allowedOrigins = config.frontOrigins.length 
  ? config.frontOrigins 
  : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    // Разрешить запросы без origin (mobile apps, curl, etc)
    if (!origin) {
      logger.debug('[CORS] Request without origin - allowed');
      return callback(null, true);
    }

    // Проверка в белом списке
    if (allowedOrigins.includes(origin)) {
      logger.debug(`[CORS] Allowed origin: ${origin}`);
      return callback(null, true);
    }

    // Разрешить *.onrender.com
    if (origin.includes('onrender.com')) {
      logger.debug(`[CORS] Render domain allowed: ${origin}`);
      return callback(null, true);
    }

    // Разрешить *.vercel.app
    if (origin.includes('vercel.app')) {
      logger.debug(`[CORS] Vercel domain allowed: ${origin}`);
      return callback(null, true);
    }

    // В development разрешить localhost с любым портом
    if (config.isDevelopment && origin.match(/^https?:\/\/localhost:\d+$/)) {
      logger.debug(`[CORS] Localhost allowed: ${origin}`);
      return callback(null, true);
    }

    logger.warn(`[CORS] Rejected origin: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept-Language'],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 часа
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ═══════════════════════════════════════════════════════════════════════════
   🚦 RATE LIMITING
   ═══════════════════════════════════════════════════════════════════════════ */

// Общий rate limiter
const generalLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Слишком много запросов, попробуйте позже',
});

// AI endpoints - более строгий лимит
const aiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxAIRequests,
  message: 'Превышен лимит AI запросов, подождите минуту',
});

// Применяем rate limiting
app.use('/api', generalLimiter);
app.use(['/api/translate', '/api/ai', '/api/recommendations'], aiLimiter);

/* ═══════════════════════════════════════════════════════════════════════════
   🎯 HEALTH & INFO ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Health check endpoint
 */
app.get('/healthz', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: getVersion(),
    cache: {
      size: cacheService.getSize(),
      hits: cacheService.getHits(),
      misses: cacheService.getMisses(),
    },
    memory: process.memoryUsage(),
  };

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(health);
});

/**
 * Readiness probe (для Kubernetes)
 */
app.get('/ready', (req, res) => {
  // Проверка критичных зависимостей
  const checks = {
    cache: cacheService.isReady(),
    // Можно добавить проверку БД, Redis, etc
  };

  const isReady = Object.values(checks).every(Boolean);

  if (isReady) {
    res.json({ status: 'ready', checks });
  } else {
    res.status(503).json({ status: 'not ready', checks });
  }
});

/**
 * Liveness probe
 */
app.get('/alive', (req, res) => {
  res.json({ status: 'alive', timestamp: Date.now() });
});

/**
 * Version info
 */
app.get('/api/version', (req, res) => {
  res.json({
    name: 'AI Resume Builder BFF',
    version: getVersion(),
    environment: config.nodeEnv,
    node: process.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Server info (development only)
 */
app.get('/api/info', (req, res) => {
  if (config.isProduction) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    config: {
      nodeEnv: config.nodeEnv,
      port: config.port,
      allowedOrigins,
      hh: {
        host: config.hh.host,
        hasClientId: !!config.hh.clientId,
        hasClientSecret: !!config.hh.clientSecret,
      },
      ai: {
        hasGemini: !!config.ai.gemini.apiKey,
        hasDeepSeek: !!config.ai.deepseek.apiKey,
        hasOpenRouter: !!config.ai.openrouter.apiKey,
      },
      cache: {
        searchTTL: config.cache.searchTTL,
        searchStaleMax: config.cache.searchStaleMax,
      },
    },
    runtime: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   🛣️ API ROUTES
   ═══════════════════════════════════════════════════════════════════════════ */

// HeadHunter API
app.use('/api/hh', hhRoutes);

// AI Translation
app.use('/api/translate', translateRoutes);

// AI Features
app.use('/api/ai', aiRoutes);

// Recommendations
app.use('/api/recommendations', recommendationsRoutes);

/* ═══════════════════════════════════════════════════════════════════════════
   🏠 ROOT ENDPOINT
   ═══════════════════════════════════════════════════════════════════════════ */

app.get('/', (req, res) => {
  // Если есть query параметры поиска - редирект на API
  const hasSearchParams = 
    req.query.text || 
    req.query.city || 
    req.query.experience ||
    req.query.salary;

  if (hasSearchParams) {
    const params = new URLSearchParams(req.query);
    logger.info('[ROOT] Redirecting search to API:', params.toString());
    return res.redirect(307, `/api/hh/jobs/search?${params.toString()}`);
  }

  // Информационная страница
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`
╔═══════════════════════════════════════════════════════════════╗
║                 AI RESUME BUILDER - BFF SERVER                ║
║                         Version ${getVersion()}                        ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server is running

📚 AVAILABLE ENDPOINTS:

Health & Info:
  GET  /healthz                     - Health check
  GET  /ready                       - Readiness probe
  GET  /alive                       - Liveness probe
  GET  /api/version                 - Version info
  GET  /api/info                    - Server info (dev only)

HeadHunter API:
  GET  /api/hh/jobs/search          - Поиск вакансий
       ?text=react                   - Поисковый запрос
       &city=Алматы                  - Город
       &experience=1-3               - Опыт (none|0-1|1-3|3-6|6+)
       &salary=200000                - Зарплата (KZT)
       &host=hh.kz                   - Домен (hh.kz|hh.ru)
       &per_page=20                  - Результатов на странице
       &page=0                       - Номер страницы

  GET  /api/hh/areas                - Справочник регионов
  GET  /api/hh/industries           - Справочник отраслей
  GET  /api/hh/dictionaries         - Все справочники
  
  GET  /api/hh/me                   - Текущий пользователь (auth)
  GET  /api/hh/resumes              - Список резюме (auth)
  POST /api/hh/respond              - Откликнуться на вакансию (auth)

AI Translation:
  POST /api/translate/text          - Перевод текста
       { text, targetLang, context }
  
  POST /api/translate/resume        - Перевод резюме
       { resumeData, targetLang }
  
  POST /api/translate/vacancies     - Перевод вакансий
       { vacancies, targetLang }

AI Features:
  POST /api/ai/infer-search         - Анализ профиля для поиска
       { profile, lang }
  
  POST /api/ai/polish               - Улучшение текста
       { text, lang, mode }
  
  POST /api/ai/polish/batch         - Пакетное улучшение
       { texts[], lang, mode }

AI Recommendations:
  POST /api/recommendations/generate - Генерация рекомендаций
       { profile }
  
  POST /api/recommendations/improve  - Улучшение резюме
       { profile }

📊 STATISTICS:
  Cache Size: ${cacheService.getSize()} items
  Cache Hits: ${cacheService.getHits()}
  Uptime: ${Math.floor(process.uptime())} seconds
  Environment: ${config.nodeEnv}

🌐 ALLOWED ORIGINS:
  ${allowedOrigins.join('\n  ')}

💡 TIP: Use /api/hh/jobs/search for vacancy search
  `.trim());
});

/* ═══════════════════════════════════════════════════════════════════════════
   🚫 ERROR HANDLING
   ═══════════════════════════════════════════════════════════════════════════ */

// 404 handler
app.use((req, res) => {
  logger.warn(`[404] ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

/* ═══════════════════════════════════════════════════════════════════════════
   🎬 SERVER START
   ═══════════════════════════════════════════════════════════════════════════ */

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`🚀 AI Resume Builder BFF Server v${getVersion()}`);
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🌐 Listening on: http://0.0.0.0:${config.port}`);
  logger.info(`🔒 CORS Origins: ${allowedOrigins.length} configured`);
  logger.info('───────────────────────────────────────────────────────────');
  logger.info(`🔑 HH Client ID: ${config.hh.clientId ? '✓ set' : '✗ missing'}`);
  logger.info(`🤖 Gemini API: ${config.ai.gemini.apiKey ? '✓ set' : '✗ missing'}`);
  logger.info(`🤖 DeepSeek API: ${config.ai.deepseek.apiKey ? '✓ set' : '✗ missing'}`);
  logger.info(`🤖 OpenRouter: ${config.ai.openrouter.apiKey ? '✓ set' : '✗ missing'}`);
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('✅ Server ready to accept connections');
  logger.info('═══════════════════════════════════════════════════════════');
});

// Увеличиваем таймауты для медленных AI запросов
server.timeout = 120000; // 2 минуты
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

/* ═══════════════════════════════════════════════════════════════════════════
   🛑 GRACEFUL SHUTDOWN
   ═══════════════════════════════════════════════════════════════════════════ */

let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`\n[${signal}] Received shutdown signal, gracefully shutting down...`);

  // Прекращаем принимать новые подключения
  server.close(() => {
    logger.info('✓ HTTP server closed');

    // Очистка ресурсов
    try {
      cacheService.shutdown();
      logger.info('✓ Cache service shut down');
    } catch (error) {
      logger.error('✗ Error during cache shutdown:', error);
    }

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  });

  // Форсированное завершение через 10 секунд
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

/* ═══════════════════════════════════════════════════════════════════════════
   🛠️ UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Получить версию из package.json
 */
function getVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   📤 EXPORTS (для тестов)
   ═══════════════════════════════════════════════════════════════════════════ */

module.exports = { app, server, config };