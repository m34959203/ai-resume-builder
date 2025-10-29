// server-production.js (Production-ready BFF)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

/**
 * В Node 18+ уже есть глобальный fetch и AbortSignal.timeout.
 * Если вы используете более старую версию Node — установите node-fetch@3
 * и раскомментируйте импорт:
 *
 * import fetch from 'node-fetch';
 */

import { body, query, validationResult } from 'express-validator';

const app = express();
app.set('trust proxy', 1);

/* ============================ Helpers & ENV ============================ */

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT || 8787);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HH_CLIENT_ID = process.env.HH_CLIENT_ID;
const HH_CLIENT_SECRET = process.env.HH_CLIENT_SECRET;

const FRONT_ORIGINS = String(process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const HH_API = 'https://api.hh.ru';

const LLM_MODELS = {
  primary: 'google/gemma-3-12b-it:free',
  complex: 'deepseek/deepseek-r1:free',
};

const pickModel = (messages = [], complexity = 'auto') => {
  if (complexity === 'complex') return LLM_MODELS.complex;
  if (complexity === 'simple') return LLM_MODELS.primary;
  const text = messages.map((m) => m?.content || '').join(' ');
  const tokensApprox = Math.ceil(text.length / 4);
  const hasCode = /```|function|class|SELECT|INSERT|<\w+>/.test(text);
  return tokensApprox > 1200 || hasCode ? LLM_MODELS.complex : LLM_MODELS.primary;
};

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message, env: NODE_ENV, ...meta };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
};

const clampInt = (v, min, max, def) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const bool = (v) => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

/* ============================== Security =============================== */

const cspConnect = [
  "'self'",
  ...FRONT_ORIGINS,
  'https://openrouter.ai',
  HH_API,
];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: cspConnect,
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(compression());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (FRONT_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

/* ============================== Rate limits ============================= */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

/* ============================== Error helpers =========================== */

const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* ============================== Health ================================= */

app.get('/health', (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    services: {
      openrouter: !!OPENROUTER_API_KEY,
      headhunter: !!(HH_CLIENT_ID && HH_CLIENT_SECRET),
    },
  };
  res.json(health);
});

/* ============================== AI Chat ================================ */

app.post(
  '/api/ai/chat',
  aiLimiter,
  body('messages').isArray({ min: 1, max: 20 }),
  body('messages.*.role').isIn(['system', 'user', 'assistant']),
  body('messages.*.content').isString().isLength({ min: 1, max: 10000 }),
  body('complexity').optional().isIn(['auto', 'simple', 'complex']),
  body('temperature').optional().isFloat({ min: 0, max: 1 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    if (!OPENROUTER_API_KEY) {
      log('error', 'OPENROUTER_API_KEY missing');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const { messages = [], complexity = 'auto', temperature = 0.3 } = req.body;
    const model = pickModel(messages, complexity);

    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.PUBLIC_URL || FRONT_ORIGINS[0] || 'http://localhost:5173',
          'X-Title': process.env.VITE_APP_NAME || 'AI Resume Builder',
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens: 1000 }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!r.ok) {
        const errorText = await r.text();
        log('error', 'OpenRouter error', { status: r.status, error: errorText });
        return res.status(502).json({ error: 'AI service error', detail: errorText });
      }

      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content || '';
      log('info', 'AI request completed', { model, tokensUsed: data.usage?.total_tokens });
      res.json({ model, content });
    } catch (e) {
      log('error', 'AI request failed', { error: e.message });
      res.status(500).json({ error: 'AI request failed', message: e.message });
    }
  })
);

/* ============================== HH Search =============================== */
/**
 * Улучшения:
 *  - если пустые фильтры, подставляем text='разработчик' (как просили)
 *  - поддержка host=hh.kz|hh.ru (по умолчанию hh.kz)
 *  - only_with_salary, per_page, currency=KZT
 *  - ретраи при 429/5xx с backoff и уважением Retry-After
 */

const EXP_ALLOWED = new Set(['noExperience', 'between1And3', 'between3And6', 'moreThan6']);
const normalizeExperience = (v) => (EXP_ALLOWED.has(String(v)) ? String(v) : '');

async function fetchJSONWithRetry(url, { headers = {}, timeoutMs = 10_000, retries = 2 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = AbortSignal.timeout(timeoutMs);
    const r = await fetch(url, { headers, signal: controller }).catch((e) => ({ _err: e }));
    if (!r || r._err) {
      if (attempt >= retries) throw (r?._err || new Error('fetch_failed'));
      attempt += 1;
      await new Promise((s) => setTimeout(s, 400 * attempt));
      continue;
    }

    if (r.ok) return r;

    const retryAfter = Number(r.headers?.get?.('Retry-After') || 0);
    const shouldRetry = r.status === 429 || (r.status >= 500 && r.status < 600);
    if (!shouldRetry || attempt >= retries) {
      return r;
    }
    attempt += 1;
    const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(400 * 2 ** (attempt - 1), 3000);
    await new Promise((s) => setTimeout(s, delay));
  }
}

app.get(
  '/api/jobs/search',
  query('text').optional().isString().trim().isLength({ max: 200 }),
  query('experience').optional().isString(),
  query('salary').optional().isInt({ min: 0 }),
  query('area').optional().isString(), // HH принимает строковый id
  query('page').optional().isInt({ min: 0, max: 50 }),
  query('per_page').optional().isInt({ min: 1, max: 100 }),
  query('only_with_salary').optional().isString().trim(),
  query('host').optional().isIn(['hh.kz', 'hh.ru']),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid parameters', details: errors.array() });
    }

    // --- входные параметры ---
    const host = (req.query.host || 'hh.kz').toString();
    let text = (req.query.text || '').toString().trim();
    const exp = normalizeExperience(req.query.experience || '');
    const area = (req.query.area || '40').toString(); // 40 — Казахстан
    const page = clampInt(req.query.page, 0, 50, 0);
    const per_page = clampInt(req.query.per_page, 1, 100, 20);
    const salary = clampInt(req.query.salary, 0, 10_000_000, 0);
    const onlyWithSalary =
      req.query.only_with_salary != null ? bool(req.query.only_with_salary) : salary > 0;

    // --- fallback при пустых фильтрах ---
    const hasAny =
      !!(text || exp || (salary && salary > 0) || onlyWithSalary || (area && area !== ''));
    if (!hasAny) {
      text = 'разработчик'; // дефолт, чтобы пустой поиск не был пустым
    }

    const params = new URLSearchParams({
      text,
      area,
      page: String(page),
      per_page: String(per_page),
      currency: 'KZT',
    });
    if (exp) params.set('experience', exp);
    if (salary > 0) {
      params.set('salary', String(salary));
      params.set('only_with_salary', 'true');
    } else if (onlyWithSalary) {
      params.set('only_with_salary', 'true');
    }
    // host полезен для некоторых справочников; HH корректно игнорирует его в vacancies — не мешает
    params.set('host', host);

    const url = `${HH_API}/vacancies?${params.toString()}`;

    try {
      const r = await fetchJSONWithRetry(url, {
        headers: {
          'User-Agent': 'AI Resume Builder/1.0 (production)',
          'HH-User-Agent': 'AI Resume Builder/1.0',
          Accept: 'application/json',
          'Accept-Language': 'ru',
        },
        timeoutMs: 10_000,
        retries: 2,
      });

      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        log('warn', 'HH API error', { status: r.status, detail });
        return res.json({
          items: [],
          found: 0,
          page: 0,
          pages: 0,
          debug: { status: r.status, url, fallback: true },
        });
      }

      const data = await r.json();
      log('info', 'Job search completed', {
        found: data?.found ?? 0,
        page: data?.page ?? 0,
        per_page,
        host,
      });
      res.json(data);
    } catch (error) {
      log('error', 'Job search failed', { error: error.message });
      res.json({
        items: [],
        found: 0,
        page: 0,
        pages: 0,
        debug: { error: error.message, url },
      });
    }
  })
);

/* ============================== HH OAuth ================================ */

app.get('/api/auth/hh/start', (req, res) => {
  if (!HH_CLIENT_ID) {
    return res.status(500).json({ error: 'HH OAuth not configured' });
  }

  const redirectUri = `${process.env.PUBLIC_URL || FRONT_ORIGINS[0] || 'http://localhost:5173'}/oauth/hh/callback`;
  const state = Math.random().toString(36).slice(2);

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });

  const authUrl = `https://hh.ru/oauth/authorize?response_type=code&client_id=${HH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`;

  res.redirect(authUrl);
});

app.get(
  '/api/auth/hh/callback',
  query('code').isString(),
  query('state').isString(),
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state;

    if (!storedState || state !== storedState) {
      log('warn', 'CSRF check failed in OAuth callback', { state, storedState });
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    try {
      const redirectUri = `${process.env.PUBLIC_URL || FRONT_ORIGINS[0] || 'http://localhost:5173'}/oauth/hh/callback`;

      const tokenResponse = await fetch('https://hh.ru/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: HH_CLIENT_ID,
          client_secret: HH_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!tokenResponse.ok) {
        const txt = await tokenResponse.text().catch(() => '');
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${txt}`);
      }

      const tokens = await tokenResponse.json();

      res.cookie('hh_access_token', tokens.access_token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: (tokens.expires_in || 3600) * 1000,
      });

      log('info', 'HH OAuth completed successfully');
      res.redirect('/?page=builder&import=success');
    } catch (error) {
      log('error', 'HH OAuth failed', { error: error.message });
      res.redirect('/?page=builder&import=error');
    }
  })
);

/* ============================== Global errors ============================ */

app.use((err, req, res, _next) => {
  log('error', 'Unhandled error', {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
  });

  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* ============================== Shutdown & Start ========================= */

['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => {
    log('info', `${sig} received, shutting down gracefully`);
    process.exit(0);
  });
});

app.listen(PORT, () => {
  log('info', `Server started on port ${PORT}`, { env: NODE_ENV, origins: FRONT_ORIGINS });
});
