// src/services/bff.js
// Клиентский слой для общения с BFF (OAuth HH + вакансии + справочники + AI-инференс + AI-рекомендации).
// ✓ Казахстан по умолчанию (VITE_FORCE_KZ=1): host=hh.kz, area=корень "Казахстан", подсказки только по КЗ.
// ✓ Связка "резюме → поиск": авто areaId по городу, дефолт на корень КЗ при отсутствии города/area.
// ✓ GET-dedupe, таймауты, кэш areas с TTL, корректная сериализация JSON в POST.
// ✓ Принудительно бьёмся на порт бэкенда: абсолютный BASE даже если VITE_API_URL не задан.
// ⚠️ 429 обрабатывает BFF (вернёт 200 + debug.stale=true)

import { mockJobs, mockResumes } from './mocks';

/* -------------------- ENV & BASE URL -------------------- */

function env(key, def = '') {
  const v = import.meta?.env?.[key];
  return v == null ? def : String(v);
}

/** Строим абсолютный BASE: если VITE_API_URL не задан — берём http://localhost:8000 */
function computeApiBase() {
  const rootRaw = env('VITE_API_URL', 'http://localhost:8000').trim();
  const prefixRaw = env('VITE_API_PREFIX', '/api').trim();

  const root = rootRaw.replace(/\/+$/, '');                       // без хвостового /
  const prefix = prefixRaw.startsWith('/') ? prefixRaw : `/${prefixRaw}`;
  return `${root}${prefix}`;                                      // напр. http://localhost:8000/api
}

export const API_BASE = computeApiBase();

const USE_MOCKS       = ['1', 'true', 'yes', 'on'].includes(env('VITE_USE_MOCKS', '').toLowerCase());
const API_TIMEOUT_MS  = Number(env('VITE_API_TIMEOUT_MS', '12000')) || 12000;
const HOST_DEFAULT    = (env('VITE_HH_HOST', 'hh.kz').trim() || 'hh.kz');
const AREAS_TTL_MS    = Number(env('VITE_AREAS_TTL_MS', String(6 * 60 * 60 * 1000))) || 21600000;
// Жёсткая фиксация поиска в Казахстане (по умолчанию включена)
const FORCE_KZ        = ['1', 'true', 'yes', 'on'].includes(env('VITE_FORCE_KZ', '1').toLowerCase());

// Удобная склейка путей без двойных слэшей
const join = (...parts) =>
  parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(':/', '://');

/** Преобразуем относительные пути к абсолютному BASE (избегаем удвоения /api) */
function makeApiUrl(u) {
  if (!u) return API_BASE;
  const s = String(u);

  // Если уже абсолютный URL — возвращаем как есть
  if (/^https?:\/\//i.test(s)) return s;

  // Если нам передали URL, начинающийся с /api или api, уберём этот префикс (в BASE уже есть /api)
  let path = s;
  if (path === '/api') path = '';
  else if (path.startsWith('/api/')) path = path.slice(5);
  else if (path.startsWith('api/'))  path = path.slice(4);

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

function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  // Нормализуем URL сразу (относительный → абсолютный)
  const normalizedUrl = makeApiUrl(url);

  // Если передан внешний AbortSignal — не вешаем свой таймер
  if (options.signal) {
    return fetch(normalizedUrl, { credentials: 'include', ...options });
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);
  return fetch(normalizedUrl, { credentials: 'include', signal: controller.signal, ...options })
    .finally(() => clearTimeout(id));
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
 * Безопасная обёртка над fetch, возвращает JSON/текст или бросает BFFHttpError.
 * options:
 *  - method?: string
 *  - headers?: Record<string,string>
 *  - signal?: AbortSignal
 *  - timeoutMs?: number
 *  - noDedupe?: boolean (по умолчанию false; dedupe только для GET)
 */
export async function safeFetchJSON(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;

  // Аккуратно соберём заголовки
  const headers = { Accept: 'application/json', ...(options.headers || {}) };

  // Если нам передали body-объект и явно Content-Type: application/json — сериализуем.
  let body = options.body;
  if (
    body != null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    (headers['Content-Type']?.includes('application/json') || headers['content-type']?.includes('application/json'))
  ) {
    body = JSON.stringify(body);
  }

  const normalizedUrl = makeApiUrl(url);

  const doFetch = async () => {
    const res = await fetchWithTimeout(normalizedUrl, { ...options, method, headers, body }, timeoutMs);

    // Если сервер дал 3xx (напр., OAuth) — инициируем переход, чтобы гарантированно проставить httpOnly cookie
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('Location');
      if (loc && typeof window !== 'undefined') window.location.href = loc;
      throw new BFFHttpError(`Redirected ${res.status}`, { status: res.status, url: normalizedUrl, method, body: null });
    }

    const payload = await parsePayload(res);

    if (!res.ok) {
      // Не ретраим: бросаем осмысленную ошибку со статусом и телом
      const msg = `${method} ${normalizedUrl} -> ${res.status}`;
      throw new BFFHttpError(msg, { status: res.status, url: normalizedUrl, method, body: payload });
    }
    return payload;
  };

  // dedupe только для GET без запроса тела
  const key = method === 'GET' && !options.noDedupe ? normalizedUrl : null;
  if (key) {
    const existing = IN_FLIGHT.get(key);
    if (existing) return existing;
    const p = doFetch().finally(() => IN_FLIGHT.delete(key));
    IN_FLIGHT.set(key, p);
    try {
      return await p;
    } catch (e) {
      if (USE_MOCKS) return null;
      throw e;
    }
  }

  try {
    return await doFetch();
  } catch (err) {
    const isAbort = (err?.name === 'AbortError') || /AbortError/i.test(err?.message || '');
    if (isAbort) console.warn('[BFF] aborted:', normalizedUrl);
    else if (isHttpError(err)) console.warn('[BFF] http error:', err.status, err.url);
    else console.error('[BFF] request failed:', err?.message || err);
    if (USE_MOCKS) return null;
    throw err;
  }
}

// Нормализация опыта: 'none' | '0-1' | '1-3' | '3-6' | '6+' | коды HH -> унифицированные ключи
const EXP_MAP = {
  none: 'none',
  '0-1': '0-1',
  '1-3': '1-3',
  '3-6': '3-6',
  '6+': '6+',
  noExperience: 'none',
  between1And3: '1-3',
  between3And6: '3-6',
  moreThan6: '6+',
};
export function normalizeExperience(v) {
  if (!v) return undefined;
  const key = String(v).trim();
  return EXP_MAP[key] || undefined;
}

const stripCurrency = (v) => (v == null || v === '' ? undefined : String(v).replace(/[^\d]/g, '') || undefined);

/* -------------------- HOST/COUNTRY helpers -------------------- */

const normalizeHost = (h) => (FORCE_KZ ? 'hh.kz' : (h || HOST_DEFAULT)).toLowerCase();

/* -------------------- OAUTH (HeadHunter) -------------------- */

/** Начать OAuth вход через HH — редирект на серверный /auth/hh/login. */
export function startHHOAuth(host = normalizeHost()) {
  const url = new URL(makeApiUrl('/auth/hh/login'));
  if (host) url.searchParams.set('host', normalizeHost(host));
  window.location.href = url.toString();
}

/** Завершение OAuth (если фронт получил ?code=...). */
export async function finishHHOAuth(code, host = normalizeHost()) {
  const url = new URL(makeApiUrl('/auth/hh/callback'));
  url.searchParams.set('code', code);
  if (host) url.searchParams.set('host', normalizeHost(host));

  // Попытка «JSON-флоу» (если сервер отдает JSON)
  const resp = await safeFetchJSON(url.toString()).catch(() => null);
  if (resp && typeof resp === 'object') return resp;

  // Фоллбэк на redirect-flow (надёжнее выставит httpOnly cookies)
  window.location.href = url.toString();
  return null;
}

/** Тихое обновление access-токена через refresh cookie. */
export async function refreshHH() {
  try {
    await safeFetchJSON('/auth/hh/refresh', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/** Выход: чистим серверные httpOnly-куки. */
export async function logoutHH() {
  await safeFetchJSON('/auth/hh/logout', { method: 'POST' });
}

/** Текущий пользователь HH (если есть access cookie). */
export async function getHHMe(options = {}) {
  return safeFetchJSON('/hh/me', options);
}

/* -------------------- СПРАВОЧНИКИ (areas) с кэшем -------------------- */

const _AREAS_CACHE = new Map();    // key: host -> { at:number, data:any }
const _AREAS_LOADING = new Map();  // key: host -> Promise<any>
const _COUNTRY_ROOT_CACHE = new Map(); // key: host -> { id, name }

/** Внутренняя загрузка справочника территорий (areas) через BFF (без кэша). */
async function _loadAreasRaw(host = normalizeHost(), options = {}) {
  const h = normalizeHost(host);
  const url = `/hh/areas?host=${encodeURIComponent(h)}`;
  return safeFetchJSON(url, options);
}

/** Получить areas с кэшем и TTL + защита от параллельных запросов. */
async function getAreas(host = normalizeHost(), options = {}) {
  const h = normalizeHost(host);
  const now = Date.now();
  const cached = _AREAS_CACHE.get(h);
  if (cached && (now - cached.at) < AREAS_TTL_MS) return cached.data;

  // Если уже грузим — дождёмся
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

/** Экспортируемая функция: fetchAreas(host) c кэшем. */
export async function fetchAreas(host = normalizeHost()) {
  return getAreas(host);
}

/** Очистить кэш areas (например, для dev-перезапуска). */
export function clearAreasCache(host = null) {
  if (host) {
    _AREAS_CACHE.delete(normalizeHost(host));
    _COUNTRY_ROOT_CACHE.delete(normalizeHost(host));
  } else {
    _AREAS_CACHE.clear();
    _COUNTRY_ROOT_CACHE.clear();
  }
}

/** Корневой узел страны по регулярному выражению названия (например /казахстан/i), с кэшем */
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

/**
 * По названию города найти areaId.
 * При host='hh.kz' поиск ограничен поддеревом страны «Казахстан».
 * Возвращает { id, name } или null.
 */
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
    // найдём узел с id kz.id в дереве, чтобы пройти только его поддерево
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

/**
 * Подсказки городов (typeahead).
 * При host='hh.kz' — только Казахстан. Можно исключать РФ (на всякий случай, если host не зафиксирован).
 * Возвращает массив [{ id, name, country, isLeaf }]
 */
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
      // найдём узел-объект, чтобы итерировать дочерние
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

  // Уберём дубли и ограничим
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

/**
 * Поиск вакансий через BFF с нормализацией параметров.
 * Если host='hh.kz' и НЕ задан ни city, ни area — по умолчанию ограничиваем корнем «Казахстан».
 * params:
 *  - text?: string
 *  - city?: string
 *  - area?: string
 *  - experience?: 'none' | '0-1' | '1-3' | '3-6' | '6+' | HH-коды
 *  - salary?: number|string  // KZT (очищается от пробелов/знаков)
 *  - only_with_salary?: boolean
 *  - page?: number
 *  - per_page?: number
 *  - host?: 'hh.kz' | 'hh.ru' | ...
 *  - signal?: AbortSignal
 *  - timeoutMs?: number
 * Возвращает объект: { items, found, page, pages, debug? }
 */
export async function searchJobs(params = {}) {
  const host = normalizeHost(params.host);

  // дефолт на страну, если КЗ и фильтр не задан
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

  if (data == null && USE_MOCKS) return { ...mockJobs }; // демо-данные
  return data;
}

/**
 * «Умный» поиск: если передан city, но нет area — пытаемся найти areaId по справочнику и
 * при host='hh.kz' ещё и дефолтимся на «Казахстан», когда город/area не заданы.
 */
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

/** Сырой «прокси» для /hh/vacancies (если нужен ответ HH как есть). */
export async function searchVacanciesRaw(params = {}) {
  const host = normalizeHost(params.host);
  const q = new URLSearchParams();

  // пробрасываем только то, что понимает HH
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

/**
 * AI-инференс поискового запроса из профиля резюме (роль/город/навыки/опыт).
 * POST /api/ai/infer-search
 * Возвращает:
 *  {
 *    role, city, skills, experience ('none'|'0-1'|'1-3'|'3-6'|'6+'), confidence,
 *    search: { host, text, city, experience, per_page, page }
 *  }
 */
export async function inferSearchFromProfile(profile, { lang = 'ru', overrideModel } = {}) {
  const url = '/ai/infer-search';
  const payload = { profile, lang, overrideModel };
  if (!overrideModel) delete payload.overrideModel;

  const out = await safeFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,               // сериализуется в safeFetchJSON
    noDedupe: true,
  });

  // Перестрахуемся: принудим host=hh.kz, если FORCE_KZ
  if (out && out.search) {
    out.search.host = normalizeHost(out.search.host);
  }
  return out;
}

/** Полировка одного текста (сервер гарантирует валидный JSON). */
export async function polishText(text, { lang = 'ru', mode = 'auto' } = {}) {
  const url = '/polish';
  return safeFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { text, lang, mode },
    noDedupe: true,
  });
}

/** Полировка массива текстов. */
export async function polishBatch(texts = [], { lang = 'ru', mode = 'auto' } = {}) {
  const url = '/polish/batch';
  return safeFetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { texts, lang, mode },
    noDedupe: true,
  });
}

/* -------------------- AI: рекомендации (анализ профиля) -------------------- */

/**
 * Новый плоский контракт: /api/recommendations/analyze
 * Возвращает:
 *  { marketFitScore:number, roles:[{title,vacancies,hhQuery,topSkills[]}], growSkills:[{name,demand}], courses:[...], debug? }
 * opts: { areaId?: string|number, city?: string } — если указан city и нет areaId, будет авто-резолв в areaId
 */
export async function fetchRecommendations(profile, opts = {}) {
  let areaId = opts.areaId ?? null;

  // Удобный бонус: если передали город — попробуем найти areaId
  if (!areaId && opts.city) {
    const resolved = await resolveAreaId(opts.city, normalizeHost()).catch(() => null);
    if (resolved?.id) areaId = resolved.id;
  }

  return safeFetchJSON('/recommendations/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile, areaId: areaId ?? null },
    noDedupe: true,
  });
}

/**
 * Старый контракт (совместимость): /api/recommendations/generate -> { ok, data }
 * data содержит marketScore, professions, skillsToGrow, courses, debug и т.п.
 */
export async function generateRecommendations(profile, opts = {}) {
  return safeFetchJSON('/recommendations/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile, areaId: opts.areaId ?? null },
    noDedupe: true,
  });
}

/** Улучшение профиля: /api/recommendations/improve -> { ok, updated, changes } */
export async function improveProfileAI(profile) {
  return safeFetchJSON('/recommendations/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile },
    noDedupe: true,
  });
}

/* -------------------- РЕЗЮМЕ ПОЛЬЗОВАТЕЛЯ (примерные эндпоинты) -------------------- */

export async function getUserResumes(options = {}) {
  const data = await safeFetchJSON('/integrations/hh/resumes', options);
  if (data == null && USE_MOCKS) return [...mockResumes];
  return data;
}

export async function importResume(hhResumeId, options = {}) {
  return safeFetchJSON(`/profile/import/hh/${encodeURIComponent(hhResumeId)}`, {
    method: 'POST',
    ...options,
  });
}

/* -------------------- HEALTH / VERSION -------------------- */

export async function ping(options = {}) {
  return safeFetchJSON('/healthz', options).catch(() => null);
}

export async function getServerVersion(options = {}) {
  return safeFetchJSON('/version', options).catch(() => null);
}

/* -------------------- Доп. утилиты -------------------- */

export const getDefaultHost = () => normalizeHost();
