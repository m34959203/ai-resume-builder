// src/components/AIResumeBuilder.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText, Briefcase, TrendingUp, Download, Search, MapPin,
  Award, BookOpen, Sparkles, ExternalLink, Filter, ChevronLeft, ChevronRight, RefreshCw, X
} from 'lucide-react';
import BuilderPage from './BuilderPage';
import {
  startHHOAuth,
  searchJobsSmart,            // ← умный поиск (auto areaId + дефолтный host)
  isHttpError,
  fetchAreas,
  inferSearchFromProfile,    // ← AI-инференс из резюме (через BFF)
  getDefaultHost,            // ← дефолтный host (обычно 'hh.kz')
} from '../services/bff';

const ALLOWED_PAGES = new Set(['home', 'import', 'builder', 'recommendations', 'vacancies']);
const HOST = getDefaultHost(); // гарантируем поиск по нужному сайту (по умолчанию Казахстан)

/* ========================== Вспомогательные хелперы ========================== */

// Простой хук дебаунса значения
function useDebouncedValue(value, delay = 800) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// Безопасный парс дат
function safeDate(d) {
  if (!d) return null;
  const s = new Date(d);
  return isNaN(+s) ? null : s;
}
function bestOfDates(obj, keys = []) {
  for (const k of keys) {
    const v = safeDate(obj?.[k]);
    if (v) return v;
  }
  return null;
}

// Выбрать «последний» опыт по дате окончания (или началу, если конец отсутствует)
function pickLatestExperience(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return null;
  const scored = items.map((it, idx) => {
    const end = bestOfDates(it, ['end', 'to', 'dateEnd', 'date_to']);
    const start = bestOfDates(it, ['start', 'from', 'dateStart', 'date_from']);
    const endScore = end ? +end : Number.MAX_SAFE_INTEGER - idx; // «по сей день» > любых
    const startScore = start ? +start : 0;
    return { it, endScore, startScore };
  });
  scored.sort((a, b) => (b.endScore - a.endScore) || (b.startScore - a.startScore));
  return scored[0]?.it || items[0];
}

// Оценка стажа по массиву опытов профиля → коды HH
function calcExperienceCategory(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return 'noExperience';

  let ms = 0;
  items.forEach((it) => {
    const start = bestOfDates(it, ['start', 'from', 'dateStart', 'date_from']);
    const end   = bestOfDates(it, ['end', 'to', 'dateEnd', 'date_to']) || new Date();
    if (start && end && end > start) ms += (+end - +start);
    else ms += 365 * 24 * 3600 * 1000;
  });
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

// Маппинг образования → стартовая роль
function roleFromEducation(eduItem) {
  if (!eduItem) return '';
  const raw = [
    eduItem?.specialization, eduItem?.speciality, eduItem?.major, eduItem?.faculty,
    eduItem?.field, eduItem?.program, eduItem?.department, eduItem?.degree,
  ].map((s) => String(s || '').toLowerCase()).join(' ');

  const any = (...words) => words.some((w) => raw.includes(w));

  // IT / CS
  if (any('информат', 'программи', 'computer', 'software', 'cs', 'it', 'information technology', 'айти')) {
    if (any('данн', 'data', 'ml', 'машин', 'искусствен')) return 'Data Analyst (Junior)';
    if (any('frontend', 'фронтенд', 'веб', 'web')) return 'Frontend Developer (Junior)';
    if (any('mobile', 'ios', 'android')) return 'Mobile Developer (Junior)';
    return 'Software Engineer (Junior)';
  }
  // Дизайн
  if (any('дизайн', 'ui', 'ux', 'graphic', 'product design', 'интерфейс')) return 'UI/UX Designer (Junior)';
  // Аналитика/Экономика/Финансы
  if (any('аналит', 'эконом', 'финан', 'бизнес')) return 'Business Analyst (Junior)';
  // Маркетинг
  if (any('маркет', 'реклам', 'digital marketing')) return 'Маркетолог (Junior)';
  // Менеджмент/ПМ
  if (any('менедж', 'управл', 'project')) return 'Project Manager (Junior)';

  return '';
}

// Текст роли из профиля (опыт → цель → образование → скиллы → summary)
function deriveDesiredRole(profile) {
  // 0) Явно заданная цель (включая поле из конструктора резюме)
  const explicit =
    profile?.position ||                      // ← Желаемая должность
    profile?.desiredRole ||
    profile?.desiredPosition ||
    profile?.targetRole ||
    profile?.objective ||
    '';
  if (explicit) return String(explicit).trim();

  // 1) Последняя должность из опыта
  const latest = pickLatestExperience(profile);
  const role = latest?.position || latest?.title || latest?.role || '';
  if (role) return String(role).trim();

  // 2) Если опыта нет — роль по последнему образованию
  const edus = Array.isArray(profile?.education) ? profile.education : [];
  if (edus.length) {
    const scored = edus.map((e, i) => {
      const end = bestOfDates(e, ['end', 'dateEnd', 'date_to']) || null;
      const year = Number(e?.year || e?.graduationYear || 0);
      const endScore = end ? +end : (year ? new Date(year, 6, 1).getTime() : 0);
      return { e, score: endScore || i };
    });
    scored.sort((a, b) => b.score - a.score);
    const eduRole = roleFromEducation(scored[0]?.e);
    if (eduRole) return eduRole;
  }

  // 3) Скиллы
  const skills = (profile?.skills || []).map(String).filter(Boolean);
  if (skills.length) return skills.slice(0, 3).join(' ');

  // 4) Резерв — кусок summary
  const sum = String(profile?.summary || '').trim();
  if (sum) return sum.split(/\s+/).slice(0, 3).join(' ');

  return '';
}

// Текст запроса из профиля (обёртка)
function deriveQueryFromProfile(profile) {
  return deriveDesiredRole(profile);
}

// Маппинг опыта из AI → коды HH
function hhExpFromAi(aiExp) {
  const v = String(aiExp || '').trim();
  if (v === 'none' || v === '0-1') return 'noExperience';
  if (v === '1-3') return 'between1And3';
  if (v === '3-6') return 'between3And6';
  if (v === '6+' ) return 'moreThan6';
  if (['noExperience','between1And3','between3And6','moreThan6'].includes(v)) return v;
  return '';
}
function prettyExp(aiExp) {
  const v = String(aiExp || '').trim();
  if (v === 'none' || v === '0-1') return 'без опыта';
  if (v === '1-3') return '1–3 года';
  if (v === '3-6') return '3–6 лет';
  if (v === '6+') return '6+ лет';
  if (v === 'noExperience') return 'без опыта';
  if (v === 'between1And3') return '1–3 года';
  if (v === 'between3And6') return '3–6 лет';
  if (v === 'moreThan6') return '6+ лет';
  return 'любой';
}

/* ========================== Компонент поиска города (только KZ) ========================== */

function CitySelect({ value, onChange }) {
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
        const areas = await fetchAreas(HOST); // ← используем текущий host (Казахстан)
        if (cancelled) return;

        // Фильтруем только Казахстан
        const kz = (areas || []).find((c) => /казахстан/i.test(c?.name));
        const acc = [];

        function walk(node) {
          if (!node) return;
          const child = Array.isArray(node.areas) ? node.areas : [];
          if (!child.length) {
            acc.push({ id: String(node.id), name: node.name });
            return;
          }
          if (node.name) acc.push({ id: String(node.id), name: node.name });
          child.forEach(walk);
        }
        if (kz) walk(kz);

        // Убираем дубликаты по названию
        const uniq = [];
        const seen = new Set();
        acc.forEach((x) => {
          const k = x.name.toLowerCase();
          if (!seen.has(k)) { seen.add(k); uniq.push(x); }
        });
        setCities(uniq.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      } catch {
        setCities([{ id: 'almaty', name: 'Алматы' }, { id: 'astana', name: 'Астана' }, { id: 'shymkent', name: 'Шымкент' }]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return cities.slice(0, 50);
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 50);
  }, [query, cities]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        placeholder="Начните вводить город…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-2 border rounded-lg"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border rounded-lg shadow-lg">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Ничего не найдено</div>
          ) : (
            filtered.map((c) => (
              <button
                key={`${c.id}-${c.name}`}
                onClick={() => {
                  setQuery(c.name);
                  setOpen(false);
                  onChange?.(c.name, c); // строка города — BFF сам мапит в area
                }}
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

/* ========================== Основной компонент ========================== */

const AIResumeBuilder = () => {
  const [currentPage, setCurrentPage] = useState('home');

  // профиль/шаблон
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: []
  });
  const [selectedTemplate, setSelectedTemplate] = useState('modern');

  // вакансии/поиск
  const [vacancies, setVacancies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // рекомендации
  const [recommendations, setRecommendations] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Санитизируем ?page=... (например, после OAuth-редиректа)
  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('page');
    if (p && ALLOWED_PAGES.has(p)) setCurrentPage(p);
    if (p) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Мок-данные вакансий на случай ошибки HH API
  const mockVacancies = [
    { id: 1, title: 'Frontend Developer', company: 'Tech Corp', salary: '200,000 – 300,000 ₸', location: 'Алматы', experience: 'Junior', description: 'Разработка современных веб-приложений на React', skills: ['React', 'JavaScript', 'TypeScript', 'CSS'] },
    { id: 2, title: 'UI/UX Designer', company: 'Design Studio', salary: '180,000 – 250,000 ₸', location: 'Астана', experience: 'Junior', description: 'Создание интуитивных пользовательских интерфейсов', skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'] },
    { id: 3, title: 'Data Analyst', company: 'Analytics Pro', salary: '220,000 – 280,000 ₸', location: 'Алматы', experience: 'Junior', description: 'Анализ данных и подготовка отчётов', skills: ['Python', 'SQL', 'Excel', 'Power BI'] }
  ];

  // Простая «AI»-генерация рекомендаций (заглушка)
  const generateRecommendations = () => {
    setIsGenerating(true);
    const t = setTimeout(() => {
      const userSkills = (profile.skills || []).map(s => String(s).toLowerCase());
      const hasDev = userSkills.some(s => ['react', 'javascript', 'python', 'java'].includes(s));
      const hasDesign = userSkills.some(s => ['figma', 'photoshop', 'design'].includes(s));

      setRecommendations({
        professions: hasDev
          ? ['Frontend Developer', 'Full-Stack Developer', 'Software Engineer']
          : hasDesign
          ? ['UI/UX Designer', 'Product Designer', 'Graphic Designer']
          : ['Project Manager', 'Business Analyst', 'Marketing Specialist'],
        skillsToLearn: hasDev
          ? ['TypeScript', 'Node.js', 'Docker', 'GraphQL']
          : hasDesign
          ? ['User Research', 'Interaction Design', 'Design Systems']
          : ['Agile', 'Data Analysis', 'Digital Marketing'],
        courses: [
          { name: 'Coursera — React Специализация', duration: '3 месяца' },
          { name: 'Udemy — Complete Web Development', duration: '2 месяца' },
          { name: 'Stepik — Python для начинающих', duration: '1 месяц' }
        ],
        matchScore: 75
      });
      setIsGenerating(false);
    }, 600);
    return () => clearTimeout(t);
  };

  return (
    <div className="font-sans">
      {/* Глобальное меню (единственное) */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold">AI Resume</span>
            </div>

            <div className="flex gap-6">
              <button
                onClick={() => setCurrentPage('builder')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <FileText size={18} />
                Резюме
              </button>
              <button
                onClick={() => setCurrentPage('vacancies')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <Briefcase size={18} />
                Вакансии
              </button>
              <button
                onClick={() => setCurrentPage('recommendations')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <TrendingUp size={18} />
                Рекомендации
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Роутинг по вкладкам */}
      {currentPage === 'home' && (
        <HomePage
          onCreate={() => setCurrentPage('builder')}
          onImport={() => setCurrentPage('import')}
        />
      )}

      {currentPage === 'import' && (
        <ImportPage onBack={() => setCurrentPage('home')} />
      )}

      {currentPage === 'builder' && (
        <BuilderPage
          profile={profile}
          setProfile={setProfile}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          setCurrentPage={setCurrentPage}
        />
      )}

      {currentPage === 'recommendations' && (
        <RecommendationsPage
          onBack={() => setCurrentPage('home')}
          recommendations={recommendations}
          isGenerating={isGenerating}
          generateRecommendations={generateRecommendations}
          onFindVacancies={() => setCurrentPage('vacancies')}
          onImproveResume={() => setCurrentPage('builder')}
          setSearchQuery={setSearchQuery}
        />
      )}

      {currentPage === 'vacancies' && (
        <VacanciesPage
          onBack={() => setCurrentPage('home')}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          vacancies={vacancies}
          setVacancies={setVacancies}
          mockVacancies={mockVacancies}
          profile={profile}                // <-- привязали профиль
        />
      )}

      {/* Футер */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="text-white" size={16} />
                </div>
                <span className="font-bold">AI Resume</span>
              </div>
              <p className="text-gray-400 text-sm">
                Создавайте профессиональные резюме с помощью искусственного интеллекта
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Продукт</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><span className="hover:text-white cursor-pointer" onClick={() => setCurrentPage('builder')}>Создать резюме</span></li>
                <li><span className="hover:text-white cursor-pointer" onClick={() => setCurrentPage('builder')}>Шаблоны</span></li>
                <li><span className="hover:text-white cursor-pointer" onClick={() => setCurrentPage('vacancies')}>Вакансии</span></li>
                <li><span className="hover:text-white cursor-pointer" onClick={() => setCurrentPage('recommendations')}>Рекомендации</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Компания</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">О нас</a></li>
                <li><a href="#" className="hover:text-white">Блог</a></li>
                <li><a href="#" className="hover:text-white">Карьера</a></li>
                <li><a href="#" className="hover:text-white">Контакты</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Помощь</a></li>
                <li><a href="#" className="hover:text-white">Условия использования</a></li>
                <li><a href="#" className="hover:text-white">Политика конфиденциальности</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2025 AI Resume Builder. Все права защищены.</p>
            <p className="mt-2">Интеграция с HeadHunter API</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIResumeBuilder;

/* ========================== Вспомогательные страницы ========================== */

function HomePage({ onCreate, onImport }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
            <Sparkles size={16} />
            <span className="text-sm font-medium">AI-powered Resume Builder</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Создайте идеальное резюме
            <span className="text-blue-600"> за минуты</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Искусственный интеллект поможет вам создать профессиональное резюме,
            найти подходящие вакансии и построить карьеру
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onCreate}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
            >
              <FileText size={20} />
              Создать резюме
            </button>
            <button
              onClick={onImport}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600 flex items-center gap-2"
            >
              <Download size={20} />
              Импорт из HH
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Умное резюме</h3>
            <p className="text-gray-600">
              AI-помощник подскажет, как улучшить каждый раздел резюме для максимального эффекта
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Briefcase className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Поиск вакансий</h3>
            <p className="text-gray-600">
              Интеграция с HeadHunter для поиска подходящих вакансий на основе вашего профиля
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Рекомендации</h3>
            <p className="text-gray-600">
              Персональные советы по развитию карьеры и необходимым навыкам
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6">Импорт резюме из HeadHunter</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Подключите HeadHunter</h3>
            <p className="text-gray-600 mb-6">
              Авторизуйтесь через HeadHunter, чтобы импортировать ваше существующее резюме
            </p>
            <button
              onClick={() => startHHOAuth(HOST)}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
            >
              Войти через HeadHunter
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <p className="mb-2">🔒 Ваши данные в безопасности</p>
            <p>Мы используем OAuth 2.0 и не храним ваш пароль от HeadHunter</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationsPage({
  onBack,
  recommendations,
  isGenerating,
  generateRecommendations,
  onFindVacancies,
  onImproveResume,
  setSearchQuery
}) {
  useEffect(() => {
    if (!recommendations) {
      const cleanup = generateRecommendations();
      return cleanup;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">AI Рекомендации</h2>
              <p className="text-gray-600">Персональные советы на основе вашего профиля</p>
            </div>
          </div>

          {isGenerating ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Анализируем ваш профиль...</p>
            </div>
          ) : recommendations && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Оценка соответствия рынку</h3>
                  <div className="text-3xl font-bold text-blue-600">{recommendations.matchScore}%</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all"
                    style={{ width: `${recommendations.matchScore}%` }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Briefcase className="text-blue-600" />
                  Рекомендуемые профессии
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {recommendations.professions.map((profession, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition">
                      <h4 className="font-semibold mb-2">{profession}</h4>
                      <button
                        onClick={() => {
                          setSearchQuery(profession);
                          onFindVacancies();
                        }}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Найти вакансии <ExternalLink size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="text-green-600" />
                  Навыки для развития
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recommendations.skillsToLearn.map((skill, idx) => (
                    <span key={idx} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="text-purple-600" />
                  Рекомендуемые курсы
                </h3>
                <div className="space-y-3">
                  {recommendations.courses.map((course, idx) => (
                    <div key={idx} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition">
                      <div>
                        <h4 className="font-semibold">{course.name}</h4>
                        <p className="text-sm text-gray-600">Длительность: {course.duration}</p>
                      </div>
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                        Подробнее
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={onFindVacancies}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Найти вакансии
                </button>
                <button
                  onClick={onImproveResume}
                  className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
                >
                  Улучшить резюме
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VacanciesPage({
  onBack,
  searchQuery,
  setSearchQuery,
  vacancies,
  setVacancies,
  mockVacancies,
  profile, // <-- получили профиль
}) {
  const [filters, setFilters] = useState({ location: '', experience: '', salary: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AI-подсказка из резюме (баннер)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const aiAskedRef = useRef(false);
  const aiAutoAppliedRef = useRef(false); // ← чтобы автоприменить только один раз

  // Пагинация
  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [found, setFound] = useState(0);
  const [pages, setPages] = useState(0);

  // Блокировка после 429
  const [retryAfter, setRetryAfter] = useState(null);
  const blocked = retryAfter && Date.now() < retryAfter;

  // Использовать данные резюме
  const [useProfile, setUseProfile] = useState(true);
  const appliedRef = useRef(false);

  // Страховка от устаревших ответов (дедуп)
  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  // Если меняются входные фильтры — сбрасываем страницу
  useEffect(() => { setPage(0); }, [searchQuery, filters.location, filters.experience, filters.salary]);

  // При включённом useProfile один раз подставляем значения из профиля (и при обновлении профиля)
  useEffect(() => {
    if (!useProfile) return;
    if (appliedRef.current && !profile) return;

    const next = { ...filters };
    let changed = false;

    // Город -> profile.location
    const city = (profile?.location || '').trim();
    if (city && city !== next.location) {
      next.location = city;
      changed = true;
    }

    // Опыт HH-код
    const cat = calcExperienceCategory(profile);
    if (cat && cat !== next.experience) {
      next.experience = cat;
      changed = true;
    }

    // Текст запроса: должность из опыта/образования/скиллов
    const q = deriveQueryFromProfile(profile);
    if (q && q !== searchQuery) {
      setSearchQuery(q);
      changed = true;
    }

    if (changed) {
      setFilters(next);
      setPage(0);
      appliedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useProfile, profile]);

  // AI-инференс подсказки из резюме — один раз при входе/обновлении профиля
  useEffect(() => {
    const hasProfileData =
      !!(profile?.summary && profile.summary.trim()) ||
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
        const s = await inferSearchFromProfile(profile, { lang: 'ru' });
        // ожидаем структуру: { role, city, skills:[], experience, confidence, search:{...} }
        if (s && (s.role || s.city || (s.skills || []).length)) {
          setAiSuggestion(s);
        }
      } catch {
        setAiError('Не удалось получить подсказку ИИ.');
      } finally {
        setAiLoading(false);
      }
    })();
  }, [useProfile, profile]);

  // Автоприменение ИИ-подсказки, если пользователь сам ещё не вводил запрос
  useEffect(() => {
    if (!useProfile) return;
    if (aiAutoAppliedRef.current) return;
    if (!aiSuggestion || aiLoading) return;

    const userTyped = Boolean((searchQuery || '').trim());
    const conf = typeof aiSuggestion.confidence === 'number' ? aiSuggestion.confidence : 0;
    if (!userTyped && conf >= 0.5) {
      // применим и больше не будем авто-переопределять
      if (aiSuggestion.role) setSearchQuery(aiSuggestion.role);
      setFilters((f) => ({
        ...f,
        location: aiSuggestion.city || f.location,
        experience: hhExpFromAi(aiSuggestion.experience) || f.experience,
      }));
      setPage(0);
      aiAutoAppliedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSuggestion, aiLoading, useProfile, searchQuery]);

  const applyAISuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.role) setSearchQuery(aiSuggestion.role);
    setFilters((f) => ({
      ...f,
      location: aiSuggestion.city || f.location,
      experience: hhExpFromAi(aiSuggestion.experience) || f.experience,
    }));
    setPage(0);
  };

  const addSkillToQuery = (skill) => {
    const s = String(skill || '').trim();
    if (!s) return;
    const has = new RegExp(`(^|\\s)${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(searchQuery);
    if (has) return;
    setSearchQuery((q) => (q ? `${q} ${s}` : s));
  };

  // Дебаунсим ввод пользователя (и фильтры), чтобы не спамить HH
  const debouncedSearch = useDebouncedValue(searchQuery, 800);
  const filtersKey = useMemo(
    () => JSON.stringify({ location: filters.location, experience: filters.experience, salary: filters.salary }),
    [filters.location, filters.experience, filters.salary]
  );
  const debouncedFiltersKey = useDebouncedValue(filtersKey, 800);

  useEffect(() => {
    if (blocked) return;           // только что словили 429 — подождём
    if (inFlightRef.current) return;

    const myId = ++reqIdRef.current;
    inFlightRef.current = true;
    setLoading(true);
    setError('');

    // Нормализуем параметры и собираем запрос
    const exp = (filters.experience === 'none') ? 'noExperience' : (filters.experience || '');
    const salaryNum = filters.salary ? String(filters.salary).replace(/\D/g, '') : undefined;

    const params = {
      text: (debouncedSearch || '').trim(),
      experience: exp,                  // HH ждёт noExperience | between1And3 | between3And6 | moreThan6
      salary: salaryNum,
      city: filters.location || undefined, // BFF превратит строку в area
      host: HOST,                       // ← только выбранный сайт (по умолчанию hh.kz)
      page,
      per_page: perPage,
    };

    (async () => {
      try {
        // используем «умный» поиск (авто areaId по городу, KZ-хост)
        const data = await searchJobsSmart(params);

        if (reqIdRef.current !== myId) return; // устаревший ответ

        const mapped = (data?.items || []).map((v) => ({
          id: v.id,
          title: v.title || v.name,
          company: (typeof v.employer === 'string' ? v.employer : (v.employer?.name || '')),
          salary: typeof v.salary === 'string'
            ? v.salary
            : v.salary_raw
              ? [v.salary_raw.from, v.salary_raw.to].filter(Boolean).join('–') + ' ' + (v.salary_raw.currency || '')
              : 'по договорённости',
          location: v.area?.name || v.area || '',
          experience: v.experience?.name || v.experience || '',
          description: v.description || v.snippet?.responsibility || v.snippet?.requirement || '',
          skills: v.keywords || [],
          alternate_url: v.url || v.alternate_url || ''
        }));

        setVacancies(mapped);
        setFound(Number(data?.found || 0));
        setPages(Number(data?.pages || 0));
        setError('');
        setRetryAfter(null);
      } catch (e) {
        if (reqIdRef.current !== myId) return;

        if (isHttpError(e)) {
          const status = e.status || 0;
          if (status === 429) {
            const serverRetry = Number(e?.body?.retry_after || 0); // если BFF пробросил
            const retryMs = serverRetry ? serverRetry * 1000 : 3000;
            setRetryAfter(Date.now() + retryMs);
            setError(`HeadHunter ограничил частоту запросов. Повтор через ~${Math.ceil(retryMs / 1000)} сек.`);
            setVacancies(mockVacancies);
            setFound(mockVacancies.length);
            setPages(1);
            setPage(0);
          } else {
            const details =
              typeof e.body === 'string' ? e.body :
              (e.body?.details || e.body?.message || '');
            if (status >= 400) {
              setError(`Поиск вакансий недоступен (HTTP ${status}). ${details ? `Подробности: ${details}` : ''}`.trim());
              setVacancies(mockVacancies);
              setFound(mockVacancies.length);
              setPages(1);
              setPage(0);
            }
          }
        } else {
          setError('Ошибка загрузки вакансий, показаны примерные данные.');
          setVacancies(mockVacancies);
          setFound(mockVacancies.length);
          setPages(1);
          setPage(0);
        }
      } finally {
        if (reqIdRef.current === myId) {
          setLoading(false);
          inFlightRef.current = false;
        }
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedFiltersKey, page, perPage, blocked]);

  const canPrev = page > 0 && !blocked;
  const canNext = pages > 0 && page + 1 < pages && !blocked;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Поиск вакансий</h2>

          {/* ===== Баннер подсказки ИИ из резюме ===== */}
          {(aiLoading || aiSuggestion || aiError) && (
            <div className="mb-6 rounded-xl p-5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Sparkles className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Подсказка ИИ из вашего резюме</div>

                    {aiLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                        Анализируем профиль…
                      </div>
                    )}

                    {aiError && !aiLoading && (
                      <div className="text-sm text-red-600">{aiError}</div>
                    )}

                    {aiSuggestion && !aiLoading && (
                      <div className="text-sm text-gray-700">
                        Предлагаем искать: <b>{aiSuggestion.role || 'подходящую роль'}</b>
                        {aiSuggestion.city ? <> в <b>{aiSuggestion.city}</b></> : null}
                        {aiSuggestion.experience ? <> • опыт: <b>{prettyExp(aiSuggestion.experience)}</b></> : null}
                        {typeof aiSuggestion.confidence === 'number' ? (
                          <> • уверенность: <b>{Math.round(aiSuggestion.confidence * 100)}%</b></>
                        ) : null}

                        {(aiSuggestion.skills || []).length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(aiSuggestion.skills || []).slice(0, 8).map((s, i) => (
                              <button
                                key={`${s}-${i}`}
                                onClick={() => addSkillToQuery(s)}
                                className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs hover:bg-blue-200"
                                title="Добавить в запрос"
                              >
                                + {s}
                              </button>
                            ))}
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
                      Применить
                    </button>
                  )}
                  {aiSuggestion && (
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                      title="Скрыть"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {!aiLoading && (
                    <button
                      onClick={() => { aiAskedRef.current = false; setAiSuggestion(null); setAiError(''); setAiLoading(true);
                        inferSearchFromProfile(profile, { lang: 'ru' })
                          .then((s) => setAiSuggestion(s))
                          .catch(() => setAiError('Не удалось получить подсказку ИИ.'))
                          .finally(() => setAiLoading(false));
                      }}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                      title="Обновить подсказку"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Баннер про блокировку после 429 */}
          {blocked && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              HeadHunter временно ограничил частоту запросов. Подождите, пожалуйста,&nbsp;
              <b>{Math.max(1, Math.ceil((retryAfter - Date.now())/1000))} сек.</b>
            </div>
          )}

          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по должности или компании..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={useProfile}
                onChange={(e) => { setUseProfile(e.target.checked); appliedRef.current = false; }}
              />
              Использовать данные резюме
            </label>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter size={20} />
              Фильтры
            </button>
          </div>

          {showFilters && (
            <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Город (только Казахстан)</label>
                <CitySelect
                  value={filters.location}
                  onChange={(name /*, obj */) => setFilters((f) => ({ ...f, location: name }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Опыт</label>
                <select
                  value={filters.experience}
                  onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Любой</option>
                  <option value="noExperience">Без опыта</option>
                  <option value="between1And3">1–3 года</option>
                  <option value="between3And6">3–6 лет</option>
                  <option value="moreThan6">6+ лет</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Зарплата от</label>
                <input
                  type="text"
                  value={filters.salary}
                  onChange={(e) => setFilters({ ...filters, salary: e.target.value })}
                  placeholder="150 000 ₸"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            <div>
              {loading
                ? 'Загружаем вакансии…'
                : <>Найдено в HH: <span className="font-semibold">{found}</span>{pages ? ` • Страница ${page + 1} из ${pages}` : ''}</>}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!canPrev || loading}
                onClick={() => canPrev && setPage(p => Math.max(0, p - 1))}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${!canPrev || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                title="Предыдущая страница"
              >
                <ChevronLeft size={16} /> Назад
              </button>
              <button
                disabled={!canNext || loading}
                onClick={() => canNext && setPage(p => p + 1)}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${!canNext || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                title="Следующая страница"
              >
                Вперёд <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {error && <div className="text-red-600 mb-4">{error}</div>}

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
                    <MapPin size={14} />
                    {vacancy.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award size={14} />
                    {vacancy.experience}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{vacancy.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(vacancy.skills || []).map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Откликнуться
                  </button>
                  <button
                    onClick={() => vacancy.alternate_url && window.open(vacancy.alternate_url, '_blank')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Открыть на HH
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && vacancies.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Вакансии не найдены</p>
              <p className="text-sm text-gray-500 mt-2">Попробуйте изменить параметры поиска</p>
            </div>
          )}
        </div>

        {/* ❌ Баннер подписки на алерты полностью удалён по вашему запросу */}
      </div>
    </div>
  );
}
