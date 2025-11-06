import rateLimit from 'express-rate-limit';

// ============================================
// 🚦 TRANSLATION API RATE LIMITER
// ============================================

/**
 * Rate limiter для переводов
 * 100 запросов за 15 минут на IP
 */
export const translationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
  
  message: { 
    error: 'Too many translation requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 900 // секунды (15 минут)
  },
  
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Ключ для определения клиента
  keyGenerator: (req) => {
    // Используем IP или user ID если авторизован
    return req.user?.id || req.ip;
  },
  
  // Пропускать успешные кэшированные запросы
  skip: (req, res) => {
    // Если ответ пришел из кэша, не считаем в лимит
    return res.locals.fromCache === true;
  },
  
  // Кастомный обработчик при превышении лимита
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded: ${req.ip} on ${req.path}`);
    
    res.status(429).json({
      error: 'Too many translation requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Please try again after 15 minutes',
      retryAfter: 900,
      limit: 100,
      windowMs: 900000
    });
  }
});

// ============================================
// 🚦 GENERAL API RATE LIMITER
// ============================================

/**
 * Rate limiter для общих API запросов
 * 200 запросов за 15 минут
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  
  message: { 
    error: 'Too many API requests',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  skip: (req) => {
    // Пропускаем health checks
    const healthPaths = ['/health', '/healthz', '/alive', '/ready'];
    return healthPaths.includes(req.path);
  },
  
  handler: (req, res) => {
    console.warn(`⚠️ API rate limit exceeded: ${req.ip} on ${req.path}`);
    
    res.status(429).json({
      error: 'Too many API requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Please try again later',
      retryAfter: 900
    });
  }
});

// ============================================
// 🚦 STRICT RATE LIMITER (для чувствительных операций)
// ============================================

/**
 * Строгий rate limiter для чувствительных операций
 * 10 запросов за 15 минут
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  
  message: { 
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  handler: (req, res) => {
    console.warn(`⚠️ Strict rate limit exceeded: ${req.ip} on ${req.path}`);
    
    res.status(429).json({
      error: 'Too many requests to this endpoint',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'This endpoint has a strict rate limit. Please try again later.',
      retryAfter: 900
    });
  }
});

// ============================================
// 🚦 RESUME EXPORT RATE LIMITER
// ============================================

/**
 * Rate limiter для экспорта резюме
 * 50 экспортов за час
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 50,
  
  message: { 
    error: 'Too many export requests',
    code: 'EXPORT_LIMIT_EXCEEDED'
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  handler: (req, res) => {
    console.warn(`⚠️ Export limit exceeded: ${req.ip}`);
    
    res.status(429).json({
      error: 'Too many export requests',
      code: 'EXPORT_LIMIT_EXCEEDED',
      message: 'You have exceeded the export limit. Please try again in an hour.',
      retryAfter: 3600
    });
  }
});

// ============================================
// 🛠️ FACTORY FUNCTION (опционально)
// ============================================

/**
 * Создать кастомный rate limiter
 */
export function createRateLimiter({ 
  windowMs, 
  max, 
  message, 
  skipSuccessfulRequests = false,
  skipPaths = []
}) {
  return rateLimit({
    windowMs,
    max,
    message: { 
      error: 'rate_limit_exceeded', 
      message 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    
    skip: (req) => {
      return skipPaths.includes(req.path);
    },
    
    handler: (req, res) => {
      console.warn(`⚠️ Rate limit exceeded: ${req.ip} on ${req.path}`);
      
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}