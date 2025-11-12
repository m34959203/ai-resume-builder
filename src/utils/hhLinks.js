// src/utils/hhLinks.js
export function normalizeHost(host = 'hh.kz') {
  const h = String(host || '').trim().toLowerCase();
  return h === 'hh.ru' ? 'hh.ru' : 'hh.kz';
}

function rewriteToPublic(url, host = 'hh.kz') {
  if (!url) return null;
  try {
    const u = new URL(url);
    const targetHost = normalizeHost(host);

    if (u.hostname === 'api.hh.ru') {
      u.hostname = targetHost;
      u.pathname = u.pathname.replace(/^\/vacancies\//, '/vacancy/');
      u.search = '';
      return u.toString();
    }
    if (u.hostname.endsWith('hh.ru') || u.hostname.endsWith('hh.kz')) {
      u.hostname = targetHost;
      u.pathname = u.pathname.replace('/vacancies/', '/vacancy/');
      return u.toString();
    }
    return url;
  } catch {
    if (/^\d+$/.test(String(url))) return `https://${normalizeHost(host)}/vacancy/${url}`;
    return url;
  }
}

export function getVacancyPublicUrl(vac, host = 'hh.kz') {
  const h = normalizeHost(host);
  const direct = vac?.alternate_url || vac?.public_url || null;
  if (direct) return rewriteToPublic(direct, h);
  const id = vac?.id || vac?.vacancy_id;
  return id ? `https://${h}/vacancy/${id}` : null;
}

export function getVacancyApplyUrl(vac, host = 'hh.kz') {
  const h = normalizeHost(host);
  const apply = vac?.apply_alternate_url || vac?.alternate_url || null;
  return apply ? rewriteToPublic(apply, h) : getVacancyPublicUrl(vac, h);
}
