// src/components/AIResumeBuilder.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  FileText,
  Briefcase,
  TrendingUp,
  Search,
  MapPin,
  Award,
  BookOpen,
  Sparkles,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';
import BuilderPage from './BuilderPage';
import {
  searchJobsSmart,
  isHttpError,
  fetchAreas,
  inferSearchFromProfile,
  getDefaultHost,
  fetchRecommendations,
} from '../services/bff';

const ALLOWED_PAGES = new Set([
  'home',
  'builder',
  'recommendations',
  'vacancies',
]);
const HOST = getDefaultHost();

/* ========================== Вспомогательные хелперы ========================== */

// простой хук дебаунса
function useDebouncedValue(value, delay = 800) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// безопасный геттер
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function cls(...parts) {
  return parts.filter(Boolean).join(' ');
}

/* ========================== Компоненты UI ========================== */

function Pill({ icon: Icon, label, sub, className = '' }) {
  return (
    <div
      className={cls(
        'px-3 py-2 rounded-lg text-left border bg-white shadow-sm flex flex-col min-w-[8rem]',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-gray-800 font-medium text-sm">
        {Icon && <Icon size={16} className="text-gray-700" />}
        <span className="truncate">{label}</span>
      </div>
      {sub && (
        <div className="text-[11px] text-gray-500 leading-tight mt-1 truncate">
          {sub}
        </div>
      )}
    </div>
  );
}

function VacancyCard({ item }) {
  return (
    <div className="p-4 border rounded-lg bg-white flex flex-col gap-2">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
            <span>{item.name || 'Вакансия'}</span>
            {item.salary && (
              <span className="text-green-700 bg-green-50 border border-green-200 text-xs px-2 py-0.5 rounded">
                {item.salary}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {item.employerName || 'Компания'}
          </div>
        </div>
        <a
          className="text-blue-600 text-sm hover:underline flex items-center gap-1 shrink-0"
          href={item.alternate_url || item.url || '#'}
          target="_blank"
          rel="noreferrer"
        >
          Открыть <ExternalLink size={14} />
        </a>
      </div>

      {item.snippet && item.snippet.requirement && (
        <div className="text-xs text-gray-700 line-clamp-3 whitespace-pre-line">
          {item.snippet.requirement}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {item.area && item.area.name && (
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {item.area.name}
          </span>
        )}
        {item.experience && item.experience.name && (
          <span className="flex items-center gap-1">
            <Briefcase size={12} />
            {item.experience.name}
          </span>
        )}
        {item.published_at && (
          <span className="flex items-center gap-1">
            <ClockIcon />
            {new Date(item.published_at).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// крошечная иконка-часы (чтобы не тянуть новый импорт)
function ClockIcon() {
  return (
    <svg
      className="text-gray-500"
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

/* ========================== Главный компонент ========================== */

export default function AIResumeBuilder() {
  /* ---- состояние страницы / табов ---- */
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'builder' | 'recommendations' | 'vacancies'
  const [selectedTemplate, setSelectedTemplate] = useState('modern');

  /* ---- профиль кандидата (пробрасывается в BuilderPage) ---- */
  const [profile, setProfile] = useState({
    fullName: '',
    position: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    photo: null,
    photoUrl: null,
    experience: [],
    education: [],
    skills: [],
    languages: [],
  });

  /* ---- поиск --- */
  // поля фильтра вакансий
  const [searchText, setSearchText] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [areas, setAreas] = useState([]);
  const [experienceFilter, setExperienceFilter] = useState(''); // 'noExperience' | 'between1And3' | ...
  const [salary, setSalary] = useState('');

  // пагинация вакансий
  const [page, setPage] = useState(0);
  const [perPage] = useState(20);

  // результаты
  const [vacancies, setVacancies] = useState([]);
  const [vacanciesTotal, setVacanciesTotal] = useState(0);
  const [loadingVacancies, setLoadingVacancies] = useState(false);
  const [vacErr, setVacErr] = useState('');

  /* ---- рекомендации навыков / улучшения профиля от backend ---- */
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState('');
  const [recommendations, setRecommendations] = useState({
    missingSkills: [],
    summaryAdvice: '',
    titleAdvice: '',
  });

  /* ---- "умный поиск" на основе профиля ---- */
  const debouncedProfile = useDebouncedValue(profile, 800);

  /* ================== эффекты/инициализация ================== */

  // Подтянуть справочник локаций hh.* (areas)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await fetchAreas(HOST);
        if (!ignore) {
          setAreas(data || []);
        }
      } catch (err) {
        console.warn('fetchAreas failed', err);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Когда пользователь меняет профиль → можем предзаполнить поиск
  useEffect(() => {
    // подставить city в поиск локации, позицию в текст
    // но не затирать, если юзер уже вводил руками (минимально аккуратно)
    if (!searchText && debouncedProfile?.position) {
      setSearchText(debouncedProfile.position);
    }
    if (!searchArea && debouncedProfile?.location) {
      // находим areaId по названию:
      const lowerCity = debouncedProfile.location
        .toLowerCase()
        .replace(/\s+/g, '');
      const match = areas.find((a) =>
        a.name?.toLowerCase().replace(/\s+/g, '').includes(lowerCity),
      );
      if (match && match.id) {
        setSearchArea(String(match.id));
      }
    }
  }, [debouncedProfile, searchText, searchArea, areas]);

  // Когда открываем вкладку "vacancies" → запускаем реальный поиск
  useEffect(() => {
    if (currentPage !== 'vacancies') return;
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, page, experienceFilter]);

  /* ================== функции ================== */

  const doSearch = useCallback(
    async (opts = {}) => {
      const {
        text = searchText,
        area = searchArea,
        pageNum = page,
        per = perPage,
        exp = experienceFilter,
        sal = salary,
      } = opts;

      setLoadingVacancies(true);
      setVacErr('');
      try {
        const data = await searchJobsSmart({
          host: HOST,
          text,
          areaId: area,
          page: pageNum,
          per_page: per,
          experience: exp || undefined,
          salary: sal || undefined,
        });

        if (Array.isArray(data.items)) {
          setVacancies(
            data.items.map((it) => ({
              id: it.id,
              name: it.name,
              salary: normSalary(it.salary),
              employerName: it.employer?.name,
              snippet: it.snippet,
              area: it.area,
              experience: it.experience,
              published_at: it.published_at,
              alternate_url: it.alternate_url,
              url: it.url,
            })),
          );
        } else {
          setVacancies([]);
        }
        setVacanciesTotal(Number(data.found) || 0);
      } catch (err) {
        console.error('doSearch error', err);
        if (isHttpError(err)) {
          setVacErr(`Ошибка запроса: ${err.status} ${err.statusText || ''}`);
        } else {
          setVacErr('Не удалось получить вакансии.');
        }
      } finally {
        setLoadingVacancies(false);
      }
    },
    [
      searchText,
      searchArea,
      page,
      perPage,
      experienceFilter,
      salary,
    ],
  );

  // формат зарплаты
  function normSalary(salObj) {
    if (!salObj) return '';
    const { from, to, currency } = salObj;
    if (from && to) return `${from}–${to} ${currency || ''}`.trim();
    if (from) return `от ${from} ${currency || ''}`.trim();
    if (to) return `до ${to} ${currency || ''}`.trim();
    return '';
  }

  // запрос улучшений профиля (рекомендации)
  const getRecommendations = useCallback(async () => {
    setRecoLoading(true);
    setRecoError('');
    try {
      const data = await fetchRecommendations({
        profile,
      });
      setRecommendations({
        missingSkills: safeArr(data.missingSkills),
        summaryAdvice: data.summaryAdvice || '',
        titleAdvice: data.titleAdvice || '',
      });
    } catch (err) {
      console.error('fetchRecommendations failed', err);
      if (isHttpError(err)) {
        setRecoError(
          `Ошибка при обращении к ИИ (${err.status} ${err.statusText || ''})`,
        );
      } else {
        setRecoError('Не удалось получить рекомендации.');
      }
    } finally {
      setRecoLoading(false);
    }
  }, [profile]);

  // авто-подбор запроса на основе профиля (кнопка "подобрать по резюме")
  const inferFromProfile = useCallback(async () => {
    try {
      const inf = await inferSearchFromProfile({ profile });
      if (inf?.text && !searchText) {
        setSearchText(inf.text);
      }
      if (inf?.areaId && !searchArea) {
        setSearchArea(String(inf.areaId));
      }
      if (inf?.experience && !experienceFilter) {
        setExperienceFilter(inf.experience);
      }
      if (inf?.salary && !salary) {
        setSalary(String(inf.salary));
      }
    } catch (err) {
      console.warn('inferFromProfile failed', err);
    }
  }, [profile, searchText, searchArea, experienceFilter, salary]);

  /* ================== рендеры страниц ================== */

  function renderHome() {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <section className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex flex-wrap items-center gap-2">
            <Sparkles className="text-blue-600" />
            <span>AI Resume Builder</span>
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
            Заполните резюме, получите рекомендации по улучшению и найдите
            вакансии, которые вам подходят. Все в одном месте.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4 mb-10">
          <button
            onClick={() => setCurrentPage('builder')}
            className="p-4 border rounded-lg bg-white hover:bg-blue-50 text-left transition flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <FileText size={18} className="text-blue-600" />
              <span>Создать резюме</span>
            </div>
            <div className="text-xs text-gray-600">
              Фото, опыт, образование, навыки и PDF в 1 клик
            </div>
          </button>

          <button
            onClick={() => {
              setCurrentPage('recommendations');
              getRecommendations();
            }}
            className="p-4 border rounded-lg bg-white hover:bg-purple-50 text-left transition flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <TrendingUp size={18} className="text-purple-600" />
              <span>Улучшить резюме</span>
            </div>
            <div className="text-xs text-gray-600">
              AI подскажет, чего не хватает для вакансий
            </div>
          </button>

          <button
            onClick={() => {
              setCurrentPage('vacancies');
              doSearch();
            }}
            className="p-4 border rounded-lg bg-white hover:bg-green-50 text-left transition flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Briefcase size={18} className="text-green-600" />
              <span>Подбор вакансий</span>
            </div>
            <div className="text-xs text-gray-600">
              Поиск по HeadHunter с учётом вашего профиля
            </div>
          </button>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <Pill
            icon={Award}
            label="Навыки под позицию"
            sub="Что нужно добавить, чтобы вас позвали"
          />
          <Pill
            icon={BookOpen}
            label="Готовый PDF"
            sub="Чистый современный макет на русском"
          />
          <Pill
            icon={Search}
            label="Вакансии рядом"
            sub="Фильтр по городу и опыту"
          />
        </section>
      </div>
    );
  }

  function renderBuilder() {
    return (
      <BuilderPage
        profile={profile}
        setProfile={setProfile}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  function renderRecommendations() {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => setCurrentPage('home')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
        >
          <ChevronLeft size={16} />
          <span>Назад</span>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex flex-wrap items-center gap-2">
          <TrendingUp className="text-purple-600" />
          <span>Рекомендации по резюме</span>
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-2xl">
          Это подсказки, которые помогут поднять релевантность под вакансии.
        </p>

        {recoLoading && (
          <div className="p-4 border rounded-lg bg-purple-50 text-purple-700 text-sm flex items-center gap-2">
            <RefreshCw className="animate-spin" size={16} />
            <span>Анализируем резюме…</span>
          </div>
        )}

        {recoError && (
          <div className="p-4 border rounded-lg bg-red-50 text-red-700 text-sm">
            {recoError}
          </div>
        )}

        {!recoLoading && !recoError && (
          <div className="space-y-6">
            {/* Титул / позиция */}
            {(recommendations.titleAdvice ||
              recommendations.summaryAdvice) && (
              <div className="p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-purple-600" />
                  <span>Формулировка профиля</span>
                </h3>
                {recommendations.titleAdvice && (
                  <div className="mb-3">
                    <div className="text-xs uppercase text-gray-500 mb-1">
                      Должность:
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-line">
                      {recommendations.titleAdvice}
                    </div>
                  </div>
                )}
                {recommendations.summaryAdvice && (
                  <div>
                    <div className="text-xs uppercase text-gray-500 mb-1">
                      О себе:
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-line">
                      {recommendations.summaryAdvice}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Навыки, которых не хватает */}
            {safeArr(recommendations.missingSkills).length > 0 && (
              <div className="p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <span>Стоит добавить навыки</span>
                </h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  {recommendations.missingSkills.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-gray-500 mt-3">
                  Добавьте ключевые слова в раздел «Навыки» и в описание
                  обязанностей.
                </div>
              </div>
            )}

            {safeArr(recommendations.missingSkills).length === 0 &&
              !recommendations.titleAdvice &&
              !recommendations.summaryAdvice && (
                <div className="p-4 border rounded-lg bg-green-50 text-green-800 text-sm">
                  Похоже, резюме выглядит достаточно полно. Можно переходить к
                  откликам ✨
                </div>
              )}
          </div>
        )}
      </div>
    );
  }

  function renderVacancies() {
    const totalPages = Math.ceil(vacanciesTotal / perPage);

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => setCurrentPage('home')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
        >
          <ChevronLeft size={16} />
          <span>Назад</span>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex flex-wrap items-center gap-2">
          <Briefcase className="text-green-600" />
          <span>Подбор вакансий</span>
        </h2>

        <p className="text-sm text-gray-600 mb-6 max-w-2xl">
          Вакансии с hh.kz / hh.ru с учётом вашей роли, города, грейда и
          ожиданий.
        </p>

        {/* Поисковая панель */}
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Кого ищем
              </label>
              <div className="flex items-center gap-2">
                <Search className="text-gray-500 shrink-0" size={16} />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Frontend разработчик, аналитик данных…"
                />
                <button
                  className="text-xs text-gray-500 border rounded px-2 py-1 hover:bg-gray-50 whitespace-nowrap"
                  onClick={inferFromProfile}
                  title="Заполнить из резюме"
                >
                  из резюме
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Город / регион
              </label>
              <div className="flex items-center gap-2">
                <MapPin className="text-gray-500 shrink-0" size={16} />
                <select
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchArea}
                  onChange={(e) => setSearchArea(e.target.value)}
                >
                  <option value="">Все локации</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Опыт
              </label>
              <div className="flex items-center gap-2">
                <Briefcase className="text-gray-500 shrink-0" size={16} />
                <select
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={experienceFilter}
                  onChange={(e) => {
                    setExperienceFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Любой</option>
                  <option value="noExperience">Без опыта</option>
                  <option value="between1And3">1–3 года</option>
                  <option value="between3And6">3–6 лет</option>
                  <option value="moreThan6">Больше 6 лет</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Зарплата от
              </label>
              <div className="flex items-center gap-2">
                <Filter className="text-gray-500 shrink-0" size={16} />
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="300000"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setPage(0);
                  doSearch({
                    text: searchText,
                    area: searchArea,
                    pageNum: 0,
                    per: perPage,
                    exp: experienceFilter,
                    sal: salary,
                  });
                }}
                className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Search size={16} />
                Найти
              </button>
            </div>
          </div>
        </div>

        {/* Результаты поиска */}
        <div className="space-y-4">
          {loadingVacancies && (
            <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800 text-sm flex items-center gap-2">
              <RefreshCw className="animate-spin" size={16} />
              <span>Загружаем вакансии…</span>
            </div>
          )}

          {vacErr && !loadingVacancies && (
            <div className="p-4 border rounded-lg bg-red-50 text-red-700 text-sm">
              {vacErr}
            </div>
          )}

          {!loadingVacancies && !vacErr && vacancies.length === 0 && (
            <div className="p-4 border rounded-lg bg-white text-gray-600 text-sm">
              Вакансий не найдено.
            </div>
          )}

          {!loadingVacancies &&
            !vacErr &&
            vacancies.length > 0 &&
            vacancies.map((v) => <VacancyCard key={v.id} item={v} />)}
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              className="px-3 py-2 border rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
              disabled={page <= 0 || loadingVacancies}
              onClick={() => {
                const newPage = Math.max(0, page - 1);
                setPage(newPage);
              }}
            >
              <ChevronLeft size={16} />
              <span>Назад</span>
            </button>

            <div className="text-sm text-gray-700">
              {page + 1} / {totalPages}
            </div>

            <button
              className="px-3 py-2 border rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
              disabled={page + 1 >= totalPages || loadingVacancies}
              onClick={() => {
                const newPage = Math.min(totalPages - 1, page + 1);
                setPage(newPage);
              }}
            >
              <span>Вперёд</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ================== главный return с футером ================== */

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      {/* контент */}
      <main className="flex-1 w-full">
        {currentPage === 'home' && renderHome()}
        {currentPage === 'builder' && renderBuilder()}
        {currentPage === 'recommendations' && renderRecommendations()}
        {currentPage === 'vacancies' && renderVacancies()}
        {!ALLOWED_PAGES.has(currentPage) && renderHome()}
      </main>

      {/* футер */}
      <footer className="mt-8 border-t bg-white text-gray-600 text-xs">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="font-semibold text-gray-800 text-sm">
              AI Resume Builder
            </div>
            <div className="text-[11px] text-gray-500">
              Резюме + вакансии. Локально, конфиденциально.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500">
            <button
              type="button"
              className="hover:text-gray-800 flex items-center gap-1"
              title="Сменить язык (в разработке)"
            >
              <GlobeIcon />
              <span>Русский / Қазақ / English</span>
            </button>

            <button
              type="button"
              className="hover:text-gray-800"
              title="Тёмная тема (в разработке)"
            >
              Тёмная тема
            </button>

            <div className="text-gray-400 select-none">
              © {new Date().getFullYear()} AdalText.kz
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* маленькая иконка глобуса для футера */
function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-500"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}
