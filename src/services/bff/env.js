// src/services/bff/env.js — Environment config, API base URL, shared constants

/* eslint-disable no-console */

function env(key, def = '') {
  const v = import.meta?.env?.[key];
  return v == null ? def : String(v);
}

/**
 * Абсолютный BASE:
 * 1) VITE_API_URL или window.__API_URL__  (+ VITE_API_PREFIX, по умолчанию /api)
 * 2) Render-фронт → VITE_RENDER_BFF_URL или дефолтный bff-хост
 * 3) Локалка → http://localhost:8000
 * 4) Фолбэк → текущий origin + /api
 */
function computeApiBase() {
  const prefixRaw = env('VITE_API_PREFIX', '/api').trim();
  const prefix = prefixRaw.startsWith('/') ? prefixRaw : `/${prefixRaw}`;

  // 1) Явный URL (ENV/глобальное окно)
  const fromEnv = env('VITE_API_URL', '').trim();
  const fromWindow = typeof window !== 'undefined' && window.__API_URL__
    ? String(window.__API_URL__).trim()
    : '';
  const chosen = fromEnv || fromWindow;
  if (chosen) {
    const url = `${chosen.replace(/\/+$/, '')}${prefix}`;
    console.log('[BFF] Using explicit API_URL:', url);
    return url;
  }

  // 2) Render: фронт на onrender.com
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isRenderFrontend = typeof host === 'string' && host.includes('onrender.com');
  if (isRenderFrontend) {
    const bffCustom = env('VITE_RENDER_BFF_URL', '').trim();
    const base = bffCustom || 'https://ai-resume-bff-nepa.onrender.com';
    const bffUrl = `${base.replace(/\/+$/, '')}${prefix}`;
    console.log('[BFF] Render detected, using BFF URL:', bffUrl);
    return bffUrl;
  }

  // 3) Локалка
  const isLocal = /^localhost$|^127\.0\.0\.1$/.test(host || '');
  if (isLocal) {
    const url = `http://localhost:8000${prefix}`;
    console.log('[BFF] Local dev, using:', url);
    return url;
  }

  // 4) Фолбэк: текущий origin
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
  const url = `${String(origin).replace(/\/+$/, '')}${prefix}`;
  console.log('[BFF] Default origin-based URL:', url);
  return url;
}

export const API_BASE = computeApiBase();

export const USE_MOCKS      = ['1', 'true', 'yes', 'on'].includes(env('VITE_USE_MOCKS', '').toLowerCase());
export const API_TIMEOUT_MS = Number(env('VITE_API_TIMEOUT_MS', '12000')) || 12000;
export const HOST_DEFAULT   = (env('VITE_HH_HOST', 'hh.kz').trim() || 'hh.kz').toLowerCase();
export const AREAS_TTL_MS   = Number(env('VITE_AREAS_TTL_MS', String(6 * 60 * 60 * 1000))) || 21600000;
export const FORCE_KZ       = ['1', 'true', 'yes', 'on'].includes(env('VITE_FORCE_KZ', '1').toLowerCase());

console.log('[BFF] API_BASE =', API_BASE);
console.log('[BFF] HOST_DEFAULT =', HOST_DEFAULT);

export function makeApiUrl(u) {
  if (!u) return API_BASE;
  const s = String(u);
  if (/^https?:\/\/+/i.test(s)) return s;
  let path = s;
  if (path === '/api') path = '';
  else if (path.startsWith('/api/')) path = path.slice(5);
  else if (path.startsWith('api/')) path = path.slice(4);
  const base = API_BASE.replace(/\/$/, '');
  const tail = String(path).replace(/^\//, '');
  return tail ? `${base}/${tail}` : base;
}
