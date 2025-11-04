import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase, Search, MapPin, Award, Filter,
  ChevronLeft, ChevronRight, RefreshCw, Sparkles, X
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import {
  searchJobsSmart,
  isHttpError,
  fetchAreas,
  inferSearchFromProfile,
  getDefaultHost,
} from '../services/bff';

const HOST = getDefaultHost();

/* ----------------------- helpers ----------------------- */
function useDebouncedValue(value, delay = 800) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const normalizeText = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function calcExperienceCategory(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return 'noExperience';
  let ms = 0;
  items.forEach((it) => {
    const s = it?.start || it?.from || it?.dateStart || it?.date_from;
    const e = it?.end || it?.to || it?.dateEnd || it?.date_to || new Date().toISOString();
    const start = s ? new Date(s) : null;
    const end = e ? new Date(e) : null;
    if (start && end && end > start) ms += (+end - +start);
    else ms += 365 * 24 * 3600 * 1000;
  });
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

function deriveQueryFromProfile(p) {
  // 1) явная целевая роль
  const explicit = p?.position || p?.desiredRole || p?.desiredPosition || p?.targetRole || p?.objective;
  if (explicit) return String(explicit).trim();
  // 2) по последнему месту
  const exp = Array.isArray(p?.experience) ? p.experience : [];
  if (exp.length) {
    const last = [...exp].sort((a, b) =>
      new Date(b?.end || b?.to || b?.dateEnd || b?.date_to || Date.now()) -
      new Date(a?.end || a?.to || a?.dateEnd || a?.date_to || Date.now())
    )[0];
    const role = last?.position || last?.title || last?.role;
    if (role) return String(role).trim();
  }
  // 3) первые 1–3 навыка
  if (Array.isArray(p?.skills) && p.skills.length) return p.skills.slice(0, 3).join(' ');
  // 4) начало summary
  const sum = String(p?.summary || '').trim();
  if (sum) return sum.split(/\s+/).slice(0, 3).join(' ');
  return '';
}

function hhExpFromAi(aiExp) {
  const v = String(aiExp || '').trim();
  if (v === 'none' || v === '0-1') return 'noExperience';
  if (v === '1-3') return 'between1And3';
  if (v === '3-6') return 'between3And6';
  if (v === '6+') return 'moreThan6';
  if (['noExperience', 'between1And3', 'between3And6', 'moreThan6'].includes(v)) return v;
  return '';
}

function prettyExp(v, t) {
  const x = String(v || '').trim();
  if (x === 'none' || x === '0-1' || x === 'noExperience') return t('vacancies.experience.noExperience');
  if (x === '1-3' || x === 'between1And3') return t('vacancies.experience.between1And3');
  if (x === '3-6' || x === 'between3And6') return t('vacancies.experience.between3And6');
  if (x === '6+' || x === 'moreThan6') return t('vacancies.experience.moreThan6');
  return t('vacancies.experience.any');
}

/* ---------- простая локализация терминов для запроса ---------- */
const ROLE_MAP = {
  kk: {
    'Frontend Developer': 'Фронтенд әзірлеуші',
    'Full-Stack Developer': 'Фулл-стек әзірлеуші',
    'Software Engineer': 'Бағдарламалық инженер',
    'Data Analyst': 'Деректер талдаушысы',
    'UI/UX Designer': 'UI/UX дизайнер',
    'Project Manager': 'Жоба менеджері',
    'Business Analyst': 'Бизнес-талдаушы',
    'Marketing Specialist': 'Маркетинг маманы',
    'Developer': 'Әзірлеуші',
    'разработчик': 'әзірлеуші',
  },
  ru: {} // по-русски оставляем как есть
};

const SKILL_MAP = {
  kk: {
    'TypeScript': 'TypeScript',
    'Node.js': 'Node.js',
    'Docker': 'Docker',
    'GraphQL': 'GraphQL',
    'React': 'React',
    'JavaScript': 'JavaScript',
    'Python': 'Python',
    'SQL': 'SQL',
    'Figma': 'Figma',
    'User Research': 'Пайдаланушы зерттеуі',
    'Design Systems': 'Дизайн жүйелері',
  },
  ru: {} // по-русски оставляем как есть
};

function localizeTerm(term, lang, dict) {
  const t = String(term || '').trim();
  if (!t) return '';
  const d = dict?.[lang] || {};
  // точное совпадение
  if (d[t]) return d[t];
  // по регистру/вариантам
  const found = Object.keys(d).find(k => k.toLowerCase() === t.toLowerCase());
  return found ? d[found] : t;
}

/* ----------------------- CitySelect ----------------------- */
function CitySelect({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const areas = await fetchAreas(HOST);
        if (cancelled) return;
        const kz = (areas || []).find((c) => /казахстан|kazakhstan|қазақстан/i.test(c?.name));
        const acc = [];
        function walk(node) {
          if (!node) return;
          const child = Array.isArray(node.areas) ? node.areas : [];
          if (!child.length) acc.push({ id: String(node.id), name: node.name });
          else child.forEach(walk);
        }
        if (kz) walk(kz);
        const seen = new Set();
        const uniq = [];
        acc.forEach((x) => {
          const key = x.name.toLowerCase();
          if (!seen.has(key)) { seen.add(key); uniq.push(x); }
        });
        setCities(uniq.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      } catch {
        setCities([
          { id: 'almaty', name: 'Алматы' },
          { id: 'astana', name: 'Астана' },
          { id: 'shymkent', name: 'Шымкент' },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return cities.slice(0, 50);
    return cities.filter(c => c.name.toLowerCase().includes(q)).slice(0, 50);
  }, [query, cities]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        placeholder={t('vacancies.cityPlaceholder')}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-2 border rounded-lg"
        aria-label={t('builder.personal.location')}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border rounded-lg shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">{t('vacancies.noCitiesFound')}</div>
          ) : (
            filtered.map((c) => (
              <button
                key={`${c.id}-${c.name}`}
                onClick={() => { setQuery(c.name); setOpen(false); onChange?.(c.name, c); }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ======================== Main: Vacancies Page ======================== */
export default function VacanciesPage({
  onBack,
  searchQuery,
  setSearchQuery,
  vacancies,
  setVacancies,
  mockVacancies,
  profile,
  lang = 'ru',
}) {
  const { t } = useTranslation();

  const [filters, setFilters] = useState({ location: '', experience: '', salary: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bootstrapped, setBootstrapped] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const aiAskedRef = useRef(false);
  const aiAutoAppliedRef = useRef(false);

  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [found, setFound] = useState(0);
  const [pages, setPages] = useState(0);

  const [retryAfter, setRetryAfter] = useState(null);
  const blocked = retryAfter && Date.now() < retryAfter;

  const [useProfile, setUseProfile] = useState(true);
  const appliedRef = useRef(false);
  const reqIdRef = useRef(0);

  useEffect(() => { setPage(0); }, [searchQuery, filters.location, filters.experience, filters.salary]);

  // автоподстановка из профиля
  useEffect(() => {
    if (!useProfile) return;
    if (appliedRef.current && !profile) return;

    const next = { ...filters };
    let changed = false;

    const city = (profile?.location || '').trim();
    if (city && city !== next.location) { next.location = city; changed = true; }

    const cat = calcExperienceCategory(profile);
    if (cat && cat !== next.experience) { next.experience = cat; changed = true; }

    const q = deriveQueryFromProfile(profile);
    if (q && q !== searchQuery) { setSearchQuery(q); changed = true; }

    if (changed) {
      setFilters(next);
      setPage(0);
      appliedRef.current = true;
    }
  }, [useProfile, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // запрос на подсказку ИИ с учётом языка
  useEffect(() => {
    const hasProfileData =
      !!normalizeText(profile?.summary) ||
      (Array.isArray(profile?.skills) && profile.skills.length) ||
      (Array.isArray(profile?.experience) && profile.experience.length) ||
      (Array.isArray(profile?.education) && profile.education.length);

    if (!useProfile || !hasProfileData || aiAskedRef.current) return;

    aiAskedRef.current = true;
    setAiLoading(true);
    setAiError('');
    setAiSuggestion(null);

    (async () => {
      try {
        const s = await inferSearchFromProfile(profile, { lang });
        if (s && (s.role || s.city || (s.skills || []).length)) setAiSuggestion(s);
      } catch {
        setAiError(t('vacancies.aiError'));
      } finally {
        setAiLoading(false);
      }
    })();
  }, [useProfile, profile, lang, t]);

  // авто-применение подсказки
  useEffect(() => {
    if (!useProfile || aiAutoAppliedRef.current || !aiSuggestion || aiLoading) return;
    const userTyped = Boolean((searchQuery || '').trim());
    const conf = typeof aiSuggestion.confidence === 'number' ? aiSuggestion.confidence : 0;
    if (!userTyped && conf >= 0.5) {
      if (aiSuggestion.role) {
        const localizedRole = localizeTerm(aiSuggestion.role, lang, ROLE_MAP);
        setSearchQuery(localizedRole);
      }
      setFilters((f) => ({
        ...f,
        location: aiSuggestion.city || f.location,
        experience: hhExpFromAi(aiSuggestion.experience) || f.experience,
      }));
      setPage(0);
      aiAutoAppliedRef.current = true;
    }
  }, [aiSuggestion, aiLoading, useProfile, searchQuery, lang]);

  const applyAISuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.role) {
      const localizedRole = localizeTerm(aiSuggestion.role, lang, ROLE_MAP);
      setSearchQuery(localizedRole);
    }
    setFilters((f) => ({
      ...f,
      location: aiSuggestion.city || f.location,
      experience: hhExpFromAi(aiSuggestion.experience) || f.experience,
    }));
    setPage(0);
  };

  const addSkillToQuery = (skill) => {
    const localized = localizeTerm(skill, lang, SKILL_MAP);
    if (!localized) return;
    const has = new RegExp(
      `(^|\\s)${localized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`,
      'i'
    ).test(searchQuery);
    if (has) return;
    setSearchQuery((q) => (q ? `${q} ${localized}` : localized));
  };

  const debouncedSearch = useDebouncedValue(searchQuery, 800);
  const filtersKey = useMemo(
    () => JSON.stringify({ location: filters.location, experience: filters.experience, salary: filters.salary }),
    [filters.location, filters.experience, filters.salary]
  );
  const debouncedFiltersKey = useDebouncedValue(filtersKey, 800);

  async function runSearch({
    typedText, chosenCity, chosenExp, salaryVal, pageArg, perPageArg, abortSignal, myId,
  }) {
    setLoading(true);
    setError('');

    const inferredRole = aiSuggestion?.role || deriveQueryFromProfile(profile) || '';
    const inferredCity = aiSuggestion?.city || (profile?.location || '');
    const inferredExp  = hhExpFromAi(aiSuggestion?.experience) || calcExperienceCategory(profile) || '';

    // локализуем роль при подстановке по умолчанию
    const defaultRole = localizeTerm(inferredRole || 'разработчик', lang, ROLE_MAP);
    const effectiveText = (typedText || '').trim() || defaultRole;
    const effectiveCity = chosenCity || inferredCity || undefined;
    const effectiveExp  = (chosenExp === 'none') ? 'noExperience' : (chosenExp || inferredExp || '');

    const salaryNum = salaryVal ? String(salaryVal).replace(/\D/g, '') : undefined;

    const params = {
      text: effectiveText,
      experience: effectiveExp || undefined,
      salary: salaryNum,
      city: effectiveCity,
      host: HOST,
      page: pageArg,
      per_page: perPageArg,
      signal: abortSignal,
      timeoutMs: 12000,
    };

    try {
      const data = await searchJobsSmart(params);
      if (reqIdRef.current !== myId) return;

      const items = Array.isArray(data?.items) ? data.items : [];

      const stripHtml = (t) => String(t || '')
        .replace(/<\/?highlighttext[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();

      const cleanSkills = (arr) => (Array.isArray(arr) ? arr : [])
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 12);

      const mapped = items.map((v) => {
        let salaryText = t('vacancies.salaryNegotiable');
        const raw = v.salary_raw || v.salary || {};
        if (typeof v.salary === 'string' && v.salary.trim()) {
          salaryText = v.salary.trim();
        } else if (raw && (raw.from || raw.to)) {
          const from = raw.from ? String(raw.from) : '';
          const to   = raw.to   ? String(raw.to)   : '';
          const cur  = raw.currency || raw.cur || '';
          const range = [from, to].filter(Boolean).join(' – ');
          salaryText = `${range}${range ? ' ' : ''}${cur}`.trim() || t('vacancies.salaryNegotiable');
        }

        return {
          id: v.id,
          title: v.title || v.name || t('vacancies.vacancyTitle'),
          company: typeof v.employer === 'string' ? v.employer : (v.employer?.name || ''),
          salary: salaryText,
          location: v.area?.name || v.area || '',
          experience: v.experience?.name || v.experience || '',
          description: stripHtml(v.description || v.snippet?.responsibility || v.snippet?.requirement || ''),
          skills: cleanSkills(v.keywords),
          alternate_url: v.url || v.alternate_url || '',
        };
      });

      setVacancies(mapped);
      setFound(Number(data?.found || items.length || 0));
      setPages(Number(data?.pages || (items.length ? 1 : 0)));
      setError('');
      setRetryAfter(null);
    } catch (e) {
      if (reqIdRef.current !== myId) return;
      if (e?.name === 'AbortError') return;

      if (isHttpError(e)) {
        const status = e.status || 0;
        if (status === 429) {
          const serverRetry = Number(e?.body?.retry_after || 0);
          const retryMs = serverRetry ? serverRetry * 1000 : 3000;
          setRetryAfter(Date.now() + retryMs);
          setError(`${t('vacancies.rateLimited')} ~${Math.ceil(retryMs / 1000)} ${t('vacancies.sec')}`);
        } else {
          const details = typeof e.body === 'string' ? e.body : (e.body?.details || e.body?.message || '');
          setError(`${t('vacancies.searchError')} (HTTP ${status})${details ? ` — ${details}` : ''}`);
        }
      } else {
        setError(t('vacancies.loadError'));
      }

      // graceful fallback
      if (Array.isArray(mockVacancies) && mockVacancies.length) {
        setVacancies(mockVacancies);
        setFound(mockVacancies.length);
        setPages(1);
        setPage(0);
      }
    } finally {
      if (reqIdRef.current === myId) setLoading(false);
    }
  }

  useEffect(() => {
    if (blocked) return;
    const ac = new AbortController();
    const myId = ++reqIdRef.current;

    runSearch({
      typedText: useDebouncedValue(searchQuery, 800),
      chosenCity: filters.location?.trim(),
      chosenExp: filters.experience?.trim(),
      salaryVal: filters.salary,
      pageArg: page,
      perPageArg: perPage,
      abortSignal: ac.signal,
      myId,
    });

    return () => { try { ac.abort(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDebouncedValue(searchQuery, 800), useDebouncedValue(JSON.stringify(filters), 800), page, perPage, blocked, aiSuggestion]);

  useEffect(() => {
    if (bootstrapped) return;
    const derivedRole = deriveQueryFromProfile(profile) || '';
    const haveQuery = (searchQuery && searchQuery.trim()) || (derivedRole && derivedRole.trim());
    if (!haveQuery) return;
    setBootstrapped(true);
  }, [bootstrapped, searchQuery, profile]);

  const canPrev = page > 0 && !blocked;
  const canNext = pages > 0 && page + 1 < pages && !blocked;

  /* ----------------------- UI ----------------------- */
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          aria-label={t('common.back')}
          type="button"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>{t('common.back')}</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">{t('vacancies.title')}</h2>

          {(aiLoading || aiSuggestion || aiError) && (
            <div className="mb-6 rounded-xl p-5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Sparkles className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">{t('vacancies.aiSuggestion')}</div>

                    {aiLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                        {t('vacancies.aiAnalyzing')}
                      </div>
                    )}

                    {aiError && !aiLoading && (
                      <div className="text-sm text-red-600">{aiError}</div>
                    )}

                    {aiSuggestion && !aiLoading && (
                      <div className="text-sm text-gray-700">
                        {t('vacancies.aiSuggestSearch')}{' '}
                        <b>{localizeTerm(aiSuggestion.role || t('vacancies.suitableRole'), lang, ROLE_MAP)}</b>
                        {aiSuggestion.city ? <> {t('vacancies.in')} <b>{aiSuggestion.city}</b></> : null}
                        {aiSuggestion.experience ? <> • {t('builder.experience.label')}: <b>{prettyExp(aiSuggestion.experience, t)}</b></> : null}
                        {typeof aiSuggestion.confidence === 'number' ? <> • {t('vacancies.aiConfidence')}: <b>{Math.round(aiSuggestion.confidence * 100)}%</b></> : null}

                        {(aiSuggestion.skills || []).length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(aiSuggestion.skills || []).slice(0, 8).map((s, i) => {
                              const loc = localizeTerm(s, lang, SKILL_MAP);
                              return (
                                <button
                                  key={`${s}-${i}`}
                                  onClick={() => addSkillToQuery(s)}
                                  className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs hover:bg-blue-200"
                                  title={t('vacancies.addToSearch')}
                                >
                                  + {loc}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {aiSuggestion && !aiLoading && (
                    <button
                      onClick={applyAISuggestion}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      {t('vacancies.aiApply')}
                    </button>
                  )}
                  {aiSuggestion && (
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                      title={t('vacancies.aiHide')}
                      aria-label={t('vacancies.aiHide')}
                    >
                      <X size={16} />
                    </button>
                  )}
                  {!aiLoading && (
                    <button
                      onClick={() => {
                        aiAskedRef.current = false;
                        setAiSuggestion(null);
                        setAiError('');
                        setAiLoading(true);
                        inferSearchFromProfile(profile, { lang })
                          .then((s) => setAiSuggestion(s))
                          .catch(() => setAiError(t('vacancies.aiError')))
                          .finally(() => setAiLoading(false));
                      }}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                      title={t('vacancies.aiRefresh')}
                      aria-label={t('vacancies.aiRefresh')}
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rate limit notice */}
          {blocked && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {t('vacancies.rateLimited')}{' '}
              <b>{Math.max(1, Math.ceil((retryAfter - Date.now()) / 1000))} {t('vacancies.sec')}</b>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} aria-hidden />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('vacancies.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label={t('vacancies.title')}
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={useProfile}
                onChange={(e) => { setUseProfile(e.target.checked); appliedRef.current = false; }}
              />
              {t('vacancies.useProfileData')}
            </label>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              aria-expanded={showFilters}
              aria-controls="filters-panel"
            >
              <Filter size={20} /> {t('vacancies.filters')}
            </button>
          </div>

          {showFilters && (
            <div id="filters-panel" className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">{t('vacancies.cityLabel')}</label>
                <CitySelect
                  value={filters.location}
                  onChange={(name) => setFilters((f) => ({ ...f, location: name }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('vacancies.experienceLabel')}</label>
                <select
                  value={filters.experience}
                  onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">{t('vacancies.experience.any')}</option>
                  <option value="noExperience">{t('vacancies.experience.noExperience')}</option>
                  <option value="between1And3">{t('vacancies.experience.between1And3')}</option>
                  <option value="between3And6">{t('vacancies.experience.between3And6')}</option>
                  <option value="moreThan6">{t('vacancies.experience.moreThan6')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('vacancies.salaryLabel')}</label>
                <input
                  type="text"
                  value={filters.salary}
                  onChange={(e) => setFilters({ ...filters, salary: e.target.value })}
                  placeholder={t('vacancies.salaryPlaceholder')}
                  className="w-full px-4 py-2 border rounded-lg"
                  inputMode="numeric"
                />
              </div>
            </div>
          )}

          {/* Pager */}
          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            <div>
              {loading ? t('vacancies.loading') : (
                <>
                  {t('vacancies.found')}: <span className="font-semibold">{found}</span>
                  {pages ? ` • ${t('vacancies.page')} ${page + 1} ${t('vacancies.of')} ${pages}` : ''}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={!canPrev || loading}
                onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${!canPrev || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                title={t('vacancies.previous')}
                aria-label={t('vacancies.previous')}
              >
                <ChevronLeft size={16} /> {t('vacancies.previous')}
              </button>
              <button
                disabled={!canNext || loading}
                onClick={() => canNext && setPage((p) => p + 1)}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${!canNext || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                title={t('vacancies.next')}
                aria-label={t('vacancies.next')}
              >
                {t('vacancies.next')} <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {error && <div className="text-red-600 mb-4">{error}</div>}

          {/* Results */}
          <div className="space-y-4">
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className="border rounded-lg p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{vacancy.title}</h3>
                    <p className="text-gray-600">{vacancy.company}</p>
                  </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {vacancy.salary}
                    </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {vacancy.location || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award size={14} /> {vacancy.experience || '—'}
                  </span>
                </div>

                {vacancy.description ? <p className="text-gray-700 mb-4">{vacancy.description}</p> : null}

                {!!(vacancy.skills || []).length && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(vacancy.skills || []).map((s, i) => (
                      <span key={`${vacancy.id}-skill-${i}`} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                        {localizeTerm(s, lang, SKILL_MAP)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => vacancy.alternate_url && window.open(vacancy.alternate_url, '_blank')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {t('vacancies.applyOnHH')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && vacancies.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">{t('vacancies.noVacancies')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('vacancies.changeParams')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
