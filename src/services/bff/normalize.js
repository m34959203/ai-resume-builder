// src/services/bff/normalize.js — Experience, host, currency normalization

import { HOST_DEFAULT, FORCE_KZ } from './env';

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

export const stripCurrency = (v) => (v == null || v === '' ? undefined : String(v).replace(/[^\d]/g, '') || undefined);

export const toIntOrUndef = (v, min = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : undefined;
};

export const normalizeHost = (h) => (FORCE_KZ ? 'hh.kz' : (h || HOST_DEFAULT)).toLowerCase();
export const getDefaultHost = () => normalizeHost();

export function currencyForHost(h) {
  const host = normalizeHost(h);
  return host === 'hh.ru' ? 'RUR' : 'KZT';
}
export const getDefaultCurrency = (h) => currencyForHost(h);
