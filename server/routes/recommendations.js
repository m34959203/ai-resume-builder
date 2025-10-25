/* eslint-disable no-console */
'use strict';

const express = require('express');
const router = express.Router();

// Пытаемся подключить «умные» сервисы; если их нет — используем фолбэк.
let buildRecommendations = null;
let improveProfile = null;
let getCourses = null;
try { ({ buildRecommendations, improveProfile } = require('../services/recommender')); } catch {}
try { ({ getCourses } = require('../services/courseAggregator')); } catch {}

// ------ Утилиты ------

const uniq = (arr) => Array.from(new Set((arr || []).map(String).map(s => s.trim()).filter(Boolean)));
const cap  = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Простая эвристика рекомендаций (на случай, если сервисы недоступны)
async function fallbackRecommendations(profile = {}) {
  const skills = uniq(profile.skills);
  const sLow = skills.map(s => s.toLowerCase());

  const professions = [];
  if (sLow.some(s => /react|vue|angular|javascript|typescript/.test(s))) {
    professions.push({ title: 'Frontend Developer' });
  }
  if (sLow.some(s => /python|django|flask|fastapi/.test(s))) {
    professions.push({ title: 'Python Developer' });
  }
  if (sLow.some(s => /sql|postgres|mysql|excel|data/.test(s))) {
    professions.push({ title: 'Data Analyst' });
  }

  let courses = [
    { provider: 'Coursera', title: 'React Specialization', duration: '3 месяца', url: 'https://www.coursera.org/' },
    { provider: 'Udemy',    title: 'Complete Web Development', duration: '2 месяца', url: 'https://www.udemy.com/' },
    { provider: 'Stepik',    title: 'Python для начинающих', duration: '1 месяц', url: 'https://stepik.org/' },
  ];

  // Если есть агрегатор курсов — попробуем им воспользоваться
  if (typeof getCourses === 'function') {
    try { courses = await getCourses(profile); } catch (e) { console.warn('[courses/fallback]', e?.message || e); }
  }

  return {
    marketScore: 75,                    // демонстрационный скоринг
    professions: professions.slice(0, 3),
    skillsToGrow: skills.length ? [] : ['Agile', 'Data Analysis', 'Digital Marketing'],
    courses,
  };
}

// Улучшение резюме — фолбэк (буллетизация + нормализация навыков)
function fallbackImprove(profile = {}) {
  const normalizedSkills = uniq(profile.skills).map(cap);

  const bullets = [];
  const txt = String(profile.summary || '').trim();
  if (txt) {
    txt.split(/[\n\.]+/).map(s => s.trim()).filter(Boolean)
      .forEach(line => bullets.push(`• ${line}`));
  }

  const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
  return {
    ok: true,
    updated,
    changes: {
      skillsCount: normalizedSkills.length,
      bulletsCount: bullets.length,
    }
  };
}

// ------ Роуты ------

// POST /api/recommendations/generate
router.post('/generate', async (req, res) => {
  try {
    const profile = req.body?.profile || {};

    // Если есть «умный» сервис — используем его
    if (typeof buildRecommendations === 'function') {
      const data = await buildRecommendations(profile);
      return res.json({ ok: true, data });
    }

    // Иначе — безопасный фолбэк
    const data = await fallbackRecommendations(profile);
    return res.json({ ok: true, data, fallback: true });
  } catch (e) {
    console.error('[rec/generate]', e);
    const data = await fallbackRecommendations(req.body?.profile || {});
    return res.json({ ok: true, data, fallback: true });
  }
});

// POST /api/recommendations/improve
router.post('/improve', async (req, res) => {
  try {
    const profile = req.body?.profile || {};

    if (typeof improveProfile === 'function') {
      const { updated, changes } = await improveProfile(profile);
      return res.json({ ok: true, updated, changes });
    }

    const out = fallbackImprove(profile);
    return res.json(out);
  } catch (e) {
    console.error('[rec/improve]', e);
    const out = fallbackImprove(req.body?.profile || {});
    return res.json(out);
  }
});

module.exports = router;
