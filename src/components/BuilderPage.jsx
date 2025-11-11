// src/components/BuilderPage.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Mail, Phone, MapPin, Plus, X, Check, Sparkles, Download,
  Briefcase, BookOpen, Upload, Globe, RefreshCw
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { translateProfileForLang } from '../services/bff'; // ✅ авто-перевод профиля перед PDF

/* ---------- Константы ---------- */
const DEFAULT_PROFILE = {
  fullName: '',
  position: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  photo: null,

  age: '',
  maritalStatus: '',
  children: '',
  // используем driversLicense, но ниже добавлена совместимость с driverLicense
  driversLicense: '',

  experience: [],
  education: [],
  skills: [],
  languages: [],
};

// только id/цвет; названия берём из i18n
const TEMPLATES = [
  { id: 'modern', color: 'blue' },
  { id: 'minimal', color: 'green' },
];

const COLOR_BG = {
  blue: 'bg-blue-100',
  green: 'bg-green-100',
};

/* ---------- helpers ---------- */
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

const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
};

const fmtDate = (v) => {
  if (!v) return '';
  // ISO month "YYYY-MM"
  const m = /^(\d{4})-(\d{2})$/.exec(String(v).trim());
  if (m) return `${m[2]}.${m[1]}`;
  // "YYYY"
  if (/^\d{4}$/.test(String(v))) return String(v);
  // Уже человекочитаемая строка
  return String(v);
};

/* ---------- мини-ИИ навыков ---------- */
const SKILL_CATALOG = {
  frontend: ['React','JavaScript','TypeScript','HTML5','CSS3','Redux','REST API','Git','Vite','Webpack','Jest','RTL'],
  backend: ['Node.js','Express','NestJS','PostgreSQL','MongoDB','Docker','GraphQL','REST API','CI/CD'],
  mobile: ['React Native','Kotlin','Swift','Flutter','MVVM','Firebase'],
  data: ['Python','Pandas','NumPy','SQL','ETL','Power BI','Tableau','Excel','scikit-learn'],
  design: ['Figma','Prototyping','User Research','Wireframing','Design Systems','UX Writing'],
  qa: ['Manual Testing','Test Automation','Selenium','Cypress','Jest','Playwright'],
  pm: ['Agile','Scrum','Kanban','Jira','Confluence','Stakeholder Management'],
  marketing: ['Digital Marketing','SEO','SMM','Google Analytics','Copywriting'],
  soft: ['Communication','Problem Solving','Teamwork','Time Management'],
};

function detectTracks(profile) {
  const bag = [
    profile?.position,
    profile?.summary,
    ...(profile?.skills || []),
    ...(profile?.experience || []).map((e) => e?.position || e?.title),
    ...(profile?.experience || []).map((e) => e?.responsibilities || e?.description),
    ...(profile?.education || []).map((e) => e?.specialization || e?.level || e?.degree),
  ].map(norm).join(' \n ');
  const has = (...keys) => keys.some((k) => bag.includes(k));

  const tracks = new Set();
  if (has('frontend','фронтенд','react','javascript','typescript','веб')) tracks.add('frontend');
  if (has('backend','бекенд','node','nestjs','express')) tracks.add('backend');
  if (has('mobile','android','ios','react native','kotlin','swift','flutter')) tracks.add('mobile');
  if (has('data','аналит','python','sql','power bi','tableau','ml','машин')) tracks.add('data');
  if (has('дизайн','ui','ux','figma','product design','интерфейс')) tracks.add('design');
  if (has('qa','тест','quality')) tracks.add('qa');
  if (has('pm','project','менедж','scrum','kanban')) tracks.add('pm');
  if (has('market','маркет','smm','seo')) tracks.add('marketing');

  if (tracks.size === 0) {
    const skills = (profile?.skills || []).map(norm);
    if (skills.some((s) => ['react','javascript','typescript','html','css'].some((k) => s.includes(k)))) tracks.add('frontend');
    if (skills.some((s) => ['python','sql'].some((k) => s.includes(k)))) tracks.add('data');
    if (skills.some((s) => ['figma'].some((k) => s.includes(k)))) tracks.add('design');
  }
  if (tracks.size === 0) tracks.add('soft');
  return [...tracks];
}

function smartSuggestSkills(profile, rotate = 0) {
  const tracks = detectTracks(profile);
  const existing = new Set((profile?.skills || []).map(norm));

  let candidates = tracks.flatMap((t) => SKILL_CATALOG[t] || []);
  candidates = candidates.concat(SKILL_CATALOG.soft);
  candidates = uniqCaseInsensitive(candidates.filter((s) => !existing.has(norm(s))));

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

const Stepper = React.memo(({ current, steps }) => (
  <div className="flex justify-between items-center mb-4">
    {steps.map((_, idx) => (
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
        {idx < steps.length - 1 && (
          <div className={`w-20 h-1 mx-2 ${idx < current ? 'bg-green-500' : 'bg-gray-200'}`} />
        )}
      </div>
    ))}
  </div>
));

const TemplateSelect = React.memo(function TemplateSelect({ selected, onSelect, t }) {
  const nameById = (id) =>
    id === 'modern'
      ? t('builder.templates.modern')
      : t('builder.templates.minimal');

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {TEMPLATES.map((tpl) => (
        <div
          key={tpl.id}
          onClick={() => onSelect(tpl.id)}
          className={`border-2 rounded-lg p-6 cursor-pointer transition ${
            selected === tpl.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(tpl.id)}
          aria-pressed={selected === tpl.id}
          aria-label={t('builder.templates.choose', { name: nameById(tpl.id) })}
        >
          <div className={`${COLOR_BG[tpl.color]} w-12 h-12 rounded-lg mb-3`} />
          <h4 className="font-semibold mb-1">{nameById(tpl.id)}</h4>
          <p className="text-sm text-gray-600">{t('builder.templates.subtitle')}</p>
          {selected === tpl.id && (
            <div className="mt-3 flex items-center gap-2 text-blue-600">
              <Check size={16} />
              <span className="text-sm font-medium">{t('builder.templates.selected')}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

/* ---------- ПОЛНЫЙ предпросмотр ---------- */
const ResumePreview = React.memo(function ResumePreview({ profile, t }) {
  // Полная поддержка разных схем полей
  const email   = profile.email;
  const phone   = profile.phone;
  const loc     = profile.location;
  const title   = firstNonEmpty(profile.position, profile.desiredRole, profile.targetRole);
  const photo   = profile.photo;

  const age     = profile.age;
  const family  = profile.maritalStatus;
  const kids    = profile.children;
  const rights  = firstNonEmpty(profile.driversLicense, profile.driverLicense); // совместимость

  const skills  = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];

  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const education  = Array.isArray(profile.education) ? profile.education : [];
  const languages  = Array.isArray(profile.languages) ? profile.languages : [];

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h4 className="font-semibold mb-3 text-green-900">{t('builder.preview.title')}</h4>

      <div className="bg-white rounded-lg p-6 border shadow-sm">
        {/* Шапка */}
        <div className="mb-4 flex gap-4">
          {photo ? (
            <img src={photo} alt={t('builder.preview.photoAlt')} className="w-16 h-16 rounded-full object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200" />
          )}

          <div>
            <h2 className="text-2xl font-bold">{profile.fullName || t('builder.preview.yourName')}</h2>
            {title && <p className="text-gray-800 font-medium mt-1">{title}</p>}

            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-2">
              {email && (<span className="flex items-center gap-1"><Mail size={14} />{email}</span>)}
              {phone && (<span className="flex items-center gap-1"><Phone size={14} />{phone}</span>)}
              {loc && (<span className="flex items-center gap-1"><MapPin size={14} />{loc}</span>)}
            </div>

            {(age || family || kids || rights) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mt-2">
                {age && <span>{t('builder.personal.age')}: {age}</span>}
                {family && <span>{t('builder.personal.maritalStatus')}: {family}</span>}
                {kids && <span>{t('builder.personal.children')}: {kids}</span>}
                {rights && <span>{t('builder.personal.driversLicense')}: {rights}</span>}
              </div>
            )}
          </div>
        </div>

        {/* О себе */}
        {profile.summary && (
          <div className="mb-5">
            <h3 className="font-semibold mb-2">{t('builder.personal.summary')}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{profile.summary}</p>
          </div>
        )}

        {/* Навыки — все */}
        {skills.length > 0 && (
          <div className="mb-5">
            <h3 className="font-semibold mb-2">{t('builder.skills.title')}</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={`${s}-${i}`} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Опыт — весь список */}
        {experience.length > 0 && (
          <div className="mb-5">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Briefcase size={18} /> {t('builder.experience.label')}
            </h3>
            <ul className="space-y-3">
              {experience.map((e, idx) => {
                const pos   = firstNonEmpty(e.position, e.title, e.role);
                const comp  = firstNonEmpty(e.company, e.employer, e.org);
                const start = fmtDate(firstNonEmpty(e.startDate, e.start, e.from, e.dateStart, e.date_from));
                const end   = e.currentlyWorking ? t('builder.experience.current') : fmtDate(firstNonEmpty(e.endDate, e.end, e.to, e.dateEnd, e.date_to));
                const text  = firstNonEmpty(e.responsibilities, e.description, e.achievements);
                const place = e.location || e.city || '';

                const bullets = String(text || '')
                  .split(/\n|•|;-?/g)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 12);

                return (
                  <li key={e.id || idx} className="border rounded-lg p-4 bg-white">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900">{pos || '—'}</div>
                        <div className="text-gray-700">{comp || '—'}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {start || '—'} — {end || '—'}{place ? ` • ${place}` : ''}
                      </div>
                    </div>

                    {bullets.length > 0 && (
                      <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                        {bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Образование — весь список */}
        {education.length > 0 && (
          <div className="mb-5">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen size={18} /> {t('builder.education.title') ?? t('builder.education.addEducation')}
            </h3>
            <ul className="space-y-3">
              {education.map((e, idx) => {
                const inst  = firstNonEmpty(e.institution, e.university, e.school, e.org);
                const level = firstNonEmpty(e.level, e.degree);
                const spec  = firstNonEmpty(e.specialization, e.major, e.faculty, e.program);
                const year  = firstNonEmpty(e.year, e.graduationYear, e.end, e.dateEnd, e.date_to);
                return (
                  <li key={e.id || idx} className="border rounded-lg p-4 bg-white">
                    <div className="font-semibold text-gray-900">{inst || '—'}</div>
                    <div className="text-gray-700">{[level, spec].filter(Boolean).join(' • ') || '—'}</div>
                    <div className="text-sm text-gray-600 mt-1">{fmtDate(year)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Языки — весь список */}
        {languages.length > 0 && (
          <div className="mb-1">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Globe size={18} /> {t('builder.languages.title')}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {languages.map((l, idx) => {
                const name = typeof l === 'string' ? l : firstNonEmpty(l.language, l.name, l.lang);
                const lvl  = typeof l === 'string' ? '' : firstNonEmpty(l.level, l.proficiency);
                return (
                  <li key={l.id || idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                    {name}{lvl ? ` — ${lvl}` : ''}
                  </li>
                );
              })}
            </ul>
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
  // ✅ ВАЖНО: получаем нормализованный язык через language (не lang!)
  const { t, language: lang } = useTranslation();

  const steps = useMemo(() => ([
    t('builder.steps.personal'),
    t('builder.steps.experience'),
    t('builder.steps.education'),
    t('builder.steps.skills'),
    t('builder.steps.languages'),
    t('builder.steps.template'),
  ]), [t]);

  const [currentStep, setCurrentStep] = useState(0);
  const headingRef = useRef(null);

  // Инициализация формы + совместимость driverLicense → driversLicense
  const [form, setForm] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...(profile || {}),
    driversLicense: firstNonEmpty(profile?.driversLicense, profile?.driverLicense),
  }));

  // Синхронизация при изменении внешнего профиля
  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      ...profile,
      driversLicense: firstNonEmpty(profile?.driversLicense, profile?.driverLicense, prev.driversLicense),
    }));
  }, [
    profile?.fullName, profile?.email, profile?.phone, profile?.location, profile?.summary,
    profile?.position, profile?.photo, profile?.languages, profile?.age, profile?.maritalStatus,
    profile?.children, profile?.driversLicense, profile?.driverLicense,
    profile?.experience, profile?.education, profile?.skills,
  ]);

  // Дебаунс-сохранение наверх
  useEffect(() => {
    const tmr = setTimeout(() => setProfile?.(form), 250);
    return () => clearTimeout(tmr);
  }, [form, setProfile]);

  // Фокус на заголовке
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (headingRef.current?.scrollIntoView) {
      headingRef.current.scrollIntoView({ behavior, block: 'start' });
      setTimeout(() => { try { headingRef.current?.focus?.(); } catch {} }, reduceMotion ? 0 : 150);
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, [currentStep]);

  const onChangeField = useCallback(
    (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value })),
    [],
  );

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

  const [aiSkillHints, setAiSkillHints] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRotate, setAiRotate] = useState(0);

  const rebuildHints = useCallback(
    (rotateBump = 0) => {
      setAiLoading(true);
      const r = aiRotate + rotateBump;
      setTimeout(() => {
        const hints = smartSuggestSkills(form, r);
        setAiSkillHints(hints);
        setAiRotate(r);
        setAiLoading(false);
      }, 250);
    },
    [form, aiRotate],
  );

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
    [],
  );
  const canCommitExperience = useCallback(
    (e) => !!e && !isBlank(e.position) && !isBlank(e.company),
    [],
  );

  const commitExperienceDraft = useCallback(() => {
    if (isExperienceDraftFilled(newExperience) && canCommitExperience(newExperience)) {
      setForm((p) => ({ ...p, experience: [...p.experience, { ...newExperience, id: Date.now() }] }));
      setNewExperience(blankExperience);
      return true;
    }
    return false;
  }, [newExperience, isExperienceDraftFilled, canCommitExperience]);

  const addExperience = useCallback(() => { commitExperienceDraft(); }, [commitExperienceDraft]);

  const removeExperience = useCallback((idxOrId) => {
    setForm((p) => ({ ...p, experience: p.experience.filter((e, i) => (e.id ? e.id !== idxOrId : i !== idxOrId)) }));
  }, []);

  /* --- Образование --- */
  const blankEducation = { year: '', institution: '', level: '', specialization: '' };
  const [newEducation, setNewEducation] = useState(blankEducation);

  const isEducationDraftFilled = useCallback(
    (e) => !!e && (!isBlank(e.institution) || !isBlank(e.level) || !isBlank(e.year) || !isBlank(e.specialization)),
    [],
  );
  const canCommitEducation = useCallback(
    (e) => !!e && !isBlank(e.institution) && !isBlank(e.level),
    [],
  );

  const commitEducationDraft = useCallback(() => {
    if (isEducationDraftFilled(newEducation) && canCommitEducation(newEducation)) {
      setForm((p) => ({ ...p, education: [...p.education, { ...newEducation, id: Date.now() }] }));
      setNewEducation(blankEducation);
      return true;
    }
    return false;
  }, [newEducation, isEducationDraftFilled, canCommitEducation]);

  const addEducation = useCallback(() => { commitEducationDraft(); }, [commitEducationDraft]);

  const removeEducation = useCallback((idxOrId) => {
    setForm((p) => ({ ...p, education: p.education.filter((e, i) => (e.id ? e.id !== idxOrId : i !== idxOrId)) }));
  }, []);

  /* --- Языки --- */
  const LANG_LEVELS = useMemo(() => ([
    t('builder.languages.levels.a1'),
    t('builder.languages.levels.a2'),
    t('builder.languages.levels.b1'),
    t('builder.languages.levels.b2'),
    t('builder.languages.levels.c1'),
    t('builder.languages.levels.c2'),
  ]), [t]);

  const blankLanguage = useMemo(
    () => ({ language: '', level: t('builder.languages.levels.b1') }),
    [t]
  );
  const [newLanguage, setNewLanguage] = useState(blankLanguage);

  // если сменили язык интерфейса и поле не заполнено — синхронизируем дефолт уровня
  useEffect(() => {
    if (!newLanguage.language && newLanguage.level !== blankLanguage.level) {
      setNewLanguage(blankLanguage);
    }
  }, [blankLanguage, newLanguage.language, newLanguage.level]);

  const isLanguageDraftFilled = useCallback((l) => !!l && !isBlank(l.language), []);
  const commitLanguageDraft = useCallback(() => {
    if (isLanguageDraftFilled(newLanguage)) {
      setForm((p) => ({ ...p, languages: [...(p.languages || []), { ...newLanguage, id: Date.now() }] }));
      setNewLanguage(blankLanguage);
      return true;
    }
    return false;
  }, [newLanguage, blankLanguage, isLanguageDraftFilled]);

  const addLanguage = useCallback(() => { commitLanguageDraft(); }, [commitLanguageDraft]);

  const removeLanguage = useCallback((idOrIdx) => {
    setForm((p) => ({ ...p, languages: (p.languages || []).filter((l, i) => (l.id ? l.id !== idOrIdx : i !== idOrIdx)) }));
  }, []);

  /* --- Выбор шаблона --- */
  const handleSelectTemplate = useCallback((id) => setSelectedTemplate(id), [setSelectedTemplate]);

  /* --- Имя файла --- */
  const fileName = useMemo(() => {
    const base = (form.fullName || 'resume').toString().trim().replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');
    return `${base || 'resume'}.pdf`;
  }, [form.fullName]);

  /* --- Проверка обязательных --- */
  const requiredMissing = useMemo(() => {
    const miss = [];
    if (!form.fullName?.trim()) miss.push(t('builder.personal.fullName'));
    if (!form.email?.trim()) miss.push('Email');
    if (!form.phone?.trim()) miss.push(t('builder.personal.phone'));
    return miss;
  }, [form.fullName, form.email, form.phone, t]);
  const canDownload = requiredMissing.length === 0;

  const goNext = useCallback(() => {
    if (currentStep === 1) commitExperienceDraft();
    if (currentStep === 2) commitEducationDraft();
    if (currentStep === 4) commitLanguageDraft();
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }, [currentStep, steps.length, commitExperienceDraft, commitEducationDraft, commitLanguageDraft]);

  /* --- Профиль для PDF --- */
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
      age: form.age || '',
      maritalStatus: form.maritalStatus || '',
      children: form.children || '',
      driversLicense: form.driversLicense || '',
      // совместимость вниз по цепочке
      driverLicense: form.driversLicense || form.driverLicense || '',
    };
  }, [
    form, newExperience, isExperienceDraftFilled, canCommitExperience,
    newEducation, isEducationDraftFilled, canCommitEducation,
    newLanguage, isLanguageDraftFilled,
  ]);

  /* --- Генерация PDF (с авто-переводом на язык интерфейса) --- */
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

      // ✅ Автоматический перевод контента профиля в выбранный язык интерфейса
      // Если перевод недоступен — вернём исходный профиль (фолбэк внутри try/catch)
      let profileForPdf = exportProfile;
      try {
        const targetLang = String(lang || 'ru');
        profileForPdf = await translateProfileForLang(exportProfile, targetLang);
      } catch (e) {
        console.warn('translateProfileForLang failed, fallback to original profile', e);
      }

      const [{ pdf }, { default: ResumePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ResumePDF'),
      ]);

      // ✅ Прокидываем язык в PDF, чтобы шаблон выводил нужные лейблы/метки
      const blob = await pdf(
        <ResumePDF
          profile={profileForPdf}
          template={selectedTemplate}
          lang={lang}  // ✅ lang уже 'ru' | 'kk' | 'en'
        />
      ).toBlob();

      if (!blob || blob.size === 0) throw new Error('Empty PDF blob');

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
      const msg = (err && (err.message || err.toString())) || 'Unknown error';
      setDownloadError(`${t('builder.messages.error')}. ${msg}`);
    } finally {
      setDownloading(false);
    }
  }, [
    t, lang, canDownload, downloading, currentStep,
    commitExperienceDraft, commitEducationDraft, commitLanguageDraft,
    buildExportProfile, selectedTemplate, fileName,
  ]);

  /* --- RENDER --- */
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => setCurrentPage('home')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← {t('common.back')}
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <Stepper current={currentStep} steps={steps} />
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
            >
              {steps[currentStep]}
            </h2>
          </div>

          <div className="mb-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-block relative">
                    {form.photo ? (
                      <img
                        src={form.photo}
                        alt={t('builder.preview.photoAlt')}
                        className="w-28 h-28 rounded-full object-cover border-4 border-blue-100"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                        <Upload className="text-gray-400" size={28} />
                      </div>
                    )}

                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow">
                      <Upload size={18} className="text-white" />
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{t('builder.personal.photoHint')}</p>
                </div>

                <Input
                  label={`${t('builder.personal.fullName')} *`}
                  type="text"
                  value={form.fullName}
                  onChange={onChangeField('fullName')}
                  placeholder={t('builder.personal.fullNamePlaceholder')}
                  autoComplete="name"
                />

                <Input
                  label={t('builder.personal.title')}
                  type="text"
                  value={form.position}
                  onChange={onChangeField('position')}
                  placeholder={t('builder.personal.titlePlaceholder')}
                  autoComplete="organization-title"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={`Email *`}
                    type="email"
                    value={form.email}
                    onChange={onChangeField('email')}
                    placeholder={t('builder.personal.emailPlaceholder')}
                    autoComplete="email"
                    inputMode="email"
                  />
                  <Input
                    label={`${t('builder.personal.phone')} *`}
                    type="tel"
                    value={form.phone}
                    onChange={onChangeField('phone')}
                    placeholder={t('builder.personal.phonePlaceholder')}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>

                <Input
                  label={t('builder.personal.location')}
                  type="text"
                  value={form.location}
                  onChange={onChangeField('location')}
                  placeholder={t('builder.personal.locationPlaceholder')}
                  autoComplete="address-level2"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t('builder.personal.age')}
                    type="number"
                    min="14"
                    max="80"
                    value={form.age}
                    onChange={onChangeField('age')}
                    placeholder={t('builder.personal.agePlaceholder')}
                  />
                  <Input
                    label={t('builder.personal.maritalStatus')}
                    type="text"
                    value={form.maritalStatus}
                    onChange={onChangeField('maritalStatus')}
                    placeholder={t('builder.personal.maritalStatusPlaceholder')}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t('builder.personal.children')}
                    type="text"
                    value={form.children}
                    onChange={onChangeField('children')}
                    placeholder={t('builder.personal.childrenPlaceholder')}
                  />
                  <Input
                    label={t('builder.personal.driversLicense')}
                    type="text"
                    value={form.driversLicense}
                    onChange={onChangeField('driversLicense')}
                    placeholder={t('builder.personal.driversLicensePlaceholder')}
                  />
                </div>

                <div>
                  <Textarea
                    label={t('builder.personal.summary')}
                    rows={4}
                    value={form.summary}
                    onChange={onChangeField('summary')}
                    placeholder={t('builder.personal.summaryPlaceholder')}
                  />
                  <div className="mt-2 flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
                    <Sparkles size={16} className="mt-0.5" />
                    <p>{t('builder.personal.hint')}</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                    <Briefcase size={18} /> {t('builder.experience.addExperience')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={`${t('builder.experience.position')} *`}
                      value={newExperience.position}
                      onChange={(e) => setNewExperience((p) => ({ ...p, position: e.target.value }))}
                      placeholder={t('builder.experience.positionPlaceholder')}
                    />
                    <Input
                      label={`${t('builder.experience.company')} *`}
                      value={newExperience.company}
                      onChange={(e) => setNewExperience((p) => ({ ...p, company: e.target.value }))}
                      placeholder={t('builder.experience.companyPlaceholder')}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={`${t('builder.experience.startDate')} *`}
                      type="month"
                      value={newExperience.startDate}
                      onChange={(e) => setNewExperience((p) => ({ ...p, startDate: e.target.value }))}
                    />
                    <Input
                      label={t('builder.experience.endDate')}
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
                    <span className="text-sm">{t('builder.experience.current')}</span>
                  </label>

                  <Textarea
                    label={t('builder.experience.description')}
                    rows={4}
                    value={newExperience.responsibilities}
                    onChange={(e) => setNewExperience((p) => ({ ...p, responsibilities: e.target.value }))}
                    placeholder={'• ' + t('builder.experience.descriptionPlaceholder')}
                  />

                  <button
                    onClick={addExperience}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    {t('builder.experience.addExperience')}
                  </button>
                </div>

                {form.experience.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">{t('builder.experience.label')}</h3>
                    {form.experience.map((exp, idx) => (
                      <div key={exp.id || idx} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h4 className="font-semibold">{exp.position || exp.title}</h4>
                            <p className="text-sm text-gray-600">
                              {exp.company} • {fmtDate(exp.startDate || exp.start || exp.dateStart)} — {exp.currentlyWorking ? t('builder.experience.current') : fmtDate(exp.endDate || exp.end || exp.dateEnd)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeExperience(exp.id ?? idx)}
                            className="text-red-500 hover:text-red-700"
                            aria-label={t('builder.experience.remove')}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {exp.responsibilities && (
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {exp.responsibilities}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
                    <BookOpen size={18} /> {t('builder.education.addEducation')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      label={t('builder.education.degree')}
                      value={newEducation.level}
                      onChange={(e) => setNewEducation((p) => ({ ...p, level: e.target.value }))}
                    >
                      <option value="">{t('common.select') ?? '—'}</option>
                      {[
                        'Среднее','Среднее специальное','Неоконченное высшее','Высшее',
                        'Бакалавр','Магистр','MBA','Кандидат наук','Доктор наук',
                      ].map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </Select>

                    <Input
                      label={t('builder.education.institution')}
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation((p) => ({ ...p, institution: e.target.value }))}
                      placeholder={t('builder.education.institutionPlaceholder')}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={t('builder.education.endDate')}
                      type="number"
                      min="1950"
                      max="2035"
                      value={newEducation.year}
                      onChange={(e) => setNewEducation((p) => ({ ...p, year: e.target.value }))}
                      placeholder="2024"
                    />
                    <Input
                      label={t('builder.education.fieldOfStudy')}
                      value={newEducation.specialization}
                      onChange={(e) => setNewEducation((p) => ({ ...p, specialization: e.target.value }))}
                      placeholder={t('builder.education.fieldOfStudyPlaceholder')}
                    />
                  </div>

                  <button
                    onClick={addEducation}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    {t('builder.education.addEducation')}
                  </button>
                </div>

                {form.education.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">{t('builder.education.title') ?? t('builder.education.addEducation')}</h3>
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
                            aria-label={t('builder.education.remove')}
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

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('builder.skills.addSkill')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      placeholder={t('builder.skills.skillPlaceholder')}
                    />
                    <button
                      onClick={addSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      aria-label={t('builder.skills.addSkill')}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {form.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">{t('builder.skills.yourSkills')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {form.skills.map((skill, idx) => (
                        <span key={`${skill}-${idx}`} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                          {skill}
                          <button
                            onClick={() => removeSkill(idx)}
                            className="hover:text-blue-900"
                            aria-label={`${t('builder.skills.remove')} ${skill}`}
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
                        <h4 className="font-semibold text-purple-900">{t('builder.skills.aiTitle')}</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiLoading ? (
                            <span className="text-sm text-gray-600">{t('builder.skills.aiLoading')}</span>
                          ) : aiSkillHints.length ? (
                            aiSkillHints.map((skill) => (
                              <button
                                key={skill}
                                onClick={() =>
                                  setForm((p) =>
                                    p.skills.includes(skill)
                                      ? p
                                      : { ...p, skills: uniqCaseInsensitive([...p.skills, skill]) }
                                  )
                                }
                                className="px-3 py-1 bg-white border border-purple-300 text-purple-700 rounded-full text-sm hover:bg-purple-100"
                              >
                                + {skill}
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">{t('builder.skills.aiEmpty')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => rebuildHints(1)}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-purple-100 disabled:opacity-50"
                      disabled={aiLoading}
                      title={t('builder.skills.refresh')}
                    >
                      <RefreshCw size={16} className={aiLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Globe size={18} /> {t('builder.languages.title')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={`${t('builder.languages.language')} *`}
                      value={newLanguage.language}
                      onChange={(e) => setNewLanguage((p) => ({ ...p, language: e.target.value }))}
                      placeholder={t('builder.languages.languagePlaceholder')}
                    />
                    <Select
                      label={`${t('builder.languages.level')} *`}
                      value={newLanguage.level}
                      onChange={(e) => setNewLanguage((p) => ({ ...p, level: e.target.value }))}
                    >
                      {LANG_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </Select>
                  </div>

                  <button
                    onClick={addLanguage}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    {t('builder.languages.addLanguage')}
                  </button>
                </div>

                {(form.languages || []).length > 0 && (
                  <div className="space-y-2">
                    {form.languages.map((l, idx) => (
                      <div key={l.id || idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                        <div>
                          <span className="font-medium text-gray-900">{l.language || l.name}</span>
                          <span className="text-gray-500 text-sm ml-2">— {l.level || l.proficiency}</span>
                        </div>
                        <button
                          onClick={() => removeLanguage(l.id ?? idx)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          aria-label={t('builder.languages.remove')}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">{t('builder.templates.title')}</h3>
                  <TemplateSelect selected={selectedTemplate} onSelect={handleSelectTemplate} t={t} />
                </div>

                {/* Полный предпросмотр */}
                <ResumePreview profile={form} t={t} />
              </div>
            )}
          </div>

          <div className="flex justify-between items-start">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('builder.buttons.previous')}
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={goNext}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('builder.buttons.next')}
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
                  {downloading ? t('builder.messages.generating') : t('builder.buttons.downloadPDF')}
                </button>
                {downloadError && <p className="text-sm text-red-600">{downloadError}</p>}
              </div>
            ) : (
              <div className="ml-auto flex flex-col items-end gap-2">
                <button
                  disabled
                  className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-2"
                  title={`${t('builder.messages.fillRequired')}: ${requiredMissing.join(', ')}`}
                >
                  <Download size={20} />
                  {t('builder.messages.fillRequired')}
                </button>
                <p className="text-xs text-gray-500">
                  {t('builder.messages.fillRequired')}: {requiredMissing.join(', ')}
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
