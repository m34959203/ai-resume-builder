/**
 * Shared date utilities — replaces duplicated date/experience logic
 * across AIResumeBuilder.jsx, BuilderPage.jsx, bff.js, and server/index.js.
 */

/** Safe date parsing — returns null if invalid */
export function safeDate(d) {
  if (!d) return null;
  const s = new Date(d);
  return isNaN(+s) ? null : s;
}

/** Pick the first valid date from multiple fields on an object */
export function bestOfDates(obj, keys = []) {
  for (const k of keys) {
    const v = safeDate(obj?.[k]);
    if (v) return v;
  }
  return null;
}

/** Standard date field names for experience start/end */
export const START_DATE_KEYS = ['start', 'from', 'dateStart', 'date_from'];
export const END_DATE_KEYS = ['end', 'to', 'dateEnd', 'date_to'];

/** Pick latest experience entry from profile */
export function pickLatestExperience(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return null;
  const scored = items.map((it, idx) => {
    const end = bestOfDates(it, END_DATE_KEYS);
    const start = bestOfDates(it, START_DATE_KEYS);
    const endScore = end ? +end : Number.MAX_SAFE_INTEGER - idx;
    const startScore = start ? +start : 0;
    return { it, endScore, startScore };
  }).sort((a, b) => (b.endScore - a.endScore) || (b.startScore - a.startScore));
  return scored[0]?.it || items[0];
}

/** Calculate total years of experience from profile */
export function yearsOfExperience(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  let ms = 0;
  for (const it of items) {
    const start = bestOfDates(it, START_DATE_KEYS);
    const end = bestOfDates(it, END_DATE_KEYS) || new Date();
    if (start && end && end > start) ms += (+end - +start);
  }
  return ms / (365 * 24 * 3600 * 1000);
}

/** Categorize experience years into HH-style categories */
export function calcExperienceCategory(profile) {
  const years = yearsOfExperience(profile);
  if (years < 0.1) {
    const items = Array.isArray(profile?.experience) ? profile.experience : [];
    return items.length === 0 ? 'none' : '0-1';
  }
  if (years < 1) return '0-1';
  if (years < 3) return '1-3';
  if (years < 6) return '3-6';
  return '6+';
}

/** Format date as MM.YYYY or YYYY */
export function fmtDate(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(String(v).trim());
  if (m) return `${m[2]}.${m[1]}`;
  if (/^\d{4}$/.test(String(v))) return String(v);
  return String(v);
}
