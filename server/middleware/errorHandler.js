/**
 * Глобальный обработчик ошибок
 */
export function errorHandler(err, req, res, next) {
  // ============================================
  // 📝 ЛОГИРОВАНИЕ
  // ============================================
  
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: err.message,
    code: err.code || 'UNKNOWN_ERROR',
    status: err.status || err.statusCode || 500,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Добавляем stack trace только в dev
  if (process.env.NODE_ENV !== 'production') {
    errorLog.stack = err.stack;
    errorLog.body = req.body;
  }

  console.error('❌ Error:', errorLog);

  // ============================================
  // 🔍 СПЕЦИФИЧНЫЕ ОШИБКИ
  // ============================================

  // CORS errors
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      error: 'cors_error',
      code: 'CORS_ERROR',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'validation_error',
      code: 'VALIDATION_ERROR',
      message: err.message,
      details: err.details || null,
      fallback: req.body || null
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'authentication_error',
      code: 'AUTH_ERROR',
      message: 'Invalid or expired token'
    });
  }

  // Rate limit errors
  if (err.status === 429 || err.statusCode === 429) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: err.retryAfter || 900
    });
  }

  // Translation errors
  if (err.code === 'TRANSLATION_FAILED' || err.message.includes('translation')) {
    return res.status(500).json({
      error: 'translation_error',
      code: 'TRANSLATION_FAILED',
      message: 'Translation service temporarily unavailable',
      fallback: req.body?.text || req.body?.resumeData || req.body?.vacancies || null
    });
  }

  // API errors (Gemini, OpenRouter)
  if (err.code === 'API_ERROR' || err.status === 503) {
    return res.status(503).json({
      error: 'service_unavailable',
      code: 'API_ERROR',
      message: 'External API temporarily unavailable. Please try again later.',
      fallback: req.body?.text || null
    });
  }

  // Network errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: 'network_error',
      code: 'NETWORK_ERROR',
      message: 'Network connection problem. Please try again later.',
      fallback: req.body || null
    });
  }

  // Payload too large
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'payload_too_large',
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload is too large',
      limit: '10MB'
    });
  }

  // JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'invalid_json',
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body'
    });
  }

  // Not found errors
  if (err.status === 404) {
    return res.status(404).json({
      error: 'not_found',
      code: 'NOT_FOUND',
      message: err.message || 'Resource not found',
      path: req.path
    });
  }

  // ============================================
  // 🛡️ DEFAULT ERROR (500)
  // ============================================
  
  const status = err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(status).json({
    error: err.name || 'internal_error',
    code: err.code || 'INTERNAL_ERROR',
    message: isDevelopment 
      ? err.message 
      : 'An unexpected error occurred. Please try again later.',
    
    // Fallback данные для клиента
    fallback: req.body || null,
    
    // Stack trace только в development
    ...(isDevelopment && { 
      stack: err.stack,
      details: {
        path: req.path,
        method: req.method,
        query: req.query,
        params: req.params
      }
    })
  });
}

/**
 * 404 Handler - для несуществующих роутов
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'not_found',
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET /health',
      'POST /api/translate/text',
      'POST /api/translate/resume',
      'POST /api/translate/vacancies',
      'POST /api/translate/recommendations'
    ]
  });
}

/**
 * Async error wrapper - для автоматической обработки async ошибок
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error - helper для создания кастомных ошибок
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Экспорт по умолчанию для совместимости
export default errorHandler;