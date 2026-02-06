/**
 * Shared constants — replaces magic numbers across the codebase.
 */

/* ---------- API / Network ---------- */
export const API_TIMEOUT_MS = 12000;
export const AREAS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/* ---------- HH Search Limits ---------- */
export const MAX_SEARCH_TEXT_LENGTH = 200;
export const MAX_PAGE = 50;
export const MAX_PER_PAGE = 100;
export const DEFAULT_PER_PAGE = 20;

/* ---------- Builder / Profile ---------- */
export const MIN_AGE = 14;
export const MAX_AGE = 80;

/* ---------- Recommendation Input ---------- */
export const MAX_PROFILE_SIZE = 50000; // chars in JSON
export const MAX_SKILLS_COUNT = 50;
export const MAX_ROLE_LENGTH = 200;
