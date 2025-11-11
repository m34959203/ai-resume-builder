/* eslint-disable no-console */

/**
 * Клиентский слой для общения с BFF:
 * - OAuth HH, поиск вакансий, справочники
 * - AI-инференс (подсказка поиска)
 * - AI-рекомендации (роли, skills gap, курсы)
 * - Перевод текстов/профиля под язык интерфейса
 *
 * Улучшения:
 *  - надёжное определение API_BASE (Render/локалка/ENV/window)
 *  - безопасная сборка query (без undefined/пустых)
 *  - корректные параметры поиска HH (currency=KZT, salary, experience)
 *  - детальная диагностика запросов /hh/jobs/search
 *  - X-No-Cache для обхода возможного SW/PWA-кэша
 *  - устойчивые переводчики (batch + graceful fallback)
 *  - ✅ experience: никогда не отправляем "none"/"0-1", только валидные HH-коды
 */

import { mockJobs, mockResumes } from './mocks';

/* -------------------- ENV & BASE URL -------------------- */

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
    // дефолт — ваш продовый BFF на Render
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

/* -------------------- Константы/утилиты -------------------- */

const USE_MOCKS      = ['1', 'true', 'yes', 'on'].includes(env('VITE_USE_MOCKS', '').toLowerCase());
const API_TIMEOUT_MS = Number(env('VITE_API_TIMEOUT_MS', '12000')) || 12000;
const HOST_DEFAULT   = (env('VITE_HH_HOST', 'hh.kz').trim() || 'hh.kz').toLowerCase();

const AREAS_TTL_MS   = Number(env('VITE_AREAS_TTL_MS', String(6 * 60 * 60 * 1000))) || 21600000;
const FORCE_KZ       = ['1', 'true', 'yes', 'on'].includes(env('VITE_FORCE_KZ', '1').toLowerCase());

console.log('[BFF] API_BASE =', API_BASE);
console.log('[BFF] HOST_DEFAULT =', HOST_DEFAULT);

const join = (...parts) =>
  parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(':/', '://');

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

/* -------------------- Ошибки и fetch обёртки -------------------- */

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

const IN_FLIGHT = new Map(); // GET-дедупликация

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
 * options:
 *  - method?: string
 *  - headers?: Record<string,string>
 *  - body?: any (автосериализация при JSON)
 *  - signal?: AbortSignal
 *  - timeoutMs?: number
 *  - noDedupe?: boolean (для GET)
 *  - cache?: RequestCache (по умолчанию 'no-store')
 *  - noCacheHeader?: boolean (не добавлять X-No-Cache)
 */
export async function safeFetchJSON(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  // Для запросов к вакансиям принудительно пробиваем no-cache,
  // чтобы исключить влияние SW/PWA runtime cache
  const normalizedUrl = makeApiUrl(url);
  const isJobsSearch = normalizedUrl.includes('/hh/jobs/search');
  if (isJobsSearch && !options.noCacheHeader) {
    headers['X-No-Cache'] = '1';
    headers['Cache-Control'] = 'no-cache';
  }

  let body = options.body;
  const hasJsonHeader =
    headers['Content-Type']?.includes('application/json') ||
    headers['content-type']?.includes('application/json');

  if (body != null && typeof body === 'object' && !(body instanceof FormData) && hasJsonHeader) {
    body = JSON.stringify(body);
  }

  if (isJobsSearch) {
    console.log('[BFF Client] Fetching jobs:', normalizedUrl);
  }

  const doFetch = async () => {
    const res = await fetchWithTimeout(
      normalizedUrl,
      {
        cache: options.cache ?? 'no-store',
        ...options,
        method,
        headers,
        body,
      },
      timeoutMs
    );

    if (isJobsSearch) {
      console.log('[BFF Client] Response status:', res.status);
      try {
        console.log('[BFF Client] Response headers:', Object.fromEntries([...res.headers.entries()]));
      } catch {}
    }

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
    if (existing) return existing;
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

/**
 * Приводим пользовательские значения к валидным HH-кодам:
 *  - '1-3'  → 'between1And3'
 *  - '3-6'  → 'between3And6'
 *  - '6+'   → 'moreThan6'
 *  - '0-1' и 'none' → НЕ отправляем (undefined), чтобы не ловить 400
 *  - уже валидные коды HH возвращаем как есть
 */
const EXP_HH_CODES = new Set(['noExperience', 'between1And3', 'between3And6', 'moreThan6']);

export function normalizeExperience(v) {
  if (v == null) return undefined;
  const raw = String(v).trim();

  // Уже HH-код
  if (EXP_HH_CODES.has(raw)) return raw;

  // Унификация тире
  const s = raw.replace(/[–—−]/g, '-').toLowerCase();

  if (s === '1-3') return 'between1And3';
  if (s === '3-6') return 'between3And6';
  if (s === '6+' || /^6\+/.test(s)) return 'moreThan6';

  // 'none' / '0-1' / «до года» и т.п. — не отправляем параметр вообще
  const noneish = new Set(['none', '0-1', '0', '<1', 'less1', 'до года', 'до 1', 'менее года', 'junior-0-1']);
  if (noneish.has(s)) return undefined;

  return undefined;
}

const stripCurrency = (v) => (v == null || v === '' ? undefined : String(v).replace(/[^\d]/g, '') || undefined);

const toIntOrUndef = (v, min = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : undefined;
};

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

    // ищем актуальный узел Казахстана
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

function buildJobsQuery(params = {}) {
  const q = new URLSearchParams();

  const text = String(params.text || '').trim();
  if (text) q.set('text', text);

  // HH: area — ключевой фильтр; если его нет, для hh.kz подставляем id страны Казахстан
  if (params.area) q.set('area', String(params.area));

  // Город в bff не требуется; оставляем для совместимости (может использоваться внешним роутом)
  if (params.city) q.set('city', String(params.city));

  // Опыт → HH-код, или не отправляем
  const exp = normalizeExperience(params.experience);
  if (exp) q.set('experience', exp);

  // Зарплата/валюта (HH понимает salary + currency)
  const salaryClean = stripCurrency(params.salary);
  if (salaryClean != null) q.set('salary', salaryClean);
  q.set('currency', String(params.currency || 'KZT'));

  if (params.only_with_salary) q.set('only_with_salary', 'true');

  const page = toIntOrUndef(params.page, 0);
  if (page !== undefined) q.set('page', String(page));

  const perPage = toIntOrUndef(params.per_page, 1);
  if (perPage !== undefined) q.set('per_page', String(perPage));

  // host прокидываем для совместимости со старыми bff-роутерами
  const host = (params.host || HOST_DEFAULT || 'hh.kz').toLowerCase();
  if (host) q.set('host', host);

  // Не трогаем date_from по умолчанию (таймзоны)
  if (typeof params.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date_from)) {
    q.set('date_from', params.date_from);
  }

  // Порядок выдачи (опционально)
  if (params.order_by) q.set('order_by', String(params.order_by)); // 'relevance' | 'publication_time'

  return q;
}

export async function searchJobs(params = {}) {
  const host = normalizeHost(params.host || HOST_DEFAULT || 'hh.kz');

  let area = params.area;
  if (!params.city && !area && host === 'hh.kz') {
    const kz = await getCountryRoot(host, /казахстан/i).catch(() => null);
    if (kz?.id) area = String(kz.id);
  }

  const q = buildJobsQuery({ ...params, host, area });
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

  // дефолтные page/per_page, валюта и отключённый date_from
  const merged = {
    per_page: params.per_page ?? 20,
    page: params.page ?? 0,
    currency: params.currency || 'KZT',
    ...params,
    area,
    host,
  };
  return searchJobs(merged);
}

// Сырые вакансии (оставлено на случай отладок)
export async function searchVacanciesRaw(params = {}) {
  const host = normalizeHost(params.host);
  const q = new URLSearchParams();
  if (params.text) q.set('text', params.text);
  if (params.area) q.set('area', params.area);

  // 🔧 важно: сначала нормализуем, потом ставим, если получилось
  const ex = normalizeExperience(params.experience);
  if (ex) q.set('experience', ex);

  if (params.page != null) q.set('page', String(params.page));
  if (params.per_page != null) q.set('per_page', String(params.per_page));
  if (params.salary != null) q.set('salary', stripCurrency(params.salary) || '');
  q.set('currency', String(params.currency || 'KZT'));
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

/* -------------------- ЛОКАЛЬНЫЕ GAP/РОЛИ/КУРСЫ (фолбэк) -------------------- */

const CANON = (s) => {
  const k = String(s || '').toLowerCase().trim();
  const map = {
    'ms excel': 'excel', excel: 'excel',
    'google sheets': 'google sheets',
    'looker studio': 'looker studio', 'google data studio': 'looker studio',
    'power query': 'power query', 'power pivot': 'power pivot',
    sql: 'sql', postgres: 'postgres', mysql: 'mysql', sqlite: 'sqlite',
    mongodb: 'mongodb', redis: 'redis',
    'power bi': 'power bi', dax: 'dax', tableau: 'tableau', qlik: 'qlik', metabase: 'metabase',
    python: 'python', pandas: 'pandas', numpy: 'numpy', scipy: 'scipy',
    matplotlib: 'matplotlib', seaborn: 'seaborn', plotly: 'plotly',
    javascript: 'javascript', js: 'javascript', typescript: 'typescript', ts: 'typescript',
    html: 'html', css: 'css', sass: 'sass', less: 'less',
    react: 'react', redux: 'redux', 'next.js': 'next', next: 'next', vite: 'vite', webpack: 'webpack', babel: 'babel',
    vue: 'vue', nuxt: 'nuxt', angular: 'angular',
    'node.js': 'node', node: 'node', express: 'express', 'nest.js': 'nest', nest: 'nest',
    django: 'django', flask: 'flask', fastapi: 'fastapi',
    spring: 'spring', '.net': '.net', 'asp.net': '.net', laravel: 'laravel', php: 'php',
    testing: 'testing', selenium: 'selenium', cypress: 'cypress', playwright: 'playwright',
    jest: 'jest', mocha: 'mocha', chai: 'chai', pytest: 'pytest',
    jmeter: 'jmeter', postman: 'postman', swagger: 'swagger',
    git: 'git', 'github actions': 'github actions', 'gitlab ci': 'gitlab ci', 'ci/cd': 'ci/cd',
    docker: 'docker', kubernetes: 'kubernetes', terraform: 'terraform', ansible: 'ansible',
    nginx: 'nginx', linux: 'linux', bash: 'bash',
    aws: 'aws', gcp: 'gcp', azure: 'azure',
    agile: 'agile', scrum: 'scrum', kanban: 'kanban',
    figma: 'figma', 'ui/ux': 'ui/ux',
  };
  return map[k] || k;
};

function normSkillsArray(arr) {
  const out = [];
  const seen = new Set();
  (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === 'string' ? x : (x?.name || x?.title || '')))
    .map((s) => CANON(s))
    .filter(Boolean)
    .forEach((s) => { if (!seen.has(s)) { seen.add(s); out.push(s); } });
  return out;
}

function localCourseLinks(skill) {
  const q = encodeURIComponent(skill);
  return [
    { provider: 'Coursera', title: `${skill} — специализации`,    duration: '1–3 мес', url: `https://www.coursera.org/search?query=${q}` },
    { provider: 'Udemy',    title: `${skill} — практические курсы`, duration: '1–2 мес', url: `https://www.udemy.com/courses/search/?q=${q}` },
    { provider: 'Stepik',   title: `${skill} — русские курсы`,    duration: '2–8 нед', url: `https://stepik.org/search?query=${q}` },
  ];
}

function localGuessRoles(profile) {
  const txt = [
    String(profile?.targetTitle || ''),
    String(profile?.desiredRole || ''),
    String(profile?.position || ''),
    String(profile?.summary || ''),
    ...(Array.isArray(profile?.experience) ? profile.experience : []).map((e) => String(e?.title || '')),
  ].join(' ').toLowerCase();

  const roles = [];
  const push = (r) => { if (!roles.includes(r)) roles.push(r); };

  if (/(front[\s-]*end|react|javascript\s*developer)/i.test(txt)) push('Frontend Developer');
  if (/(back[\s-]*end|node\.?js|django|spring|\.net)/i.test(txt)) push('Backend Developer');
  if (/(qa|тестировщик|quality\s*assurance)/i.test(txt)) push('QA Engineer');
  if (/(data\s*analyst|аналитик\s*данных)/i.test(txt)) push('Data Analyst');
  if (/(data\s*scientist)/i.test(txt)) push('Data Scientist');
  if (/(devops|ci\/cd)/i.test(txt)) push('DevOps Engineer');

  const skills = normSkillsArray(profile?.skills);
  const has = (xs) => xs.some((s) => skills.includes(CANON(s)));

  if (!roles.length) {
    if (has(['react','javascript','typescript','html','css'])) push('Frontend Developer');
    if (has(['node','django','spring','.net'])) push('Backend Developer');
    if (has(['sql','excel','power bi','tableau','python','pandas','numpy'])) push('Data Analyst');
    if (has(['selenium','cypress','playwright','testing'])) push('QA Engineer');
    if (has(['docker','kubernetes','terraform','ansible'])) push('DevOps Engineer');
  }
  return roles.slice(0, 4);
}

function localGapFrom(profile) {
  const mine = new Set(normSkillsArray(profile?.skills));
  const suggestions = [];

  // Аналитика / Python+SQL+Excel
  if (mine.has('python') || mine.has('sql') || mine.has('excel')) {
    ['pandas', 'numpy', 'etl', 'power bi', 'tableau', 'scikit-learn', 'data visualization'].forEach((s) => {
      const k = CANON(s); if (!mine.has(k)) suggestions.push(k);
    });
  }

  // Фронтенд
  if (['react','javascript','typescript','html','css'].some((s) => mine.has(s))) {
    ['redux', 'testing', 'jest', 'playwright', 'performance', 'accessibility', 'graphql'].forEach((s) => {
      const k = CANON(s); if (!mine.has(k)) suggestions.push(k);
    });
  }

  // Бэкенд
  if (['node','django','spring','.net'].some((s) => mine.has(s))) {
    ['api design','sql optimization','caching','security','docker','kubernetes'].forEach((s) => {
      const k = CANON(s); if (!mine.has(k)) suggestions.push(k);
    });
  }

  // Базовые инженерные
  ['git', 'github actions', 'ci/cd'].forEach((s) => { const k = CANON(s); if (!mine.has(k)) suggestions.push(k); });

  // Уникализация
  const out = [];
  const seen = new Set();
  for (const s of suggestions) { if (!seen.has(s)) { seen.add(s); out.push(s); } }
  return out.slice(0, 8);
}

function localRecommendations(profile) {
  const roles = localGuessRoles(profile);
  const grow = localGapFrom(profile);
  const courses = grow.slice(0, 3).flatMap((s) => localCourseLinks(s));
  // простой скоринг от заполненности
  const base = normSkillsArray(profile?.skills).length;
  const marketFitScore = Math.max(10, Math.min(70, 25 + base * 4));
  const roleObj = (r) => ({ title: r, vacancies: 0, hhQuery: r, url: `https://hh.kz/search/vacancy?text=${encodeURIComponent(r)}` });

  return {
    marketFitScore,
    marketScore: marketFitScore,
    roles: roles.map(roleObj),
    professions: roles.map(roleObj),
    growSkills: grow.map((n) => ({ name: n, demand: 1, gap: true })),
    skillsToGrow: grow.map((s) => s[0].toUpperCase() + s.slice(1)),
    courses,
    debug: { fallback: 'client-local', skillsDetected: normSkillsArray(profile?.skills) }
  };
}

/* -------------------- Вспомогательное для рекомендаций -------------------- */

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

/** Универсальный нормализатор ответа рекомендаций для UI */
function normalizeRecPayload(payload, profile) {
  const raw =
    payload && typeof payload === 'object'
      ? (payload.data && payload.ok !== undefined ? payload.data : payload)
      : {};

  // роли
  let roles = Array.isArray(raw.roles) ? raw.roles
           : Array.isArray(raw.professions) ? raw.professions
           : [];
  roles = roles
    .map(r => (typeof r === 'string' ? { title: r } : r))
    .filter(Boolean);

  // навыки для развития
  const growArr =
    (Array.isArray(raw.growSkills) ? raw.growSkills : null) ??
    (Array.isArray(raw.skillsToGrow) ? raw.skillsToGrow.map(n => ({ name: n })) : null) ??
    (Array.isArray(raw.skillsToLearn) ? raw.skillsToLearn.map(n => ({ name: n })) : null) ??
    [];
  let growSkills = growArr
    .map(s => (typeof s === 'string' ? { name: s } : s))
    .filter(s => s && s.name);

  // фильтруем дубли с тем, что уже есть в профиле
  const userSkills = new Set(extractSkills(profile).map(s => s.toLowerCase()));
  growSkills = growSkills.filter(s => !userSkills.has(String(s.name).toLowerCase()));

  // если GAP пуст — подстрахуемся локальным вычислением
  if (!growSkills.length) {
    const localGrow = localGapFrom(profile);
    growSkills = localGrow.map((n) => ({ name: n, demand: 1, gap: true }));
  }

  // курсы
  let courses = Array.isArray(raw.courses) ? raw.courses
             : Array.isArray(raw.recommendedCourses) ? raw.recommendedCourses
             : Array.isArray(raw.courseRecommendations) ? raw.courseRecommendations
             : [];
  courses = courses.map(c => (typeof c === 'string' ? { title: c, provider: '', url: c } : c));

  // если курсов нет — сгенерируем по GAP
  if (!courses.length && growSkills.length) {
    courses = growSkills.slice(0, 3).flatMap((g) => localCourseLinks(String(g.name)));
  }

  // оценка соответствия
  const market = raw.marketFitScore ?? raw.marketScore ?? raw.score ?? marketFit(profile);

  // если не пришли роли — подскажем локально
  if (!roles.length) {
    const localRoles = localGuessRoles(profile).map((r) => ({ title: r, vacancies: 0, hhQuery: r, url: `https://hh.kz/search/vacancy?text=${encodeURIComponent(r)}` }));
    roles = localRoles;
  }

  return {
    marketFitScore: market,
    marketScore: market,
    roles,
    professions: roles,
    growSkills,
    skillsToGrow: growSkills.map(s => s.name),
    courses,
    debug: raw.debug || {},
  };
}

/* -------------------- AI: рекомендации -------------------- */

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

  // 1) Основной путь
  try {
    const resp = await safeFetchJSON('/recommendations/generate', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
      noDedupe: true,
    });
    return normalizeRecPayload(resp, profile);
  } catch (e1) {
    // 2) Старый путь “analyze”
    try {
      const resp = await safeFetchJSON('/recommendations/analyze', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body,
        noDedupe: true,
      });
      return normalizeRecPayload(resp, profile);
    } catch (e2) {
      // 3) Умный клиентский фолбэк (реальный GAP + курсы)
      return localRecommendations(profile);
    }
  }
}

export async function generateRecommendations(profile, opts = {}) {
  return fetchRecommendations(profile, opts);
}

export async function improveProfileAI(profile, opts = {}) {
  const body = { profile, sig: opts.sig || undefined, ts: typeof opts.ts === 'number' ? opts.ts : Date.now() };
  try {
    const resp = await safeFetchJSON('/recommendations/improve', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
      noDedupe: true,
    });
    if (resp && resp.ok && resp.updated) return resp; // унификация
    return resp || { ok: true, updated: profile, changes: {} };
  } catch {
    // локальная минимальная нормализация
    const uniq = (arr) => Array.from(new Set((arr || []).map(String).map((s) => s.trim()).filter(Boolean)));
    const cap  = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const normalizedSkills = uniq(profile.skills).map(cap);
    const bullets = [];
    const txt = String(profile.summary || '').trim();
    if (txt) txt.split(/[\n\.]+/).map((s) => s.trim()).filter(Boolean).forEach((line) => bullets.push(`• ${line}`));
    const updated = { ...profile, skills: normalizedSkills, bullets, summary: txt || undefined };
    return { ok: true, updated, changes: { skillsCount: normalizedSkills.length, bulletsCount: bullets.length } };
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
  return safeFetchJSON('/health', options).catch(() =>
    safeFetchJSON('/alive', options).catch(() => null)
  );
}

export async function getServerVersion(options = {}) {
  // унифицируем с /version
  return safeFetchJSON('/version', options).catch(() => null);
}

/* -------------------- ПЕРЕВОД ТЕКСТОВ / ПРОФИЛЯ -------------------- */

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
