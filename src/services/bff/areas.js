// src/services/bff/areas.js — Areas cache, city resolution, suggestions

import { safeFetchJSON } from './http';
import { normalizeHost } from './normalize';
import { AREAS_TTL_MS } from './env';

const _AREAS_CACHE = new Map();       // host -> { at:number, data:any }
const _AREAS_LOADING = new Map();     // host -> Promise<any>
const _COUNTRY_ROOT_CACHE = new Map();// host -> { id, name }

async function _loadAreasRaw(host = normalizeHost(), options = {}) {
  const h = normalizeHost(host);
  const url = `/hh/areas?host=${encodeURIComponent(h)}`;
  return safeFetchJSON(url, options);
}

export async function getAreas(host = normalizeHost(), options = {}) {
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

export async function getCountryRoot(host, reCountry = /казахстан/i) {
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
