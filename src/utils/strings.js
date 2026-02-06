/**
 * Shared string utilities — replaces duplicated norm/uniqCI/dedup
 * across BuilderPage.jsx, AIResumeBuilder.jsx, and bff.js.
 */

/** Normalize string: lowercase + trim */
export const norm = (s) => String(s || '').toLowerCase().trim();

/** Case-insensitive unique filter */
export const uniqCaseInsensitive = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = norm(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(typeof x === 'string' ? x.trim() : x);
  }
  return out;
};

/** Alias */
export const uniqCI = uniqCaseInsensitive;

/** Check if value is blank (null, undefined, empty string) */
export const isBlank = (v) => !v || !String(v).trim();

/** Return first non-empty string from values */
export const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
};

/** Capitalize first letter */
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
