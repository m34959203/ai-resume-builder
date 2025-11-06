'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom token для request ID
morgan.token('id', (req) => req.id);

// Custom token для user (если есть)
morgan.token('user', (req) => {
  return req.user?.id || req.userId || 'anonymous';
});

// Development format
const devFormat = ':id :method :url :status :res[content-length] - :response-time ms';

// Production format (JSON)
const prodFormat = (tokens, req, res) => {
  return JSON.stringify({
    id: tokens.id(req, res),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTime: tokens['response-time'](req, res),
    userAgent: tokens['user-agent'](req, res),
    ip: tokens['remote-addr'](req, res),
    user: tokens.user(req, res),
  });
};

module.exports = morgan(isDevelopment ? devFormat : prodFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    },
  },
  skip: (req) => {
    // Пропускаем health checks
    return req.path === '/healthz' || req.path === '/alive' || req.path === '/ready';
  },
});