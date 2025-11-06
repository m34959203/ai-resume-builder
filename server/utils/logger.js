'use strict';

/**
 * Structured Logger
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;
const isDevelopment = process.env.NODE_ENV !== 'production';

class Logger {
  constructor() {
    this.context = {};
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  log(level, message, ...args) {
    if (LOG_LEVELS[level] > currentLevel) return;

    const timestamp = new Date().toISOString();
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🐛',
    }[level] || 'ℹ️';

    if (isDevelopment) {
      // Красивый вывод в development
      console[level === 'error' ? 'error' : 'log'](
        `${emoji} [${timestamp}] ${level.toUpperCase()}:`,
        message,
        ...args
      );
    } else {
      // JSON для production (для парсинга логами)
      console[level === 'error' ? 'error' : 'log'](
        JSON.stringify({
          timestamp,
          level,
          message,
          context: this.context,
          data: args.length === 1 ? args[0] : args,
        })
      );
    }
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
}

module.exports = new Logger();