// server-production.js (Production-ready BFF)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import { body, query, validationResult } from 'express-validator';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai", "https://api.hh.ru"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
});

// Environment variables
const PORT = process.env.PORT || 8787;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HH_CLIENT_ID = process.env.HH_CLIENT_ID;
const HH_CLIENT_SECRET = process.env.HH_CLIENT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Logging
const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    env: NODE_ENV,
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
};

// Error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// LLM models
const LLM_MODELS = {
  primary: 'google/gemma-3-12b-it:free',
  complex: 'deepseek/deepseek-r1:free',
};

function pickModel(messages = [], complexity = 'auto') {
  if (complexity === 'complex') return LLM_MODELS.complex;
  if (complexity === 'simple') return LLM_MODELS.primary;
  
  const text = messages.map(m => m?.content || '').join(' ');
  const tokensApprox = Math.ceil(text.length / 4);
  const hasCode = /```|function|class|SELECT|INSERT|<\w+>/.test(text);
  
  return tokensApprox > 1200 || hasCode ? LLM_MODELS.complex : LLM_MODELS.primary;
}

// Health check
app.get('/health', (req, res) => {
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

// AI Chat endpoint
app.post('/api/ai/chat',
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
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.PUBLIC_URL || 'http://localhost:5173',
          'X-Title': process.env.VITE_APP_NAME || 'AI Resume Builder',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        log('error', 'OpenRouter error', { status: response.status, error: errorText });
        return res.status(502).json({ error: 'AI service error', detail: errorText });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';

      log('info', 'AI request completed', { model, tokensUsed: data.usage?.total_tokens });
      res.json({ model, content });
    } catch (error) {
      log('error', 'AI request failed', { error: error.message });
      res.status(500).json({ error: 'AI request failed', message: error.message });
    }
  })
);

// Job search endpoint
app.get('/api/jobs/search',
  query('text').optional().isString().trim().isLength({ max: 200 }),
  query('experience').optional().isIn(['noExperience', 'between1And3', 'between3And6', 'moreThan6']),
  query('salary').optional().isInt({ min: 0 }),
  query('area').optional().isInt(),
  query('page').optional().isInt({ min: 0, max: 20 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid parameters', details: errors.array() });
    }

    const { text = '', experience = '', salary = '', area = 40, page = 0 } = req.query;

    const params = new URLSearchParams({
      text,
      area,
      page,
      per_page: '20',
    });

    if (experience) params.append('experience', experience);
    if (salary) params.append('salary', salary);

    try {
      const response = await fetch(`https://api.hh.ru/vacancies?${params}`, {
        headers: {
          'User-Agent': 'AI Resume Builder/1.0 (production)',
          'HH-User-Agent': 'AI Resume Builder/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        log('warn', 'HH API error', { status: response.status });
        // Return mock data on HH API failure
        return res.json({
          items: [],
          found: 0,
          page: 0,
          pages: 0,
        });
      }

      const data = await response.json();
      log('info', 'Job search completed', { found: data.found, page: data.page });
      res.json(data);
    } catch (error) {
      log('error', 'Job search failed', { error: error.message });
      res.json({ items: [], found: 0, page: 0, pages: 0 });
    }
  })
);

// HeadHunter OAuth start
app.get('/api/auth/hh/start', (req, res) => {
  if (!HH_CLIENT_ID) {
    return res.status(500).json({ error: 'HH OAuth not configured' });
  }

  const redirectUri = `${process.env.PUBLIC_URL}/oauth/hh/callback`;
  const state = Math.random().toString(36).substring(7);
  
  // Store state in session/cookie for CSRF protection
  res.cookie('oauth_state', state, { httpOnly: true, secure: NODE_ENV === 'production', maxAge: 600000 });

  const authUrl = `https://hh.ru/oauth/authorize?response_type=code&client_id=${HH_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  res.redirect(authUrl);
});

// HeadHunter OAuth callback
app.get('/api/auth/hh/callback',
  query('code').isString(),
  query('state').isString(),
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state;

    if (!storedState || state !== storedState) {
      log('warn', 'CSRF check failed in OAuth callback');
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    try {
      const redirectUri = `${process.env.PUBLIC_URL}/oauth/hh/callback`;
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
      });

      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }

      const tokens = await tokenResponse.json();
      
      // Store tokens securely (use session/secure cookies in production)
      res.cookie('hh_access_token', tokens.access_token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        maxAge: tokens.expires_in * 1000,
      });

      log('info', 'HH OAuth completed successfully');
      res.redirect('/?page=builder&import=success');
    } catch (error) {
      log('error', 'HH OAuth failed', { error: error.message });
      res.redirect('/?page=builder&import=error');
    }
  })
);

// Global error handler
app.use((err, req, res, next) => {
  log('error', 'Unhandled error', {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
  });

  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  log('info', `Server started on port ${PORT}`, { env: NODE_ENV });
});