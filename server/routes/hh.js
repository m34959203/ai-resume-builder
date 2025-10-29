'use strict';
const express = require('express');
const router = express.Router();

const HH_API = 'https://api.hh.ru';
const UA = process.env.HH_USER_AGENT || 'AI Resume Builder/1.0';

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

router.get('/areas', async (req, res) => {
  try {
    const host = String(req.query.host || process.env.HH_HOST || 'hh.kz').trim();
    const r = await fetch(`${HH_API}/areas?host=${encodeURIComponent(host)}`, {
      headers: { 'HH-User-Agent': UA, 'Accept': 'application/json' },
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.json(await r.json());
  } catch (e) {
    res.status(500).send(String(e));
  }
});

router.get('/jobs/search', async (req, res) => {
  try {
    const host = String(req.query.host || process.env.HH_HOST || 'hh.kz').trim();
    const text = String(req.query.text || '').trim();
    const page = toInt(req.query.page, 0);
    const per_page = toInt(req.query.per_page, 20);

    const p = new URLSearchParams({ host, page, per_page });
    if (text) p.set('text', text);
    if (req.query.area) p.set('area', String(req.query.area));

    const url = `${HH_API}/vacancies?${p.toString()}`;
    const r = await fetch(url, { headers: { 'HH-User-Agent': UA, 'Accept': 'application/json' } });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const data = await r.json();

    res.json({
      items: Array.isArray(data.items) ? data.items : [],
      found: Number.isFinite(data.found) ? data.found : 0,
      page: data.page ?? page,
      pages: data.pages ?? 0,
    });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

module.exports = router;
