// src/services/bff.js
/* eslint-disable no-console */

/**
 * Клиентский слой для общения с BFF:
 * - OAuth HH, поиск вакансий, справочники
 * - AI-инференс (подсказка поиска)
 * - AI-рекомендации (роли, skills gap, курсы)
 *
 * ВАЖНО: публичные функции/имена экспортов сохранены для совместимости.
 */

import { mockJobs, mockResumes } from './mocks';

/* -------------------- ENV & BASE URL -------------------- */

function env(key, def = '') {
  const v = import.meta?.env?.[key];
  return v == null ? def : String(v);
}

/**
 * Абсолютный BASE:
 * 1) VITE_API_URL или window.__API_URL__
 * 2) Render фронт → фиксированный BFF (или VITE_RENDER_BFF_URL)
 * 3) Локалка → http://localhost:8000
 * 4) Фолбэк → текущий origin
 */
function computeApiBase() {
  const prefixRaw = env('VITE_API_PREFIX', '/api').trim();
  const prefix = prefixRaw.startsWith('/') ? prefixRaw : `/${prefixRaw}`;

  // 1) Явный URL
  const fromEnv = env('VITE_API_URL', '').trim();
  const fromWindow =
    typeof window !== 'undefined' && window.__API_URL__ ? String(window.__API_URL__).trim() : '';
  const chosen = fromEnv || fromWindow;
  if (chosen) {
    const url = `${chosen.replace(/\/+$/, '')}${prefix}`;
    console.log('[BFF] Using explicit API_URL:', url);
    return url;
  }

  // 2) Render: фронт на onrender.com
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isRenderFrontend = typeof host === 'string'
    && host.includes('onrender.com')
    && (host.includes('ai-resume-frontend') || host.includes('-frontend'));

  if (isRenderFrontend) {
    const bffCustom = env('VITE_RENDER_BFF_URL', '').trim();
    const base = bffCustom || 'https://ai-resume-bff.onrender.com';
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
  const origin =
    (typeof window !== 'undefined' && window.location && window.location.origin) || '';
  const url = `${String(origin).replace(/\/+$/, '')}${prefix}`;
  console.log('[BFF] Default origin-based URL:', url);
  return url;
}

export const API_BASE = computeApiBase();

/* -------------------- Константы -------------------- */

const USE_MOCKS      = ['1', 'true', 'yes', 'on'].includes(env('VITE_USE_MOCKS', '').toLowerCase());
const API_TIMEOUT_MS = Number(env('VITE_API_TIMEOUT_MS', '12000')) || 12000;
const HOST_DEFAULT   = (env('VITE_HH_HOST', 'hh.kz').trim() || 'hh.kz').toLowerCase();

const AREAS_TTL_MS   = Number(env('VITE_AREAS_TTL_MS', String(6 * 60 * 60 * 1000))) || 21600000;
const FORCE_KZ       = ['1', 'true', 'yes', 'on'].includes(env('VITE_FORCE_KZ', '1').toLowerCase());

console.log('[BFF] API_BASE =', API_BASE);
console.log('[BFF] HOST_DEFAULT =', HOST_DEFAULT);

/* -------------------- Склейка URL -------------------- */

const join = (...parts) =>
  parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(':/', '://');

/** Делает абсолютный URL к BFF (не допускает удвоения /api) */
function makeApiUrl(u) {
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

/* -------------------- Ошибки и утилиты -------------------- */

export class BFFHttpError extends Error {
  constructor(message, { status, url, method, body }) {
    super(message);
    this.name = 'BFFHttpError';
    this.status = status;
    this.url = url;
    this.method = method || 'GET';
    this.body = body;
  }
}
export const isHttpError = (e) => e && typeof e === 'object' && e.name === 'BFFHttpError';

// In-flight dedupe для GET-запросов
const IN_FLIGHT = new Map(); // key: normalizedUrl -> Promise<any>

/** внутренняя обёртка fetch с таймаутом */
function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const normalizedUrl = makeApiUrl(url);
  if (options.signal) {
    return fetch(normalizedUrl, { credentials: 'include', ...options });
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);
  return fetch(normalizedUrl, {
    credentials: 'include',
    signal: controller.signal,
    ...options,
  }).finally(() => clearTimeout(id));
}

async function parsePayload(res) {
  const ct = res.headers.get('content-type') || '';
  const isJSON = ct.includes('application/json');
  if (res.status === 204) return null;
  try {
    return isJSON ? await res.json() : await res.text();
  } catch {
    return null;
  }
}

/**
 * Безопасная обёртка над fetch.
 * options:
 *  - method?: string
 *  - headers?: Record<string,string>
 *  - body?: any (автосериализация для JSON)
 *  - signal?: AbortSignal
 *  - timeoutMs?: number
 *  - noDedupe?: boolean (по умолчанию false; dedupe только для GET)
 *  - cache?: RequestCache (по умолчанию 'no-store')
 */
export async function safeFetchJSON(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;

  const headers = { Accept: 'application/json', ...(options.headers || {}) };

  let body = options.body;
  const hasJsonHeader =
    headers['Content-Type']?.includes('application/json') ||
    headers['content-type']?.includes('application/json');

  if (body != null && typeof body === 'object' && !(body instanceof FormData) && hasJsonHeader) {
    body = JSON.stringify(body);
  }

  const normalizedUrl = makeApiUrl(url);

  // Диагностика HH-поиска
  if (normalizedUrl.includes('/hh/jobs/search')) {
    console.log('[BFF Client] Fetching jobs:', normalizedUrl);
    console.log('[BFF Client] Method:', method);
    console.log('[BFF Client] Headers:', headers);
  }

  const doFetch = async () => {
    const res = await fetchWithTimeout(
      normalizedUrl,
      {
        cache: options.cache ?? 'no-store',         // <— важно: без кастомных заголовков и без кэша
        ...options,
        method,
        headers,
        body,
      },
      timeoutMs
    );

    if (normalizedUrl.includes('/hh/jobs/search')) {
      console.log('[BFF Client] Response status:', res.status);
      try { console.log('[BFF Client] Response headers:', Object.fromEntries([...res.headers.entries()])); } catch {}
    }

    // Прозрачные редиректы 3xx мы не следуем на клиенте — бросаем BFFHttpError (видно в логе)
    if (res.status >= 300 && res.status < 400) {
      const payload = await parsePayload(res);
      throw new BFFHttpError(`Redirected ${res.status}`, {
        status: res.status, url: normalizedUrl, method, body: payload,
      });
    }

    const payload = await parsePayload(res);

    if (!res.ok) {
      const msg = `${method} ${normalizedUrl} -> ${res.status}`;
      console.error('[BFF Client] HTTP Error:', msg, payload);
      throw new BFFHttpError(msg, { status: res.status, url: normalizedUrl, method, body: payload });
    }
    return payload;
  };

  const key = method === 'GET' && !options.noDedupe ? normalizedUrl : null;
  if (key) {
    const existing = IN_FLIGHT.get(key);
    if (existing) {
      // console.log('[BFF Client] Using cached request:', key);
      return existing;
    }
    const p = doFetch().finally(() => IN_FLIGHT.delete(key));
    IN_FLIGHT.set(key, p);
    try {
      return await p;
    } catch (e) {
      if (USE_MOCKS) {
        console.warn('[BFF Client] Error, using mocks:', e?.message || e);
        return null;
      }
      throw e;
    }
  }

  try {
    return await doFetch();
  } catch (err) {
    const isAbort = err?.name === 'AbortError' || /AbortError/i.test(err?.message || '');
    if (isAbort) console.warn('[BFF Client] aborted:', normalizedUrl);
    else if (isHttpError(err)) console.warn('[BFF Client] http error:', err.status, err.url, err.body);
    else console.error('[BFF Client] request failed:', err?.message || err);
    if (USE_MOCKS) {
      console.warn('[BFF Client] Using mocks due to error');
      return null;
    }
    throw err;
  }
}

/* -------------------- Нормализация опыта -------------------- */

const EXP_MAP = {
  none: 'none', '0-1': '0-1', '1-3': '1-3', '3-6': '3-6', '6+': '6+',
  noExperience: 'none', between1And3: '1-3', between3And6: '3-6', moreThan6: '6+',
};
export function normalizeExperience(v) {
  if (!v) return undefined;
  const key = String(v).trim();
  return EXP_MAP[key] || undefined;
}

const stripCurrency = (v) => (v == null || v === '' ? undefined : String(v).replace(/[^\d]/g, '') || undefined);

/* -------------------- HOST/COUNTRY helpers -------------------- */

const normalizeHost = (h) => (FORCE_KZ ? 'hh.kz' : (h || HOST_DEFAULT)).toLowerCase();
export const getDefaultHost = () => normalizeHost();

/* -------------------- OAUTH (HeadHunter) -------------------- */

export function startHHOAuth(host = normalizeHost()) {
  const url = new URL(makeApiUrl('/auth/hh/login'));
  if (host) url.searchParams.set('host', normalizeHost(host));
  window.location.href = url.toString();
}

export async function finishHHOAuth(code, host = normalizeHost()) {
  const url = new URL(makeApiUrl('/auth/hh/callback'));
  url.searchParams.set('code', code);
  if (host) url.searchParams.set('host', normalizeHost(host));
  const resp = await safeFetchJSON(url.toString()).catch(() => null);
  if (resp && typeof resp === 'object') return resp;
  window.location.href = url.toString();
  return null;
}

export async function refreshHH() {
  try {
    await safeFetchJSON('/auth/hh/refresh', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

export async function logoutHH() {
  await safeFetchJSON('/auth/hh/logout', { method: 'POST' });
}

export async function getHHMe(options = {}) {
  return safeFetchJSON('/hh/me', options);
}

export async function hhIsAuthed() {
  try {
    const me = await getHHMe();
    return !!(me && me.ok);
  } catch {
    return false;
  }
}

export async function hhListResumes(options = {}) {
  return safeFetchJSON('/hh/resumes', { method: 'GET', ...options });
}

export async function hhRespond({ vacancyId, resumeId, message = '' }, options = {}) {
  if (!vacancyId) throw new Error('vacancyId is required');
  return safeFetchJSON('/hh/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { vacancy_id: vacancyId, resume_id: resumeId, message },
    noDedupe: true,
    ...options,
  });
}

/* -------------------- СПРАВОЧНИКИ (areas) с кэшем -------------------- */

const _AREAS_CACHE = new Map();       // host -> { at:number, data:any }
const _AREAS_LOADING = new Map();     // host -> Promise<any>
const _COUNTRY_ROOT_CACHE = new Map();// host -> { id, name }

async function _loadAreasRaw(host = normalizeHost(), options = {}) {
  const h = normalizeHost(host);
  const url = `/hh/areas?host=${encodeURIComponent(h)}`;
  return safeFetchJSON(url, options);
}

async function getAreas(host = normalizeHost(), options = {}) {
  const h = normalizeHost(host);
  const now = Date.now();

  const cached = _AREAS_CACHE.get(h);
  if (cached && now - cached.at < AREAS_TTL_MS) return cached.data;

  if (_AREAS_LOADING.has(h)) return _AREAS_LOADING.get(h);

  const p = _loadAreasRaw(h, options)
    .then((data) => {
      if (data) _AREAS_CACHE.set(h, { at: Date.now(), data });
      return data;
    })
    .finally(() => _AREAS_LOADING.delete(h));

  _AREAS_LOADING.set(h, p);
  return p;
}

export async function fetchAreas(host = normalizeHost()) {
  return getAreas(host);
}

export function clearAreasCache(host = null) {
  if (host) {
    _AREAS_CACHE.delete(normalizeHost(host));
    _COUNTRY_ROOT_CACHE.delete(normalizeHost(host));
  } else {
    _AREAS_CACHE.clear();
    _COUNTRY_ROOT_CACHE.clear();
  }
}

async function getCountryRoot(host, reCountry = /казахстан/i) {
  const h = normalizeHost(host);
  const cached = _COUNTRY_ROOT_CACHE.get(h);
  if (cached) return cached;

  const tree = await getAreas(h).catch(() => null);
  if (!tree) return null;
  const found = (tree || []).find((c) => reCountry.test(String(c?.name || ''))) || null;
  if (found) _COUNTRY_ROOT_CACHE.set(h, { id: String(found.id), name: found.name });
  return found ? { id: String(found.id), name: found.name } : null;
}

/** По названию города найти areaId (для hh.kz — только в поддереве Казахстана) */
export async function resolveAreaId(cityName, host = normalizeHost()) {
  const h = normalizeHost(host);
  const name = (cityName || '').toString().trim().toLowerCase();
  if (!name) return null;

  const tree = await getAreas(h).catch(() => null);
  if (!tree) return null;

  let roots = tree;
  if (h === 'hh.kz') {
    const kz = await getCountryRoot(h, /казахстан/i);
    if (!kz) return null;

    // ищем actual узел Казахстана
    const stackFind = [...tree];
    let kzNode = null;
    while (stackFind.length && !kzNode) {
      const node = stackFind.pop();
      if (String(node?.id) === String(kz.id)) { kzNode = node; break; }
      if (Array.isArray(node?.areas)) stackFind.push(...node.areas);
    }
    if (!kzNode) return null;
    roots = [kzNode];
  }

  const stack = [...roots];
  let fallback = null;

  while (stack.length) {
    const node = stack.pop();
    const nm = (node?.name || '').toString().trim();
    const nmLower = nm.toLowerCase();

    if (nmLower === name) return { id: String(node.id), name: nm };
    if (!fallback && nmLower.includes(name)) fallback = { id: String(node.id), name: nm };

    const children = Array.isArray(node?.areas) ? node.areas : [];
    for (const ch of children) stack.push(ch);
  }
  return fallback;
}

/** Подсказки городов (typeahead) */
export async function suggestCities(query, { host = normalizeHost(), limit = 8, excludeRU = true } = {}) {
  const h = normalizeHost(host);
  const q = (query || '').toString().trim().toLowerCase();
  if (!q) return [];

  const tree = await getAreas(h).catch(() => null);
  if (!tree) return [];

  const out = [];
  const stack = [];
  if (h === 'hh.kz') {
    const kz = await getCountryRoot(h, /казахстан/i);
    if (kz) {
      const find = [...tree];
      let kzNode = null;
      while (find.length && !kzNode) {
        const node = find.pop();
        if (String(node?.id) === String(kz.id)) { kzNode = node; break; }
        if (Array.isArray(node?.areas)) find.push(...node.areas);
      }
      if (kzNode) stack.push({ node: kzNode, country: kz.name || 'Казахстан' });
    }
  } else {
    for (const country of tree) stack.push({ node: country, country: country?.name || '' });
  }

  const EXCLUDED = excludeRU ? new Set(['россия', 'russia']) : new Set();

  while (stack.length && out.length < limit * 3) {
    const { node, country } = stack.pop();
    if (EXCLUDED.has((country || '').toLowerCase())) continue;

    const name = (node?.name || '').toString().trim();
    const nmLower = name.toLowerCase();
    const children = Array.isArray(node?.areas) ? node.areas : [];

    if (children.length === 0) {
      if (nmLower.includes(q)) out.push({ id: String(node.id), name, country, isLeaf: true });
    } else {
      for (const ch of children) stack.push({ node: ch, country });
    }
  }

  const seen = new Set();
  const uniq = [];
  for (const item of out) {
    const key = `${item.id}:${item.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(item);
    if (uniq.length >= limit) break;
  }
  return uniq;
}

/* -------------------- ВАКАНСИИ -------------------- */

export async function searchJobs(params = {}) {
  const host = normalizeHost(params.host || HOST_DEFAULT || 'hh.kz');

  let area = params.area;
  if (!params.city && !area && host === 'hh.kz') {
    const kz = await getCountryRoot(host, /казахстан/i).catch(() => null);
    if (kz?.id) area = String(kz.id);
  }

  const q = new URLSearchParams();
  if (params.text) q.set('text', params.text);
  if (params.city) q.set('city', params.city);
  if (area) q.set('area', area);
  q.set('host', host);

  const salaryClean = stripCurrency(params.salary);
  if (salaryClean != null) q.set('salary', salaryClean);

  if (params.only_with_salary) q.set('only_with_salary', 'true');
  if (params.page != null) q.set('page', String(params.page));
  if (params.per_page != null) q.set('per_page', String(params.per_page));

  const exp = normalizeExperience(params.experience);
  if (exp) q.set('experience', exp);

  const url = `/hh/jobs/search?${q.toString()}`;
  const data = await safeFetchJSON(url, {
    method: 'GET',
    signal: params.signal,
    timeoutMs: params.timeoutMs,
  });

  if (data == null && USE_MOCKS) return { ...mockJobs };
  return data;
}

export async function searchJobsSmart(params = {}) {
  const host = normalizeHost(params.host);

  let area = params.area;
  if (!area && params.city) {
    const resolved = await resolveAreaId(params.city, host).catch(() => null);
    if (resolved?.id) area = resolved.id;
  }
  if (!params.city && !area && host === 'hh.kz') {
    const kz = await getCountryRoot(host, /казахстан/i).catch(() => null);
    if (kz?.id) area = String(kz.id);
  }
  return searchJobs({ ...params, area, host });
}

// Сырые вакансии (оставлено на случай отладок)
export async function searchVacanciesRaw(params = {}) {
  const host = normalizeHost(params.host);
  const q = new URLSearchParams();
  if (params.text) q.set('text', params.text);
  if (params.area) q.set('area', params.area);
  if (params.experience) q.set('experience', params.experience);
  if (params.page != null) q.set('page', String(params.page));
  if (params.per_page != null) q.set('per_page', String(params.per_page));
  if (params.salary != null) q.set('salary', stripCurrency(params.salary) || '');
  if (params.only_with_salary) q.set('only_with_salary', 'true');
  q.set('host', host);
  const url = `/hh/vacancies?${q.toString()}`;
  return safeFetchJSON(url, { method: 'GET' });
}

/* -------------------- AI: инференс и полировка -------------------- */

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
  // грубая уверенность — чем больше данных, тем выше
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
    // Структура старых реализаций: { role, city, skills, experience, confidence }
    if (!out?.search && (out?.role || out?.skills)) {
      return out;
    }
    return out?.search || out || localInferSearch(profile);
  } catch (e) {
    // пробуем альтернативный путь (на случай другого роутинга на BFF)
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

/* -------------------- AI: рекомендации -------------------- */
/**
 * Важно: на сервере точно есть /api/recommendations/generate.
 * Здесь мы вызываем /recommendations/generate как основной путь.
 * Если на старом сервере был только /recommendations/analyze — пробуем fallback.
 * В крайних случаях отдаём безопасный локальный “seed”: роль из профиля и текущие скиллы (без домыслов).
 */
function extractSkills(profile = {}) {
  const raw = (Array.isArray(profile.skills) ? profile.skills : [])
    .map((s) => (typeof s === 'string' ? s : (s?.name || s?.title || s?.skill || '')))
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const v of raw) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}
function seedRole(profile = {}) {
  const fields = [
    profile?.position, profile?.desiredRole, profile?.desiredPosition, profile?.targetRole, profile?.objective,
    profile?.experience?.[0]?.title, profile?.experience?.[0]?.position
  ];
  for (const f of fields) {
    const val = String(f || '').trim();
    if (val) return val;
  }
  return '';
}
function marketFit(profile = {}) {
  const hasAnything =
    (profile.summary && profile.summary.trim().length > 0) ||
    (Array.isArray(profile.skills) && profile.skills.length > 0) ||
    (Array.isArray(profile.experience) && profile.experience.length > 0) ||
    (Array.isArray(profile.education) && profile.education.length > 0);
  if (!hasAnything) return 0;

  let score = 0;
  const roleText = String(profile.position || profile.title || '').trim();
  if (roleText.length >= 3) score += Math.min(10, Math.floor(roleText.split(/\s+/).length * 2));

  const uniqSkills = Array.from(new Set((profile.skills || []).map((s) => String(s).trim()).filter(Boolean)));
  score += Math.min(30, uniqSkills.length * 3);

  // грубо по длительности опыта (если есть даты в experience)
  const items = Array.isArray(profile.experience) ? profile.experience : [];
  let ms = 0;
  for (const it of items) {
    const start = it?.start || it?.from || it?.dateStart || it?.date_from;
    const end   = it?.end || it?.to || it?.dateEnd || it?.date_to || new Date().toISOString();
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e && e > s) ms += (+e - +s);
  }
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years >= 6) score += 35;
  else if (years >= 3) score += 25;
  else if (years >= 1) score += 15;
  else if (years > 0) score += 5;

  const sumLen = String(profile.summary || '').trim().length;
  if (sumLen >= 200) score += 10;
  else if (sumLen >= 120) score += 7;
  else if (sumLen >= 60) score += 5;
  else if (sumLen >= 20) score += 2;

  if (Array.isArray(profile.education) && profile.education.length) score += 8;
  if (String(profile.location || '').trim()) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function fetchRecommendations(profile, opts = {}) {
  // попытка резолва areaId по городу
  let areaId = opts.areaId ?? null;
  if (!areaId && opts.city) {
    const resolved = await resolveAreaId(opts.city, normalizeHost()).catch(() => null);
    if (resolved?.id) areaId = resolved.id;
  }

  const body = {
    profile,
    areaId: areaId ?? null,
    sig: opts.sig || undefined,
    ts: typeof opts.ts === 'number' ? opts.ts : Date.now(),
    lang: opts.lang || undefined,
    expand: opts.expand || undefined,
    meta: opts.meta || undefined,
    focusRole: opts.focusRole || undefined,
    seedSkills: opts.seedSkills || undefined,
  };

  // 1) Основной актуальный путь
  try {
    return await safeFetchJSON('/recommendations/generate', {
      method: 'POST',
      cache: 'no-store',                         // <— без кэша и без префлайтов
      headers: { 'Content-Type': 'application/json' },
      body,
      noDedupe: true,
    });
  } catch (e1) {
    // 2) Старый путь “analyze”
    try {
      return await safeFetchJSON('/recommendations/analyze', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body,
        noDedupe: true,
      });
    } catch (e2) {
      // 3) Полный фейл — отдаём только «семена» из профиля (без выдумок)
      const role = seedRole(profile);
      const skills = extractSkills(profile).slice(0, 10);
      return {
        roles: role ? [role] : [],
        professions: role ? [role] : [],
        skillsToLearn: skills,
        courses: [],
        marketFitScore: marketFit(profile),
        debug: { fallback: 'profile-seed', ai: false, e1: e1?.message, e2: e2?.message },
      };
    }
  }
}

export async function generateRecommendations(profile, opts = {}) {
  // оставлено для совместимости; теперь вызывает тот же /recommendations/generate
  return fetchRecommendations(profile, opts);
}

export async function improveProfileAI(profile, opts = {}) {
  const body = { profile, sig: opts.sig || undefined, ts: typeof opts.ts === 'number' ? opts.ts : Date.now() };
  try {
    return await safeFetchJSON('/recommendations/improve', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
      noDedupe: true,
    });
  } catch {
    // нет эндпоинта — отдаём то, что есть
    return { profile, debug: { fallback: 'no-endpoint' } };
  }
}

/* -------------------- РЕЗЮМЕ ПОЛЬЗОВАТЕЛЯ -------------------- */

export async function getUserResumes(options = {}) {
  const data = await safeFetchJSON('/hh/resumes', { method: 'GET', ...options });
  if (data == null && USE_MOCKS) return [...mockResumes];
  return data;
}

// Может отсутствовать на BFF — оставлен для совместимости
export async function importResume(hhResumeId, options = {}) {
  return safeFetchJSON(`/profile/import/hh/${encodeURIComponent(hhResumeId)}`, {
    method: 'POST',
    ...options,
  });
}

/* -------------------- HEALTH / VERSION -------------------- */

export async function ping(options = {}) {
  // реальный health на сервере — /health
  return safeFetchJSON('/health', options).catch(() =>
    safeFetchJSON('/alive', options).catch(() => null)
  );
}

export async function getServerVersion(options = {}) {
  // отдаём /api/debug как “версию/состояние” сервера
  return safeFetchJSON('/debug', options).catch(() => null);
}
