// src/components/AIResumeBuilder.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText, Briefcase, TrendingUp, Search, MapPin,
  Award, BookOpen, Sparkles, ExternalLink, Filter,
  ChevronLeft, ChevronRight, RefreshCw, X
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

const ALLOWED_PAGES = new Set(['home', 'builder', 'recommendations', 'vacancies']);
const HOST = getDefaultHost();

/* ========================== Вспомогательные хелперы ========================== */

// простой дебаунс
function useDebouncedValue(value, delay = 800) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// --- даты / опыт ---
function safeDate(d) { if (!d) return null; const s = new Date(d); return isNaN(+s) ? null : s; }
function bestOfDates(obj, keys = []) {
  for (const k of keys) {
    const v = safeDate(obj?.[k]);
    if (v) return v;
  }
  return null;
}

function pickLatestExperience(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return null;
  const scored = items.map((it, idx) => {
    const end = bestOfDates(it, ['end', 'to', 'dateEnd', 'date_to']);
    const start = bestOfDates(it, ['start', 'from', 'dateStart', 'date_from']);
    const endScore = end ? +end : Number.MAX_SAFE_INTEGER - idx;
    const startScore = start ? +start : 0;
    return { it, endScore, startScore };
  });
  scored.sort((a, b) => (b.endScore - a.endScore) || (b.startScore - a.startScore));
  return scored[0]?.it || items[0];
}

function calcExperienceCategory(profile) {
  const items = Array.isArray(profile?.experience) ? profile.experience : [];
  if (!items.length) return 'noExperience';
  let ms = 0;
  items.forEach((it) => {
    const start = bestOfDates(it, ['start', 'from', 'dateStart', 'date_from']);
    const end   = bestOfDates(it, ['end', 'to', 'dateEnd', 'date_to']) || new Date();
    if (start && end && end > start) {
      ms += (+end - +start);
    } else {
      ms += 365 * 24 * 3600 * 1000; // считаем год по умолчанию
    }
  });
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

// --- целевая роль ---
function roleFromEducation(eduItem) {
  if (!eduItem) return '';
  const raw = [
    eduItem?.specialization, eduItem?.speciality, eduItem?.major, eduItem?.faculty,
    eduItem?.field, eduItem?.program, eduItem?.department, eduItem?.degree,
  ].map((s) => String(s || '').toLowerCase()).join(' ');

  const any = (...words) => words.some((w) => raw.includes(w));

  if (any('информат', 'программи', 'computer', 'software', 'cs', 'it', 'information technology', 'айти')) {
    if (any('данн', 'data', 'ml', 'машин', 'искусствен')) return 'Data Analyst (Junior)';
    if (any('frontend', 'фронтенд', 'веб', 'web')) return 'Frontend Developer (Junior)';
    if (any('mobile', 'ios', 'android')) return 'Mobile Developer (Junior)';
    return 'Software Engineer (Junior)';
  }
  if (any('дизайн', 'ui', 'ux', 'graphic', 'product design', 'интерфейс'))
    return 'UI/UX Designer (Junior)';
  if (any('аналит', 'эконом', 'финан', 'бизнес'))
    return 'Business Analyst (Junior)';
  if (any('маркет', 'реклам', 'digital marketing'))
    return 'Маркетолог (Junior)';
  if (any('менедж', 'управл', 'project'))
    return 'Project Manager (Junior)';

  return '';
}

function deriveDesiredRole(profile) {
  const explicit =
    profile?.position ||
    profile?.desiredRole ||
    profile?.desiredPosition ||
    profile?.targetRole ||
    profile?.objective ||
    '';
  if (explicit) return String(explicit).trim();

  const latest = pickLatestExperience(profile);
  const role = latest?.position || latest?.title || latest?.role || '';
  if (role) return String(role).trim();

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

  const skills = (profile?.skills || []).map(String).filter(Boolean);
  if (skills.length) return skills.slice(0, 3).join(' ');

  const sum = String(profile?.summary || '').trim();
  if (sum) return sum.split(/\s+/).slice(0, 3).join(' ');

  return '';
}
const deriveQueryFromProfile = (p) => deriveDesiredRole(p);

// --- опыт от ИИ к HH ---
function hhExpFromAi(aiExp) {
  const v = String(aiExp || '').trim();
  if (v === 'none' || v === '0-1') return 'noExperience';
  if (v === '1-3') return 'between1And3';
  if (v === '3-6') return 'between3And6';
  if (v === '6+') return 'moreThan6';
  if (['noExperience','between1And3','between3And6','moreThan6'].includes(v)) return v;
  return '';
}
function prettyExp(aiExp) {
  const v = String(aiExp || '').trim();
  if (v === 'none' || v === '0-1' || v === 'noExperience') return 'без опыта';
  if (v === '1-3' || v === 'between1And3') return '1–3 года';
  if (v === '3-6' || v === 'between3And6') return '3–6 лет';
  if (v === '6+' || v === 'moreThan6') return '6+ лет';
  return 'любой';
}

// --- валидация профиля для рекомендаций ---
const normalizeText = (s) => String(s || '').replace(/\s+/g, ' ').trim();
function hasProfileForRecs(p = {}) {
  const summaryOk = normalizeText(p.summary).length >= 20;
  const skillsOk  = Array.isArray(p.skills) && p.skills.filter(Boolean).length >= 3;
  const expOk     = Array.isArray(p.experience) && p.experience.some(
    e => normalizeText(e?.title || e?.position || e?.company || e?.description).length >= 5
  );
  const eduOk     = Array.isArray(p.education) && p.education.some(
    e => normalizeText(e?.degree || e?.major || e?.institution).length >= 3
  );
  return summaryOk || skillsOk || expOk || eduOk;
}
function missingProfileSections(p = {}) {
  const miss = [];
  if (!(Array.isArray(p.experience) && p.experience.length)) miss.push('Опыт работы');
  if (!(Array.isArray(p.skills) && p.skills.filter(Boolean).length >= 3)) miss.push('Навыки');
  if (!(Array.isArray(p.education) && p.education.length)) miss.push('Образование');
  if (!(normalizeText(p.summary).length >= 20)) miss.push('О себе');
  return miss;
}

/* ===================== Выбор города (только KZ) ===================== */
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
        const areas = await fetchAreas(HOST);
        if (cancelled) return;

        // Ищем "Казахстан"
        const kz = (areas || []).find((c) => /казахстан/i.test(c?.name));
        const acc = [];
        function walk(node) {
          if (!node) return;
          const child = Array.isArray(node.areas) ? node.areas : [];
          if (!child.length) {
            acc.push({ id: String(node.id), name: node.name });
            return;
          }
          child.forEach(walk);
        }
        if (kz) walk(kz);

        // убираем дубликаты
        const uniq = [];
        const seen = new Set();
        acc.forEach((x) => {
          const k = x.name.toLowerCase();
          if (!seen.has(k)) { seen.add(k); uniq.push(x); }
        });

        setCities(uniq.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      } catch {
        // fallback на крупные города
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
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return cities.slice(0, 50);
    return cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
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
        aria-label="Город"
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
                  onChange?.(c.name, c); // фронт отдаёт строку, бэкенд мапит её в area
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

/* ================================= Основной компонент ================================= */

const AIResumeBuilder = () => {
  const [currentPage, setCurrentPage] = useState('home');

  // профиль пользователя
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    age: '',               // 🆕 возраст
    maritalStatus: '',     // 🆕 семейное положение
    children: '',          // 🆕 дети
    driverLicense: '',     // 🆕 водительские права
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: []
  });

  // выбор шаблона для PDF
  const [selectedTemplate, setSelectedTemplate] = useState('modern');

  // вакансии и строка поиска (глобально)
  const [vacancies, setVacancies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // рекомендации
  const [recommendations, setRecommendations] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // читаем ?page=... из урла один раз
  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('page');
    if (p && ALLOWED_PAGES.has(p)) setCurrentPage(p);
    if (p) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // fallback-данные для карточек вакансий при ошибках HH
  const mockVacancies = useMemo(() => ([
    {
      id: 'm1',
      title: 'Frontend Developer',
      company: 'Tech Corp',
      salary: '200 000 – 300 000 ₸',
      location: 'Алматы',
      experience: 'Junior',
      description: 'Разработка современных веб-приложений на React',
      skills: ['React', 'JavaScript', 'TypeScript', 'CSS']
    },
    {
      id: 'm2',
      title: 'UI/UX Designer',
      company: 'Design Studio',
      salary: '180 000 – 250 000 ₸',
      location: 'Астана',
      experience: 'Junior',
      description: 'Создание интуитивных интерфейсов',
      skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping']
    },
    {
      id: 'm3',
      title: 'Data Analyst',
      company: 'Analytics Pro',
      salary: '220 000 – 280 000 ₸',
      location: 'Алматы',
      experience: 'Junior',
      description: 'Анализ данных и отчётность',
      skills: ['Python', 'SQL', 'Excel', 'Power BI']
    }
  ]), []);

  // генерация рекомендаций (AI)
  const generateRecommendations = async () => {
    if (!hasProfileForRecs(profile)) {
      setRecommendations(null);
      setIsGenerating(false);
      return;
    }
    setIsGenerating(true);
    try {
      const city = (profile?.location || '').trim();
      const rec = await fetchRecommendations(profile, { city });

      const professions = (rec?.roles || rec?.professions || [])
        .map(r => (typeof r === 'string' ? r : (r?.title || '')))
        .filter(Boolean);

      const skillsToLearn = (rec?.growSkills || rec?.skillsToGrow || [])
        .map(s => (typeof s === 'string' ? s : (s?.name || '')))
        .filter(Boolean);

      const courses = (rec?.courses || []).map(c => ({
        name: [c?.provider, c?.title].filter(Boolean).join(' — '),
        duration: c?.duration || '',
        url: c?.url || c?.link || ''
      }));

      const matchScore = Number(rec?.marketFitScore ?? rec?.marketScore ?? 0);

      setRecommendations({
        professions: professions.slice(0, 6),
        skillsToLearn: skillsToLearn.slice(0, 10),
        courses: courses.slice(0, 10),
        matchScore: isNaN(matchScore)
          ? 0
          : Math.max(0, Math.min(100, matchScore)),
        debug: rec?.debug || null,
      });
    } catch {
      // fallback
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
          { name: 'Coursera — React Специализация', duration: '3 месяца', url: '' },
          { name: 'Udemy — Complete Web Development', duration: '2 месяца', url: '' },
          { name: 'Stepik — Python для начинающих', duration: '1 месяц', url: '' }
        ],
        matchScore: 62
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="font-sans">
      {/* Навигация */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-2 cursor-pointer"
              aria-label="На главную"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold">AI Resume</span>
            </button>

            <div className="flex gap-6">
              <button
                onClick={() => setCurrentPage('builder')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <FileText size={18} /> Резюме
              </button>
              <button
                onClick={() => setCurrentPage('vacancies')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <Briefcase size={18} /> Вакансии
              </button>
              <button
                onClick={() => setCurrentPage('recommendations')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <TrendingUp size={18} /> Рекомендации
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Роутинг */}
      {currentPage === 'home' && (
        <HomePage
          onCreate={() => setCurrentPage('builder')}
          onFindJobs={() => setCurrentPage('vacancies')}
        />
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
          profile={profile}
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
          profile={profile}
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
                Создавайте профессиональные резюме с помощью ИИ
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Продукт</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button
                    className="hover:text-white"
                    onClick={() => setCurrentPage('builder')}
                  >
                    Создать резюме
                  </button>
                </li>
                <li>
                  <button
                    className="hover:text-white"
                    onClick={() => setCurrentPage('builder')}
                  >
                    Шаблоны
                  </button>
                </li>
                <li>
                  <button
                    className="hover:text-white"
                    onClick={() => setCurrentPage('vacancies')}
                  >
                    Вакансии
                  </button>
                </li>
                <li>
                  <button
                    className="hover:text-white"
                    onClick={() => setCurrentPage('recommendations')}
                  >
                    Рекомендации
                  </button>
                </li>
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
            <p className="mt-2">
              Интеграция с HeadHunter: поиск вакансий и переход на HH для отклика
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIResumeBuilder;

/* ========================== Вспомогательные страницы ========================== */

function HomePage({ onCreate, onFindJobs }) {
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
            ИИ поможет быстро подготовить сильное резюме и найти подходящие вакансии
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onCreate}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
            >
              <FileText size={20} /> Создать резюме
            </button>
            <button
              onClick={onFindJobs}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600 flex items-center gap-2"
            >
              <Briefcase size={20} /> Найти вакансии
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Умное резюме</h3>
            <p className="text-gray-600">Подсказки по улучшению каждого раздела</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Briefcase className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Поиск вакансий</h3>
            <p className="text-gray-600">
              Интеграция с HeadHunter для релевантных предложений
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Рекомендации</h3>
            <p className="text-gray-600">Навыки, роли и курсы для роста</p>
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
  setSearchQuery,
  profile
}) {
  const profileOk = hasProfileForRecs(profile);
  const missing = profileOk ? [] : missingProfileSections(profile);

  useEffect(() => {
    if (!recommendations && profileOk) generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileOk]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          aria-label="Назад"
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
              <p className="text-gray-600">Советы на основе вашего резюме</p>
            </div>
          </div>

          {!profileOk && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
              <div className="text-lg font-semibold mb-2">
                Рекомендации появятся после анализа резюме
              </div>
              <p className="text-gray-700 mb-4">
                Заполните основные разделы — и мы подберём профессии, навыки и
                курсы. Начните с:
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {missing.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1 rounded-full bg-white/70 border text-sm"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onImproveResume}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Заполнить резюме
                </button>
                <button
                  onClick={onFindVacancies}
                  className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
                >
                  Посмотреть вакансии
                </button>
              </div>
            </div>
          )}

          {profileOk && (
            <>
              {isGenerating ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600">Анализируем ваш профиль…</p>
                </div>
              ) : recommendations && (
                <div className="space-y-8">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">
                        Оценка соответствия рынку
                      </h3>
                      <div className="text-3xl font-bold text-blue-600">
                        {recommendations.matchScore}%
                      </div>
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
                      <Briefcase className="text-blue-600" /> Рекомендуемые
                      профессии
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {recommendations.professions.map((profession, idx) => (
                        <div
                          key={`${profession}-${idx}`}
                          className="border rounded-lg p-4 hover:shadow-md transition"
                        >
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
                      <TrendingUp className="text-green-600" /> Навыки для
                      развития
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.skillsToLearn.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <BookOpen className="text-purple-600" /> Рекомендуемые
                      курсы
                    </h3>
                    <div className="space-y-3">
                      {recommendations.courses.map((course, idx) => (
                        <div
                          key={`${course.name}-${idx}`}
                          className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"
                        >
                          <div>
                            <h4 className="font-semibold">{course.name}</h4>
                            {course.duration ? (
                              <p className="text-sm text-gray-600">
                                Длительность: {course.duration}
                              </p>
                            ) : null}
                          </div>
                          <button
                            onClick={() =>
                              course.url && window.open(course.url, '_blank')
                            }
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                          >
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
            </>
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
  profile,
}) {
  // 🔧 По умолчанию опыт — пусто (Любой)
  const [filters, setFilters] = useState({ location: '', experience: '', salary: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // инициализация «первого захода»
  const didInitRef = useRef(false);

  // AI-подсказка
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const aiAskedRef = useRef(false);
  const aiAutoAppliedRef = useRef(false);

  // пагинация
  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [found, setFound] = useState(0);
  const [pages, setPages] = useState(0);

  // блокировка после 429
  const [retryAfter, setRetryAfter] = useState(null);
  const blocked = retryAfter && Date.now() < retryAfter;

  // чекбокс "использовать данные резюме"
  const [useProfile, setUseProfile] = useState(true);
  const appliedRef = useRef(false);

  // обрывы старых запросов
  const reqIdRef = useRef(0);

  // при изменении фильтров или строки поиска — сбрасываем страницу
  useEffect(() => { setPage(0); }, [searchQuery, filters.location, filters.experience, filters.salary]);

  // автоподстановка из профиля: город и роль (опыт НЕ трогаем, оставляем «Любой»)
  useEffect(() => {
    if (!useProfile) return;
    if (appliedRef.current && !profile) return;

    const next = { ...filters };
    let changed = false;

    const city = (profile?.location || '').trim();
    if (city && city !== next.location) {
      next.location = city;
      changed = true;
    }

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

  // разовая AI-подсказка из профиля
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

  // автоматическое применение AI-подсказки (опыт НЕ подставляем автоматически)
  useEffect(() => {
    if (!useProfile || aiAutoAppliedRef.current || !aiSuggestion || aiLoading) return;

    const userTyped = Boolean((searchQuery || '').trim());
    const conf = typeof aiSuggestion.confidence === 'number' ? aiSuggestion.confidence : 0;

    if (!userTyped && conf >= 0.5) {
      if (aiSuggestion.role) setSearchQuery(aiSuggestion.role);
      setFilters((f) => ({
        ...f,
        location: aiSuggestion.city || f.location,
        // experience — не трогаем, оставляем «Любой»
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
      experience: hhExpFromAi(aiSuggestion.experience) || f.experience, // по кнопке можно применить
    }));
    setPage(0);
  };

  const addSkillToQuery = (skill) => {
    const s = String(skill || '').trim();
    if (!s) return;
    const has = new RegExp(
      `(^|\\s)${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`,
      'i'
    ).test(searchQuery);
    if (has) return;
    setSearchQuery((q) => (q ? `${q} ${s}` : s));
  };

  // дебаунс полей
  const debouncedSearch = useDebouncedValue(searchQuery, 800);
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        location: filters.location,
        experience: filters.experience,
        salary: filters.salary,
      }),
    [filters.location, filters.experience, filters.salary]
  );
  const debouncedFiltersKey = useDebouncedValue(filtersKey, 800);

  // единая функция поиска вакансий
  const runSearch = async ({
    typedText,
    chosenCity,
    chosenExp,
    salaryVal,
    pageArg,
    perPageArg,
    abortSignal,
    myId,
  }) => {
    setLoading(true);
    setError('');

    const inferredRole = aiSuggestion?.role || deriveQueryFromProfile(profile) || '';
    // ⛔️ Больше НЕ подставляем inferredExp — опыт определяет только UI-фильтр/пользователь
    const effectiveText = (typedText || '').trim() || inferredRole || 'разработчик';
    const effectiveCity = chosenCity || (aiSuggestion?.city || (profile?.location || '')) || undefined;
    const effectiveExp  = (chosenExp === 'none') ? 'noExperience' : (chosenExp || ''); // '' => Любой

    const salaryNum = salaryVal
      ? String(salaryVal).replace(/\D/g, '')
      : undefined;

    const params = {
      text: effectiveText,
      experience: effectiveExp || undefined, // undefined => не фильтруем по опыту
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
      if (reqIdRef.current !== myId) return; // был отменён

      const items = Array.isArray(data?.items) ? data.items : [];

      // чистим шумовые навыки
      const ban = new Set(['и', 'в', 'на', 'of', 'a', 'an']);
      const mapSkill = (s) => String(s || '').trim();
      const goodSkills = (arr) =>
        (Array.isArray(arr) ? arr : [])
          .map(mapSkill)
          .filter(
            (t) =>
              t &&
              !ban.has(t.toLowerCase()) &&
              (t.length > 2 || /[A-Za-z]/.test(t))
          )
          .slice(0, 12);

      const stripHtml = (t) =>
        String(t || '')
          .replace(/<\/?highlighttext[^>]*>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();

      const mapped = items.map((v) => {
        let salaryText = 'по договорённости';
        const raw = v.salary_raw || v.salary || {};
        if (typeof v.salary === 'string' && v.salary.trim()) {
          salaryText = v.salary.trim();
        } else if (raw && (raw.from || raw.to)) {
          const from = raw.from ? String(raw.from) : '';
          const to   = raw.to   ? String(raw.to)   : '';
          const cur  = raw.currency || raw.cur || '';
          const range = [from, to].filter(Boolean).join(' – ');
          salaryText = `${range}${range ? ' ' : ''}${cur}`.trim() || 'по договорённости';
        }

        return (
          {
            id: v.id,
            title: v.title || v.name || 'Вакансия',
            company:
              typeof v.employer === 'string'
                ? v.employer
                : (v.employer?.name || ''),
            salary: salaryText,
            location: v.area?.name || v.area || '',
            experience: v.experience?.name || v.experience || '',
            description: stripHtml(
              v.description ||
              v.snippet?.responsibility ||
              v.snippet?.requirement ||
              ''
            ),
            skills: goodSkills(v.keywords),
            alternate_url: v.url || v.alternate_url || '',
          }
        );
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
          setError(
            `HeadHunter ограничил частоту запросов. Повтор через ~${Math.ceil(
              retryMs / 1000
            )} сек.`
          );
        } else {
          const details =
            typeof e.body === 'string'
              ? e.body
              : (e.body?.details || e.body?.message || '');
          setError(
            `Поиск недоступен (HTTP ${status})${
              details ? ` — ${details}` : ''
            }`
          );
        }
      } else {
        setError('Ошибка загрузки вакансий.');
      }

      // graceful fallback
      setVacancies(mockVacancies);
      setFound(mockVacancies.length);
      setPages(1);
      setPage(0);
    } finally {
      if (reqIdRef.current === myId) {
        setLoading(false);
      }
    }
  };

  // стартовый автопоиск при первом монтировании вкладки
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // 1) роль из профиля → иначе дефолт "разработчик"
    const role = (deriveQueryFromProfile(profile) || '').trim();
    if (!String(searchQuery || '').trim()) {
      setSearchQuery(role || 'разработчик');
    }

    // 2) подставим только город (опыт не трогаем → «Любой»)
    setFilters((f) => {
      const next = { ...f };
      if (!next.location && (profile?.location || '').trim()) {
        next.location = profile.location.trim();
      }
      return next;
    });
    // страница уже 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // основной эффект поиска
  const debouncedSearch = useDebouncedValue(searchQuery, 800);
  const filtersKey = useMemo(
    () => JSON.stringify({
      location: filters.location,
      experience: filters.experience,
      salary: filters.salary,
    }),
    [filters.location, filters.experience, filters.salary]
  );
  const debouncedFiltersKey = useDebouncedValue(filtersKey, 800);

  useEffect(() => {
    if (blocked) return;

    const ac = new AbortController();
    const myId = ++reqIdRef.current;

    runSearch({
      typedText: debouncedSearch,
      chosenCity: filters.location?.trim(),
      chosenExp: filters.experience?.trim(), // '' => Любой
      salaryVal: filters.salary,
      pageArg: page,
      perPageArg: perPage,
      abortSignal: ac.signal,
      myId,
    });

    return () => {
      try { ac.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedFiltersKey, page, perPage, blocked, aiSuggestion]);

  const canPrev = page > 0 && !blocked;
  const canNext = pages > 0 && page + 1 < pages && !blocked;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          aria-label="Назад"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Поиск вакансий</h2>

          {(aiLoading || aiSuggestion || aiError) && (
            <div className="mb-6 rounded-xl p-5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Sparkles className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">
                      Подсказка ИИ из вашего резюме
                    </div>

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
                        Предлагаем искать:{' '}
                        <b>{aiSuggestion.role || 'подходящую роль'}</b>
                        {aiSuggestion.city ? (
                          <>
                            {' '}в <b>{aiSuggestion.city}</b>
                          </>
                        ) : null}
                        {aiSuggestion.experience ? (
                          <> • опыт: <b>{prettyExp(aiSuggestion.experience)}</b></>
                        ) : null}

                        {(aiSuggestion.skills || []).length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(aiSuggestion.skills || [])
                              .slice(0, 8)
                              .map((s, i) => (
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
                      aria-label="Скрыть подсказку"
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
                        inferSearchFromProfile(profile, { lang: 'ru' })
                          .then((s) => setAiSuggestion(s))
                          .catch(() => setAiError('Не удалось получить подсказку ИИ.'))
                          .finally(() => setAiLoading(false));
                      }}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                      title="Обновить подсказку"
                      aria-label="Обновить подсказку"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {blocked && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              HeadHunter временно ограничил частоту запросов. Подождите{' '}
              <b>{Math.max(1, Math.ceil((retryAfter - Date.now()) / 1000))} сек.</b>
            </div>
          )}

          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} aria-hidden />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по должности или компании..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Поиск"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={useProfile}
                onChange={(e) => {
                  setUseProfile(e.target.checked);
                  appliedRef.current = false;
                }}
              />
              Использовать данные резюме
            </label>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              aria-expanded={showFilters}
              aria-controls="filters-panel"
            >
              <Filter size={20} /> Фильтры
            </button>
          </div>

          {showFilters && (
            <div id="filters-panel" className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Город (только Казахстан)</label>
                <CitySelect
                  value={filters.location}
                  onChange={(name) => setFilters((f) => ({ ...f, location: name }))}
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
                  inputMode="numeric"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            <div>
              {loading ? 'Загружаем вакансии…' : (
                <>
                  Найдено в HH: <span className="font-semibold">{found}</span>
                  {pages ? ` • Страница ${page + 1} из ${pages}` : ''}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={!canPrev || loading}
                onClick={() => canPrev && setPage((p) => Math.max(0, p - 1))}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${
                  !canPrev || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
                title="Предыдущая страница"
                aria-label="Предыдущая страница"
              >
                <ChevronLeft size={16} /> Назад
              </button>
              <button
                disabled={!canNext || loading}
                onClick={() => canNext && setPage((p) => p + 1)}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${
                  !canNext || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
                title="Следующая страница"
                aria-label="Следующая страница"
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
                    <MapPin size={14} /> {vacancy.location || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award size={14} /> {vacancy.experience || '—'}
                  </span>
                </div>

                {vacancy.description && <p className="text-gray-700 mb-4">{vacancy.description}</p>}

                {!!(vacancy.skills || []).length && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(vacancy.skills || []).map((skill, idx) => (
                      <span key={`${vacancy.id}-skill-${idx}`} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => vacancy.alternate_url && window.open(vacancy.alternate_url, '_blank')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Откликнуться на HH
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && vacancies.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Вакансии не найдены</p>
              <p className="text-sm text-gray-500 mt-2">Измените параметры поиска</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
