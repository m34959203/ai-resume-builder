// src/services/bff/http.js — HTTP client with deduping and timeouts

/* eslint-disable no-console */

import { makeApiUrl, API_TIMEOUT_MS, USE_MOCKS } from './env';

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
 *  - noCacheHeader?: boolean (не добавлять X-No-Cache/Pragma для jobs-search)
 */
export async function safeFetchJSON(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  // Для запросов к вакансиям пробиваем no-cache,
  // чтобы исключить влияние SW/PWA runtime cache
  const normalizedUrl = makeApiUrl(url);
  const isJobsSearch = normalizedUrl.includes('/hh/jobs/search');
  if (isJobsSearch && !options.noCacheHeader) {
    headers['X-No-Cache'] = '1';
    headers['Cache-Control'] = 'no-cache, no-store';
    headers.Pragma = 'no-cache';
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
        const headersObj = Object.fromEntries([...res.headers.entries()]);
        console.log('[BFF Client] Response headers:', headersObj);
        if (headersObj['x-source-hh-url']) {
          console.log('[BFF Client] HH URL:', headersObj['x-source-hh-url']);
        }
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
