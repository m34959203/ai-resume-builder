// server/services/translate.js
/* eslint-disable no-console */
'use strict';

/**
 * Универсальный переводчик через OpenRouter (free-модели).
 * Особенности:
 *  - Ретраи на 429/5xx с уважением Retry-After;
 *  - Таймаут на запрос (по умолчанию 30 c, настраивается OR_TIMEOUT_MS);
 *  - Защита плейсхолдеров/кода/URL: временно маскируем и восстанавливаем после перевода;
 *  - Поддержка HTML: сохраняем теги, переводим видимый текст (попросили модель и защищаем атрибуты/URL);
 *  - Пакетный перевод выполняется ПОСЛЕДОВАТЕЛЬНО (на free-тарифе это устойчивее).
 *
 * ENV (server/.env):
 *  OPENROUTER_API_KEY=...
 *  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
 *  OPENROUTER_MODEL=deepseek/deepseek-r1:free
 *  OPENROUTER_REFERER=http://localhost:5173
 *  OPENROUTER_TITLE=AI Resume Builder
 *  OR_TIMEOUT_MS=30000
 */

const BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/,'');
const OPENROUTER_URL = `${BASE_URL}/chat/completions`;

const MODELS = {
  primary: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free',
  complex: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free',
};

const DEFAULT_TIMEOUT = Math.max(5_000, Number(process.env.OR_TIMEOUT_MS || 30_000) || 30_000);

function ensureKey() {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new Error('OPENROUTER_API_KEY is not set');
  return k;
}

function baseHeaders() {
  const h = {
    Authorization: `Bearer ${ensureKey()}`,
    'Content-Type': 'application/json',
  };
  // Рекомендовано OpenRouter для аналитики/квот
  if (process.env.OPENROUTER_REFERER) h['HTTP-Referer'] = process.env.OPENROUTER_REFERER;
  if (process.env.OPENROUTER_TITLE)   h['X-Title']      = process.env.OPENROUTER_TITLE;
  return h;
}

/* --------------------------------- Helpers --------------------------------- */

function withTimeout(factory, ms = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error('Timeout')), ms);
  return factory(ctrl.signal)
    .finally(() => clearTimeout(id));
}

// Простая экспоненциальная пауза с верхним пределом
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function tryParseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fence = /```json([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  return null;
}

function normLang(v) {
  const s = String(v || '').toLowerCase().trim();
  if (!s || s === 'auto') return 'auto';
  if (['kk','kz','kk-kz'].includes(s)) return 'kk';
  if (['ru','ru-ru'].includes(s)) return 'ru';
  if (['en','en-us','en-gb'].includes(s)) return 'en';
  return s; // пропускаем произвольные BCP-47 при желании
}

function isLikelyHTML(text) {
  const s = String(text || '');
  return /<\w+[^>]*>/.test(s) && /<\/\w+>/.test(s);
}

// Маскируем «недотрогаемые» сегменты, чтобы LLM их не меняла
function maskProtect(raw, { html = false } = {}) {
  let text = String(raw ?? '');
  const restores = [];

  // 1) Тройные code-fence ```...```
  text = text.replace(/```([\s\S]*?)```/g, (_m, g1) => {
    const token = `__KEEP_BLOCK_${restores.length}__`;
    restores.push({ token, val: '```' + g1 + '```' });
    return token;
  });

  // 2) Инлайн-код `...`
  text = text.replace(/`([^`]+)`/g, (_m, g1) => {
    const token = `__KEEP_INLINE_${restores.length}__`;
    restores.push({ token, val: '`' + g1 + '`' });
    return token;
  });

  // 3) URL и email
  const urlRe = /\b((?:https?:\/\/|www\.)\S+)\b/gi;
  text = text.replace(urlRe, (m) => {
    const token = `__KEEP_URL_${restores.length}__`;
    restores.push({ token, val: m });
    return token;
  });
  const emailRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  text = text.replace(emailRe, (m) => {
    const token = `__KEEP_MAIL_${restores.length}__`;
    restores.push({ token, val: m });
    return token;
  });

  // 4) Шаблоны {{...}}, {0}, {name}, %s, %1$s, $1, :var
  const patterns = [
    /\{\{[^{}]+\}\}/g,               // {{...}}
    /\{[0-9]+\}/g,                   // {0}
    /\{[a-zA-Z_][\w-]*\}/g,          // {name}
    /%[sdifo]/gi,                    // %s, %d ...
    /%[0-9]+\$[sdifo]/gi,            // %1$s
    /\$[0-9]+\b/g,                   // $1
    /:[a-zA-Z_][\w-]*/g,             // :variable
  ];
  for (const re of patterns) {
    text = text.replace(re, (m) => {
      const token = `__KEEP_P_${restores.length}__`;
      restores.push({ token, val: m });
      return token;
    });
  }

  // 5) В HTML — дополнительно защищаем атрибуты ссылок/изображений (href/src)
  if (html || isLikelyHTML(text)) {
    text = text.replace(/\s(href|src)=["']([^"']+)["']/gi, (_m, attr, val) => {
      const token = `__KEEP_ATTR_${restores.length}__`;
      restores.push({ token, val });
      return ` ${attr}="${token}"`;
    });
  }

  return { text, restores };
}

function unmask(text, restores) {
  let out = String(text ?? '');
  for (let i = restores.length - 1; i >= 0; i -= 1) {
    const { token, val } = restores[i];
    out = out.replaceAll(token, val);
  }
  return out;
}

/* --------------------------- Low-level OpenRouter --------------------------- */

async function requestOpenRouter({ body, timeoutMs = DEFAULT_TIMEOUT }, { retries = 2 } = {}) {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await withTimeout(
      (signal) => fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: baseHeaders(),
        body: JSON.stringify(body),
        signal,
      }),
      timeoutMs
    );

    if (resp.ok) return resp;

    const status = resp.status;
    const retryAfter = Number(resp.headers?.get?.('Retry-After') || 0);
    const retriable = status === 429 || (status >= 500 && status < 600);

    if (attempt < retries && retriable) {
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(400 * (2 ** attempt), 3000);
      await sleep(backoff);
      attempt += 1;
      continue;
    }

    const text = await resp.text().catch(() => '');
    throw new Error(`OpenRouter ${status}: ${text}`);
  }
}

async function openrouterJSON({ messages, model, max_tokens = 900, temperature = 0.2, timeoutMs = DEFAULT_TIMEOUT }) {
  const base = { model, messages, temperature, max_tokens, stream: false };

  // 1) Попытка с response_format (json_object)
  const first = { ...base, response_format: { type: 'json_object' } };
  try {
    const r1 = await requestOpenRouter({ body: first, timeoutMs });
    const j1 = await r1.json();
    const c1 = j1?.choices?.[0]?.message?.content ?? '';
    const as1 = typeof c1 === 'string' ? tryParseJSON(c1) : c1;
    if (as1 && typeof as1 === 'object') return as1;
  } catch {
    // провалимся на попытку 2
  }

  // 2) Без response_format — дадим модели свободу, но распарсим
  const second = { ...base };
  const r2 = await requestOpenRouter({ body: second, timeoutMs });
  const j2 = await r2.json();
  const c2 = j2?.choices?.[0]?.message?.content ?? '';
  const as2 = typeof c2 === 'string' ? tryParseJSON(c2) : c2;
  return as2 ?? { text: String(c2 || '') };
}

/* --------------------------------- Public API ------------------------------- */

/**
 * Перевод одного текста.
 * @param {string} text
 * @param {object} opts
 *  - from: 'auto'|'kk'|'ru'|'en'|BCP-47
 *  - to:   'kk'|'ru'|'en'|BCP-47
 *  - html: boolean (true — вход воспринимается как HTML)
 *  - mode: 'keep-format'|'plain' (предпочтение оформления)
 *  - overrideModel: string (id модели OpenRouter)
 * @returns {Promise<{ text: string, modelUsed: string, detected?: string }>}
 */
async function translateText(text, opts = {}) {
  const from = normLang(opts.from || 'auto');
  const to = normLang(opts.to || 'ru');
  const html = !!opts.html || isLikelyHTML(text);
  const mode = opts.mode === 'plain' ? 'plain' : 'keep-format';
  const model = opts.overrideModel || MODELS.primary;

  // Маскируем чувствительные сегменты перед отправкой в LLM
  const masked = maskProtect(text, { html });

  const system = [
    'Ты — аккуратный переводчик.',
    'Требования:',
    '- Переводи естественно, сохраняй смысл и стиль.',
    '- Соблюдай переносы строк, списки, тире, нумерацию.',
    '- НЕ изменяй маркеры вида __KEEP_...__, они будут восстановлены.',
    '- Не переводить и не менять код/плейсхолдеры/URL/почту.',
    html ? '- Это HTML. Сохрани структуру и атрибуты. Переводи только видимый текст.' : '- Это обычный текст (не HTML).',
    `- Режим оформления: "${mode}".`,
    '- Если источник неизвестен, сам определи язык.',
    'Ответ — ТОЛЬКО JSON вида: {"text":"...", "detected":"<src-lang>"}',
  ].join('\n');

  const userPayload = {
    from, to, html, mode,
    text: String(masked.text ?? ''),
    note: 'Не изменяй __KEEP_*__ токены и не добавляй новых.',
  };

  let out;
  try {
    const res = await openrouterJSON({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      model,
      max_tokens: 1200,
      temperature: 0.1,
    });

    const translated =
      (typeof res?.text === 'string' ? res.text : String(masked.text || '')).trim();

    out = {
      text: unmask(translated, masked.restores),
      modelUsed: model,
      detected: typeof res?.detected === 'string' ? res.detected : undefined,
    };
  } catch (e) {
    // Фолбэк — возвращаем исходник, но не падаем
    console.warn('[translateText] fallback due to error:', e?.message || e);
    out = { text: String(text ?? ''), modelUsed: model, error: 'openrouter_failed' };
  }

  // Лёгкая нормализация пробелов
  out.text = String(out.text)
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*—\s*/g, ' — ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s*:\s*/g, ': ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/ +\./g, '.')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

/**
 * Пакетный перевод (последовательно для стабильности на free-лимитах).
 * items: Array<{ text, from?, to?, html?, mode? }>
 * opts: { from?, to?, html?, mode?, overrideModel? }
 */
async function translateBatch(items = [], opts = {}) {
  const arr = Array.isArray(items) ? items : [];
  const out = [];
  for (const it of arr) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await translateText(it?.text ?? '', {
      from: it?.from ?? opts.from ?? 'auto',
      to: it?.to ?? opts.to ?? 'ru',
      html: (typeof it?.html === 'boolean' ? it.html : opts.html),
      mode: it?.mode ?? opts.mode ?? 'keep-format',
      overrideModel: opts.overrideModel || MODELS.primary,
    }));
  }
  return out;
}

module.exports = {
  MODELS,
  translateText,
  translateBatch,
};
