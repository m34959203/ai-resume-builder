'use strict';

const NodeCache = require('node-cache');
const logger = require('../utils/logger');

/**
 * Cache Service с метриками
 */
class CacheService {
  constructor() {
    // Разные кэши для разных типов данных
    this.caches = {
      // Поиск вакансий (короткий TTL)
      search: new NodeCache({
        stdTTL: 90, // 90 секунд
        checkperiod: 120,
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 1000,
      }),

      // Справочники (долгий TTL)
      dictionaries: new NodeCache({
        stdTTL: 86400, // 24 часа
        checkperiod: 3600,
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 100,
      }),

      // Переводы (очень долгий TTL)
      translations: new NodeCache({
        stdTTL: 604800, // 7 дней
        checkperiod: 86400,
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 10000,
      }),

      // AI результаты
      ai: new NodeCache({
        stdTTL: 1800, // 30 минут
        checkperiod: 600,
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 500,
      }),
    };

    // Метрики
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    Object.entries(this.caches).forEach(([name, cache]) => {
      cache.on('expired', (key, value) => {
        logger.debug(`[Cache:${name}] Expired key: ${key}`);
      });

      cache.on('flush', () => {
        logger.info(`[Cache:${name}] Flushed`);
      });
    });
  }

  /**
   * Get from cache
   */
  get(cacheName, key) {
    const cache = this.caches[cacheName];
    if (!cache) {
      logger.warn(`[Cache] Unknown cache: ${cacheName}`);
      return undefined;
    }

    const value = cache.get(key);

    if (value !== undefined) {
      this.metrics.hits++;
      logger.debug(`[Cache:${cacheName}] HIT: ${key}`);
    } else {
      this.metrics.misses++;
      logger.debug(`[Cache:${cacheName}] MISS: ${key}`);
    }

    return value;
  }

  /**
   * Set to cache
   */
  set(cacheName, key, value, ttl) {
    const cache = this.caches[cacheName];
    if (!cache) {
      logger.warn(`[Cache] Unknown cache: ${cacheName}`);
      return false;
    }

    const success = cache.set(key, value, ttl);
    
    if (success) {
      this.metrics.sets++;
      logger.debug(`[Cache:${cacheName}] SET: ${key} (TTL: ${ttl || 'default'}s)`);
    }

    return success;
  }

  /**
   * Delete from cache
   */
  del(cacheName, key) {
    const cache = this.caches[cacheName];
    if (!cache) return 0;

    const deleted = cache.del(key);
    
    if (deleted > 0) {
      this.metrics.deletes += deleted;
      logger.debug(`[Cache:${cacheName}] DEL: ${key}`);
    }

    return deleted;
  }

  /**
   * Get or set (with producer function)
   */
  async getOrSet(cacheName, key, ttl, producer) {
    let value = this.get(cacheName, key);

    if (value !== undefined) {
      return value;
    }

    try {
      value = await producer();
      this.set(cacheName, key, value, ttl);
      return value;
    } catch (error) {
      logger.error(`[Cache:${cacheName}] Producer failed for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Flush specific cache
   */
  flush(cacheName) {
    const cache = this.caches[cacheName];
    if (!cache) return;

    cache.flushAll();
    logger.info(`[Cache:${cacheName}] Flushed`);
  }

  /**
   * Flush all caches
   */
  flushAll() {
    Object.keys(this.caches).forEach((name) => this.flush(name));
  }

  /**
   * Get cache size
   */
  getSize(cacheName) {
    if (cacheName) {
      return this.caches[cacheName]?.keys().length || 0;
    }

    return Object.values(this.caches).reduce((sum, cache) => sum + cache.keys().length, 0);
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      metrics: { ...this.metrics },
      caches: {},
    };

    Object.entries(this.caches).forEach(([name, cache]) => {
      stats.caches[name] = {
        keys: cache.keys().length,
        stats: cache.getStats(),
      };
    });

    return stats;
  }

  /**
   * Get metrics
   */
  getHits() {
    return this.metrics.hits;
  }

  getMisses() {
    return this.metrics.misses;
  }

  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Health check
   */
  isReady() {
    return Object.values(this.caches).every((cache) => cache !== null);
  }

  /**
   * Shutdown
   */
  shutdown() {
    logger.info('[Cache] Shutting down...');
    
    const stats = this.getStats();
    logger.info('[Cache] Final stats:', stats);

    this.flushAll();

    Object.values(this.caches).forEach((cache) => cache.close());
    
    logger.info('[Cache] Shutdown complete');
  }
}

module.exports = new CacheService();