// src/services/bff/translate.js — Text and profile translation

/* eslint-disable no-console */

import { safeFetchJSON } from './http';

function normalizeLangCode(lang) {
  const s = String(lang || '').trim().toLowerCase();
  if (['ru', 'kk', 'kz'].includes(s)) return s === 'kz' ? 'kk' : s;
  if (s.startsWith('ru')) return 'ru';
  if (s.startsWith('kk') || s.startsWith('kz')) return 'kk';
  if (s.startsWith('en')) return 'en';
  return 'ru';
}

/** Перевод одной строки через /translate (bff). */
export async function translateText(text, { to = 'ru', from } = {}) {
  const t = String(text ?? '');
  if (!t) return '';
  try {
    const resp = await safeFetchJSON('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { text: t, to: normalizeLangCode(to), from: from ? normalizeLangCode(from) : undefined },
      noDedupe: true,
    });
    if (!resp) return t;
    const out = resp.text ?? resp.translation ?? resp?.data?.text;
    return typeof out === 'string' && out.trim() ? out : t;
  } catch (e) {
    console.warn('[BFF translateText] fallback on error:', e?.message || e);
    return t;
  }
}

/** Батч-перевод. */
export async function translateTextBatch(texts = [], { to = 'ru', from } = {}) {
  const arr = Array.isArray(texts) ? texts.map((v) => String(v ?? '')) : [];
  if (!arr.length) return [];

  const toLang = normalizeLangCode(to);
  const fromLang = from ? normalizeLangCode(from) : undefined;

  // Пытаемся пакетно
  try {
    const resp = await safeFetchJSON('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { texts: arr, to: toLang, from: fromLang },
      noDedupe: true,
    });
    if (resp && Array.isArray(resp.texts)) return resp.texts;
    if (resp && Array.isArray(resp.translations)) return resp.translations;
    if (resp && Array.isArray(resp.data)) return resp.data;
  } catch {
    // игнор — пойдём по одному
  }

  // По одному, с кешом уникальных строк
  const uniq = [];
  const idx = [];
  const map = new Map();
  arr.forEach((s, i) => {
    if (!map.has(s)) { map.set(s, uniq.length); uniq.push(s); }
    idx.push(map.get(s));
  });

  const translatedUniq = await Promise.all(
    uniq.map((s) => translateText(s, { to: toLang, from: fromLang }))
  );

  return idx.map((k) => translatedUniq[k] ?? arr[k] ?? '');
}

/** Собираем переводимые поля из профиля → [{ path, text }] */
function collectTranslatables(profile = {}) {
  const items = [];
  const push = (path, v) => {
    const s = String(v ?? '').trim();
    if (s) items.push({ path, text: s });
  };

  // Блок "О себе" и заголовки
  push('position', profile.position);
  push('summary', profile.summary);
  push('location', profile.location);

  // Опыт: должность/обязанности/локация
  (Array.isArray(profile.experience) ? profile.experience : []).forEach((e, i) => {
    push(`experience.${i}.position`, e?.position ?? e?.title);
    push(`experience.${i}.responsibilities`, e?.responsibilities ?? e?.description ?? e?.achievements);
    if (e?.location || e?.city) push(`experience.${i}.location`, e?.location ?? e?.city);
  });

  // Образование
  (Array.isArray(profile.education) ? profile.education : []).forEach((ed, i) => {
    push(`education.${i}.level`, ed?.level ?? ed?.degree);
    push(`education.${i}.specialization`, ed?.specialization ?? ed?.major ?? ed?.program);
  });

  return items;
}

/** Применяем переводы к профилю (не мутируем исходник) */
function applyTranslations(profile, pairs, translations) {
  const clone = JSON.parse(JSON.stringify(profile));
  const setByPath = (obj, path, value) => {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in cur) || typeof cur[k] !== 'object' || cur[k] === null) {
        const nextIsIndex = /^\d+$/.test(keys[i + 1]);
        cur[k] = nextIsIndex ? [] : {};
      }
      cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
  };

  pairs.forEach((p, i) => {
    const v = translations[i];
    if (typeof v === 'string' && v.trim()) {
      setByPath(clone, p.path, v);
    }
  });
  return clone;
}

/**
 * Перевести все текстовые поля профиля под выбранный язык интерфейса.
 * Если targetLang === 'ru' — возвращаем исходный профиль (быстро и без артефактов).
 */
export async function translateProfileForLang(profile, targetLang = 'ru') {
  const to = normalizeLangCode(targetLang);
  if (to === 'ru') return profile;

  const pairs = collectTranslatables(profile);
  if (!pairs.length) return profile;

  const texts = pairs.map((p) => p.text);
  const translated = await translateTextBatch(texts, { to });

  return applyTranslations(profile, pairs, translated);
}
