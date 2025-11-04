// src/components/BuilderPage.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Plus,
  X,
  Check,
  Sparkles,
  Download,
  Briefcase,
  BookOpen,
  Upload,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

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
  driversLicense: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
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

/* ---------- мини-ИИ навыков ---------- */
const SKILL_CATALOG = {
  frontend: [
    'React',
    'JavaScript',
    'TypeScript',
    'HTML5',
    'CSS3',
    'Redux',
    'REST API',
    'Git',
    'Vite',
    'Webpack',
    'Jest',
    'RTL',
  ],
  backend: [
    'Node.js',
    'Express',
    'NestJS',
    'PostgreSQL',
    'MongoDB',
    'Docker',
    'GraphQL',
    'REST API',
    'CI/CD',
  ],
  mobile: [
    'React Native',
    'Kotlin',
    'Swift',
    'Flutter',
    'MVVM',
    'Firebase',
  ],
  data: [
    'Python',
    'Pandas',
    'NumPy',
    'SQL',
    'ETL',
    'Power BI',
    'Tableau',
    'Excel',
    'scikit-learn',
  ],
  design: [
    'Figma',
    'Prototyping',
    'User Research',
    'Wireframing',
    'Design Systems',
    'UX Writing',
  ],
  qa: [
    'Manual Testing',
    'Test Automation',
    'Selenium',
    'Cypress',
    'Jest',
    'Playwright',
  ],
  pm: [
    'Agile',
    'Scrum',
    'Kanban',
    'Jira',
    'Confluence',
    'Stakeholder Management',
  ],
  marketing: [
    'Digital Marketing',
    'SEO',
    'SMM',
    'Google Analytics',
    'Copywriting',
  ],
  soft: [
    'Communication',
    'Problem Solving',
    'Teamwork',
    'Time Management',
  ],
};

function detectTracks(profile) {
  const bag = [
    profile?.position,
    profile?.summary,
    ...(profile?.skills || []),
    ...(profile?.experience || []).map((e) => e?.position),
    ...(profile?.experience || []).map((e) => e?.responsibilities),
    ...(profile?.education || []).map((e) => e?.specialization || e?.level),
  ]
    .map(norm)
    .join(' \n ');

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
    const skills = (profile?.skills || []).map(norm);
    if (skills.some((s) => ['react', 'javascript', 'typescript', 'html', 'css'].some((k) => s.includes(k)))) {
      tracks.add('frontend');
    }
    if (skills.some((s) => ['python', 'sql'].some((k) => s.includes(k)))) {
      tracks.add('data');
    }
    if (skills.some((s) => ['figma'].some((k) => s.includes(k)))) {
      tracks.add('design');
    }
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

/* Только 2 шаблона */
const TemplateSelect = React.memo(function TemplateSelect({ selected, onSelect, templates }) {
  const { t } = useTranslation();
  
  const COLOR_BG = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {templates.map((tmpl) => (
        <div
          key={tmpl.id}
          onClick={() => onSelect(tmpl.id)}
          className={`border-2 rounded-lg p-6 cursor-pointer transition ${
            selected === tmpl.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(tmpl.id)}
          aria-pressed={selected === tmpl.id}
          aria-label={`${t('builder.template.select')} ${tmpl.name}`}
        >
          <div className={`${COLOR_BG[tmpl.color]} w-12 h-12 rounded-lg mb-3`} />
          <h4 className="font-semibold mb-1">{tmpl.name}</h4>
          <p className="text-sm text-gray-600">{t('builder.template.description')}</p>
          {selected === tmpl.id && (
            <div className="mt-3 flex items-center gap-2 text-blue-600">
              <Check size={16} />
              <span className="text-sm font-medium">{t('builder.template.selected')}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

const ResumePreview = React.memo(function ResumePreview({ profile }) {
  const { t } = useTranslation();
  const topSkills = useMemo(() => (profile.skills || []).slice(0, 8), [profile.skills]);
  const expCount = (profile.experience || []).length;
  const eduCount = (profile.education || []).length;
  const langCount = (profile.languages || []).length;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h4 className="font-semibold mb-3 text-green-900">{t('builder.preview.title')}</h4>
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="mb-4 flex gap-4">
          {profile.photo && (
            <img
              src={profile.photo}
              alt={t('builder.preview.photo')}
              className="w-16 h-16 rounded-full object-cover border"
            />
          )}

          <div>
            <h2 className="text-2xl font-bold">{profile.fullName || t('builder.preview.yourName')}</h2>

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

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
              {profile.age && <span>{t('builder.personal.age')}: {profile.age}</span>}
              {profile.maritalStatus && <span>{t('builder.personal.maritalStatus')}: {profile.maritalStatus}</span>}
              {profile.children && <span>{t('builder.personal.children')}: {profile.children}</span>}
              {profile.driversLicense && <span>{t('builder.personal.driversLicense')}: {profile.driversLicense}</span>}
            </div>
          </div>
        </div>

        {profile.summary && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">{t('builder.personal.summary')}</h3>
            <p className="text-sm text-gray-700">{profile.summary}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Briefcase size={20} className="mx-auto mb-1 text-blue-600" />
            <div className="font-semibold text-gray-900">{expCount}</div>
            <div className="text-gray-600">{t('builder.preview.jobsCount')}</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <BookOpen size={20} className="mx-auto mb-1 text-purple-600" />
            <div className="font-semibold text-gray-900">{eduCount}</div>
            <div className="text-gray-600">{t('builder.preview.educationCount')}</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <Globe size={20} className="mx-auto mb-1 text-indigo-600" />
            <div className="font-semibold text-gray-900">{langCount}</div>
            <div className="text-gray-600">{t('builder.preview.languagesCount')}</div>
          </div>
        </div>

        {topSkills.length > 0 && (
          <div className="mb-0">
            <h3 className="font-semibold mb-2">{t('builder.steps.skills')}</h3>
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
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const headingRef = useRef(null);

  // Динамически формируем шаги на основе переводов
  const STEPS = useMemo(() => [
    t('builder.steps.personal'),
    t('builder.steps.experience'),
    t('builder.steps.education'),
    t('builder.steps.skills'),
    t('builder.steps.languages'),
    t('builder.steps.template'),
  ], [t]);

  // Шаблоны с переводами
  const TEMPLATES = useMemo(() => [
    { id: 'modern', name: t('builder.templates.modern'), color: 'blue' },
    { id: 'minimal', name: t('builder.templates.minimal'), color: 'green' },
  ], [t]);

  const [form, setForm] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...(profile || {}),
  }));

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      ...profile,
    }));
  }, [
    profile?.fullName,
    profile?.email,
    profile?.phone,
    profile?.location,
    profile?.summary,
    profile?.position,
    profile?.photo,
    profile?.languages,
    profile?.age,
    profile?.maritalStatus,
    profile?.children,
    profile?.driversLicense,
    profile?.experience,
    profile?.education,
    profile?.skills,
  ]);

  useEffect(() => {
    const tm = setTimeout(() => {
      setProfile?.(form);
    }, 250);
    return () => clearTimeout(tm);
  }, [form, setProfile]);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const behavior = reduceMotion ? 'auto' : 'smooth';

    if (headingRef.current?.scrollIntoView) {
      headingRef.current.scrollIntoView({ behavior, block: 'start' });
      setTimeout(() => {
        try {
          headingRef.current?.focus?.();
        } catch {}
      }, reduceMotion ? 0 : 150);
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, [currentStep]);

  const onChangeField = useCallback(
    (field) => (e) =>
      setForm((p) => ({
        ...p,
        [field]: e.target.value,
      })),
    [],
  );

  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (dataUrl) {
        setForm((p) => ({
          ...p,
          photo: dataUrl,
        }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  /* --- Навыки --- */
  const [newSkill, setNewSkill] = useState('');
  const addSkill = useCallback(() => {
    const s = newSkill.trim();
    if (!s) return;
    setForm((p) =>
      p.skills.includes(s)
        ? p
        : {
            ...p,
            skills: [...p.skills, s],
          },
    );
    setNewSkill('');
  }, [newSkill]);
  const removeSkill = useCallback((idx) => {
    setForm((p) => ({
      ...p,
      skills: p.skills.filter((_, i) => i !== idx),
    }));
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
      (!isBlank(e.position) ||
        !isBlank(e.company) ||
        !isBlank(e.startDate) ||
        !isBlank(e.endDate) ||
        !isBlank(e.responsibilities)),
    [],
  );
  const canCommitExperience = useCallback(
    (e) => !!e && !isBlank(e.position) && !isBlank(e.company),
    [],
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
    (e) =>
      !!e &&
      (!isBlank(e.institution) ||
        !isBlank(e.level) ||
        !isBlank(e.year) ||
        !isBlank(e.specialization)),
    [],
  );
  const canCommitEducation = useCallback(
    (e) => !!e && !isBlank(e.institution) && !isBlank(e.level),
    [],
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

  /* --- Шаблон выбора --- */
  const handleSelectTemplate = useCallback(
    (id) => setSelectedTemplate(id),
    [setSelectedTemplate],
  );

  /* --- Имя файла --- */
  const fileName = useMemo(() => {
    const base = (form.fullName || 'resume')
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]+/g, '');
    return `${base || 'resume'}.pdf`;
  }, [form.fullName]);

  /* --- Проверка обязательных --- */
  const requiredMissing = useMemo(() => {
    const miss = [];
    if (!form.fullName?.trim()) miss.push(t('builder.personal.fullName'));
    if (!form.email?.trim()) miss.push(t('builder.personal.email'));
    if (!form.phone?.trim()) miss.push(t('builder.personal.phone'));
    return miss;
  }, [form.fullName, form.email, form.phone, t]);
  const canDownload = requiredMissing.length === 0;

  const goNext = useCallback(() => {
    if (currentStep === 1) commitExperienceDraft();
    if (currentStep === 2) commitEducationDraft();
    if (currentStep === 4) commitLanguageDraft();
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [currentStep, commitExperienceDraft, commitEducationDraft, commitLanguageDraft, STEPS.length]);

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
    };
  }, [
    form,
    newExperience,
    isExperienceDraftFilled,
    canCommitExperience,
    newEducation,
    isEducationDraftFilled,
    canCommitEducation,
    newLanguage,
    isLanguageDraftFilled,
  ]);

  /* --- Генерация PDF --- */
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
      if (!blob || blob.size === 0) throw new Error(t('builder.pdf.emptyError'));

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
      const msg = (err && (err.message || err.toString())) || t('builder.pdf.unknownError');
      setDownloadError(`${t('builder.pdf.generateError')} ${msg}`);
    } finally {
      setDownloading(false);
    }
  }, [
    canDownload,
    downloading,
    currentStep,
    commitExperienceDraft,
    commitEducationDraft,
    commitLanguageDraft,
    buildExportProfile,
    selectedTemplate,
    fileName,
    t,
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
            <Stepper current={currentStep} steps={STEPS} />
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
            >
              {STEPS[currentStep]}
            </h2>
          </div>

          <div className="mb-8">
            {/* ШАГ 0: Личная информация */}
            {currentStep === 0 && (
              <PersonalInfoStep
                form={form}
                onChangeField={onChangeField}
                handlePhotoUpload={handlePhotoUpload}
                t={t}
              />
            )}

            {/* ШАГ 1: Опыт работы */}
            {currentStep === 1 && (
              <ExperienceStep
                form={form}
                newExperience={newExperience}
                setNewExperience={setNewExperience}
                addExperience={addExperience}
                removeExperience={removeExperience}
                t={t}
              />
            )}

            {/* ШАГ 2: Образование */}
            {currentStep === 2 && (
              <EducationStep
                form={form}
                newEducation={newEducation}
                setNewEducation={setNewEducation}
                addEducation={addEducation}
                removeEducation={removeEducation}
                t={t}
              />
            )}

            {/* ШАГ 3: Навыки */}
            {currentStep === 3 && (
              <SkillsStep
                form={form}
                newSkill={newSkill}
                setNewSkill={setNewSkill}
                addSkill={addSkill}
                removeSkill={removeSkill}
                aiSkillHints={aiSkillHints}
                aiLoading={aiLoading}
                rebuildHints={rebuildHints}
                setForm={setForm}
                uniqCaseInsensitive={uniqCaseInsensitive}
                t={t}
              />
            )}

            {/* ШАГ 4: Языки */}
            {currentStep === 4 && (
              <LanguagesStep
                form={form}
                newLanguage={newLanguage}
                setNewLanguage={setNewLanguage}
                addLanguage={addLanguage}
                removeLanguage={removeLanguage}
                t={t}
              />
            )}

            {/* ШАГ 5: Шаблон */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">{t('builder.template.title')}</h3>
                  <TemplateSelect
                    selected={selectedTemplate}
                    onSelect={handleSelectTemplate}
                    templates={TEMPLATES}
                  />
                </div>
                <ResumePreview profile={form} />
              </div>
            )}
          </div>

          {/* Кнопки навигации */}
          <div className="flex justify-between items-start">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('builder.buttons.previous')}
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
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
                    downloading
                      ? 'bg-green-500 text-white opacity-80 cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Download size={20} />
                  {downloading ? t('builder.buttons.downloadingPDF') : t('builder.buttons.downloadPDF')}
                </button>
                {downloadError && <p className="text-sm text-red-600">{downloadError}</p>}
              </div>
            ) : (
              <div className="ml-auto flex flex-col items-end gap-2">
                <button
                  disabled
                  className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-2"
                  title={`${t('builder.buttons.fillRequired')}: ${requiredMissing.join(', ')}`}
                >
                  <Download size={20} />
                  {t('builder.buttons.fillRequired')}
                </button>
                <p className="text-xs text-gray-500">
                  {t('builder.messages.requiredFields')} {requiredMissing.join(', ')}
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