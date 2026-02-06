/* eslint-disable no-console */
'use strict';

const express = require('express');
const router = express.Router();

let getCourses = null;
try {
  ({ getCourses } = require('../services/courseAggregator'));
} catch (e) {
  console.warn('[courses] courseAggregator not available:', e?.message);
}

/**
 * GET /api/courses/search?skills=React,TypeScript&limit=12
 * → { ok, courses: [{ provider, title, url, cover?, duration?, description?, source }] }
 */
router.get('/search', async (req, res) => {
  try {
    const skillsRaw = String(req.query.skills || req.query.q || '').trim();
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 12));

    if (!skillsRaw) {
      return res.status(400).json({ ok: false, error: 'skills parameter required' });
    }

    // Ограничим длину запроса
    if (skillsRaw.length > 500) {
      return res.status(400).json({ ok: false, error: 'skills too long' });
    }

    const skills = skillsRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);

    if (!getCourses) {
      return res.json({ ok: true, courses: [], source: 'unavailable' });
    }

    const gaps = skills.map((name) => ({ name }));
    const courses = await getCourses({ gaps, keywords: skillsRaw });

    return res.json({
      ok: true,
      courses: courses.slice(0, limit),
      count: courses.length,
    });
  } catch (e) {
    console.error('[courses/search]', e);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

module.exports = router;
