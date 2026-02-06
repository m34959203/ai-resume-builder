// src/services/bff/ai.js — AI inference and text polishing

import { safeFetchJSON } from './http';
import { normalizeHost } from './normalize';

// Локальная эвристика (fallback), если бэкенд-ИИ недоступен
function localInferSearch(profile) {
  const norm = (s) => String(s || '').trim();
  const role =
    norm(profile?.position) ||
    norm(profile?.desiredRole) ||
    norm(profile?.desiredPosition) ||
    norm(profile?.targetRole) ||
    norm(profile?.objective) ||
    norm(profile?.experience?.[0]?.title || profile?.experience?.[0]?.position || '');

  const skills = Array.isArray(profile?.skills)
    ? [...new Set(profile.skills.map((x) => norm(typeof x === 'string' ? x : (x?.name || x?.title || ''))))].filter(Boolean).slice(0, 12)
    : [];

  const city = norm(profile?.location);
  const confidence = Math.min(0.9, 0.2 + (Number(Boolean(role)) + skills.length / 12 + Number(Boolean(city))) / 3);
  return { role: role || '', city: city || '', skills, experience: undefined, confidence };
}

export async function inferSearchFromProfile(profile, { lang = 'ru', overrideModel } = {}) {
  const url = '/ai/infer-search';
  const payload = { profile, lang, overrideModel };
  if (!overrideModel) delete payload.overrideModel;

  try {
    const out = await safeFetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { ...payload },
      noDedupe: true,
    });

    if (out && out.search) {
      out.search.host = normalizeHost(out.search.host);
    }
    if (!out?.search && (out?.role || out?.skills)) {
      return out;
    }
    return out?.search || out || localInferSearch(profile);
  } catch (e) {
    try {
      const alt = await safeFetchJSON('/recommendations/infer-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { profile, lang, overrideModel },
        noDedupe: true,
      });
      return alt?.search || alt || localInferSearch(profile);
    } catch {
      return localInferSearch(profile);
    }
  }
}

export async function polishText(text, { lang = 'ru', mode = 'auto' } = {}) {
  const url = '/polish';
  return safeFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { text, lang, mode },
    noDedupe: true,
  });
}

export async function polishBatch(texts = [], { lang = 'ru', mode = 'auto' } = {}) {
  const url = '/polish/batch';
  return safeFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { texts, lang, mode },
    noDedupe: true,
  });
}
