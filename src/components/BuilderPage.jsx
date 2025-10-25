// src/components/BuilderPage.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Mail, Phone, MapPin, Plus, X, Check, Sparkles, Download,
  Briefcase, BookOpen, Upload, Globe, RefreshCw
} from 'lucide-react';

// ВАЖНО: НЕ импортируем ResumePDF статически, чтобы не тянуть второй инстанс @react-pdf/renderer
// import ResumePDF from './ResumePDF';

/* ---------- Константы ---------- */
const DEFAULT_PROFILE = {
  fullName: '',
  position: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  photo: null,
  experience: [],
  education: [],
  skills: [],
  languages: [],
};

const STEPS = ['Личная информация', 'Опыт работы', 'Образование', 'Навыки', 'Языки', 'Шаблон'];

const TEMPLATES = [
  { id: 'modern', name: 'Современный', color: 'blue' },
  { id: 'creative', name: 'Креативный', color: 'purple' },
  { id: 'professional', name: 'Профессиональный', color: 'gray' },
  { id: 'minimal', name: 'Минималистичный', color: 'green' },
];

const COLOR_BG = {
  blue: 'bg-blue-100',
  purple: 'bg-purple-100',
  gray: 'bg-gray-100',
  green: 'bg-green-100',
};

/* ---------- helpers ---------- */
const fmtMonth = (m) => {
  if (!m) return '';
  const m2 = /^(\d{4})-(\d{2})$/.exec(m);
  if (!m2) return m;
  const [, y, mo] = m2;
  return `${mo}.${y}`;
};
const isBlank = (v) => !v || !String(v).trim();

const norm = (s) => String(s || '').toLowerCase().trim();
const uniqCaseInsensitive = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = norm(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
};

/* ---------- Примитивный офлайн-AI для подсказок навыков ---------- */
/** Каталоги навыков по направлениям (можно расширять) */
const SKILL_CATALOG = {
  frontend: ['React', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Redux', 'REST API', 'Git', 'Vite', 'Webpack', 'Jest', 'RTL'],
  backend: ['Node.js', 'Express', 'NestJS', 'PostgreSQL', 'MongoDB', 'Docker', 'GraphQL', 'REST API', 'CI/CD'],
  mobile: ['React Native', 'Kotlin', 'Swift', 'Flutter', 'MVVM', 'Firebase'],
  data: ['Python', 'Pandas', 'NumPy', 'SQL', 'ETL', 'Power BI', 'Tableau', 'Excel', 'scikit-learn'],
  design: ['Figma', 'Prototyping', 'User Research', 'Wireframing', 'Design Systems', 'UX Writing'],
  qa: ['Manual Testing', 'Test Automation', 'Selenium', 'Cypress', 'Jest', 'Playwright'],
  pm: ['Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence', 'Stakeholder Management'],
  marketing: ['Digital Marketing', 'SEO', 'SMM', 'Google Analytics', 'Copywriting'],
  soft: ['Communication', 'Problem Solving', 'Teamwork', 'Time Management'],
};

/** детектор направлений по текстам профиля */
function detectTracks(profile) {
  const bag = [
    profile?.position,
    profile?.summary,
    ...(profile?.skills || []),
    ...(profile?.experience || []).map((e) => e?.position),
    ...(profile?.experience || []).map((e) => e?.responsibilities),
    ...(profile?.education || []).map((e) => e?.specialization || e?.level),
  ].map(norm).join(' \n ');

  const has = (...keys) => keys.some((k) => bag.includes(k));

  const tracks = new Set();
  if (has('frontend', 'фронтенд', 'react', 'javascript', 'typescript', 'веб')) tracks.add('frontend');
  if (has('backend', 'бекенд', 'node', 'nestjs', 'express')) tracks.add('backend');
  if (has('mobile', 'android', 'ios', 'react native', 'kotlin', 'swift', 'flutter')) tracks.add('mobile');
  if (has('data', 'аналит', 'python', 'sql', 'power bi', 'tableau', 'ml', 'машин')) tracks.add('data');
  if (has('дизайн', 'ui', 'ux', 'figma', 'product design', 'интерфейс')) tracks.add('design');
  if (has('qa', 'тест', 'quality')) tracks.add('qa');
  if (has('pm', 'project', 'менедж', 'scrum', 'kanban')) tracks.add('pm');
  if (has('market', 'маркет', 'smm', 'seo')) tracks.add('marketing');

  if (tracks.size === 0) {
    // Попробуем угадать по базовым скиллам
    const skills = (profile?.skills || []).map(norm);
    if (skills.some((s) => ['react', 'javascript', 'typescript', 'html', 'css'].some((k) => s.includes(k)))) tracks.add('frontend');
    if (skills.some((s) => ['python', 'sql'].some((k) => s.includes(k)))) tracks.add('data');
    if (skills.some((s) => ['figma'].some((k) => s.includes(k)))) tracks.add('design');
  }
  if (tracks.size === 0) tracks.add('soft');
  return [...tracks];
}

/** Генератор подсказок навыков — полностью локально, без сети */
function smartSuggestSkills(profile, rotate = 0) {
  const tracks = detectTracks(profile);
  const existing = new Set((profile?.skills || []).map(norm));

  // Собираем кандидатов по трекам + общие
  let candidates = tracks.flatMap((t) => SKILL_CATALOG[t] || []);
  candidates = candidates.concat(SKILL_CATALOG.soft);

  // Убираем то, что уже есть (с учётом регистра), чистим дубли
  candidates = uniqCaseInsensitive(candidates.filter((s) => !existing.has(norm(s))));

  // Лёгкая «случайность» для кнопки Обновить: циклический сдвиг
  if (candidates.length && rotate) {
    const k = rotate % candidates.length;
    candidates = candidates.slice(k).concat(candidates.slice(0, k));
  }
  return candidates.slice(0, 8);
}

/* ---------- UI helpers ---------- */
const Input = React.memo(({ label, className = '', ...rest }) => (
  <div>
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <input
      {...rest}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  </div>
));

const Select = React.memo(({ label, className = '', children, ...rest }) => (
  <div>
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <select
      {...rest}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      {children}
    </select>
  </div>
));

const Textarea = React.memo(({ label, rows = 3, className = '', ...rest }) => (
  <div>
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <textarea
      rows={rows}
      {...rest}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  </div>
));

const Stepper = React.memo(({ current }) => (
  <div className="flex justify-between items-center mb-4">
    {STEPS.map((_, idx) => (
      <div key={idx} className="flex items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            idx === current
              ? 'bg-blue-600 text-white'
              : idx < current
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {idx < current ? <Check size={20} /> : idx + 1}
        </div>
        {idx < STEPS.length - 1 && (
          <div className={`w-20 h-1 mx-2 ${idx < current ? 'bg-green-500' : 'bg-gray-200'}`} />
        )}
      </div>
    ))}
  </div>
));

const TemplateSelect = React.memo(function TemplateSelect({ selected, onSelect }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {TEMPLATES.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`border-2 rounded-lg p-6 cursor-pointer transition ${
            selected === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(t.id)}
          aria-pressed={selected === t.id}
        >
          <div className={`${COLOR_BG[t.color]} w-12 h-12 rounded-lg mb-3`} />
          <h4 className="font-semibold mb-1">{t.name}</h4>
          <p className="text-sm text-gray-600">Стильный и профессиональный дизайн</p>
          {selected === t.id && (
            <div className="mt-3 flex items-center gap-2 text-blue-600">
              <Check size={16} />
              <span className="text-sm font-medium">Выбрано</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

const ResumePreview = React.memo(function ResumePreview({ profile }) {
  const topSkills = useMemo(() => (profile.skills || []).slice(0, 8), [profile.skills]);
  const expCount = (profile.experience || []).length;
  const eduCount = (profile.education || []).length;
  const langCount = (profile.languages || []).length;
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h4 className="font-semibold mb-3 text-green-900">Предпросмотр резюме</h4>
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="mb-4 flex gap-4">
          {profile.photo && (
            <img
              src={profile.photo}
              alt="Фото"
              className="w-16 h-16 rounded-full object-cover border"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{profile.fullName || 'Ваше имя'}</h2>
            {profile.position && <p className="text-gray-800 font-medium mt-1">{profile.position}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-2">
              {profile.email && (
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  {profile.phone}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.summary && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">О себе</h3>
            <p className="text-sm text-gray-700">{profile.summary}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Briefcase size={20} className="mx-auto mb-1 text-blue-600" />
            <div className="font-semibold text-gray-900">{expCount}</div>
            <div className="text-gray-600">мест работы</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <BookOpen size={20} className="mx-auto mb-1 text-purple-600" />
            <div className="font-semibold text-gray-900">{eduCount}</div>
            <div className="text-gray-600">образование</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <Globe size={20} className="mx-auto mb-1 text-indigo-600" />
            <div className="font-semibold text-gray-900">{langCount}</div>
            <div className="text-gray-600">языков</div>
          </div>
        </div>

        {topSkills.length > 0 && (
          <div className="mb-0">
            <h3 className="font-semibold mb-2">Навыки</h3>
            <div className="flex flex-wrap gap-2">
              {topSkills.map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/* ---------- Основной компонент ---------- */
function BuilderPage({
  profile = DEFAULT_PROFILE,
  setProfile,
  selectedTemplate,
  setSelectedTemplate,
  setCurrentPage,
}) {
  const [currentStep, setCurrentStep] = useState(0);

  // 🔝 ref на заголовок шага — сюда ставим фокус и крутим в начало
  const headingRef = useRef(null);

  // ЛОКАЛЬНОЕ состояние формы
  const [form, setForm] = useState(() => ({ ...DEFAULT_PROFILE, ...(profile || {}) }));

  // подтянуть внешние изменения
  useEffect(() => {
    if (profile) setForm((prev) => ({ ...prev, ...profile }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.fullName, profile?.email, profile?.phone, profile?.location,
    profile?.summary, profile?.position, profile?.photo, profile?.languages
  ]);

  // мягкая синхронизация наружу
  useEffect(() => {
    const t = setTimeout(() => setProfile?.(form), 250);
    return () => clearTimeout(t);
  }, [form, setProfile]);

  // 🎯 При смене шага — прокрутка вверх и установка фокуса на заголовок
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const behavior = reduceMotion ? 'auto' : 'smooth';

    if (headingRef.current?.scrollIntoView) {
      headingRef.current.scrollIntoView({ behavior, block: 'start' });
      setTimeout(() => {
        try { headingRef.current?.focus?.(); } catch {}
      }, reduceMotion ? 0 : 150);
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, [currentStep]);

  // обработчики
  const onChangeField = useCallback(
    (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value })),
    []
  );

  /* --- Фото --- */
  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (dataUrl) setForm((p) => ({ ...p, photo: dataUrl }));
    };
    reader.readAsDataURL(file);
  }, []);

  /* --- Навыки --- */
  const [newSkill, setNewSkill] = useState('');
  const addSkill = useCallback(() => {
    const s = newSkill.trim();
    if (!s) return;
    setForm((p) => (p.skills.includes(s) ? p : { ...p, skills: [...p.skills, s] }));
    setNewSkill('');
  }, [newSkill]);
  const removeSkill = useCallback((idx) => {
    setForm((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));
  }, []);

  // 🔮 Офлайн-подсказки навыков (никаких запросов к /api/ai/chat)
  const [aiSkillHints, setAiSkillHints] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRotate, setAiRotate] = useState(0);

  const rebuildHints = useCallback((rotateBump = 0) => {
    setAiLoading(true);
    const r = aiRotate + rotateBump;
    // имитируем «прогресс», но без сети
    setTimeout(() => {
      const hints = smartSuggestSkills(form, r);
      setAiSkillHints(hints);
      setAiRotate(r);
      setAiLoading(false);
    }, 250);
  }, [form, aiRotate]);

  // Пересчитывать подсказки при изменении скиллов/позиции/summary и при входе на шаг «Навыки»
  useEffect(() => {
    if (currentStep !== 3) return;
    rebuildHints(0);
  }, [currentStep, form.skills, form.position, form.summary, rebuildHints]);

  /* --- Опыт --- */
  const blankExperience = {
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    position: '',
    company: '',
    responsibilities: '',
  };
  const [newExperience, setNewExperience] = useState(blankExperience);

  const isExperienceDraftFilled = useCallback(
    (e) =>
      !!e &&
      (!isBlank(e.position) || !isBlank(e.company) || !isBlank(e.startDate) || !isBlank(e.endDate) || !isBlank(e.responsibilities)),
    []
  );
  const canCommitExperience = useCallback(
    (e) => !!e && !isBlank(e.position) && !isBlank(e.company),
    []
  );
  const commitExperienceDraft = useCallback(() => {
    if (isExperienceDraftFilled(newExperience) && canCommitExperience(newExperience)) {
      setForm((p) => ({
        ...p,
        experience: [...p.experience, { ...newExperience, id: Date.now() }],
      }));
      setNewExperience(blankExperience);
      return true;
    }
    return false;
  }, [newExperience, isExperienceDraftFilled, canCommitExperience]);

  const addExperience = useCallback(() => {
    commitExperienceDraft();
  }, [commitExperienceDraft]);

  const removeExperience = useCallback((idxOrId) => {
    setForm((p) => ({
      ...p,
      experience: p.experience.filter((e, i) => (e.id ? e.id !== idxOrId : i !== idxOrId)),
    }));
  }, []);

  /* --- Образование --- */
  const blankEducation = { year: '', institution: '', level: '', specialization: '' };
  const [newEducation, setNewEducation] = useState(blankEducation);

  const isEducationDraftFilled = useCallback(
    (e) => !!e && (!isBlank(e.institution) || !isBlank(e.level) || !isBlank(e.year) || !isBlank(e.specialization)),
    []
  );
  const canCommitEducation = useCallback(
    (e) => !!e && !isBlank(e.institution) && !isBlank(e.level),
    []
  );
  const commitEducationDraft = useCallback(() => {
    if (isEducationDraftFilled(newEducation) && canCommitEducation(newEducation)) {
      setForm((p) => ({
        ...p,
        education: [...p.education, { ...newEducation, id: Date.now() }],
      }));
      setNewEducation(blankEducation);
      return true;
    }
    return false;
  }, [newEducation, isEducationDraftFilled, canCommitEducation]);

  const addEducation = useCallback(() => {
    commitEducationDraft();
  }, [commitEducationDraft]);

  const removeEducation = useCallback((idxOrId) => {
    setForm((p) => ({
      ...p,
      education: p.education.filter((e, i) => (e.id ? e.id !== idxOrId : i !== idxOrId)),
    }));
  }, []);

  /* --- Языки --- */
  const blankLanguage = { language: '', level: 'B1 — Средний' };
  const [newLanguage, setNewLanguage] = useState(blankLanguage);

  const isLanguageDraftFilled = useCallback((l) => !!l && !isBlank(l.language), []);
  const commitLanguageDraft = useCallback(() => {
    if (isLanguageDraftFilled(newLanguage)) {
      setForm((p) => ({
        ...p,
        languages: [...(p.languages || []), { ...newLanguage, id: Date.now() }],
      }));
      setNewLanguage(blankLanguage);
      return true;
    }
    return false;
  }, [newLanguage, isLanguageDraftFilled]);

  const addLanguage = useCallback(() => {
    commitLanguageDraft();
  }, [commitLanguageDraft]);

  const removeLanguage = useCallback((idOrIdx) => {
    setForm((p) => ({
      ...p,
      languages: (p.languages || []).filter((l, i) => (l.id ? l.id !== idOrIdx : i !== idOrIdx)),
    }));
  }, []);

  const handleSelectTemplate = useCallback(
    (id) => setSelectedTemplate(id),
    [setSelectedTemplate]
  );

  // Имя файла
  const fileName = useMemo(() => {
    const base = (form.fullName || 'resume').toString().trim().replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');
    return `${base || 'resume'}.pdf`;
  }, [form.fullName]);

  // Валидация для скачивания
  const requiredMissing = useMemo(() => {
    const miss = [];
    if (!form.fullName?.trim()) miss.push('ФИО');
    if (!form.email?.trim()) miss.push('Email');
    if (!form.phone?.trim()) miss.push('Телефон');
    return miss;
  }, [form.fullName, form.email, form.phone]);
  const canDownload = requiredMissing.length === 0;

  // «Далее» — авто-коммит черновиков по шагам
  const goNext = useCallback(() => {
    if (currentStep === 1) commitExperienceDraft();
    if (currentStep === 2) commitEducationDraft();
    if (currentStep === 4) commitLanguageDraft();
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [currentStep, commitExperienceDraft, commitEducationDraft, commitLanguageDraft]);

  // Построить профиль для экспорта (с учётом незажатых черновиков)
  const buildExportProfile = useCallback(() => {
    const exp = [...form.experience];
    if (isExperienceDraftFilled(newExperience) && canCommitExperience(newExperience)) {
      exp.push({ ...newExperience, id: `draft-${Date.now()}` });
    }
    const edu = [...form.education];
    if (isEducationDraftFilled(newEducation) && canCommitEducation(newEducation)) {
      edu.push({ ...newEducation, id: `draft-${Date.now()}` });
    }
    const langs = [...(form.languages || [])];
    if (isLanguageDraftFilled(newLanguage)) {
      langs.push({ ...newLanguage, id: `draft-${Date.now()}` });
    }
    return {
      ...form,
      experience: exp,
      education: edu,
      languages: langs,
      photoUrl: form.photo || form.photoUrl || null,
    };
  }, [
    form,
    newExperience, isExperienceDraftFilled, canCommitExperience,
    newEducation, isEducationDraftFilled, canCommitEducation,
    newLanguage, isLanguageDraftFilled
  ]);

  // Ручная генерация PDF (динамически грузим и шаблон, и pdf())
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = useCallback(async () => {
    if (!canDownload || downloading) return;

    try {
      if (currentStep === 1) await commitExperienceDraft();
      if (currentStep === 2) await commitEducationDraft();
      if (currentStep === 4) await commitLanguageDraft();
    } catch {}

    setDownloading(true);
    setDownloadError('');
    try {
      const exportProfile = buildExportProfile();

      const [{ pdf }, { default: ResumePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ResumePDF'),
      ]);

      const blob = await pdf(<ResumePDF profile={exportProfile} template={selectedTemplate} />).toBlob();
      if (!blob || blob.size === 0) throw new Error('Пустой PDF (blob.size === 0)');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generate error:', err);
      const msg = (err && (err.message || err.toString())) || 'Неизвестная ошибка';
      setDownloadError(`Не удалось сформировать PDF. ${msg}`);
    } finally {
      setDownloading(false);
    }
  }, [
    canDownload, downloading, currentStep,
    commitExperienceDraft, commitEducationDraft, commitLanguageDraft,
    buildExportProfile, selectedTemplate, fileName
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => setCurrentPage('home')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <Stepper current={currentStep} />
            {/* Заголовок шага — сюда ставим фокус при смене шага */}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
            >
              {STEPS[currentStep]}
            </h2>
          </div>

          <div className="mb-8">
            {/* Шаг 0 — Личная информация */}
            {currentStep === 0 && (
              <div className="space-y-6">
                {/* Фото */}
                <div className="text-center">
                  <div className="inline-block relative">
                    {form.photo ? (
                      <img
                        src={form.photo}
                        alt="Фото"
                        className="w-28 h-28 rounded-full object-cover border-4 border-blue-100"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                        <Upload className="text-gray-400" size={28} />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow">
                      <Upload size={18} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Рекомендуется загрузить фото</p>
                </div>

                <Input
                  label="Полное имя *"
                  type="text"
                  value={form.fullName}
                  onChange={onChangeField('fullName')}
                  placeholder="Иван Иванов"
                  autoComplete="name"
                />

                <Input
                  label="Желаемая должность"
                  type="text"
                  value={form.position}
                  onChange={onChangeField('position')}
                  placeholder="Frontend Developer"
                  autoComplete="organization-title"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Email *"
                    type="email"
                    value={form.email}
                    onChange={onChangeField('email')}
                    placeholder="ivan@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                  <Input
                    label="Телефон *"
                    type="tel"
                    value={form.phone}
                    onChange={onChangeField('phone')}
                    placeholder="+7 (777) 123-45-67"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>

                <Input
                  label="Город"
                  type="text"
                  value={form.location}
                  onChange={onChangeField('location')}
                  placeholder="Алматы"
                  autoComplete="address-level2"
                />

                <div>
                  <Textarea
                    label="О себе"
                    rows={4}
                    value={form.summary}
                    onChange={onChangeField('summary')}
                    placeholder="Расскажите о себе: 2–3 предложения о ключевых компетенциях и целях…"
                  />
                  <div className="mt-2 flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
                    <Sparkles size={16} className="mt-0.5" />
                    <p>AI подсказка: Укажите опыт, 1–2 достижения и стек/сферы, в которых сильны.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 1 — Опыт */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                    <Briefcase size={18} /> Добавить опыт
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Должность *"
                      value={newExperience.position}
                      onChange={(e) => setNewExperience((p) => ({ ...p, position: e.target.value }))}
                      placeholder="Frontend Developer"
                    />
                    <Input
                      label="Компания *"
                      value={newExperience.company}
                      onChange={(e) => setNewExperience((p) => ({ ...p, company: e.target.value }))}
                      placeholder='ТОО "Tech Corp"'
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Начало работы *"
                      type="month"
                      value={newExperience.startDate}
                      onChange={(e) => setNewExperience((p) => ({ ...p, startDate: e.target.value }))}
                    />
                    <Input
                      label="Окончание работы"
                      type="month"
                      value={newExperience.endDate}
                      onChange={(e) => setNewExperience((p) => ({ ...p, endDate: e.target.value }))}
                      disabled={newExperience.currentlyWorking}
                      className={newExperience.currentlyWorking ? 'bg-gray-100 cursor-not-allowed' : ''}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExperience.currentlyWorking}
                      onChange={(e) =>
                        setNewExperience((p) => ({
                          ...p,
                          currentlyWorking: e.target.checked,
                          endDate: e.target.checked ? '' : p.endDate,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Работаю в настоящее время</span>
                  </label>

                  <Textarea
                    label="Обязанности и достижения"
                    rows={4}
                    value={newExperience.responsibilities}
                    onChange={(e) => setNewExperience((p) => ({ ...p, responsibilities: e.target.value }))}
                    placeholder={'• Разработка и поддержка приложений\n• Оптимизация производительности\n• Наставничество джуниоров'}
                  />

                  <button
                    onClick={addExperience}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Добавить опыт
                  </button>
                </div>

                {form.experience.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Добавленный опыт:</h3>
                    {form.experience.map((exp, idx) => (
                      <div key={exp.id || idx} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h4 className="font-semibold">{exp.position}</h4>
                            <p className="text-sm text-gray-600">
                              {exp.company} • {fmtMonth(exp.startDate)} — {exp.currentlyWorking ? 'настоящее время' : fmtMonth(exp.endDate)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeExperience(exp.id ?? idx)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Удалить опыт"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {exp.responsibilities && (
                          <p className="text-sm text-gray-700 whitespace-pre-line">{exp.responsibilities}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Шаг 2 — Образование */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
                    <BookOpen size={18} /> Добавить образование
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      label="Уровень *"
                      value={newEducation.level}
                      onChange={(e) => setNewEducation((p) => ({ ...p, level: e.target.value }))}
                    >
                      <option value="">Выберите</option>
                      {['Среднее', 'Среднее специальное', 'Неоконченное высшее', 'Высшее', 'Бакалавр', 'Магистр', 'MBA', 'Кандидат наук', 'Доктор наук']
                        .map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </Select>
                    <Input
                      label="Учебное заведение *"
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation((p) => ({ ...p, institution: e.target.value }))}
                      placeholder="КазНУ им. аль-Фараби"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Год окончания"
                      type="number"
                      min="1950"
                      max="2035"
                      value={newEducation.year}
                      onChange={(e) => setNewEducation((p) => ({ ...p, year: e.target.value }))}
                      placeholder="2024"
                    />
                    <Input
                      label="Специальность"
                      value={newEducation.specialization}
                      onChange={(e) => setNewEducation((p) => ({ ...p, specialization: e.target.value }))}
                      placeholder="Программная инженерия"
                    />
                  </div>

                  <button
                    onClick={addEducation}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Добавить образование
                  </button>
                </div>

                {form.education.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Добавленное образование:</h3>
                    {form.education.map((edu, idx) => (
                      <div key={edu.id || idx} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{edu.level}</h4>
                            <p className="text-sm text-gray-600">
                              {edu.institution}{edu.year ? ` • ${edu.year}` : ''}
                            </p>
                            {edu.specialization && (
                              <p className="text-sm text-gray-700">{edu.specialization}</p>
                            )}
                          </div>
                          <button
                            onClick={() => removeEducation(edu.id ?? idx)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Удалить образование"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Шаг 3 — Навыки */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Добавить навык</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      placeholder="Например: React, JavaScript, Python"
                    />
                    <button
                      onClick={addSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {form.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Ваши навыки:</h3>
                    <div className="flex flex-wrap gap-2">
                      {form.skills.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(idx)}
                            className="hover:text-blue-900"
                            aria-label={`Удалить навык ${skill}`}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="text-purple-600 mt-0.5" size={16} />
                      <div>
                        <h4 className="font-semibold text-purple-900">AI рекомендует добавить:</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiLoading ? (
                            <span className="text-sm text-gray-600">Подбираем навыки…</span>
                          ) : aiSkillHints.length ? (
                            aiSkillHints.map((skill) => (
                              <button
                                key={skill}
                                onClick={() =>
                                  setForm((p) => (p.skills.includes(skill) ? p : { ...p, skills: uniqCaseInsensitive([...p.skills, skill]) }))
                                }
                                className="px-3 py-1 bg-white border border-purple-300 text-purple-700 rounded-full text-sm hover:bg-purple-100"
                              >
                                + {skill}
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">Пока нечего предложить — добавьте пару ключевых навыков или укажите должность.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => rebuildHints(1)}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-purple-100 disabled:opacity-50"
                      disabled={aiLoading}
                      title="Обновить рекомендации"
                    >
                      <RefreshCw size={16} className={aiLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 4 — Языки */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Globe size={18} /> Знание языков
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Язык *"
                      value={newLanguage.language}
                      onChange={(e) => setNewLanguage((p) => ({ ...p, language: e.target.value }))}
                      placeholder="Английский"
                    />
                    <Select
                      label="Уровень *"
                      value={newLanguage.level}
                      onChange={(e) => setNewLanguage((p) => ({ ...p, level: e.target.value }))}
                    >
                      {['A1 — Начальный','A2 — Элементарный','B1 — Средний','B2 — Средне-продвинутый','C1 — Продвинутый','C2 — В совершенстве']
                        .map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </Select>
                  </div>

                  <button
                    onClick={addLanguage}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Добавить язык
                  </button>
                </div>

                {(form.languages || []).length > 0 && (
                  <div className="space-y-2">
                    {form.languages.map((l, idx) => (
                      <div
                        key={l.id || idx}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{l.language}</span>
                          <span className="text-gray-500 text-sm ml-2">— {l.level}</span>
                        </div>
                        <button
                          onClick={() => removeLanguage(l.id ?? idx)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          aria-label={`Удалить язык ${l.language}`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Шаг 5 — Шаблон и предпросмотр */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Выберите шаблон резюме:</h3>
                  <TemplateSelect selected={selectedTemplate} onSelect={handleSelectTemplate} />
                </div>
                <ResumePreview profile={form} />
              </div>
            )}
          </div>

          {/* Навигация/скачивание */}
          <div className="flex justify-between items-start">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Назад
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Далее
              </button>
            ) : canDownload ? (
              <div className="ml-auto flex flex-col items-end gap-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                    downloading ? 'bg-green-500 text-white opacity-80 cursor-wait' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Download size={20} />
                  {downloading ? 'Готовим PDF…' : 'Скачать PDF'}
                </button>
                {downloadError && (
                  <p className="text-sm text-red-600">{downloadError}</p>
                )}
              </div>
            ) : (
              <div className="ml-auto flex flex-col items-end gap-2">
                <button
                  disabled
                  className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-2"
                  title={`Заполните: ${requiredMissing.join(', ')}`}
                >
                  <Download size={20} />
                  Заполните обязательные поля
                </button>
                <p className="text-xs text-gray-500">
                  Необходимо: {requiredMissing.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BuilderPage);
