// server/services/translator.js
/* eslint-disable no-console */
'use strict';

/**
 * DeepSeek Translator Service
 * -----------------------------------------
 * Возможности:
 *  - Прямой вызов DeepSeek Chat Completions (model: deepseek-chat по умолчанию)
 *  - Чанкинг длинных текстов (по абзацам → по предложениям)
 *  - Ин-мемори кэш с TTL + ограничение по размеру
 *  - Защита от таймаутов/429/5xx, частичный прогресс для батч-перевода
 *  - Аккуратные промпты с опцией html=true (сохранение тегов)
 *  - Мягкий фолбэк при отсутствии API-ключа (возврат исходного текста)
 *
 * Требования: Node.js 18+ (встроенный fetch)
 *
 * Экспорт:
 *  - translateText(options)             → основной метод (строка → строка)
 *  - translateMany(array, options)      → батч переводов (массив строк)
 *  - splitIntoChunks(text, maxChars)    → утилита чанкинга
 *  - deepseekTranslateChunk(text, opts) → низкоуровневый перевод одного чанка
 *  - clearCache()                       → очистка кэша
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/* ============================ ENV LOADING (SAFE) ============================ */
(() => {
  const isRender = !!process.env.RENDER;
  if (!isRender) {
    const rootEnv = path.resolve(__dirname, '..', '..', '.env');
    const localEnv = path.resolve(__dirname, '..', '.env');
    // Сначала корневой .env, затем локальный, override=false
    require('dotenv').config({ path: rootEnv, override: false });
    require('dotenv').config({ path: localEnv, override: false });
  }
})();

/* =================================== ENV ==================================== */
const {
  // Прямой ключ DeepSeek (основной)
  API_KEY_DEEPSEEK,
  DEEPSEEK_API_KEY,              // альтернативное имя переменной

  // Модель (по умолчанию deepseek-chat)
  DEEPSEEK_MODEL,

  // Тюнинги переводчика
  TRANSLATE_TTL_MS = String(24 * 3600 * 1000), // 24 часа
  TRANSLATE_MAX_CHARS = '200000',
  TRANSLATE_CHUNK_CHARS = '3500',
  TRANSLATE_TEMP = '0.2',
  DEEPSEEK_TIMEOUT_MS = '25000',

  // Отладочный вывод
  TRANSLATE_DEBUG = '',
} = process.env;

const DS_API_KEY = API_KEY_DEEPSEEK || DEEPSEEK_API_KEY || '';
const DS_MODEL   = DEEPSEEK_MODEL || 'deepseek-chat';
const DS_URL     = 'https://api.deepseek.com/chat/completions';

const TX_TTL       = Math.max(60_000, Number(TRANSLATE_TTL_MS) || 24 * 3600 * 1000);
const TX_MAX_INPUT = Math.max(10_000, Number(TRANSLATE_MAX_CHARS) || 200_000);
const TX_CHUNK     = Math.max(1000, Number(TRANSLATE_CHUNK_CHARS) || 3500);
const TX_TEMP      = Math.max(0, Math.min(1, Number(TRANSLATE_TEMP) || 0.2));
const DS_TIMEOUT   = Math.max(5_000, Number(DEEPSEEK_TIMEOUT_MS) || 25_000);

const DEBUG = /^(1|true|yes)$/i.test(String(TRANSLATE_DEBUG || ''));

/* =============================== SMALL HELPERS ============================== */

function debug(...args) {
  if (DEBUG) console.log('[translator]', ...args);
}

function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

// fetch с таймаутом (Node 18+)
async function fetchWithTimeout(resource, options = {}, ms = DS_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error('Fetch timeout')), ms);
  try {
    return await fetch(resource, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/* =============================== LANGUAGE NAMES ============================= */

const LANG_NAME = {
  ru: 'Russian',
  en: 'English',
  kk: 'Kazakh',
  kz: 'Kazakh',
  uk: 'Ukrainian',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  ar: 'Arabic',
  zh: 'Chinese',
  'zh-cn': 'Chinese (Simplified)',
  'zh-tw': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
};

function langToName(codeOrName = '') {
  const c = String(codeOrName || '').toLowerCase().trim();
  if (!c) return '';
  return LANG_NAME[c] || c.charAt(0).toUpperCase() + c.slice(1);
}

/* =============================== MEMORY CACHE =============================== */

class TTLCache {
  /**
   * @param {number} ttlMs
   * @param {number} maxEntries
   */
  constructor(ttlMs = TX_TTL, maxEntries = 1000) {
    this.ttl = ttlMs;
    this.max = maxEntries;
    this.map = new Map(); // key -> { value, expires, at }
  }
  _purgeExpired() {
    const now = Date.now();
    for (const [k, v] of this.map) {
      if (v.expires <= now) this.map.delete(k);
    }
  }
  _evictIfNeeded() {
    if (this.map.size <= this.max) return;
    // удалить самые старые по at
    const arr = [...this.map.entries()].sort((a, b) => a[1].at - b[1].at);
    const toDrop = this.map.size - this.max;
    for (let i = 0; i < toDrop; i += 1) {
      this.map.delete(arr[i][0]);
    }
  }
  get(key) {
    this._purgeExpired();
    const v = this.map.get(key);
    if (!v) return undefined;
    if (v.expires <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return v.value;
  }
  set(key, value, ttlMs = this.ttl) {
    this._purgeExpired();
    this.map.set(key, { value, expires: Date.now() + ttlMs, at: Date.now() });
    this._evictIfNeeded();
  }
  clear() {
    this.map.clear();
  }
}

const cache = new TTLCache(TX_TTL, 1000);
const inflight = new Map(); // key -> Promise<string>

/* ================================ CHUNKING ================================= */

function splitIntoChunks(text, maxChars = TX_CHUNK) {
  const t = String(text || '');
  if (t.length <= maxChars) return [t];

  const parts = [];
  const paras = t.split(/\n{2,}/); // крупный шаг: по абзацам
  let buf = '';

  const pushBuf = () => {
    if (buf) {
      parts.push(buf);
      buf = '';
    }
  };

  for (const p of paras) {
    const candidate = buf ? `${buf}\n\n${p}` : p;
    if (candidate.length > maxChars) {
      if (buf) pushBuf();
      if (p.length <= maxChars) {
        buf = p;
      } else {
        // дробим длинный абзац по предложениям
        const sentences = p.split(/(?<=[.!?])\s+/);
        let cur = '';
        for (const s of sentences) {
          const cand = cur ? `${cur} ${s}` : s;
          if (cand.length > maxChars) {
            if (cur) parts.push(cur);
            cur = s;
          } else {
            cur = cand;
          }
        }
        if (cur) parts.push(cur);
        buf = '';
      }
    } else {
      buf = candidate;
    }
  }
  pushBuf();
  return parts;
}

/* =========================== DEEPSEEK LOW-LEVEL CALL ======================== */

/**
 * Перевод одного чанка текста через DeepSeek.
 * Возвращает строку с переведённым фрагментом.
 */
async function deepseekTranslateChunk(text, {
  sourceName = 'auto',
  targetName,
  html = false,
  temperature = TX_TEMP,
  model = DS_MODEL,
  abortSignal,
} = {}) {
  if (!DS_API_KEY) {
    // Мягкий фолбэк: без ключа возвращаем исходный фрагмент, чтобы не ломать UI.
    return String(text || '');
  }

  const systemMsg = [
    'You are a professional translator.',
    'Translate the user text to the requested target language.',
    'Preserve meaning, tone, numbers, names, and layout.',
    html
      ? 'The input may contain HTML markup. Keep tags/attributes intact and translate only the human-readable text. Do not add or remove tags.'
      : 'Input is plain text. Preserve line breaks.',
    'Return ONLY the translated text with no explanations.',
  ].join(' ');

  // Ограничим размер message (защита от слишком больших чанков при ошибочной конфигурации)
  const safeText = String(text || '');
  const userMsg = [
    sourceName && String(sourceName).toLowerCase() !== 'auto'
      ? `Source language: ${sourceName}` : 'Source language: auto',
    `Target language: ${targetName}`,
    'Text:',
    '<<<',
    safeText,
    '>>>',
  ].join('\n');

  const body = {
    model,
    temperature: typeof temperature === 'number' ? temperature : TX_TEMP,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ],
  };

  const r = await fetchWithTimeout(DS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  }, DS_TIMEOUT);

  const txt = await r.text();
  if (!r.ok) {
    const detail = txt.slice(0, 600);
    const err = new Error(`deepseek_http_${r.status}`);
    err.status = r.status;
    err.detail = detail;
    throw err;
  }

  let json = null;
  try {
    json = JSON.parse(txt);
  } catch {
    const err = new Error('deepseek_bad_json');
    err.status = 502;
    err.detail = txt.slice(0, 400);
    throw err;
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error('deepseek_empty_content');
    err.status = 502;
    err.detail = txt.slice(0, 400);
    throw err;
  }
  return content;
}

/* ================================ TRANSLATE ================================= */

/**
 * @typedef {Object} TranslateOptions
 * @property {string} target              - Целевой язык (код/название)
 * @property {string} [source='auto']     - Источник (auto|код|название)
 * @property {boolean} [html=false]       - Вход содержит HTML
 * @property {number}  [temperature]      - Температура модели
 * @property {string}  [model]            - deepseek-chat / ваш кастом
 * @property {number}  [maxChars]         - Максимальная длина входного текста
 * @property {number}  [chunkChars]       - Размер чанка
 * @property {number}  [ttlMs]            - TTL кэша для результата
 * @property {AbortSignal} [signal]       - AbortSignal для отмены
 * @property {string}  [domain]           - Необязательный домен/сфера (для промпта)
 */

/**
 * Перевод одного текста.
 * Возвращает объект { ok, translated, provider, chunks, cached, fallback?, meta }
 */
async function translateText(text, opts = /** @type {TranslateOptions} */({})) {
  const {
    target = 'ru',
    source = 'auto',
    html = false,
    temperature = TX_TEMP,
    model = DS_MODEL,
    maxChars = TX_MAX_INPUT,
    chunkChars = TX_CHUNK,
    ttlMs = TX_TTL,
    signal,
    domain = '',
  } = opts || {};

  const raw = String(text ?? '');
  if (!raw.trim()) {
    return { ok: true, translated: '', provider: 'noop', chunks: 0, cached: false };
  }
  if (raw.length > maxChars) {
    const err = new Error('text_too_long');
    err.status = 413;
    err.max = maxChars;
    throw err;
  }

  const targetName = langToName(target);
  if (!targetName) {
    const err = new Error('target_invalid');
    err.status = 400;
    throw err;
  }

  const srcName = source && String(source).toLowerCase() !== 'auto' ? langToName(source) : 'auto';
  if (srcName !== 'auto' && srcName.toLowerCase() === targetName.toLowerCase()) {
    // Нет смысла переводить в тот же язык
    return { ok: true, translated: raw, provider: DS_API_KEY ? 'noop' : 'fallback', chunks: 1, cached: false };
    }

  // Ключ кэша: источник+цель+html+модель+domain+текст
  const cacheKey = sha1([srcName, targetName, html ? 'html' : 'plain', model, String(domain || ''), raw].join('|'));
  const fromCache = cache.get(cacheKey);
  if (fromCache) {
    debug('cache hit', cacheKey);
    return { ok: true, translated: fromCache, provider: 'cache', chunks: fromCache.split('\n').length, cached: true };
  }

  // Разбиваем на chunks
  const chunks = splitIntoChunks(raw, chunkChars);
  const outputs = [];

  // Для коалесинга параллельных запросов по chunk + настройкам
  const mkChunkKey = (chunk) => sha1([srcName, targetName, html ? 'html' : 'plain', model, chunk].join('|'));

  for (let i = 0; i < chunks.length; i += 1) {
    const piece = chunks[i];
    const key = mkChunkKey(piece);

    let p = inflight.get(key);
    if (!p) {
      p = deepseekTranslateChunk(piece, { sourceName: srcName, targetName, html, temperature, model, abortSignal: signal })
        .catch((e) => {
          // не оставляем висящих промисов в карте
          throw e;
        })
        .finally(() => {
          inflight.delete(key);
        });
      inflight.set(key, p);
    }

    try {
      const translated = await p;
      outputs.push(translated);
    } catch (e) {
      debug('chunk fail', i, e?.status || '', e?.message || e);
      if (outputs.length) {
        // Вернём частичный результат — пусть UI решает, что делать
        return {
          ok: false,
          partial: outputs.join('\n\n'),
          error: 'translate_partial_failure',
          chunk_index: i,
          status: e?.status || 502,
        };
      }
      // Полный фэйл — мягкий фолбэк: отдать исходник
      if (!DS_API_KEY) {
        return { ok: true, translated: raw, provider: 'fallback', chunks: chunks.length, cached: false, fallback: true };
      }
      const err = new Error('translate_failed');
      err.status = e?.status || 502;
      err.detail = e?.detail || '';
      throw err;
    }
  }

  const translated = outputs.join('\n\n');
  cache.set(cacheKey, translated, ttlMs);

  return {
    ok: true,
    translated,
    provider: DS_API_KEY ? 'deepseek' : 'fallback',
    chunks: chunks.length,
    cached: false,
    meta: { model, html: !!html, source: srcName, target: targetName, domain: String(domain || '') },
  };
}

/**
 * Батч-перевод массива строк.
 * Возвращает массив результатов по форме translateText()
 */
async function translateMany(texts, opts = /** @type {TranslateOptions} */({})) {
  const arr = Array.isArray(texts) ? texts : [];
  const out = [];
  for (let i = 0; i < arr.length; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await translateText(arr[i], opts);
      out.push(r);
    } catch (e) {
      out.push({ ok: false, error: e?.message || 'translate_failed', status: e?.status || 500 });
    }
  }
  return out;
}

function clearCache() {
  cache.clear();
}

/* ================================== EXPORTS ================================= */

module.exports = {
  translateText,
  translateMany,
  splitIntoChunks,
  deepseekTranslateChunk,
  clearCache,
  // Для тестов/диагностики:
  _internals: {
    cache,
    sha1,
    langToName,
    defaults: { TX_TTL, TX_MAX_INPUT, TX_CHUNK, TX_TEMP, DS_TIMEOUT, DS_MODEL },
  },
};
