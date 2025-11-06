'use strict';

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Создать rate limiter
 */
function createRateLimiter({ windowMs, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'rate_limit_exceeded', message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      logger.warn(`[Rate Limit] ${req.ip} exceeded ${max} requests in ${windowMs}ms`, {
        path: req.path,
        ip: req.ip,
      });

      res.status(429).json({
        error: 'rate_limit_exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    skip: (req) => {
      // Пропускаем health checks
      return req.path === '/healthz' || req.path === '/alive' || req.path === '/ready';
    },
  });
}

module.exports = { createRateLimiter };