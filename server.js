// server.js (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const LLM_MODELS = {
  primary: 'google/gemma-3-12b-it:free',
  complex: 'deepseek/deepseek-r1:free'
};

function pickModel(messages = [], complexity = 'auto') {
  if (complexity === 'complex') return LLM_MODELS.complex;
  if (complexity === 'simple') return LLM_MODELS.primary;
  const text = messages.map(m => m?.content || '').join(' ');
  const tokensApprox = Math.ceil(text.length / 4);
  const hasCode = /```|function|class|SELECT|INSERT|<\w+>/.test(text);
  return tokensApprox > 1200 || hasCode ? LLM_MODELS.complex : LLM_MODELS.primary;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/ai/chat', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY is missing' });
    const { messages = [], complexity = 'auto', temperature = 0.3 } = req.body || {};
    const model = pickModel(messages, complexity);

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_URL || 'http://localhost:5173',
        'X-Title': process.env.VITE_APP_NAME || 'AI Resume Builder'
      },
      body: JSON.stringify({ model, messages, temperature })
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: 'OpenRouter error', detail });
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.json({ model, content });
  } catch (e) {
    res.status(500).json({ error: e.message || 'AI proxy failed' });
  }
});

// лёгкий мок для дев-режима
app.get('/api/jobs/search', (_req, res) => {
  const items = [
    {
      id: 'm1',
      name: 'Frontend Developer',
      employer: { name: 'Tech Corp' },
      salary: { from: 200000, to: 300000, currency: 'KZT' },
      area: { name: 'Алматы' },
      experience: { name: 'Junior' },
      snippet: { responsibility: 'Разработка React UI', requirement: 'JS/TS' },
      alternate_url: 'https://hh.kz/vacancy/000'
    }
  ];
  res.json({ items, found: items.length, page: 0, pages: 1 });
});

app.listen(PORT, () => {
  console.log(`BFF is up: http://localhost:${PORT}`);
});
