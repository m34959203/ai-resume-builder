'use strict';
const express = require('express');
const router = express.Router();

const HH_API = 'https://api.hh.ru';
const UA = process.env.HH_USER_AGENT || 'AI Resume Builder/1.0';
const ALLOWED_HOSTS = ['hh.kz', 'hh.ru'];
const DEFAULT_HOST = process.env.HH_HOST || 'hh.kz';

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

function sanitizeHost(raw) {
  const h = String(raw || DEFAULT_HOST).trim().toLowerCase();
  return ALLOWED_HOSTS.includes(h) ? h : DEFAULT_HOST;
}

router.get('/areas', async (req, res) => {
  try {
    const host = sanitizeHost(req.query.host);
    const r = await fetch(`${HH_API}/areas?host=${encodeURIComponent(host)}`, {
      headers: { 'HH-User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      return res.status(r.status).json({ error: 'HH_API_ERROR', status: r.status });
    }
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/jobs/search', async (req, res) => {
  try {
    const host = sanitizeHost(req.query.host);
    const text = String(req.query.text || '').trim().slice(0, 200);
    const page = Math.min(toInt(req.query.page, 0), 50);
    const per_page = Math.min(toInt(req.query.per_page, 20), 100);

    const p = new URLSearchParams({ host, page, per_page });
    if (text) p.set('text', text);
    if (req.query.area) p.set('area', String(req.query.area).slice(0, 20));

    const url = `${HH_API}/vacancies?${p.toString()}`;
    const r = await fetch(url, {
      headers: { 'HH-User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      return res.status(r.status).json({ error: 'HH_API_ERROR', status: r.status });
    }
    const data = await r.json();

    res.json({
      items: Array.isArray(data.items) ? data.items : [],
      found: Number.isFinite(data.found) ? data.found : 0,
      page: data.page ?? page,
      pages: data.pages ?? 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
