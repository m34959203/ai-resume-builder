// src/components/BuilderPage.jsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useId,
} from 'react';
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

// ВАЖНО: не тянем @react-pdf/renderer заранее
// import ResumePDF from './ResumePDF';

/* ---------- Константы состояния по умолчанию ---------- */
const DEFAULT_PROFILE = {
  fullName: '',
  position: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  photo: null,
  photoUrl: null, // на случай внешнего URL
  experience: [],
  education: [],
  skills: [],
  languages: [],
};

const STEPS = [
  'Личная информация',
  'Опыт работы',
  'Образование',
  'Навыки',
  'Языки',
  'Шаблон',
];

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

/* ---------- Утилиты ---------- */
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

/* ---------- Каталог навыков (оффлайн "ИИ") ---------- */
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

/* Определяем направления (треки) на основе профиля */
function detectTracks(profile) {
  const bag = [
    profile?.position,
    profile?.summary,
    ...(profile?.skills || []),
    ...(profile?.experience || []).map((e) => e?.position),
    ...(profile?.experience || []).map((e) => e?.responsibilities),
    ...(profile?.education || []).map(
      (e) => e?.specialization || e?.level || e?.institution,
    ),
  ]
    .map(norm)
    .join(' \n ');

  const has = (...keys) => keys.some((k) => bag.includes(k));

  const tracks = new Set();
  if (has('frontend', 'фронтенд', 'react', 'javascript', 'typescript', 'веб'))
    tracks.add('frontend');
  if (has('backend', 'бекенд', 'node', 'nestjs', 'express'))
    tracks.add('backend');
  if (has('mobile', 'android', 'ios', 'react native', 'kotlin', 'swift', 'flutter'))
    tracks.add('mobile');
  if (
    has(
      'data',
      'аналит',
      'python',
      'sql',
      'power bi',
      'tableau',
      'ml',
      'машин',
    )
  )
    tracks.add('data');
  if (has('дизайн', 'ui', 'ux', 'figma', 'product design', 'интерфейс'))
    tracks.add('design');
  if (has('qa', 'тест', 'quality')) tracks.add('qa');
  if (has('pm', 'project', 'менедж', 'scrum', 'kanban')) tracks.add('pm');
  if (has('market', 'маркет', 'smm', 'seo')) tracks.add('marketing');

  // если треков не нашли, пробуем по навыкам
  if (tracks.size === 0) {
    const skills = (profile?.skills || []).map(norm);
    if (
      skills.some((s) =>
        ['react', 'javascript', 'typescript', 'html', 'css'].some((k) =>
          s.includes(k),
        ),
      )
    )
      tracks.add('frontend');
    if (
      skills.some((s) => ['python', 'sql'].some((k) => s.includes(k)))
    )
      tracks.add('data');
    if (skills.some((s) => ['figma'].some((k) => s.includes(k))))
      tracks.add('design');
  }

  // супер-фолбэк: общее
  if (tracks.size === 0) {
    if (!isBlank(profile?.position) || !isBlank(profile?.summary)) {
      // кандидат без жёсткой профессии → менеджмент/софт/маркетинг
      tracks.add('pm');
      tracks.add('soft');
      tracks.add('marketing');
    } else {
      tracks.add('soft');
    }
  }
  return [...tracks];
}

/* Генерация локальных рекомендаций навыков */
function smartSuggestSkills(profile, rotate = 0) {
  const tracks = detectTracks(profile);
  const existing = new Set((profile?.skills || []).map(norm));

  let candidates = tracks.flatMap((t) => SKILL_CATALOG[t] || []);
  candidates = candidates.concat(SKILL_CATALOG.soft);

  // Фильтрация дублей с учётом регистра
  candidates = uniqCaseInsensitive(
    candidates.filter((s) => !existing.has(norm(s))),
  );

  // Лёгкий сдвиг, чтобы "Обновить" меняло порядок
  if (candidates.length && rotate) {
    const k = rotate % candidates.length;
    candidates = candidates.slice(k).concat(candidates.slice(0, k));
  }

  return candidates.slice(0, 8);
}

/* ---------- Небольшие UI-компоненты ---------- */
const Input = React.memo(({ label, className = '', ...rest }) => (
  <div>
    {label && (
      <label className="block text-sm font-medium mb-2 text-gray-900">
        {label}
      </label>
    )}
    <input
      {...rest}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${className}`}
    />
  </div>
));

const Select = React.memo(({ label, className = '', children, ...rest }) => (
  <div>
    {label && (
      <label className="block text-sm font-medium mb-2 text-gray-900">
        {label}
      </label>
    )}
    <select
      {...rest}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${className}`}
    >
      {children}
    </select>
  </div>
));

const Textarea = React.memo(
  ({ label, rows = 3, className = '', ...rest }) => (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-900">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        {...rest}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${className}`}
      />
    </div>
  ),
);

const Stepper = React.memo(({ current }) => (
  <div className="flex justify-between items-center mb-4" aria-label="Шаги заполнения резюме">
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
          <div
            className={`w-20 h-1 mx-2 ${
              idx < current ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        )}
      </div>
    ))}
  </div>
));

const TemplateSelect = React.memo(function TemplateSelect({
  selected,
  onSelect,
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {TEMPLATES.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`border-2 rounded-lg p-6 cursor-pointer transition ${
            selected === t.id
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(t.id)}
          aria-pressed={selected === t.id}
        >
          <div className={`${COLOR_BG[t.color]} w-12 h-12 rounded-lg mb-3`} />
          <h4 className="font-semibold mb-1 text-gray-900">{t.name}</h4>
          <p className="text-sm text-gray-600">
            Стильный и профессиональный дизайн
          </p>
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
  const topSkills = useMemo(
    () => (profile.skills || []).slice(0, 8),
    [profile.skills],
  );
  const expCount = (profile.experience || []).length;
  const eduCount = (profile.education || []).length;
  const langCount = (profile.languages || []).length;

  return (
    <section
      className="bg-green-50 border border-green-200 rounded-lg p-6"
      aria-labelledby="preview-heading"
    >
      <h4
        id="preview-heading"
        className="font-semibold mb-3 text-green-900 text-lg"
      >
        Предпросмотр резюме
      </h4>

      <div className="bg-white rounded-lg p-6 border shadow-sm">
        {/* Шапка */}
        <div className="mb-4 flex gap-4 flex-wrap">
          {profile.photo && (
            <img
              src={profile.photo}
              alt="Фото кандидата"
              className="w-16 h-16 rounded-full object-cover border"
            />
          )}

          <div className="min-w-[12rem]">
            <h2 className="text-2xl font-bold text-gray-900">
              {profile.fullName || 'Ваше имя'}
            </h2>

            {profile.position && (
              <p className="text-gray-800 font-medium mt-1">
                {profile.position}
              </p>
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
          </div>
        </div>

        {/* О себе */}
        {profile.summary && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-900">О себе</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {profile.summary}
            </p>
          </div>
        )}

        {/* Карточки статистики */}
        <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Briefcase
              size={20}
              className="mx-auto mb-1 text-blue-600"
              aria-hidden
            />
            <div className="font-semibold text-gray-900">{expCount}</div>
            <div className="text-gray-600">мест работы</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <BookOpen
              size={20}
              className="mx-auto mb-1 text-purple-600"
              aria-hidden
            />
            <div className="font-semibold text-gray-900">{eduCount}</div>
            <div className="text-gray-600">образование</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <Globe
              size={20}
              className="mx-auto mb-1 text-indigo-600"
              aria-hidden
            />
            <div className="font-semibold text-gray-900">{langCount}</div>
            <div className="text-gray-600">языков</div>
          </div>
        </div>

        {/* Навыки */}
        {topSkills.length > 0 && (
          <div className="mb-0">
            <h3 className="font-semibold mb-2 text-gray-900">Навыки</h3>
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
    </section>
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

  // ref для заголовка текущего шага – фокус и прокрутка
  const headingRef = useRef(null);

  // локальное состояние формы
  const [form, setForm] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...(profile || {}),
  }));

  // ошибок для фото
  const [photoError, setPhotoError] = useState('');

  // синхронизация наружу (дебаунс)
  useEffect(() => {
    const t = setTimeout(() => {
      if (setProfile) setProfile(form);
    }, 250);
    return () => clearTimeout(t);
  }, [form, setProfile]);

  // мягкое обновление локальной формы при изменении внешнего profile
  useEffect(() => {
    // берём только поля, которые реально могут апдейтнуться извне
    setForm((prev) => ({
      ...prev,
      fullName: profile?.fullName ?? prev.fullName,
      position: profile?.position ?? prev.position,
      email: profile?.email ?? prev.email,
      phone: profile?.phone ?? prev.phone,
      location: profile?.location ?? prev.location,
      summary: profile?.summary ?? prev.summary,
      photo: profile?.photo ?? prev.photo,
      photoUrl: profile?.photoUrl ?? prev.photoUrl,
      skills: Array.isArray(profile?.skills) ? profile.skills : prev.skills,
      languages: Array.isArray(profile?.languages)
        ? profile.languages
        : prev.languages,
      experience: Array.isArray(profile?.experience)
        ? profile.experience
        : prev.experience,
      education: Array.isArray(profile?.education)
        ? profile.education
        : prev.education,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.fullName,
    profile?.position,
    profile?.email,
    profile?.phone,
    profile?.location,
    profile?.summary,
    profile?.photo,
    profile?.photoUrl,
    profile?.skills,
    profile?.languages,
    profile?.experience,
    profile?.education,
  ]);

  // прокрутка + фокус при изменении шага
  useEffect(() => {
    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const behavior = reduceMotion ? 'auto' : 'smooth';

    if (headingRef.current?.scrollIntoView) {
      headingRef.current.scrollIntoView({ behavior, block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior });
    }

    // после скролла — фокус для screenreader
    const timer = setTimeout(() => {
      try {
        headingRef.current?.focus?.();
      } catch {}
    }, reduceMotion ? 0 : 150);

    return () => clearTimeout(timer);
  }, [currentStep]);

  /* ---------- Примитивные сеттеры ---------- */
  const onChangeField = useCallback(
    (field) => (e) =>
      setForm((p) => ({
        ...p,
        [field]: e.target.value,
      })),
    [],
  );

  /* ---------- Фото ---------- */
  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // лёгкая валидация
    if (!file.type.startsWith('image/')) {
      setPhotoError('Загрузите файл изображения (JPEG, PNG и т.п.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Файл слишком большой. Лимит ~5 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (dataUrl) {
        setForm((p) => ({ ...p, photo: dataUrl }));
        setPhotoError('');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  /* ---------- Навыки ---------- */
  const [newSkill, setNewSkill] = useState('');
  const addSkill = useCallback(() => {
    const s = newSkill.trim();
    if (!s) return;
    setForm((p) => {
      const next = uniqCaseInsensitive([...p.skills, s]);
      return { ...p, skills: next };
    });
    setNewSkill('');
  }, [newSkill]);

  const removeSkill = useCallback((idx) => {
    setForm((p) => ({
      ...p,
      skills: p.skills.filter((_, i) => i !== idx),
    }));
  }, []);

  // рекомендации ИИ (локальные)
  const [aiSkillHints, setAiSkillHints] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRotate, setAiRotate] = useState(0);

  const rebuildHints = useCallback(
    (rotateBump = 0) => {
      setAiLoading(true);
      const r = aiRotate + rotateBump;
      // имитируем лёгкую задержку, без реального запроса
      setTimeout(() => {
        const hints = smartSuggestSkills(form, r);
        setAiSkillHints(hints);
        setAiRotate(r);
        setAiLoading(false);
      }, 250);
    },
    [form, aiRotate],
  );

  // пересчитывать подсказки, когда мы на шаге "Навыки"
  useEffect(() => {
    if (currentStep !== 3) return;
    rebuildHints(0);
  }, [currentStep, form.skills, form.position, form.summary, rebuildHints]);

  /* ---------- Опыт ---------- */
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
        experience: [
          ...p.experience,
          { ...newExperience, id: Date.now() },
        ],
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
      experience: p.experience.filter((e, i) =>
        e.id ? e.id !== idxOrId : i !== idxOrId,
      ),
    }));
  }, []);

  /* ---------- Образование ---------- */
  const blankEducation = {
    year: '',
    institution: '',
    level: '',
    specialization: '',
  };
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
        education: [
          ...p.education,
          { ...newEducation, id: Date.now() },
        ],
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
      education: p.education.filter((e, i) =>
        e.id ? e.id !== idxOrId : i !== idxOrId,
      ),
    }));
  }, []);

  /* ---------- Языки ---------- */
  const blankLanguage = { language: '', level: 'B1 — Средний' };
  const [newLanguage, setNewLanguage] = useState(blankLanguage);

  const isLanguageDraftFilled = useCallback(
    (l) => !!l && !isBlank(l.language),
    [],
  );

  const commitLanguageDraft = useCallback(() => {
    if (isLanguageDraftFilled(newLanguage)) {
      setForm((p) => ({
        ...p,
        languages: [
          ...(p.languages || []),
          { ...newLanguage, id: Date.now() },
        ],
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
      languages: (p.languages || []).filter((l, i) =>
        l.id ? l.id !== idOrIdx : i !== idOrIdx,
      ),
    }));
  }, []);

  /* ---------- Шаблон ---------- */
  const handleSelectTemplate = useCallback(
    (id) => setSelectedTemplate(id),
    [setSelectedTemplate],
  );

  /* ---------- Имя файла PDF ---------- */
  const fileName = useMemo(() => {
    const base = (form.fullName || 'resume')
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]+/g, '');
    return `${base || 'resume'}.pdf`;
  }, [form.fullName]);

  /* ---------- Валидация перед скачиванием ---------- */
  const requiredMissing = useMemo(() => {
    const miss = [];
    if (!form.fullName?.trim()) miss.push('ФИО');
    if (!form.email?.trim()) miss.push('Email');
    if (!form.phone?.trim()) miss.push('Телефон');
    return miss;
  }, [form.fullName, form.email, form.phone]);

  const canDownload = requiredMissing.length === 0;

  /* ---------- Навигация шагов ---------- */
  const goNext = useCallback(() => {
    // когда уходим со "сложных" шагов — коммитим текущие черновики
    if (currentStep === 1) commitExperienceDraft();
    if (currentStep === 2) commitEducationDraft();
    if (currentStep === 4) commitLanguageDraft();
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [
    currentStep,
    commitExperienceDraft,
    commitEducationDraft,
    commitLanguageDraft,
  ]);

  /* ---------- Пакет для экспорта (в т.ч. незакоммиченные драфты) ---------- */
  const buildExportProfile = useCallback(() => {
    const exp = [...form.experience];
    if (
      isExperienceDraftFilled(newExperience) &&
      canCommitExperience(newExperience)
    ) {
      exp.push({ ...newExperience, id: `draft-${Date.now()}` });
    }

    const edu = [...form.education];
    if (
      isEducationDraftFilled(newEducation) &&
      canCommitEducation(newEducation)
    ) {
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
    newExperience,
    isExperienceDraftFilled,
    canCommitExperience,
    newEducation,
    isEducationDraftFilled,
    canCommitEducation,
    newLanguage,
    isLanguageDraftFilled,
  ]);

  /* ---------- Генерация PDF ---------- */
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const liveRegionId = useId();

  const handleDownload = useCallback(async () => {
    if (!canDownload || downloading) return;

    try {
      // финальный коммит черновиков, если юзер не нажал "Далее"
      if (currentStep === 1) await commitExperienceDraft();
      if (currentStep === 2) await commitEducationDraft();
      if (currentStep === 4) await commitLanguageDraft();
    } catch {
      /* ignore */
    }

    setDownloading(true);
    setDownloadError('');
    try {
      const exportProfile = buildExportProfile();

      const [{ pdf }, { default: ResumePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ResumePDF'),
      ]);

      const blob = await pdf(
        <ResumePDF profile={exportProfile} template={selectedTemplate} />,
      ).toBlob();

      if (!blob || blob.size === 0)
        throw new Error('Пустой PDF (blob.size === 0)');

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
      const msg =
        (err && (err.message || err.toString())) || 'Неизвестная ошибка';
      setDownloadError(`Не удалось сформировать PDF. ${msg}`);
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
  ]);

  /* ---------- Рендер ---------- */
  return (
    <div className="min-h-screen bg-gray-50 py-12 text-gray-900">
      <div className="max-w-5xl mx-auto px-4">
        {/* Кнопка назад в "домой" */}
        <button
          onClick={() => setCurrentPage('home')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          aria-label="Вернуться на главную"
        >
          ← Назад
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Шапка с шагами */}
          <div className="mb-8">
            <Stepper current={currentStep} />
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm text-gray-900"
            >
              {STEPS[currentStep]}
            </h2>
          </div>

          {/* Контент по шагам */}
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
                        alt="Фото профиля"
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
                  <p className="text-sm text-gray-500 mt-2">
                    Рекомендуется загрузить фото
                  </p>
                  {photoError && (
                    <p className="text-xs text-red-600 mt-1">{photoError}</p>
                  )}
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
                    placeholder="Кратко опишите сильные стороны, опыт, ключевые достижения и карьерную цель (2–3 предложения)…"
                  />
                  <div className="mt-2 flex items-start gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
                    <Sparkles size={16} className="mt-0.5" aria-hidden />
                    <p>
                      Подсказка: укажите опыт, одно-два достижения и стек /
                      область, в которой сильны.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 1 — Опыт */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                    <Briefcase size={18} aria-hidden />
                    <span>Добавить опыт</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Должность *"
                      value={newExperience.position}
                      onChange={(e) =>
                        setNewExperience((p) => ({
                          ...p,
                          position: e.target.value,
                        }))
                      }
                      placeholder="Frontend Developer"
                    />
                    <Input
                      label="Компания *"
                      value={newExperience.company}
                      onChange={(e) =>
                        setNewExperience((p) => ({
                          ...p,
                          company: e.target.value,
                        }))
                      }
                      placeholder='ТОО "Tech Corp"'
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Начало работы *"
                      type="month"
                      value={newExperience.startDate}
                      onChange={(e) =>
                        setNewExperience((p) => ({
                          ...p,
                          startDate: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Окончание работы"
                      type="month"
                      value={newExperience.endDate}
                      onChange={(e) =>
                        setNewExperience((p) => ({
                          ...p,
                          endDate: e.target.value,
                        }))
                      }
                      disabled={newExperience.currentlyWorking}
                      className={
                        newExperience.currentlyWorking
                          ? 'bg-gray-100 cursor-not-allowed'
                          : ''
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-900">
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
                    <span>Работаю по настоящее время</span>
                  </label>

                  <Textarea
                    label="Обязанности и достижения"
                    rows={4}
                    value={newExperience.responsibilities}
                    onChange={(e) =>
                      setNewExperience((p) => ({
                        ...p,
                        responsibilities: e.target.value,
                      }))
                    }
                    placeholder={
                      '• Разработка и поддержка клиентской части\n• Оптимизация производительности интерфейса\n• Наставничество стажёров'
                    }
                  />

                  <button
                    onClick={addExperience}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Добавить опыт</span>
                  </button>
                </div>

                {form.experience.length > 0 && (
                  <div className="space-y-3" role="list" aria-label="Добавленный опыт работы">
                    <h3 className="font-semibold text-gray-900">
                      Добавленный опыт:
                    </h3>
                    {form.experience.map((exp, idx) => (
                      <div
                        key={exp.id || idx}
                        className="border rounded-lg p-4 bg-white"
                        role="listitem"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {exp.position}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {exp.company} • {fmtMonth(exp.startDate)} —{' '}
                              {exp.currentlyWorking
                                ? 'по настоящее время'
                                : fmtMonth(exp.endDate)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeExperience(exp.id ?? idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            aria-label="Удалить запись об опыте"
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

            {/* Шаг 2 — Образование */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
                    <BookOpen size={18} aria-hidden />
                    <span>Добавить образование</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      label="Уровень *"
                      value={newEducation.level}
                      onChange={(e) =>
                        setNewEducation((p) => ({
                          ...p,
                          level: e.target.value,
                        }))
                      }
                    >
                      <option value="">Выберите</option>
                      {[
                        'Среднее',
                        'Среднее специальное',
                        'Неоконченное высшее',
                        'Высшее',
                        'Бакалавр',
                        'Магистр',
                        'MBA',
                        'Кандидат наук',
                        'Доктор наук',
                      ].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </Select>

                    <Input
                      label="Учебное заведение *"
                      value={newEducation.institution}
                      onChange={(e) =>
                        setNewEducation((p) => ({
                          ...p,
                          institution: e.target.value,
                        }))
                      }
                      placeholder="Жезказганский университет имени О.А. Байконурова"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Год окончания"
                      type="number"
                      min="1950"
                      max="2035"
                      value={newEducation.year}
                      onChange={(e) =>
                        setNewEducation((p) => ({
                          ...p,
                          year: e.target.value,
                        }))
                      }
                      placeholder="2024"
                    />
                    <Input
                      label="Специальность"
                      value={newEducation.specialization}
                      onChange={(e) =>
                        setNewEducation((p) => ({
                          ...p,
                          specialization: e.target.value,
                        }))
                      }
                      placeholder="Программная инженерия"
                    />
                  </div>

                  <button
                    onClick={addEducation}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Добавить образование</span>
                  </button>
                </div>

                {form.education.length > 0 && (
                  <div className="space-y-3" role="list" aria-label="Добавленное образование">
                    <h3 className="font-semibold text-gray-900">
                      Добавленное образование:
                    </h3>
                    {form.education.map((edu, idx) => (
                      <div
                        key={edu.id || idx}
                        className="border rounded-lg p-4 bg-white"
                        role="listitem"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {edu.level}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {edu.institution}
                              {edu.year ? ` • ${edu.year}` : ''}
                            </p>
                            {edu.specialization && (
                              <p className="text-sm text-gray-700">
                                {edu.specialization}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeEducation(edu.id ?? idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            aria-label="Удалить запись об образовании"
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
                {/* Добавление навыка вручную */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Добавить навык
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="Например: React, JavaScript, Python"
                      aria-label="Введите навык"
                    />
                    <button
                      onClick={addSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                      aria-label="Добавить навык"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {/* Текущие навыки */}
                {form.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-gray-900">
                      Ваши навыки:
                    </h3>
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

                {/* AI-рекомендации (локальные) */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sparkles
                        className="text-purple-600 mt-0.5"
                        size={16}
                        aria-hidden
                      />
                      <div>
                        <h4 className="font-semibold text-purple-900">
                          AI рекомендует добавить:
                        </h4>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiLoading ? (
                            <span className="text-sm text-gray-600">
                              Подбираем навыки…
                            </span>
                          ) : aiSkillHints.length ? (
                            aiSkillHints.map((skill) => (
                              <button
                                key={skill}
                                onClick={() =>
                                  setForm((p) => {
                                    const next = uniqCaseInsensitive([
                                      ...p.skills,
                                      skill,
                                    ]);
                                    return { ...p, skills: next };
                                  })
                                }
                                className="px-3 py-1 bg-white border border-purple-300 text-purple-700 rounded-full text-sm hover:bg-purple-100"
                              >
                                + {skill}
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">
                              Пока нечего предложить — добавьте пару ключевых
                              навыков или укажите должность и опыт.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => rebuildHints(1)}
                      className="px-3 py-2 text-sm border rounded-lg hover:bg-purple-100 disabled:opacity-50"
                      disabled={aiLoading}
                      title="Обновить рекомендации по навыкам"
                      aria-label="Обновить рекомендации по навыкам"
                    >
                      <RefreshCw
                        size={16}
                        className={aiLoading ? 'animate-spin' : ''}
                      />
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
                    <Globe size={18} aria-hidden />
                    <span>Знание языков</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Язык *"
                      value={newLanguage.language}
                      onChange={(e) =>
                        setNewLanguage((p) => ({
                          ...p,
                          language: e.target.value,
                        }))
                      }
                      placeholder="Английский"
                    />
                    <Select
                      label="Уровень *"
                      value={newLanguage.level}
                      onChange={(e) =>
                        setNewLanguage((p) => ({
                          ...p,
                          level: e.target.value,
                        }))
                      }
                    >
                      {[
                        'A1 — Начальный',
                        'A2 — Элементарный',
                        'B1 — Средний',
                        'B2 — Средне-продвинутый',
                        'C1 — Продвинутый',
                        'C2 — В совершенстве',
                      ].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <button
                    onClick={addLanguage}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Добавить язык</span>
                  </button>
                </div>

                {(form.languages || []).length > 0 && (
                  <div className="space-y-2" role="list" aria-label="Добавленные языки">
                    {form.languages.map((l, idx) => (
                      <div
                        key={l.id || idx}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                        role="listitem"
                      >
                        <div className="text-gray-900">
                          <span className="font-medium">{l.language}</span>
                          <span className="text-gray-500 text-sm ml-2">
                            — {l.level}
                          </span>
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
                  <h3 className="font-semibold mb-4 text-gray-900">
                    Выберите шаблон резюме:
                  </h3>
                  <TemplateSelect
                    selected={selectedTemplate}
                    onSelect={handleSelectTemplate}
                  />
                </div>
                <ResumePreview profile={form} />
              </div>
            )}
          </div>

          {/* Нижняя панель навигации и скачивания */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Назад */}
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                aria-label="Назад к предыдущему шагу"
              >
                Назад
              </button>
            ) : (
              <span />
            )}

            {/* Далее / Скачать */}
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                aria-label="Перейти к следующему шагу"
              >
                Далее
              </button>
            ) : canDownload ? (
              <div className="ml-auto flex flex-col items-end gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                    downloading
                      ? 'bg-green-500 text-white opacity-80 cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  aria-describedby={liveRegionId}
                >
                  <Download size={20} />
                  <span>{downloading ? 'Готовим PDF…' : 'Скачать PDF'}</span>
                </button>

                <p
                  id={liveRegionId}
                  aria-live="assertive"
                  className="text-sm text-red-600 min-h-[1.25rem]"
                >
                  {downloadError || ''}
                </p>
              </div>
            ) : (
              <div className="ml-auto flex flex-col items-end gap-2 w-full sm:w-auto">
                <button
                  disabled
                  className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-2"
                  title={`Заполните: ${requiredMissing.join(', ')}`}
                  aria-describedby={liveRegionId}
                >
                  <Download size={20} />
                  <span>Заполните обязательные поля</span>
                </button>
                <p
                  id={liveRegionId}
                  aria-live="polite"
                  className="text-xs text-gray-500"
                >
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
