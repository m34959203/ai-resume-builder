'use strict';

/**
 * Environment validation
 */

function validateEnv(config) {
  const errors = [];

  // Обязательные переменные для production
  if (config.isProduction) {
    if (!config.frontOrigins.length) {
      errors.push('FRONT_ORIGINS is required in production');
    }
  }

  // Проверка HH конфигурации
  if (config.hh.clientId && !config.hh.clientSecret) {
    errors.push('HH_CLIENT_SECRET is required when HH_CLIENT_ID is set');
  }

  // Проверка портов
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push(`Invalid PORT: ${config.port}`);
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Валидация search параметров
 */
function validateSearchParams(params) {
  const errors = [];

  if (params.per_page && (params.per_page < 1 || params.per_page > 100)) {
    errors.push('per_page must be between 1 and 100');
  }

  if (params.page && params.page < 0) {
    errors.push('page must be >= 0');
  }

  if (params.salary && params.salary < 0) {
    errors.push('salary must be >= 0');
  }

  if (params.experience) {
    const validExperience = ['none', '0-1', '1-3', '3-6', '6+', 
                             'noExperience', 'between1And3', 'between3And6', 'moreThan6'];
    if (!validExperience.includes(params.experience)) {
      errors.push(`Invalid experience: ${params.experience}`);
    }
  }

  return errors;
}

module.exports = {
  validateEnv,
  validateSearchParams,
};