/* eslint-disable no-console */
'use strict';

/**
 * courseAggregator.js — Реальный парсинг курсов с Stepik, Coursera, YouTube
 *
 * Stepik:   Открытый API (без ключа) — поиск + детали курсов
 * Coursera: Парсинг поисковой страницы (без ключа)
 * YouTube:  YouTube Data API v3 (нужен YOUTUBE_API_KEY) или fallback на ссылки
 *
 * Все запросы с таймаутами, кешированием и graceful fallback.
 */

const CACHE_TTL_MS = Number(process.env.COURSE_CACHE_TTL_MS || 30 * 60 * 1000); // 30 мин
const FETCH_TIMEOUT = 8000;
const YOUTUBE_API_KEY = (process.env.YOUTUBE_API_KEY || '').trim();

const _cache = new Map();
function cacheGet(key) {
  const it = _cache.get(key);
  if (!it) return null;
  if (it.exp < Date.now()) { _cache.delete(key); return null; }
  return it.data;
}
function cacheSet(key, data, ttl = CACHE_TTL_MS) {
  _cache.set(key, { exp: Date.now() + ttl, data });
  // Не даём кешу расти бесконечно
  if (_cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of _cache) {
      if (v.exp < now) _cache.delete(k);
    }
  }
}

async function fetchWithTimeout(url, opts = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, ...opts });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/* ======================== STEPIK ======================== */

async function fetchStepik(query, limit = 4) {
  const cacheKey = `stepik:${query}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://stepik.org/api/search-results?query=${encodeURIComponent(query)}&type=course&page=1&page_size=${limit}`;
    const res = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = (data['search-results'] || []).map((item) => ({
      provider: 'Stepik',
      title: item.course_title || query,
      url: `https://stepik.org/course/${item.course || item.target_id}`,
      cover: item.course_cover || '',
      duration: '',
      source: 'api',
    }));

    // Подтянем детали (workload) для первых курсов
    const courseIds = (data['search-results'] || [])
      .map((r) => r.course || r.target_id)
      .filter(Boolean)
      .slice(0, limit);

    if (courseIds.length) {
      try {
        const detailUrl = `https://stepik.org/api/courses?ids[]=${courseIds.join('&ids[]=')}`;
        const detailRes = await fetchWithTimeout(detailUrl, {
          headers: { 'Accept': 'application/json' },
        });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const courseMap = new Map();
          (detailData.courses || []).forEach((c) => courseMap.set(c.id, c));

          results.forEach((r) => {
            const id = Number(r.url.split('/course/')[1]);
            const detail = courseMap.get(id);
            if (detail) {
              if (detail.workload) r.duration = detail.workload;
              if (detail.summary) r.description = detail.summary.slice(0, 200);
              if (detail.cover) r.cover = detail.cover;
              if (detail.learners_count) r.learners = detail.learners_count;
            }
          });
        }
      } catch {
        // детали — не критичны
      }
    }

    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[courseAggregator/stepik]', e?.message || e);
    return [];
  }
}

/* ======================== COURSERA ======================== */

/**
 * Coursera отключила публичный поиск через API (courses.v1?q=search).
 * Используем парсинг их GraphQL search endpoint.
 * Если не работает — fallback на ссылки поиска.
 */
async function fetchCoursera(query, limit = 3) {
  const cacheKey = `coursera:${query}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    // Coursera Search API (internal GraphQL, может измениться)
    const searchUrl = `https://www.coursera.org/api/search/v1?query=${encodeURIComponent(query)}&limit=${limit}&entityTypes=PRODUCTS&index=prod_all_products_term_optimization_filtered`;
    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Resume-Builder/1.0)',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const elements = data.elements || data.hits || [];

    const results = elements.slice(0, limit).map((item) => {
      const name = item.name || item.title || query;
      const slug = item.objectUrl || item.slug || '';
      const url = slug.startsWith('http')
        ? slug
        : slug.startsWith('/')
          ? `https://www.coursera.org${slug}`
          : `https://www.coursera.org/learn/${slug}`;
      const partners = Array.isArray(item.partners) ? item.partners.map((p) => p.name || p).join(', ') : '';

      return {
        provider: partners ? `Coursera (${partners})` : 'Coursera',
        title: name,
        url,
        cover: item.imageUrl || item.photoUrl || '',
        duration: item.productDuration || '',
        source: 'api',
      };
    });

    if (results.length) {
      cacheSet(cacheKey, results);
      return results;
    }
  } catch (e) {
    console.warn('[courseAggregator/coursera] API fallback:', e?.message || e);
  }

  // Fallback: ссылки на поиск
  const fallback = [{
    provider: 'Coursera',
    title: `${query} — специализации`,
    url: `https://www.coursera.org/search?query=${encodeURIComponent(query)}`,
    cover: '',
    duration: '1–3 мес',
    source: 'search-link',
  }];
  cacheSet(cacheKey, fallback, CACHE_TTL_MS / 2);
  return fallback;
}

/* ======================== YOUTUBE ======================== */

/**
 * YouTube Data API v3 (нужен YOUTUBE_API_KEY).
 * Если ключа нет — fallback на ссылки поиска.
 */
async function fetchYouTube(query, limit = 3) {
  const cacheKey = `youtube:${query}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (YOUTUBE_API_KEY) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: `${query} tutorial курс`,
        type: 'video',
        maxResults: String(limit),
        videoDuration: 'medium',
        relevanceLanguage: 'ru',
        order: 'relevance',
        key: YOUTUBE_API_KEY,
      });
      const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
      const res = await fetchWithTimeout(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const results = (data.items || []).map((item) => ({
        provider: 'YouTube',
        title: item.snippet?.title || query,
        url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
        cover: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        duration: '',
        channel: item.snippet?.channelTitle || '',
        source: 'api',
      }));

      if (results.length) {
        cacheSet(cacheKey, results);
        return results;
      }
    } catch (e) {
      console.warn('[courseAggregator/youtube] API error:', e?.message || e);
    }
  }

  // Fallback: ссылки на поиск YouTube
  const q = encodeURIComponent(`${query} tutorial курс`);
  const fallback = [{
    provider: 'YouTube',
    title: `${query} — видеоуроки`,
    url: `https://www.youtube.com/results?search_query=${q}`,
    cover: '',
    duration: 'видео',
    source: 'search-link',
  }];
  cacheSet(cacheKey, fallback, CACHE_TTL_MS / 2);
  return fallback;
}

/* ======================== MAIN ======================== */

/**
 * getCourses({ gaps, keywords })
 * → массив { provider, title, url, cover?, duration?, description?, source }
 *
 * gaps: [{ name: 'React' }, { name: 'TypeScript' }, ...]
 * keywords: 'React, TypeScript' (альтернатива)
 */
exports.getCourses = async function getCourses({ gaps = [], keywords = '' } = {}) {
  const skills = (Array.isArray(gaps) ? gaps : [])
    .map((g) => String(g.name || g || '').trim())
    .filter(Boolean);

  // Если gaps пустые — парсим keywords
  if (!skills.length && keywords) {
    keywords.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).forEach((s) => skills.push(s));
  }

  const uniq = Array.from(new Set(skills)).slice(0, 5);
  if (!uniq.length) return [];

  const allResults = [];

  // Запросы по каждому навыку — параллельно по провайдерам
  const perSkillLimit = Math.max(2, Math.ceil(12 / uniq.length));

  await Promise.all(
    uniq.map(async (skill) => {
      const [stepik, coursera, youtube] = await Promise.allSettled([
        fetchStepik(skill, Math.min(perSkillLimit, 3)),
        fetchCoursera(skill, Math.min(perSkillLimit, 2)),
        fetchYouTube(skill, Math.min(perSkillLimit, 2)),
      ]);

      // Stepik первый (лучше для РУ-аудитории)
      if (stepik.status === 'fulfilled') allResults.push(...stepik.value);
      if (coursera.status === 'fulfilled') allResults.push(...coursera.value);
      if (youtube.status === 'fulfilled') allResults.push(...youtube.value);
    })
  );

  // Дедупликация по URL
  const seen = new Set();
  const deduped = [];
  for (const item of allResults) {
    const key = item.url;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 15);
};

/**
 * Очистка кеша (для тестов / ручного сброса)
 */
exports.clearCache = function clearCache() {
  _cache.clear();
};
