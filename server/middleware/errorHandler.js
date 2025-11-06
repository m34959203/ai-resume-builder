'use strict';

const logger = require('../utils/logger');

/**
 * Глобальный обработчик ошибок
 */
function errorHandler(err, req, res, next) {
  // Логирование
  logger.error('[Error Handler]', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
    body: req.body,
  });

  // CORS errors
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      error: 'cors_error',
      message: 'Origin not allowed',
      origin: req.headers.origin,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'validation_error',
      message: err.message,
      details: err.details || null,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'authentication_error',
      message: 'Invalid or expired token',
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many requests',
      retryAfter: err.retryAfter || 60,
    });
  }

  // Default error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: err.code || 'internal_error',
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
    requestId: req.id,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;