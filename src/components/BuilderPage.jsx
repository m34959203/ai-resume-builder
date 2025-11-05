import React, { useState, useCallback, useMemo, useEffect, useRef, useContext } from 'react';
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
  User,
  Calendar,
  Heart,
  Baby,
  Car,
  AlertCircle,
  CheckCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageContext } from '../context/LanguageContext';
import ResumeLanguageSelector from './ResumeLanguageSelector';
import { translateResumeData } from '../services/translation';

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

/* ---------- Helpers ---------- */
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

/* ---------- Каталог навыков (мультиязычный) ---------- */
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
    'Next.js',
    'Vue.js',
    'Angular',
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
    'Redis',
    'Kafka',
  ],
  mobile: [
    'React Native',
    'Kotlin',
    'Swift',
    'Flutter',
    'MVVM',
    'Firebase',
    'iOS',
    'Android',
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
    'TensorFlow',
  ],
  design: [
    'Figma',
    'Prototyping',
    'User Research',
    'Wireframing',
    'Design Systems',
    'UX Writing',
    'Adobe XD',
    'Sketch',
  ],
  qa: [
    'Manual Testing',
    'Test Automation',
    'Selenium',
    'Cypress',
    'Jest',
    'Playwright',
    'Postman',
  ],
  pm: [
    'Agile',
    'Scrum',
    'Kanban',
    'Jira',
    'Confluence',
    'Stakeholder Management',
    'Product Strategy',
  ],
  marketing: [
    'Digital Marketing',
    'SEO',
    'SMM',
    'Google Analytics',
    'Copywriting',
    'Content Strategy',
  ],
  soft: [
    'Communication',
    'Problem Solving',
    'Teamwork',
    'Time Management',
    'Leadership',
    'Critical Thinking',
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

/* ---------- UI Components ---------- */
const Input = React.memo(({ label, icon: Icon, className = '', error, ...rest }) => (
  <div>
    {label && (
      <label className="block text-sm font-medium mb-2 text-gray-700">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-3 text-gray-400" size={18} />
      )}
      <input
        {...rest}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        } rounded-lg focus:ring-2 focus:border-transparent transition-all ${className}`}
      />
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {error}
      </p>
    )}
  </div>
));

const Select = React.memo(({ label, icon: Icon, className = '', children, error, ...rest }) => (
  <div>
    {label && (
      <label className="block text-sm font-medium mb-2 text-gray-700">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
      )}
      <select
        {...rest}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 border ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        } rounded-lg focus:ring-2 focus:border-transparent transition-all appearance-none ${className}`}
      >
        {children}
      </select>
      <ChevronRight className="absolute right-3 top-3 text-gray-400 pointer-events-none rotate-90" size={18} />
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {error}
      </p>
    )}
  </div>
));

const Textarea = React.memo(({ label, rows = 3, className = '', error, maxLength, showCount, ...rest }) => {
  const [count, setCount] = useState(rest.value?.length || 0);

  useEffect(() => {
    setCount(rest.value?.length || 0);
  }, [rest.value]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-700">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        maxLength={maxLength}
        {...rest}
        onChange={(e) => {
          setCount(e.target.value.length);
          rest.onChange?.(e);
        }}
        className={`w-full px-4 py-2.5 border ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        } rounded-lg focus:ring-2 focus:border-transparent transition-all resize-none ${className}`}
      />
      <div className="flex justify-between items-center mt-1">
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {showCount && maxLength && (
          <p className={`text-xs ml-auto ${count > maxLength * 0.9 ? 'text-amber-600' : 'text-gray-500'}`}>
            {count} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

const Stepper = React.memo(({ current, steps }) => (
  <div className="flex justify-between items-center mb-8">
    {steps.map((step, idx) => (
      <div key={idx} className="flex items-center flex-1">
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
              idx === current
                ? 'bg-blue-600 text-white shadow-lg scale-110'
                : idx < current
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {idx < current ? <Check size={20} /> : idx + 1}
          </div>
          <span className={`text-xs mt-2 font-medium ${idx === current ? 'text-blue-600' : 'text-gray-600'}`}>
            {step}
          </span>
        </div>
        {idx < steps.length - 1 && (
          <div className="flex-1 h-1 mx-2 -mt-8">
            <div className={`h-full transition-all duration-300 ${idx < current ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>
        )}
      </div>
    ))}
  </div>
));

const TemplateSelect = React.memo(function TemplateSelect({ selected, onSelect, templates }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {templates.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selected === t.id 
              ? 'border-blue-600 bg-blue-50 shadow-md' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(t.id)}
          aria-pressed={selected === t.id}
          aria-label={`${t.name}`}
        >
          <div className={`w-full h-32 rounded-lg mb-4 flex items-center justify-center ${
            t.id === 'modern' ? 'bg-gradient-to-br from-blue-100 to-purple-100' : 'bg-gradient-to-br from-green-100 to-teal-100'
          }`}>
            <div className="text-center">
              <div className="text-4xl mb-2">{t.id === 'modern' ? '🎨' : '📄'}</div>
            </div>
          </div>
          <h4 className="font-semibold text-lg mb-2">{t.name}</h4>
          <p className="text-sm text-gray-600 mb-4">{t.description}</p>
          {selected === t.id && (
            <div className="flex items-center gap-2 text-blue-600 animate-fade-in">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">{t.selected}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

const ResumePreview = React.memo(function ResumePreview({ profile, t }) {
  const topSkills = useMemo(() => (profile.skills || []).slice(0, 8), [profile.skills]);
  const expCount = (profile.experience || []).length;
  const eduCount = (profile.education || []).length;
  const langCount = (profile.languages || []).length;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-md">
      <h4 className="font-semibold mb-4 text-green-900 flex items-center gap-2">
        <Sparkles size={18} />
        {t('builder.preview.title')}
      </h4>
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="mb-4 flex gap-4">
          {profile.photo && (
            <img
              src={profile.photo}
              alt={t('builder.preview.photo')}
              className="w-20 h-20 rounded-full object-cover border-2 border-blue-100"
            />
          )}

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {profile.fullName || t('builder.preview.yourName')}
            </h2>

            {profile.position && (
              <p className="text-gray-800 font-medium mt-1">{profile.position}</p>
            )}

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
            <h3 className="font-semibold mb-2 text-gray-900">{t('builder.personalInfo.summary')}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{profile.summary}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <Briefcase size={24} className="mx-auto mb-2 text-blue-600" />
            <div className="font-bold text-xl text-gray-900">{expCount}</div>
            <div className="text-gray-600 text-xs mt-1">{t('builder.preview.workPlaces')}</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <BookOpen size={24} className="mx-auto mb-2 text-purple-600" />
            <div className="font-bold text-xl text-gray-900">{eduCount}</div>
            <div className="text-gray-600 text-xs mt-1">{t('builder.preview.education')}</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
            <Globe size={24} className="mx-auto mb-2 text-indigo-600" />
            <div className="font-bold text-xl text-gray-900">{langCount}</div>
            <div className="text-gray-600 text-xs mt-1">{t('builder.preview.languages')}</div>
          </div>
        </div>

        {topSkills.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-gray-900">{t('builder.skills.title')}</h3>
            <div className="flex flex-wrap gap-2">
              {topSkills.map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
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
  const { t, language: interfaceLanguage } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeLanguage, setResumeLanguage] = useState(interfaceLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const headingRef = useRef(null);

  const steps = useMemo(() => [
    t('builder.steps.personal'),
    t('builder.steps.experience'),
    t('builder.steps.education'),
    t('builder.steps.skills'),
    t('builder.steps.languages'),
    t('builder.steps.template'),
  ], [t]);

  const templates = useMemo(() => [
    { 
      id: 'modern', 
      name: t('builder.template.modern'),
      description: t('builder.template.modernDesc'),
      selected: t('builder.template.selected')
    },
    { 
      id: 'minimal', 
      name: t('builder.template.minimal'),
      description: t('builder.template.minimalDesc'),
      selected: t('builder.template.selected')
    },
  ], [t]);

  const [form, setForm] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...(profile || {}),
  }));

  const [errors, setErrors] = useState({});

  // Синхронизация с profile
  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      ...profile,
    }));
  }, [profile]);

  // Автосохранение
  useEffect(() => {
    const t = setTimeout(() => {
      setProfile?.(form);
    }, 250);
    return () => clearTimeout(t);
  }, [form, setProfile]);

  // Скролл при смене шага
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

  // Смена языка резюме
  const handleResumeLanguageChange = async (newLanguage) => {
    if (newLanguage === resumeLanguage) return;

    setIsTranslating(true);
    try {
      const translatedData = await translateResumeData(form, newLanguage);
      setForm(translatedData);
      setResumeLanguage(newLanguage);
    } catch (error) {
      console.error('Translation error:', error);
      alert(t('errors.somethingWrong'));
    } finally {
      setIsTranslating(false);
    }
  };

  const onChangeField = useCallback(
    (field) => (e) => {
      setForm((p) => ({
        ...p,
        [field]: e.target.value,
      }));
      // Очистка ошибки при изменении
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert(t('errors.fileTooLarge'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (dataUrl) {
        setForm((p) => ({ ...p, photo: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  }, [t]);

  /* --- Навыки --- */
  const [newSkill, setNewSkill] = useState('');
  const addSkill = useCallback(() => {
    const s = newSkill.trim();
    if (!s) return;
    if (form.skills.includes(s)) {
      setNewSkill('');
      return;
    }
    setForm((p) => ({
      ...p,
      skills: [...p.skills, s],
    }));
    setNewSkill('');
  }, [newSkill, form.skills]);

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
  }, [currentStep, form.skills.length, form.position, form.summary]);

  /* --- Опыт --- */
  const blankExperience = useMemo(() => ({
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    position: '',
    company: '',
    responsibilities: '',
  }), []);

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
  }, [newExperience, isExperienceDraftFilled, canCommitExperience, blankExperience]);

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
  const blankEducation = useMemo(() => ({ 
    year: '', 
    institution: '', 
    level: '', 
    specialization: '' 
  }), []);

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
  }, [newEducation, isEducationDraftFilled, canCommitEducation, blankEducation]);

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
  const blankLanguage = useMemo(() => ({ 
    language: '', 
    level: t('builder.languages.levels.intermediate')
  }), [t]);

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
  }, [newLanguage, isLanguageDraftFilled, blankLanguage]);

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
    [setSelectedTemplate],
  );

  const fileName = useMemo(() => {
    const base = (form.fullName || 'resume')
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]+/g, '');
    return `${base || 'resume'}_${resumeLanguage}.pdf`;
  }, [form.fullName, resumeLanguage]);

  // Валидация
  const validateStep = useCallback((step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!form.fullName?.trim()) newErrors.fullName = t('errors.required');
      if (!form.email?.trim()) {
        newErrors.email = t('errors.required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        newErrors.email = t('errors.invalidEmail');
      }
      if (!form.phone?.trim()) newErrors.phone = t('errors.required');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, t]);

  const requiredMissing = useMemo(() => {
    const miss = [];
    if (!form.fullName?.trim()) miss.push(t('builder.personalInfo.fullName'));
    if (!form.email?.trim()) miss.push(t('builder.personalInfo.email'));
    if (!form.phone?.trim()) miss.push(t('builder.personalInfo.phone'));
    return miss;
  }, [form.fullName, form.email, form.phone, t]);

  const canDownload = requiredMissing.length === 0;

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    
    if (currentStep === 1) commitExperienceDraft();
    if (currentStep === 2) commitEducationDraft();
    if (currentStep === 4) commitLanguageDraft();
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }, [currentStep, validateStep, commitExperienceDraft, commitEducationDraft, commitLanguageDraft, steps.length]);

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

      const blob = await pdf(
        <ResumePDF 
          profile={exportProfile} 
          template={selectedTemplate}
          language={resumeLanguage}
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
      const msg = (err && (err.message || err.toString())) || t('errors.unknown');
      setDownloadError(`${t('builder.downloadError')} ${msg}`);
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
    resumeLanguage,
    fileName,
    t,
  ]);

  /* --- RENDER --- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => setCurrentPage('home')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
        >
          <ChevronLeft size={20} />
          {t('common.back')}
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Выбор языка резюме */}
          <ResumeLanguageSelector
            resumeLanguage={resumeLanguage}
            onLanguageChange={handleResumeLanguageChange}
            disabled={isTranslating}
          />

          {isTranslating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <Loader className="animate-spin text-blue-600" size={20} />
              <span className="text-blue-700 font-medium">{t('builder.translating')}</span>
            </div>
          )}

          <div className="mb-8">
            <Stepper current={currentStep} steps={steps} />
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              {steps[currentStep]}
            </h2>
          </div>

          <div className="mb-8">
            {/* ШАГ 0: Личная информация */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-block relative">
                    {form.photo ? (
                      <img
                        src={form.photo}
                        alt={t('builder.personal.photo')}
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-4 border-gray-200">
                        <User className="text-gray-400" size={48} />
                      </div>
                    )}

                    <label className="absolute bottom-0 right-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow-lg hover:scale-110 transform">
                      <Upload size={20} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">{t('builder.personal.photoHint')}</p>
                </div>

                <Input
                  label={t('builder.personalInfo.fullName') + ' *'}
                  icon={User}
                  type="text"
                  value={form.fullName}
                  onChange={onChangeField('fullName')}
                  placeholder={t('builder.personalInfo.fullNamePlaceholder')}
                  autoComplete="name"
                  error={errors.fullName}
                />

                <Input
                  label={t('builder.personalInfo.position')}
                  icon={Briefcase}
                  type="text"
                  value={form.position}
                  onChange={onChangeField('position')}
                  placeholder={t('builder.personalInfo.positionPlaceholder')}
                  autoComplete="organization-title"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t('builder.personalInfo.email') + ' *'}
                    icon={Mail}
                    type="email"
                    value={form.email}
                    onChange={onChangeField('email')}
                    placeholder={t('builder.personalInfo.emailPlaceholder')}
                    autoComplete="email"
                    inputMode="email"
                    error={errors.email}
                  />
                  <Input
                    label={t('builder.personalInfo.phone') + ' *'}
                    icon={Phone}
                    type="tel"
                    value={form.phone}
                    onChange={onChangeField('phone')}
                    placeholder={t('builder.personalInfo.phonePlaceholder')}
                    autoComplete="tel"
                    inputMode="tel"
                    error={errors.phone}
                  />
                </div>

                <Input
                  label={t('builder.personalInfo.location')}
                  icon={MapPin}
                  type="text"
                  value={form.location}
                  onChange={onChangeField('location')}
                  placeholder={t('builder.personalInfo.locationPlaceholder')}
                  autoComplete="address-level2"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t('builder.personal.age')}
                    icon={Calendar}
                    type="number"
                    min="14"
                    max="80"
                    value={form.age}
                    onChange={onChangeField('age')}
                    placeholder="30"
                  />
                  <Input
                    label={t('builder.personal.maritalStatus')}
                    icon={Heart}
                    type="text"
                    value={form.maritalStatus}
                    onChange={onChangeField('maritalStatus')}
                    placeholder={t('builder.personal.maritalStatusPlaceholder')}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t('builder.personal.children')}
                    icon={Baby}
                    type="text"
                    value={form.children}
                    onChange={onChangeField('children')}
                    placeholder={t('builder.personal.childrenPlaceholder')}
                  />
                  <Input
                    label={t('builder.personal.driversLicense')}
                    icon={Car}
                    type="text"
                    value={form.driversLicense}
                    onChange={onChangeField('driversLicense')}
                    placeholder={t('builder.personal.driversLicensePlaceholder')}
                  />
                </div>

                <div>
                  <Textarea
                    label={t('builder.personalInfo.summary')}
                    rows={5}
                    value={form.summary}
                    onChange={onChangeField('summary')}
                    placeholder={t('builder.personalInfo.summaryPlaceholder')}
                    maxLength={500}
                    showCount
                  />
                  <div className="mt-3 flex items-start gap-3 text-sm text-blue-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <Sparkles size={18} className="mt-0.5 flex-shrink-0" />
                    <p>{t('builder.personalInfo.summaryHint')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ШАГ 1: Опыт работы */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-lg">
                    <Briefcase size={20} />
                    {t('builder.experience.add')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={t('builder.experience.position') + ' *'}
                      value={newExperience.position}
                      onChange={(e) =>
                        setNewExperience((p) => ({ ...p, position: e.target.value }))
                      }
                      placeholder={t('builder.experience.positionPlaceholder')}
                    />
                    <Input
                      label={t('builder.experience.company') + ' *'}
                      value={newExperience.company}
                      onChange={(e) =>
                        setNewExperience((p) => ({ ...p, company: e.target.value }))
                      }
                      placeholder={t('builder.experience.companyPlaceholder')}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={t('builder.experience.startDate') + ' *'}
                      type="month"
                      value={newExperience.startDate}
                      onChange={(e) =>
                        setNewExperience((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                    <Input
                      label={t('builder.experience.endDate')}
                      type="month"
                      value={newExperience.endDate}
                      onChange={(e) =>
                        setNewExperience((p) => ({ ...p, endDate: e.target.value }))
                      }
                      disabled={newExperience.currentlyWorking}
                      className={newExperience.currentlyWorking ? 'bg-gray-100 cursor-not-allowed' : ''}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
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
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{t('builder.experience.current')}</span>
                  </label>

                  <Textarea
                    label={t('builder.experience.responsibilities')}
                    rows={5}
                    value={newExperience.responsibilities}
                    onChange={(e) =>
                      setNewExperience((p) => ({ ...p, responsibilities: e.target.value }))
                    }
                    placeholder={t('builder.experience.responsibilitiesPlaceholder')}
                    maxLength={1000}
                    showCount
                  />

                  <button
                    onClick={addExperience}
                    disabled={!canCommitExperience(newExperience)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all"
                  >
                    <Plus size={18} />
                    {t('builder.experience.addButton')}
                  </button>
                </div>

                {form.experience.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-600" />
                      {t('builder.experience.added')}:
                    </h3>
                    {form.experience.map((exp, idx) => (
                      <div key={exp.id || idx} className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900">{exp.position}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{exp.company}</span> • {fmtMonth(exp.startDate)} —{' '}
                              {exp.currentlyWorking ? t('builder.experience.present') : fmtMonth(exp.endDate)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeExperience(exp.id ?? idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            aria-label={t('common.delete')}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {exp.responsibilities && (
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mt-3 pl-4 border-l-2 border-blue-200">
                            {exp.responsibilities}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ШАГ 2: Образование */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2 text-lg">
                    <BookOpen size={20} />
                    {t('builder.education.add')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      label={t('builder.education.degree') + ' *'}
                      value={newEducation.level}
                      onChange={(e) =>
                        setNewEducation((p) => ({ ...p, level: e.target.value }))
                      }
                    >
                      <option value="">{t('common.select')}</option>
                      {[
                        t('builder.education.levels.secondary'),
                        t('builder.education.levels.vocational'),
                        t('builder.education.levels.incomplete'),
                        t('builder.education.levels.bachelor'),
                        t('builder.education.levels.master'),
                        t('builder.education.levels.mba'),
                        t('builder.education.levels.phd'),
                      ].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label={t('builder.education.institution') + ' *'}
                      value={newEducation.institution}
                      onChange={(e) =>
                        setNewEducation((p) => ({ ...p, institution: e.target.value }))
                      }
                      placeholder={t('builder.education.institutionPlaceholder')}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label={t('builder.education.graduationYear')}
                      type="number"
                      min="1950"
                      max="2035"
                      value={newEducation.year}
                      onChange={(e) =>
                        setNewEducation((p) => ({ ...p, year: e.target.value }))
                      }
                      placeholder="2024"
                    />
                    <Input
                      label={t('builder.education.field')}
                      value={newEducation.specialization}
                      onChange={(e) =>
                        setNewEducation((p) => ({ ...p, specialization: e.target.value }))
                      }
                      placeholder={t('builder.education.fieldPlaceholder')}
                    />
                  </div>

                  <button
                    onClick={addEducation}
                    disabled={!canCommitEducation(newEducation)}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all"
                  >
                    <Plus size={18} />
                    {t('builder.education.addButton')}
                  </button>
                </div>

                {form.education.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-600" />
                      {t('builder.education.added')}:
                    </h3>
                    {form.education.map((edu, idx) => (
                      <div key={edu.id || idx} className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900">{edu.level}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{edu.institution}</span>
                              {edu.year && <span> • {edu.year}</span>}
                            </p>
                            {edu.specialization && (
                              <p className="text-sm text-gray-700 mt-2">{edu.specialization}</p>
                            )}
                          </div>
                          <button
                            onClick={() => removeEducation(edu.id ?? idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            aria-label={t('common.delete')}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ШАГ 3: Навыки */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    {t('builder.skills.add')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={t('builder.skills.placeholder')}
                    />
                    <button
                      onClick={addSkill}
                      disabled={!newSkill.trim()}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {form.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-600" />
                      {t('builder.skills.your')}:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {form.skills.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2 font-medium hover:bg-blue-200 transition-colors"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(idx)}
                            className="hover:text-blue-900 transition-colors"
                            aria-label={`${t('common.delete')} ${skill}`}
                          >
                            <X size={16} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="text-purple-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-purple-900 mb-3">
                          {t('builder.skills.aiRecommends')}:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {aiLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Loader className="animate-spin" size={16} />
                              {t('builder.skills.aiLoading')}
                            </div>
                          ) : aiSkillHints.length ? (
                            aiSkillHints.map((skill) => (
                              <button
                                key={skill}
                                onClick={() =>
                                  setForm((p) =>
                                    p.skills.includes(skill)
                                      ? p
                                      : {
                                          ...p,
                                          skills: uniqCaseInsensitive([...p.skills, skill]),
                                        }
                                  )
                                }
                                className="px-3 py-1.5 bg-white border-2 border-purple-300 text-purple-700 rounded-full text-sm hover:bg-purple-100 font-medium transition-all"
                              >
                                + {skill}
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">
                              {t('builder.skills.noSuggestions')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => rebuildHints(1)}
                      className="px-3 py-2 text-sm border-2 border-purple-300 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-all"
                      disabled={aiLoading}
                      title={t('builder.skills.refresh')}
                    >
                      <RefreshCw size={18} className={aiLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ШАГ 4: Языки */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2 text-lg">
                    <Globe size={20} />
                    {t('builder.languages.add')}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Input
                      label={t('builder.languages.languageName') + ' *'}
                      value={newLanguage.language}
                      onChange={(e) =>
                        setNewLanguage((p) => ({ ...p, language: e.target.value }))
                      }
                      placeholder={t('builder.languages.languagePlaceholder')}
                    />
                    <Select
                      label={t('builder.languages.proficiency') + ' *'}
                      value={newLanguage.level}
                      onChange={(e) =>
                        setNewLanguage((p) => ({ ...p, level: e.target.value }))
                      }
                    >
                      {[
                        t('builder.languages.levels.basic'),
                        t('builder.languages.levels.intermediate'),
                        t('builder.languages.levels.advanced'),
                        t('builder.languages.levels.fluent'),
                        t('builder.languages.levels.native'),
                      ].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <button
                    onClick={addLanguage}
                    disabled={!isLanguageDraftFilled(newLanguage)}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all"
                  >
                    <Plus size={18} />
                    {t('builder.languages.addButton')}
                  </button>
                </div>

                {(form.languages || []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-600" />
                      {t('builder.languages.added')}:
                    </h3>
                    {form.languages.map((l, idx) => (
                      <div
                        key={l.id || idx}
                        className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow"
                      >
                        <div>
                          <span className="font-semibold text-gray-900 text-lg">{l.language}</span>
                          <span className="text-gray-600 text-sm ml-3">— {l.level}</span>
                        </div>
                        <button
                          onClick={() => removeLanguage(l.id ?? idx)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          aria-label={`${t('common.delete')} ${l.language}`}
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ШАГ 5: Шаблон */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-6 text-xl">{t('builder.template.choose')}:</h3>
                  <TemplateSelect selected={selectedTemplate} onSelect={handleSelectTemplate} templates={templates} />
                </div>

                <ResumePreview profile={form} t={t} />
              </div>
            )}
          </div>

          {/* Навигация */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-all flex items-center gap-2"
              >
                <ChevronLeft size={20} />
                {t('common.back')}
              </button>
            ) : (
              <div />
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={goNext}
                className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {t('common.next')}
                <ChevronRight size={20} />
              </button>
            ) : canDownload ? (
              <div className="ml-auto flex flex-col items-end gap-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={`px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all shadow-md hover:shadow-lg ${
                    downloading
                      ? 'bg-green-500 text-white opacity-80 cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {downloading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      {t('builder.downloading')}
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      {t('builder.actions.downloadPDF')}
                    </>
                  )}
                </button>
                {downloadError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {downloadError}
                  </p>
                )}
              </div>
            ) : (
              <div className="ml-auto flex flex-col items-end gap-2">
                <button
                  disabled
                  className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-2 font-medium"
                  title={`${t('builder.fillRequired')}: ${requiredMissing.join(', ')}`}
                >
                  <AlertCircle size={20} />
                  {t('builder.fillRequired')}
                </button>
                <p className="text-xs text-gray-500">
                  {t('builder.required')}: {requiredMissing.join(', ')}
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