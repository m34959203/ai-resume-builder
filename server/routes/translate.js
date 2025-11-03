// server/routes/translate.js
const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

/* ======= Конфиг из .env (одна модель) ======= */
const BASE = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const ENDPOINT = `${BASE}/chat/completions`;
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free';
const API_KEY = process.env.OPENROUTER_API_KEY; // обязателен
const REFERER = process.env.OPENROUTER_REFERER || 'http://localhost:5173';
const TITLE = process.env.OPENROUTER_TITLE || 'AI Resume Builder';

if (!API_KEY) {
  // Печатать один раз при старте, чтобы не шуметь в логах
  console.warn('[translate] OPENROUTER_API_KEY is not set — /api/translate будет отдавать 500');
}

/* ======= Вспомогалки ======= */
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней
const cache = new Map(); // key -> {v, exp}

const norm = (x) => String(x || '').trim().toLowerCase();
const isRu = (l) => /^ru(-|$)/.test(norm(l));

function getCache(key) {
  const rec = cache.get(key);
  if (!rec) return null;
  if (rec.exp && Date.now() > rec.exp) { cache.delete(key); return null; }
  return rec.v;
}
function putCache(key, v, ttl = TTL_MS) {
  cache.set(key, { v, exp: ttl ? Date.now() + ttl : 0 });
}

async function callOpenRouter(messages) {
  if (!API_KEY) throw new Error('OPENROUTER_API_KEY is not set');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': REFERER,
      'X-Title': TITLE,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status} ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content?.trim() || '';
}

/* ======= Перевод одиночного текста ======= */
async function translateText(text, targetLang, { sourceLang = '', html = false, mode = '' } = {}) {
  const t = String(text ?? '');
  const L = norm(targetLang);
  if (!t || isRu(L)) return t;

  const key = `tr:${L}:${sourceLang || ''}:${html ? 1 : 0}:${mode}:${Buffer.from(t).toString('base64url')}`;
  const cached = getCache(key);
  if (cached != null) return cached;

  const system = `Translate into ${L}. Keep meaning, tone and formatting.
Preserve URLs and HTML tags if present. Return only the translated text without explanations.`;
  const user = (html ? 'HTML:' : 'Text:') + '\n' + t;

  const out = await callOpenRouter([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  putCache(key, out);
  return out;
}

/* ======= Перевод массива текстов (batch) ======= */
async function translateBatch(texts = [], targetLang, { sourceLang = '', html = false, mode = '' } = {}) {
  const L = norm(targetLang);
  if (!Array.isArray(texts) || texts.length === 0 || isRu(L)) return Array.isArray(texts) ? texts : [];

  const out = new Array(texts.length);
  const toSend = [];
  const idxs = [];

  texts.forEach((txt, i) => {
    const t = String(txt ?? '');
    if (!t) { out[i] = t; return; }
    const key = `tr:${L}:${sourceLang || ''}:${html ? 1 : 0}:${mode}:${Buffer.from(t).toString('base64url')}`;
    const c = getCache(key);
    if (c != null) out[i] = c;
    else { toSend.push(t); idxs.push({ i, key }); }
  });

  if (!toSend.length) return out;

  const SPLIT = '<<<SPLIT>>>';
  const system = `Translate into ${L}. Keep meaning and formatting; preserve URLs/HTML.
Return translations joined exactly by token ${SPLIT}, same count & order. No comments.`;
  const user = toSend.join(`\n${SPLIT}\n`);

  let raw = '';
  try {
    raw = await callOpenRouter([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
  } catch (e) {
    // Фолбэк в поштучный перевод
    for (const { i, key } of idxs) {
      const single = await translateText(texts[i], L, { sourceLang, html, mode }).catch(() => texts[i]);
      out[i] = single;
      putCache(key, single);
    }
    return out;
  }

  const parts = String(raw).split(SPLIT).map(s => s.trim());
  if (parts.length !== toSend.length) {
    // Фолбэк, если LLM перепутал формат
    for (const { i, key } of idxs) {
      const single = await translateText(texts[i], L, { sourceLang, html, mode }).catch(() => texts[i]);
      out[i] = single;
      putCache(key, single);
    }
    return out;
  }

  parts.forEach((p, j) => {
    const { i, key } = idxs[j];
    out[i] = p;
    putCache(key, p);
  });
  return out;
}

/* ======= Маршруты ======= */

// POST /api/translate
router.post('/translate', async (req, res) => {
  try {
    const { text = '', targetLang = 'kk', sourceLang = '', html = false, mode = '' } = req.body || {};
    const translated = await translateText(text, targetLang, { sourceLang, html, mode });
    res.json({ translated, lang: norm(targetLang) });
  } catch (e) {
    res.status(500).json({ error: e.message || 'translate_failed' });
  }
});

// POST /api/translate/batch
router.post('/translate/batch', async (req, res) => {
  try {
    const { texts = [], targetLang = 'kk', sourceLang = '', html = false, mode = '' } = req.body || {};
    const translations = await translateBatch(texts, targetLang, { sourceLang, html, mode });
    res.json({ translations, lang: norm(targetLang) });
  } catch (e) {
    res.status(500).json({ error: e.message || 'translate_batch_failed' });
  }
});

module.exports = router;
