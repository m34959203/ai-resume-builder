// src/components/AIResumeBuilder.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileText, Briefcase, TrendingUp, Search, MapPin,
  Award, BookOpen, Sparkles, ExternalLink, Filter,
  ChevronLeft, ChevronRight, RefreshCw, X,
  Phone, Mail
} from 'lucide-react';
import BuilderPage from './BuilderPage';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';
import {
  searchJobsSmart,
  isHttpError,
  fetchAreas,
  inferSearchFromProfile,
  getDefaultHost,
  fetchRecommendations,
} from '../services/bff';

// ⬇️ ЛОГОТИП БРЕНДА (положите файл в src/assets/zhezu-logo.png)
import zhezuLogo from '../assets/zhezu-logo.png';

const ALLOWED_PAGES = new Set(['home', 'builder', 'recommendations', 'vacancies']);
const HOST = getDefaultHost();
const BRAND_NAME = 'ZhezU AI Resume';

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

// --- уникализация без учёта регистра
const uniqCI = (arr = []) => {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const k = String(v || '').trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(String(v).trim());
  }
  return out;
};
const uniq = (arr = []) => uniqCI(arr);

// --- нормализация навыков профиля (строки и объекты)
function extractSkillName(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.name || s.title || s.skill || '';
}
function extractSkills(profile = {}) {
  const raw = (Array.isArray(profile.skills) ? profile.skills : []).map(extractSkillName);
  return uniqCI(raw).map((x) => x.toLowerCase());
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
      ms += 365 * 24 * 3600 * 1000;
    }
  });
  const years = ms / (365 * 24 * 3600 * 1000);
  if (years < 1) return 'noExperience';
  if (years < 3) return 'between1And3';
  if (years < 6) return 'between3And6';
  return 'moreThan6';
}

// --- Market Fit score (0..100) ---
function yearsOfExperience(profile = {}) {
  const items = Array.isArray(profile.experience) ? profile.experience : [];
  let ms = 0;
  for (const it of items) {
    const start = bestOfDates(it, ['start', 'from', 'dateStart', 'date_from']);
    const end   = bestOfDates(it, ['end', 'to', 'dateEnd', 'date_to']) || new Date();
    if (start && end && end > start) ms += (+end - +start);
  }
  return ms / (365 * 24 * 3600 * 1000);
}

function englishLevelScore(langs = []) {
  const arr = Array.isArray(langs) ? langs : [];
  const isEn = (s) => /англ|english/i.test(String(s || ''));
  const lvlOk = (s) => /B1|B2|C1|C2|upper|advanced|intermediate/i.test(String(s || ''));
  for (const l of arr) {
    if (isEn(l?.language || l?.name || l)) {
      if (lvlOk(l?.level || l)) return 5;
      return 2;
    }
  }
  return 0;
}

function computeMarketFit(profile = {}) {
  const hasAnything =
    (profile.summary && profile.summary.trim().length > 0) ||
    (Array.isArray(profile.skills) && profile.skills.length > 0) ||
    (Array.isArray(profile.experience) && profile.experience.length > 0) ||
    (Array.isArray(profile.education) && profile.education.length > 0);

  if (!hasAnything) return 0;

  let score = 0;

  // Конкретика роли/позиции
  const roleText = String(profile.position || profile.title || '').trim();
  if (roleText.length >= 3) score += Math.min(10, Math.floor(roleText.split(/\s+/).length * 2)); // до 10

  // Навыки
  const uniqSkills = Array.from(new Set((profile.skills || []).map((s) => String(s).trim()).filter(Boolean)));
  score += Math.min(30, uniqSkills.length * 3);

  // Опыт
  const y = yearsOfExperience(profile);
  if (y >= 6) score += 35;
  else if (y >= 3) score += 25;
  else if (y >= 1) score += 15;
  else if (y > 0) score += 5;

  // О себе
  const sumLen = String(profile.summary || '').trim().length;
  if (sumLen >= 200) score += 10;
  else if (sumLen >= 120) score += 7;
  else if (sumLen >= 60) score += 5;
  else if (sumLen >= 20) score += 2;

  // Образование
  if (Array.isArray(profile.education) && profile.education.length) {
    score += 8;
    const e = profile.education[0];
    const txt = [e?.degree, e?.fieldOfStudy, e?.speciality, e?.major].map(String).join(' ').toLowerCase();
    if (txt && roleText) {
      const hit = roleText.toLowerCase().split(/\W+/).some((w) => w && txt.includes(w));
      if (hit) score += 4;
    }
  }

  // Языки
  score += englishLevelScore(profile.languages);

  // Локация
  if (String(profile.location || '').trim()) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// --- подпись профиля для авто-обновления рекомендаций ---
function profileSignature(p = {}) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const role = norm(p.position || p.desiredRole || p.desiredPosition || p.targetRole || '');
  const summary = norm(p.summary);
  const location = norm(p.location);

  const skills = Array.isArray(p.skills)
    ? Array.from(new Set(p.skills.map(norm).filter(Boolean))).sort()
    : [];

  const exp = Array.isArray(p.experience)
    ? p.experience.slice(0, 6).map(e => ({
        t: norm(e.title || e.position),
        c: norm(e.company),
        s: norm(e.start || e.from || e.dateStart || e.date_from),
        e: norm(e.end || e.to || e.dateEnd || e.date_to),
        d: norm(e.description),
      }))
    : [];

  const edu = Array.isArray(p.education)
    ? p.education.slice(0, 6).map(e => ({
        i: norm(e.institution || e.school || e.university),
        d: norm(e.degree),
        m: norm(e.major || e.speciality || e.specialization),
        y: String(e.year || e.graduationYear || '').trim(),
      }))
    : [];

  return JSON.stringify({ role, summary, location, skills, exp, edu });
}

// --- детект трека по навыкам + ролям/саммари/опыту ---
function detectTrack(skills = [], profile = {}) {
  const expText = (Array.isArray(profile?.experience) ? profile.experience : [])
    .map(e => [e?.position, e?.title, e?.role, e?.responsibilities, e?.description].filter(Boolean).join(' '))
    .join(' ');

  const text = (
    skills.join(' ') + ' ' +
    (profile?.summary || '') + ' ' +
    (profile?.position || '') + ' ' +
    expText
  ).toLowerCase();

  const score = (arr) => arr.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);

  const dict = {
    dev: ['react', 'vue', 'angular', 'typescript', 'node', 'java', 'spring', 'django', 'flask', 'kotlin', 'swift', 'ios', 'android', 'c#', '.net', 'docker', 'kubernetes', 'graphql', 'rest api', 'git'],
    data: ['sql', 'python', 'pandas', 'numpy', 'power bi', 'tableau', 'excel', 'airflow', 'dbt', 'etl', 'data', 'ml', 'machine learning', 'a/b', 'hypothesis', 'statistics'],
    design: ['figma', 'ux', 'ui', 'user research', 'prototype', 'wireframe', 'design system', 'typography', 'interface', 'interaction'],
    qa: ['qa', 'quality', 'test', 'selenium', 'cypress', 'postman', 'jmeter', 'pytest', 'playwright', 'automation', 'регресс', 'тест-кейс'],
    product: ['product manager', 'product owner', 'roadmap', 'backlog', 'hypothesis', 'unit economics', 'metrics', 'a/b', 'custdev', 'discovery'],
    marketing: ['smm', 'seo', 'sem', 'context', 'performance', 'facebook ads', 'google ads', 'content', 'email marketing', 'crm'],
    ba_pm: ['business analyst', 'бизнес аналит', 'system analyst', 'системн', 'project manager', 'проектн', 'scrum', 'kanban'],
  };

  const scores = Object.fromEntries(Object.keys(dict).map(k => [k, score(dict[k])]));
  // выберем трек с максимальным счетом
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) return best[0];

  // fallback по ключевым словам должности
  const pos = String(profile?.position || '').toLowerCase();
  if (/product/.test(pos)) return 'product';
  if (/manager|проект/.test(pos)) return 'ba_pm';
  if (/analyst|аналит/.test(pos)) return 'data';
  if (/designer|дизайн|ux|ui/.test(pos)) return 'design';
  if (/qa|test|тест/.test(pos)) return 'qa';
  if (/market|маркет/.test(pos)) return 'marketing';
  if (/dev|разработ|engineer|инженер|программи/.test(pos)) return 'dev';

  // по умолчанию
  return 'ba_pm';
}

// --- fallback пресеты по трекам (профессии/скиллы/курсы)
function trackFallback(track = 'ba_pm') {
  const C = (name, url = '', duration = '') => ({ name, url, duration });

  const presets = {
    dev: {
      professions: [
        'Frontend Developer', 'Backend Developer', 'Full-Stack Developer',
        'Software Engineer', 'Mobile Developer', 'DevOps Engineer'
      ],
      grow: ['TypeScript', 'Node.js', 'Docker', 'Git', 'CI/CD', 'SQL', 'REST API', 'GraphQL', 'Unit Testing', 'Linux'],
      courses: [
        C('Coursera — Meta Front-End Developer', 'https://coursera.org', '3–6 мес'),
        C('Udemy — Node.js Complete Guide', 'https://udemy.com', '1–2 мес'),
        C('Stepik — Алгоритмы и структуры данных', 'https://stepik.org', '1–2 мес'),
        C('Hexlet — Верстка и JavaScript', 'https://ru.hexlet.io', '2–4 мес'),
        C('Karpov.Courses — Frontend', 'https://karpov.courses', '2–4 мес'),
      ],
    },
    data: {
      professions: [
        'Data Analyst', 'BI Analyst', 'Data Engineer', 'ML Engineer', 'Product Analyst', 'Financial Analyst'
      ],
      grow: ['SQL', 'Python', 'Pandas', 'Power BI', 'Tableau', 'A/B-тесты', 'Статистика', 'ETL', 'Airflow', 'Docker'],
      courses: [
        C('Karpov.Courses — Аналитик данных', 'https://karpov.courses', '3–6 мес'),
        C('Coursera — Google Data Analytics', 'https://coursera.org', '3–6 мес'),
        C('Stepik — Введение в Data Science', 'https://stepik.org', '1–2 мес'),
        C('Udemy — The Data Analyst Course', 'https://udemy.com', '2–3 мес'),
      ],
    },
    design: {
      professions: [
        'UI/UX Designer', 'Product Designer', 'UX Researcher', 'Interaction Designer', 'Design System Specialist', 'Graphic Designer'
      ],
      grow: ['User Research', 'UX Writing', 'Interaction Design', 'Design Systems', 'Prototyping', 'Accessibility', 'Figma Advanced'],
      courses: [
        C('Coursera — UI/UX Design', 'https://coursera.org', '2–4 мес'),
        C('Bang Bang Education — Product Design', 'https://bangbangeducation.ru', '2–6 мес'),
        C('Udemy — Figma UI/UX', 'https://udemy.com', '1–2 мес'),
      ],
    },
    qa: {
      professions: ['QA Engineer', 'QA Automation Engineer', 'Test Analyst', 'Test Manager'],
      grow: ['Test Design', 'Postman', 'Selenium', 'Playwright', 'Cypress', 'PyTest', 'Java/JUnit', 'API Testing', 'SQL'],
      courses: [
        C('Stepik — Тестирование ПО', 'https://stepik.org', '1–2 мес'),
        C('Udemy — Selenium WebDriver', 'https://udemy.com', '1–2 мес'),
        C('Coursera — Software Testing', 'https://coursera.org', '2–3 мес'),
      ],
    },
    product: {
      professions: ['Product Manager', 'Product Owner', 'Growth PM', 'Scrum Master', 'UX Writer'],
      grow: ['Roadmapping', 'Unit Economics', 'Product Discovery', 'JTBD', 'A/B-тесты', 'SQL для PM', 'CustDev', 'Metrics'],
      courses: [
        C('Coursera — Digital Product Management', 'https://coursera.org', '2–3 мес'),
        C('GoPractice — Симулятор', 'https://gopractice.io', '1–2 мес'),
        C('ProductStar — PM', 'https://productstar.ru', '2–4 мес'),
      ],
    },
    marketing: {
      professions: ['Digital Marketing Specialist', 'SMM Manager', 'Content Manager', 'Performance Marketer', 'SEO Specialist'],
      grow: ['SEO', 'Google Ads', 'Facebook Ads', 'Аналитика', 'Копирайтинг', 'E-mail Marketing', 'CRM', 'А/Б-тесты'],
      courses: [
        C('Coursera — Digital Marketing', 'https://coursera.org', '2–4 мес'),
        C('Netology — Интернет-маркетолог', 'https://netology.ru', '3–6 мес'),
      ],
    },
    ba_pm: {
      professions: ['Business Analyst', 'Project Manager', 'Scrum Master', 'Product Owner'],
      grow: ['UML/BPMN', 'SQL базовый', 'API (REST/GraphQL)', 'Системный анализ', 'Agile/Scrum', 'Jira/Confluence', 'BRD/FRD', 'Backlog'],
      courses: [
        C('Coursera — Business Analysis', 'https://coursera.org', '2–3 мес'),
        C('PMI — Project Management Basics', 'https://pmi.org', '1–2 мес'),
      ],
    },
  };

  return presets[track] || presets['ba_pm'];
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

function prettyExp(aiExp, t) {
  const v = String(aiExp || '').trim();
  if (v === 'none' || v === '0-1' || v === 'noExperience') return t('vacancies.experience.noExperience');
  if (v === '1-3' || v === 'between1And3') return t('vacancies.experience.between1And3');
  if (v === '3-6' || v === 'between3And6') return t('vacancies.experience.between3And6');
  if (v === '6+' || v === 'moreThan6') return t('vacancies.experience.moreThan6');
  return t('vacancies.experience.any');
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

function missingProfileSections(p = {}, t) {
  const miss = [];
  if (!(Array.isArray(p.experience) && p.experience.length)) miss.push(t('builder.steps.experience'));
  if (!(Array.isArray(p.skills) && p.skills.filter(Boolean).length >= 3)) miss.push(t('builder.steps.skills'));
  if (!(Array.isArray(p.education) && p.education.length)) miss.push(t('builder.steps.education'));
  if (!(normalizeText(p.summary).length >= 20)) miss.push(t('builder.personal.summary'));
  return miss;
}

// --- спец-проверка: ответы только BA/PM
function onlyBA_PM(arr = []) {
  const items = (arr || []).map((s) => String(s).toLowerCase());
  if (!items.length) return false;
  const isOnlyKnown = items.every((s) =>
    s.includes('business analyst') || s.includes('бизнес') || s.includes('analyst') ||
    s.includes('project manager') || s.includes('проектн') || s.includes('scrum') || s.includes('product owner')
  );
  return isOnlyKnown;
}

/* ===================== Выбор города (только KZ) ===================== */
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
          if (!child.length) {
            acc.push({ id: String(node.id), name: node.name });
            return;
          }
          child.forEach(walk);
        }
        if (kz) walk(kz);

        const uniqCities = [];
        const seen = new Set();
        acc.forEach((x) => {
          const k = x.name.toLowerCase();
          if (!seen.has(k)) { seen.add(k); uniqCities.push(x); }
        });

        setCities(uniqCities.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
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
                onClick={() => {
                  setQuery(c.name);
                  setOpen(false);
                  onChange?.(c.name, c);
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

function AIResumeBuilder() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    document.title = `${BRAND_NAME} — умный помощник для создания резюме`;
  }, []);

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    age: '',
    maritalStatus: '',
    children: '',
    driverLicense: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: []
  });

  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [vacancies, setVacancies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('page');
    if (p && ALLOWED_PAGES.has(p)) setCurrentPage(p);
    if (p) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const mockVacancies = useMemo(() => ([
    {
      id: 'm1',
      title: 'Frontend Developer',
      company: 'Tech Corp',
      salary: '200 000 – 300 000 ₸',
      location: t('vacancies.cities.almaty'),
      experience: 'Junior',
      description: t('vacancies.mockDescription1'),
      skills: ['React', 'JavaScript', 'TypeScript', 'CSS']
    },
    {
      id: 'm2',
      title: 'UI/UX Designer',
      company: 'Design Studio',
      salary: '180 000 – 250 000 ₸',
      location: t('vacancies.cities.astana'),
      experience: 'Junior',
      description: t('vacancies.mockDescription2'),
      skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping']
    },
    {
      id: 'm3',
      title: 'Data Analyst',
      company: 'Analytics Pro',
      salary: '220 000 – 280 000 ₸',
      location: t('vacancies.cities.almaty'),
      experience: 'Junior',
      description: t('vacancies.mockDescription3'),
      skills: ['Python', 'SQL', 'Excel', 'Power BI']
    }
  ]), [t]);

  // === Улучшенная логика рекомендаций с треками и фолбэком ===
  const generateRecommendations = async () => {
    if (!hasProfileForRecs(profile)) {
      setRecommendations(null);
      setIsGenerating(false);
      return;
    }
    setIsGenerating(true);

    const skills = extractSkills(profile);
    const track = detectTrack(skills, profile) || 'ba_pm';
    const fb = trackFallback(track);

    try {
      const city = (profile?.location || '').trim();
      const rec = await fetchRecommendations(
        profile,
        { city, signature: profileSignature(profile), ts: Date.now() } // пробиваем кэш
      );

      // Нормализация полученных данных
      let professions = (rec?.roles || rec?.professions || [])
        .map((r) => (typeof r === 'string' ? r : (r?.title || '')))
        .filter(Boolean);
      professions = uniq(professions);

      let skillsToLearn = (rec?.growSkills || rec?.skillsToGrow || [])
        .map((s) => (typeof s === 'string' ? s : (s?.name || '')))
        .filter(Boolean);
      skillsToLearn = uniq(skillsToLearn);

      let courses = (rec?.courses || []).map((c) => ({
        name: [c?.provider, c?.title].filter(Boolean).join(' — '),
        duration: c?.duration || '',
        url: c?.url || c?.link || ''
      })).filter(c => c.name);

      // Если пришло узко ИЛИ только BA/PM — расширяем профессиями по треку
      if (professions.length <= 2 || onlyBA_PM(professions)) {
        professions = uniq([...professions, ...fb.professions]);
      }
      professions = professions.slice(0, 6);

      // Навыки для развития: топ-ап до 10
      if (skillsToLearn.length < 10) {
        const have = new Set(skillsToLearn.map((x) => x.toLowerCase()));
        const toAdd = fb.grow.filter((g) => !have.has(g.toLowerCase()));
        skillsToLearn = uniq([...skillsToLearn, ...toAdd]).slice(0, 10);
      }

      // Курсы: топ-ап до 10
      if (courses.length < 10) {
        const have = new Set(courses.map((c) => c.name.toLowerCase()));
        const add = (fb.courses || []).filter((c) => c?.name && !have.has(c.name.toLowerCase()));
        courses = [...courses, ...add].slice(0, 10);
      }

      const matchScore = Number(rec?.marketFitScore ?? rec?.marketScore);
      setRecommendations({
        professions,
        skillsToLearn,
        courses,
        matchScore: Number.isFinite(matchScore) ? Math.max(0, Math.min(100, matchScore)) : computeMarketFit(profile),
        debug: { ...(rec?.debug || {}), track },
      });
    } catch {
      // Полный локальный фолбэк
      setRecommendations({
        professions: fb.professions.slice(0, 6),
        skillsToLearn: fb.grow.slice(0, 10),
        courses: fb.courses.slice(0, 10),
        matchScore: computeMarketFit(profile),
        debug: { track, fallback: true },
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
              type="button"
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-3 cursor-pointer"
              aria-label={BRAND_NAME}
            >
              {/* Лого + бренд */}
              <img
                src={zhezuLogo}
                alt={BRAND_NAME}
                className="w-10 h-10 rounded-md object-contain"
                loading="eager"
              />
              <span className="text-xl font-extrabold tracking-tight">
                {BRAND_NAME}
              </span>
            </button>

            <div className="flex gap-6 items-center">
              <button
                onClick={() => setCurrentPage('builder')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <FileText size={18} /> {t('nav.builder')}
              </button>
              <button
                onClick={() => setCurrentPage('vacancies')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <Briefcase size={18} /> {t('nav.vacancies')}
              </button>
              <button
                onClick={() => setCurrentPage('recommendations')}
                className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
              >
                <TrendingUp size={18} /> {t('nav.recommendations')}
              </button>

              <LanguageSwitcher />
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
            {/* Левый бренд-блок */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src={zhezuLogo}
                  alt={BRAND_NAME}
                  className="w-8 h-8 rounded-md object-contain"
                  loading="lazy"
                />
                <span className="font-bold">{BRAND_NAME}</span>
              </div>
              <p className="text-gray-400 text-sm">
                {t('footer.description')}
              </p>
            </div>

            {/* Контакты — вместо ссылок/колонок */}
            <div className="md:col-span-3">
              <h4 className="font-semibold mb-4">Контакты</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5" size={16} />
                  <div>
                    100600 Улытауская область, г. Жезказган, пр. Алашахана, 1б — главный корпус
                    <br />
                    Главный корпус, кабинет №108 — приёмная комиссия
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>8&nbsp;(7102)&nbsp;736015 — канцелярия</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>8&nbsp;(7102)&nbsp;410461 — приёмная комиссия</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5" size={16} />
                  <div>
                    univer@zhezu.kz; univer_zhez@mail.ru — канцелярия
                    <br />
                    zhezu_priem@mail.ru — приёмная комиссия
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>{t('footer.copyright')}</p>
            <p className="mt-2">{t('footer.integration')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ========================== Вспомогательные страницы ========================== */

function HomePage({ onCreate, onFindJobs }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
            <Sparkles size={16} />
            <span className="text-sm font-medium">{t('home.badge')}</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('home.titlePrefix')}{' '}
            <span className="text-blue-600">{t('home.titleAccent')}</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onCreate}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
            >
              <FileText size={20} /> {t('home.createButton')}
            </button>
            <button
              onClick={onFindJobs}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600 flex items-center gap-2"
            >
              <Briefcase size={20} /> {t('home.findJobsButton')}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('home.features.ai.title')}</h3>
            <p className="text-gray-600">{t('home.features.ai.description')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Briefcase className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('home.features.vacancies.title')}</h3>
            <p className="text-gray-600">{t('home.features.vacancies.description')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('home.features.recommendations.title')}</h3>
            <p className="text-gray-600">{t('home.features.recommendations.description')}</p>
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
  const { t, lang } = useTranslation();

  // Достаточно ли данных резюме для советов
  const profileOk = hasProfileForRecs(profile);
  const missing = profileOk ? [] : missingProfileSections(profile, t);

  // подпись профиля + дебаунс
  const sig = React.useMemo(() => profileSignature(profile), [profile]);
  const debouncedSig = useDebouncedValue(sig, 900);

  // выбранная (целевая) профессия — одно поле, как на макете
  const [selectedProfession, setSelectedProfession] = React.useState(() => {
    const p = recommendations?.professions?.[0] || '';
    return String(p || '').trim();
  });

  React.useEffect(() => {
    setSelectedProfession(String(recommendations?.professions?.[0] || '').trim());
  }, [recommendations?.professions]);

  // авто-обновление рекомендаций при изменении профиля (дебаунс)
  React.useEffect(() => {
    if (!isGenerating) {
      generateRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSig, profileOk]);

  // Реальная оценка соответствия
  const score = React.useMemo(() => {
    const v = Number(recommendations?.matchScore);
    if (Number.isFinite(v)) return Math.max(0, Math.min(100, v));
    return computeMarketFit(profile);
  }, [recommendations?.matchScore, profile]);

  const handleFindJobs = React.useCallback(() => {
    const q = (selectedProfession || '').trim();
    if (q) setSearchQuery(q);
    onFindVacancies?.();
  }, [selectedProfession, setSearchQuery, onFindVacancies]);

  const ScoreBar = ({ value }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">
          {t('recommendations.marketScore') || 'Оценка соответствия рынку'}
        </div>
        <div className="text-sm font-semibold text-purple-700">{value}%</div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        />
      </div>
    </div>
  );

  const CoursesSkeleton = () => (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div className="w-2/3 h-4 bg-gray-100 rounded" />
          <div className="w-20 h-8 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );

  const notAvailable =
    lang === 'kk' ? 'Қолжетімсіз' :
    lang === 'en' ? 'Unavailable' : 'Недоступно';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          aria-label={t('common.back')}
          type="button"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>{t('common.back')}</span>
        </button>

        <div className="bg-white rounded-2xl shadow p-6 border">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                <Sparkles size={18} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">
                  {t('recommendations.title')}
                </h2>
                <div className="text-xs text-gray-500">
                  {t('recommendations.hint')}
                </div>
              </div>
            </div>

            {/* Ручное обновление */}
            <button
              onClick={() => !isGenerating && generateRecommendations()}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              title={t('vacancies.aiRefresh')}
              aria-label={t('vacancies.aiRefresh')}
            >
              <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
              {t('vacancies.aiRefresh')}
            </button>
          </div>

          {/* Если данных мало */}
          {!profileOk && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="font-semibold mb-2 text-blue-900">
                {t('recommendations.needMoreData')}
              </div>
              <div className="text-sm text-blue-900 mb-2">
                {t('recommendations.missingSections')}:
              </div>
              <div className="flex flex-wrap gap-2">
                {missing.map((m, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs ring-1 ring-blue-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <button
                onClick={onImproveResume}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('recommendations.improveResume')}
              </button>
            </div>
          )}

          {/* Оценка соответствия */}
          <div className="mb-6">
            <ScoreBar value={score} />
          </div>

          {/* Целевая профессия (одно поле) и быстрый выбор */}
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              {t('recommendations.professions')}
            </div>

            <input
              type="text"
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
              placeholder={t('recommendations.suitableRole') || t('vacancies.suitableRole')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              {(recommendations?.professions || []).map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  onClick={() => setSelectedProfession(p)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    p === selectedProfession
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50'
                  }`}
                  title={t('recommendations.searchVacancies')}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Навыки для развития */}
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-800 mb-2">
              {t('recommendations.skillsToLearn')}
            </div>
            <div className="flex flex-wrap gap-2">
              {(recommendations?.skillsToLearn || []).map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs border border-indigo-200"
                >
                  {s}
                </span>
              ))}
              {(!recommendations || (recommendations?.skillsToLearn || []).length === 0) && (
                <span className="text-sm text-gray-500">
                  {t('recommendations.aiEmpty')}
                </span>
              )}
            </div>
          </div>

          {/* Рекомендуемые курсы */}
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-800 mb-3">
              {t('recommendations.courses')}
            </div>

            {isGenerating ? (
              <CoursesSkeleton />
            ) : (
              <div className="space-y-2">
                {(recommendations?.courses || []).map((c, i) => (
                  <div key={`${c.name}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{c.name}</div>
                      {(c.duration || c.url) && (
                        <div className="text-xs text-gray-500">
                          {c.duration || ''}{c.duration && c.url ? ' • ' : ''}{c.url ? t('recommendations.openCourse') : ''}
                        </div>
                      )}
                    </div>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-1"
                      >
                        <ExternalLink size={14} />
                        {t('recommendations.openCourse')}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">{notAvailable}</span>
                    )}
                  </div>
                ))}

                {(!recommendations || (recommendations?.courses || []).length === 0) && !isGenerating && (
                  <div className="rounded-lg border px-3 py-6 text-center text-gray-500 text-sm">
                    {t('recommendations.aiEmpty')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Нижние кнопки как на макете */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleFindJobs}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {t('home.findJobsButton')}
            </button>
            <button
              onClick={onImproveResume}
              className="flex-1 px-4 py-2.5 rounded-lg border font-medium hover:bg-gray-50"
            >
              {t('recommendations.improveResume')}
            </button>
          </div>
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
  const { t, lang } = useTranslation();
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

  // ⬇️ флаг для авто-расширения (чтобы не зациклиться)
  const [autoRelaxInfo, setAutoRelaxInfo] = useState(null);

  useEffect(() => { setPage(0); }, [searchQuery, filters.location, filters.experience, filters.salary]);

  // подтягиваем город/опыт/роль из профиля
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

    const cat = calcExperienceCategory(profile);
    if (cat && cat !== next.experience) {
      next.experience = cat;
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
  }, [useProfile, profile]); // eslint-disable-line

  // подсказка ИИ
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
        setAiError(t('vacancies.aiError'));
      } finally {
        setAiLoading(false);
      }
    })();
  }, [useProfile, profile, t]);

  // авто-применение подсказки
  useEffect(() => {
    if (!useProfile || aiAutoAppliedRef.current || !aiSuggestion || aiLoading) return;

    const userTyped = Boolean((searchQuery || '').trim());
    const conf = typeof aiSuggestion.confidence === 'number' ? aiSuggestion.confidence : 0;

    if (!userTyped && conf >= 0.5) {
      if (aiSuggestion.role) setSearchQuery(aiSuggestion.role);

      setFilters((f) => ({
        ...f,
        location: aiSuggestion.city || f.location,
        experience: hhExpFromAi(aiSuggestion.experience) || f.experience,
      }));

      setPage(0);
      aiAutoAppliedRef.current = true;
    }
  }, [aiSuggestion, aiLoading, useProfile, searchQuery]); // eslint-disable-line

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

  // добавление навыка в строку поиска
  const addSkillToQuery = (skill) => {
    const s = String(skill || '').trim();
    if (!s) return;
    const has = new RegExp(`(^|\\s)${s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\s|$)`, 'i').test(searchQuery);
    if (has) return;
    setSearchQuery((q) => (q ? `${q} ${s}` : s));
  };

  // локальный дебаунс (название иное, чтобы не конфликтовать с глобальным)
  function useDebouncedLocal(value, delay = 650) {
    const [v, setV] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setV(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return v;
  }
  const debouncedSearch = useDebouncedLocal(searchQuery, 650);
  const filtersKey = useMemo(
    () => JSON.stringify({ location: filters.location, experience: filters.experience, salary: filters.salary }),
    [filters.location, filters.experience, filters.salary]
  );
  const debouncedFiltersKey = useDebouncedLocal(filtersKey, 650);

  // единая функция маппинга
  const mapResponse = useCallback((data) => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const stripHtml = (t) =>
      String(t || '').replace(/<\/?highlighttext[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();

    const ban = new Set(['и', 'в', 'на', 'of', 'a', 'an']);
    const goodSkills = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map((s) => String(s || '').trim())
        .filter((t) => t && !ban.has(t.toLowerCase()) && (t.length > 2 || /[A-Za-z]/.test(t)))
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
        skills: goodSkills(v.keywords),
        alternate_url: v.url || v.alternate_url || '',
      };
    });

    return {
      items: mapped,
      found: Number(data?.found || mapped.length || 0),
      pages: Number(data?.pages || (mapped.length ? 1 : 0)),
    };
  }, [t]);

  // главный раннер с авто-расширением
  const runSearch = useCallback(
    async ({
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

      const inferredRole = aiSuggestion?.role || deriveDesiredRole(profile) || '';
      const inferredCity = aiSuggestion?.city || (profile?.location || '');
      const inferredExp  = hhExpFromAi(aiSuggestion?.experience) || calcExperienceCategory(profile) || '';

      const baseText = (typedText || '').trim() || inferredRole || 'разработчик';
      const baseCity = chosenCity || inferredCity || undefined;
      const baseExp  = (chosenExp === 'none') ? 'noExperience' : (chosenExp || inferredExp || '');

      const salaryNum = salaryVal ? String(salaryVal).replace(/\D/g, '') : undefined;

      // локальный хелпер для одного запроса
      const doQuery = async (text, city, exp) => {
        const params = {
          text,
          experience: exp || undefined,
          salary: salaryNum,
          city,
          host: HOST,
          page: pageArg,
          per_page: perPageArg,
          signal: abortSignal,
          timeoutMs: 12000,
        };
        const data = await searchJobsSmart(params);
        return mapResponse(data);
      };

      try {
        // 1) основной запрос
        let res = await doQuery(baseText, baseCity, baseExp);
        if (reqIdRef.current !== myId) return;

        // 2) авто-расширение: если пусто — убираем город
        if (!res.items.length && baseCity) {
          const widened = await doQuery(baseText, undefined, baseExp);
          if (reqIdRef.current !== myId) return;
          if (widened.items.length) {
            res = widened;
            setAutoRelaxInfo({ dropped: 'city' });
          }
        }

        // 3) всё ещё пусто — убираем опыт
        if (!res.items.length && baseExp) {
          const noExp = await doQuery(baseText, undefined, '');
          if (reqIdRef.current !== myId) return;
          if (noExp.items.length) {
            res = noExp;
            setAutoRelaxInfo({ dropped: 'experience' });
          }
        }

        // 4) всё ещё пусто — подставляем общий текст
        if (!res.items.length && baseText) {
          const generic = await doQuery('разработчик', undefined, '');
          if (reqIdRef.current !== myId) return;
          if (generic.items.length) {
            res = generic;
            setAutoRelaxInfo({ dropped: 'all' });
          }
        }

        setVacancies(res.items);
        setFound(res.found);
        setPages(res.pages);
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

        // безопасный мок, чтобы не оставлять пусто
        setVacancies(mockVacancies);
        setFound(mockVacancies.length);
        setPages(1);
        setPage(0);
      } finally {
        if (reqIdRef.current === myId) setLoading(false);
      }
    },
    [aiSuggestion, profile, mapResponse, setVacancies, mockVacancies, t]
  );

  // сброс авто-расширения при явном изменении пользователем
  useEffect(() => { setAutoRelaxInfo(null); }, [debouncedSearch, debouncedFiltersKey]);

  // основной эффект запуска поиска
  useEffect(() => {
    if (blocked) return;
    const ac = new AbortController();
    const myId = ++reqIdRef.current;

    const chosenExp = filters.experience?.trim();
    runSearch({
      typedText: debouncedSearch,
      chosenCity: filters.location?.trim(),
      chosenExp,
      salaryVal: filters.salary,
      pageArg: page,
      perPageArg: perPage,
      abortSignal: ac.signal,
      myId,
    });

    return () => { try { ac.abort(); } catch {} };
  }, [debouncedSearch, debouncedFiltersKey, page, perPage, blocked]); // eslint-disable-line

  // мягкий бутстрап (для "резюме → вакансии")
  useEffect(() => {
    if (bootstrapped) return;
    const derivedRole = deriveDesiredRole(profile) || '';
    const haveMeaningfulQuery = (searchQuery && searchQuery.trim()) || (derivedRole && derivedRole.trim());
    if (!haveMeaningfulQuery) return;
    setBootstrapped(true);
  }, [bootstrapped, searchQuery, profile]);

  const canPrev = page > 0 && !blocked;
  const canNext = pages > 0 && page + 1 < pages && !blocked;

  // локализованные сообщения для авто-расширения, чтобы не зависеть от отсутствующих ключей
  const autoRelaxMsg = (kind) => {
    if (lang === 'kk') {
      if (kind === 'city') return 'Іздеуді кеңейттік: қала сүзгісі алынды.';
      if (kind === 'experience') return 'Іздеуді кеңейттік: тәжірибе сүзгісі алынды.';
      return 'Іздеуді кеңейттік: жалпы сұраныс қолданылды.';
    }
    if (lang === 'en') {
      if (kind === 'city') return 'Search widened: city filter removed.';
      if (kind === 'experience') return 'Search widened: experience filter removed.';
      return 'Search widened: using a more generic query.';
    }
    // ru
    if (kind === 'city') return 'Расширили поиск: убрали фильтр по городу.';
    if (kind === 'experience') return 'Расширили поиск: убрали фильтр по опыту.';
    return 'Расширили поиск: использован более общий запрос.';
  };

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

          {/* ИИ-подсказка */}
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
                    {aiError && !aiLoading && <div className="text-sm text-red-600">{aiError}</div>}
                    {aiSuggestion && !aiLoading && (
                      <div className="text-sm text-gray-700">
                        {t('vacancies.aiSuggestSearch')}{' '}
                        <b>{aiSuggestion.role || t('vacancies.suitableRole')}</b>
                        {aiSuggestion.city ? <> {t('vacancies.in')} <b>{aiSuggestion.city}</b></> : null}
                        {aiSuggestion.experience ? <> • {t('builder.experience.label')}: <b>{prettyExp(aiSuggestion.experience, t)}</b></> : null}
                        {typeof aiSuggestion.confidence === 'number' ? <> • {t('vacancies.aiConfidence')}: <b>{Math.round(aiSuggestion.confidence * 100)}%</b></> : null}
                        {(aiSuggestion.skills || []).length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(aiSuggestion.skills || []).slice(0, 8).map((s, i) => (
                              <button
                                key={`${s}-${i}`}
                                onClick={() => addSkillToQuery(s)}
                                className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs hover:bg-blue-200"
                                title={t('vacancies.addToSearch')}
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
                    <button onClick={applyAISuggestion} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
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
                        inferSearchFromProfile(profile, { lang: 'ru' })
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

          {blocked && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {t('vacancies.rateLimited')}{' '}
              <b>{Math.max(1, Math.ceil((retryAfter - Date.now()) / 1000))} {t('vacancies.sec')}</b>
            </div>
          )}

          {/* Бейджик про авто-расширение (локализовано без новых ключей) */}
          {autoRelaxInfo && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm">
              {autoRelaxMsg(autoRelaxInfo.dropped)}
            </div>
          )}

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
                onChange={(e) => {
                  setUseProfile(e.target.checked);
                  appliedRef.current = false;
                }}
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

          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            <div>
              {loading
                ? t('vacancies.loading')
                : (<>
                    {t('vacancies.found')}: <span className="font-semibold">{found}</span>
                    {pages ? ` • ${t('vacancies.page')} ${page + 1} ${t('vacancies.of')} ${pages}` : ''}
                  </>)}
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
                  <span className="flex items-center gap-1"><MapPin size={14} /> {vacancy.location || '—'}</span>
                  <span className="flex items-center gap-1"><Award size={14} /> {vacancy.experience || '—'}</span>
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

export default AIResumeBuilder;
