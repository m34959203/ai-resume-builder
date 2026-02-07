// src/services/bff/jobs.js — Job search (HH vacancies)

import { safeFetchJSON } from './http';
import { normalizeExperience, normalizeHost, currencyForHost, stripCurrency, toIntOrUndef } from './normalize';
import { getCountryRoot, resolveAreaId } from './areas';
import { USE_MOCKS, HOST_DEFAULT } from './env';
import { mockJobs } from '../mocks';

function truthy(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(s);
}

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

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
  q.set('currency', String(params.currency || currencyForHost(params.host)));

  if (truthy(params.only_with_salary)) q.set('only_with_salary', 'true');

  // Дополнительные параметры HH (опционально)
  if (params.specialization) q.set('specialization', String(params.specialization));
  if (params.professional_role) q.set('professional_role', String(params.professional_role));
  if (params.employment) q.set('employment', String(params.employment)); // full, part, project, volunteer, probation
  if (params.schedule) q.set('schedule', String(params.schedule));       // remote, fullDay, shift, flexible, flyInFlyOut
  if (params.search_period != null) q.set('search_period', String(clamp(params.search_period, 1, 30)));

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

  // Порядок выдачи: по умолчанию по релевантности, если есть текстовый запрос
  const orderBy = params.order_by || (text ? 'relevance' : 'publication_time');
  q.set('order_by', orderBy);

  return q;
}

export async function searchJobs(params = {}) {
  const host = normalizeHost(params.host || HOST_DEFAULT || 'hh.kz');

  let area = params.area;
  // Fallback к стране, если area не задан (независимо от city)
  if (!area && host === 'hh.kz') {
    const kz = await getCountryRoot(host, /казахстан/i).catch(() => null);
    if (kz?.id) area = String(kz.id);
  }

  const currency = params.currency || currencyForHost(host);

  const q = buildJobsQuery({ ...params, host, area, currency });
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
  // Fallback: если город указан, но не резолвится — используем корень страны (КЗ)
  // Раньше fallback срабатывал только когда city пуст, из-за чего запрос уходил без area
  if (!area && host === 'hh.kz') {
    const kz = await getCountryRoot(host, /казахстан/i).catch(() => null);
    if (kz?.id) area = String(kz.id);
  }

  // дефолтные page/per_page, валюта и отключённый date_from
  const merged = {
    per_page: params.per_page ?? 20,
    page: params.page ?? 0,
    currency: params.currency || currencyForHost(host),
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

  const ex = normalizeExperience(params.experience);
  if (ex) q.set('experience', ex);

  if (params.page != null) q.set('page', String(params.page));
  if (params.per_page != null) q.set('per_page', String(params.per_page));
  if (params.salary != null) q.set('salary', stripCurrency(params.salary) || '');
  q.set('currency', String(params.currency || currencyForHost(host)));
  if (truthy(params.only_with_salary)) q.set('only_with_salary', 'true');

  // те же доп.параметры
  if (params.specialization) q.set('specialization', String(params.specialization));
  if (params.professional_role) q.set('professional_role', String(params.professional_role));
  if (params.employment) q.set('employment', String(params.employment));
  if (params.schedule) q.set('schedule', String(params.schedule));
  if (params.search_period != null) q.set('search_period', String(clamp(params.search_period, 1, 30)));

  q.set('host', host);

  const url = `/hh/vacancies?${q.toString()}`;
  return safeFetchJSON(url, { method: 'GET' });
}
