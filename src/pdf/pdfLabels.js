/**
 * PDF Labels Module
 * 
 * Multi-language labels for PDF resume templates
 * Supports 7 languages: EN, RU, KK, ES, FR, DE, ZH
 * 
 * @module pdf/pdfLabels
 */

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export const SUPPORTED_PDF_LANGUAGES = ['en', 'ru', 'kk', 'es', 'fr', 'de', 'zh'];
export const DEFAULT_PDF_LANGUAGE = 'en';

// ============================================================================
// LABELS DATA
// ============================================================================

/**
 * Multi-language labels for PDF templates
 * @type {Object.<string, Object>}
 */
export const pdfLabels = {
  // ========================================
  // ENGLISH
  // ========================================
  en: {
    // Main sections
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Education',
    educationDetails: 'Education Details',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Projects',
    references: 'References',
    profile: 'Profile',
    
    // Contact
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    location: 'Location',
    website: 'Website',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Portfolio',
    
    // Personal info
    personalInfo: 'Personal Information',
    age: 'Age',
    dateOfBirth: 'Date of Birth',
    maritalStatus: 'Marital Status',
    children: 'Children',
    license: 'Driver\'s License',
    nationality: 'Nationality',
    
    // Experience
    position: 'Position',
    company: 'Company',
    present: 'Present',
    to: 'to',
    responsibilities: 'Responsibilities & Achievements',
    duties: 'Key Duties',
    achievements: 'Achievements',
    
    // Education
    degree: 'Degree',
    institution: 'Institution',
    field: 'Field of Study',
    major: 'Major',
    gpa: 'GPA',
    honors: 'Honors',
    
    // Skills & Languages
    skillLevel: 'Level',
    proficiency: 'Proficiency',
    
    // Language proficiency levels
    languageLevels: {
      basic: 'Basic',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      fluent: 'Fluent',
      native: 'Native',
    },
    
    // Skill levels
    skillLevels: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
    },
    
    // Certifications
    issuer: 'Issued by',
    issued: 'Issued',
    expires: 'Expires',
    credentialId: 'Credential ID',
    
    // Projects
    projectName: 'Project',
    description: 'Description',
    technologies: 'Technologies',
    link: 'Link',
    
    // Date formats
    months: {
      short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },
    
    // Defaults
    defaultName: 'FULL NAME',
    noData: 'No data provided',
    page: 'Page',
  },

  // ========================================
  // RUSSIAN
  // ========================================
  ru: {
    // Основные секции
    summary: 'Профессиональное резюме',
    experience: 'Опыт работы',
    education: 'Образование',
    educationDetails: 'Детали образования',
    skills: 'Навыки',
    languages: 'Языки',
    certifications: 'Сертификаты',
    projects: 'Проекты',
    references: 'Рекомендации',
    profile: 'Профиль',
    
    // Контакты
    contact: 'Контакты',
    email: 'Email',
    phone: 'Телефон',
    location: 'Местоположение',
    website: 'Веб-сайт',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Портфолио',
    
    // Личная информация
    personalInfo: 'Личная информация',
    age: 'Возраст',
    dateOfBirth: 'Дата рождения',
    maritalStatus: 'Семейное положение',
    children: 'Дети',
    license: 'Водительские права',
    nationality: 'Национальность',
    
    // Опыт работы
    position: 'Должность',
    company: 'Компания',
    present: 'Настоящее время',
    to: 'по',
    responsibilities: 'Обязанности и достижения',
    duties: 'Ключевые обязанности',
    achievements: 'Достижения',
    
    // Образование
    degree: 'Степень',
    institution: 'Учебное заведение',
    field: 'Специальность',
    major: 'Направление',
    gpa: 'Средний балл',
    honors: 'Награды',
    
    // Навыки и языки
    skillLevel: 'Уровень',
    proficiency: 'Уровень владения',
    
    // Уровни владения языком
    languageLevels: {
      basic: 'Базовый',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
      fluent: 'Свободный',
      native: 'Родной',
    },
    
    // Уровни навыков
    skillLevels: {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
      expert: 'Эксперт',
    },
    
    // Сертификаты
    issuer: 'Выдан',
    issued: 'Дата выдачи',
    expires: 'Истекает',
    credentialId: 'ID сертификата',
    
    // Проекты
    projectName: 'Проект',
    description: 'Описание',
    technologies: 'Технологии',
    link: 'Ссылка',
    
    // Форматы дат
    months: {
      short: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
      long: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    },
    
    // Дефолтные значения
    defaultName: 'ПОЛНОЕ ИМЯ',
    noData: 'Нет данных',
    page: 'Страница',
  },

  // ========================================
  // KAZAKH
  // ========================================
  kk: {
    // Основные секции
    summary: 'Кәсіби түйіндеме',
    experience: 'Жұмыс тәжірибесі',
    education: 'Білім',
    educationDetails: 'Білім туралы толық ақпарат',
    skills: 'Дағдылар',
    languages: 'Тілдер',
    certifications: 'Сертификаттар',
    projects: 'Жобалар',
    references: 'Ұсынымдар',
    profile: 'Профиль',
    
    // Контакты
    contact: 'Байланыс',
    email: 'Email',
    phone: 'Телефон',
    location: 'Орналасқан жері',
    website: 'Веб-сайт',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Портфолио',
    
    // Личная информация
    personalInfo: 'Жеке ақпарат',
    age: 'Жасы',
    dateOfBirth: 'Туған күні',
    maritalStatus: 'Отбасылық жағдайы',
    children: 'Балалар',
    license: 'Жүргізуші куәлігі',
    nationality: 'Ұлты',
    
    // Опыт работы
    position: 'Лауазым',
    company: 'Компания',
    present: 'Қазіргі уақыт',
    to: 'дейін',
    responsibilities: 'Міндеттер мен жетістіктер',
    duties: 'Негізгі міндеттер',
    achievements: 'Жетістіктер',
    
    // Образование
    degree: 'Дәреже',
    institution: 'Оқу орны',
    field: 'Мамандық',
    major: 'Бағыт',
    gpa: 'Орташа балл',
    honors: 'Марапаттар',
    
    // Навыки и языки
    skillLevel: 'Деңгей',
    proficiency: 'Меңгеру деңгейі',
    
    // Уровни владения языком
    languageLevels: {
      basic: 'Базалық',
      intermediate: 'Орташа',
      advanced: 'Жоғары',
      fluent: 'Еркін',
      native: 'Ана тілі',
    },
    
    // Уровни навыков
    skillLevels: {
      beginner: 'Бастауыш',
      intermediate: 'Орташа',
      advanced: 'Жоғары',
      expert: 'Сарапшы',
    },
    
    // Сертификаты
    issuer: 'Берген',
    issued: 'Берілген күні',
    expires: 'Аяқталады',
    credentialId: 'Сертификат ID',
    
    // Проекты
    projectName: 'Жоба',
    description: 'Сипаттама',
    technologies: 'Технологиялар',
    link: 'Сілтеме',
    
    // Форматы дат
    months: {
      short: ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'],
      long: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
    },
    
    // Дефолтные значения
    defaultName: 'ТОЛЫҚ АТЫ-ЖӨНІ',
    noData: 'Деректер жоқ',
    page: 'Бет',
  },

  // ========================================
  // SPANISH
  // ========================================
  es: {
    summary: 'Resumen Profesional',
    experience: 'Experiencia Laboral',
    education: 'Educación',
    educationDetails: 'Detalles de Educación',
    skills: 'Habilidades',
    languages: 'Idiomas',
    certifications: 'Certificaciones',
    projects: 'Proyectos',
    references: 'Referencias',
    profile: 'Perfil',
    
    contact: 'Contacto',
    email: 'Email',
    phone: 'Teléfono',
    location: 'Ubicación',
    website: 'Sitio Web',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Portafolio',
    
    personalInfo: 'Información Personal',
    age: 'Edad',
    dateOfBirth: 'Fecha de Nacimiento',
    maritalStatus: 'Estado Civil',
    children: 'Hijos',
    license: 'Licencia de Conducir',
    nationality: 'Nacionalidad',
    
    position: 'Puesto',
    company: 'Empresa',
    present: 'Presente',
    to: 'a',
    responsibilities: 'Responsabilidades y Logros',
    duties: 'Deberes Clave',
    achievements: 'Logros',
    
    degree: 'Título',
    institution: 'Institución',
    field: 'Campo de Estudio',
    major: 'Especialidad',
    gpa: 'Promedio',
    honors: 'Honores',
    
    skillLevel: 'Nivel',
    proficiency: 'Competencia',
    
    languageLevels: {
      basic: 'Básico',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
      fluent: 'Fluido',
      native: 'Nativo',
    },
    
    skillLevels: {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
      expert: 'Experto',
    },
    
    issuer: 'Emitido por',
    issued: 'Emitido',
    expires: 'Expira',
    credentialId: 'ID de Credencial',
    
    projectName: 'Proyecto',
    description: 'Descripción',
    technologies: 'Tecnologías',
    link: 'Enlace',
    
    months: {
      short: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      long: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    },
    
    defaultName: 'NOMBRE COMPLETO',
    noData: 'Sin datos',
    page: 'Página',
  },

  // ========================================
  // FRENCH
  // ========================================
  fr: {
    summary: 'Résumé Professionnel',
    experience: 'Expérience Professionnelle',
    education: 'Formation',
    educationDetails: 'Détails de Formation',
    skills: 'Compétences',
    languages: 'Langues',
    certifications: 'Certifications',
    projects: 'Projets',
    references: 'Références',
    profile: 'Profil',
    
    contact: 'Contact',
    email: 'Email',
    phone: 'Téléphone',
    location: 'Localisation',
    website: 'Site Web',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Portfolio',
    
    personalInfo: 'Informations Personnelles',
    age: 'Âge',
    dateOfBirth: 'Date de Naissance',
    maritalStatus: 'État Civil',
    children: 'Enfants',
    license: 'Permis de Conduire',
    nationality: 'Nationalité',
    
    position: 'Poste',
    company: 'Entreprise',
    present: 'Présent',
    to: 'à',
    responsibilities: 'Responsabilités et Réalisations',
    duties: 'Principales Tâches',
    achievements: 'Réalisations',
    
    degree: 'Diplôme',
    institution: 'Institution',
    field: 'Domaine d\'Étude',
    major: 'Spécialité',
    gpa: 'Moyenne',
    honors: 'Distinctions',
    
    skillLevel: 'Niveau',
    proficiency: 'Maîtrise',
    
    languageLevels: {
      basic: 'Base',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
      fluent: 'Courant',
      native: 'Natif',
    },
    
    skillLevels: {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
      expert: 'Expert',
    },
    
    issuer: 'Émis par',
    issued: 'Émis',
    expires: 'Expire',
    credentialId: 'ID de Certification',
    
    projectName: 'Projet',
    description: 'Description',
    technologies: 'Technologies',
    link: 'Lien',
    
    months: {
      short: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      long: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    },
    
    defaultName: 'NOM COMPLET',
    noData: 'Aucune donnée',
    page: 'Page',
  },

  // ========================================
  // GERMAN
  // ========================================
  de: {
    summary: 'Berufliche Zusammenfassung',
    experience: 'Berufserfahrung',
    education: 'Ausbildung',
    educationDetails: 'Ausbildungsdetails',
    skills: 'Fähigkeiten',
    languages: 'Sprachen',
    certifications: 'Zertifizierungen',
    projects: 'Projekte',
    references: 'Referenzen',
    profile: 'Profil',
    
    contact: 'Kontakt',
    email: 'E-Mail',
    phone: 'Telefon',
    location: 'Standort',
    website: 'Website',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: 'Portfolio',
    
    personalInfo: 'Persönliche Informationen',
    age: 'Alter',
    dateOfBirth: 'Geburtsdatum',
    maritalStatus: 'Familienstand',
    children: 'Kinder',
    license: 'Führerschein',
    nationality: 'Nationalität',
    
    position: 'Position',
    company: 'Unternehmen',
    present: 'Gegenwart',
    to: 'bis',
    responsibilities: 'Verantwortlichkeiten und Erfolge',
    duties: 'Hauptaufgaben',
    achievements: 'Erfolge',
    
    degree: 'Abschluss',
    institution: 'Institution',
    field: 'Studienrichtung',
    major: 'Hauptfach',
    gpa: 'Notendurchschnitt',
    honors: 'Auszeichnungen',
    
    skillLevel: 'Level',
    proficiency: 'Kenntnisstand',
    
    languageLevels: {
      basic: 'Grundkenntnisse',
      intermediate: 'Mittelstufe',
      advanced: 'Fortgeschritten',
      fluent: 'Fließend',
      native: 'Muttersprache',
    },
    
    skillLevels: {
      beginner: 'Anfänger',
      intermediate: 'Fortgeschritten',
      advanced: 'Erfahren',
      expert: 'Experte',
    },
    
    issuer: 'Ausgestellt von',
    issued: 'Ausgestellt',
    expires: 'Läuft ab',
    credentialId: 'Zertifikats-ID',
    
    projectName: 'Projekt',
    description: 'Beschreibung',
    technologies: 'Technologien',
    link: 'Link',
    
    months: {
      short: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
      long: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    },
    
    defaultName: 'VOLLSTÄNDIGER NAME',
    noData: 'Keine Daten',
    page: 'Seite',
  },

  // ========================================
  // CHINESE (Simplified)
  // ========================================
  zh: {
    summary: '专业简介',
    experience: '工作经验',
    education: '教育背景',
    educationDetails: '教育详情',
    skills: '技能',
    languages: '语言',
    certifications: '证书',
    projects: '项目',
    references: '推荐人',
    profile: '个人资料',
    
    contact: '联系方式',
    email: '电子邮件',
    phone: '电话',
    location: '位置',
    website: '网站',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    portfolio: '作品集',
    
    personalInfo: '个人信息',
    age: '年龄',
    dateOfBirth: '出生日期',
    maritalStatus: '婚姻状况',
    children: '子女',
    license: '驾驶执照',
    nationality: '国籍',
    
    position: '职位',
    company: '公司',
    present: '至今',
    to: '至',
    responsibilities: '职责与成就',
    duties: '主要职责',
    achievements: '成就',
    
    degree: '学位',
    institution: '学校',
    field: '专业',
    major: '主修',
    gpa: '平均绩点',
    honors: '荣誉',
    
    skillLevel: '等级',
    proficiency: '熟练程度',
    
    languageLevels: {
      basic: '基础',
      intermediate: '中级',
      advanced: '高级',
      fluent: '流利',
      native: '母语',
    },
    
    skillLevels: {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
      expert: '专家',
    },
    
    issuer: '颁发者',
    issued: '颁发日期',
    expires: '到期日期',
    credentialId: '证书编号',
    
    projectName: '项目',
    description: '描述',
    technologies: '技术',
    link: '链接',
    
    months: {
      short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      long: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    },
    
    defaultName: '姓名',
    noData: '无数据',
    page: '页',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all labels for specified language
 * 
 * @param {string} language - Language code ('en', 'ru', 'kk', etc.)
 * @returns {Object} Labels object for the language
 * 
 * @example
 * const labels = getLabels('ru');
 * console.log(labels.experience); // 'Опыт работы'
 */
export function getLabels(language = DEFAULT_PDF_LANGUAGE) {
  // Validate language code
  if (!language || typeof language !== 'string') {
    console.warn('[PDFLabels] Invalid language, using default:', DEFAULT_PDF_LANGUAGE);
    return pdfLabels[DEFAULT_PDF_LANGUAGE];
  }

  const lang = language.toLowerCase();

  // Return labels or fallback to default
  return pdfLabels[lang] || pdfLabels[DEFAULT_PDF_LANGUAGE];
}

/**
 * Get specific label by key (supports nested keys)
 * 
 * @param {string} key - Label key (supports dot notation: 'languageLevels.basic')
 * @param {string} language - Language code
 * @returns {string} Label value
 * 
 * @example
 * getLabel('experience', 'ru'); // 'Опыт работы'
 * getLabel('languageLevels.fluent', 'en'); // 'Fluent'
 */
export function getLabel(key, language = DEFAULT_PDF_LANGUAGE) {
  if (!key || typeof key !== 'string') {
    console.warn('[PDFLabels] Invalid key:', key);
    return key || '';
  }

  const labels = getLabels(language);

  // Support nested keys (e.g., 'languageLevels.basic')
  if (key.includes('.')) {
    const keys = key.split('.');
    let value = labels;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`[PDFLabels] Key not found: ${key} in language: ${language}`);
        return key;
      }
    }

    return value;
  }

  // Simple key lookup
  return labels[key] || key;
}

/**
 * Get month name
 * 
 * @param {number} monthIndex - Month index (0-11)
 * @param {string} language - Language code
 * @param {boolean} short - Use short format
 * @returns {string} Month name
 * 
 * @example
 * getMonthName(0, 'ru', false); // 'Январь'
 * getMonthName(0, 'en', true);  // 'Jan'
 */
export function getMonthName(monthIndex, language = DEFAULT_PDF_LANGUAGE, short = false) {
  const labels = getLabels(language);
  const months = short ? labels.months?.short : labels.months?.long;

  if (!months || monthIndex < 0 || monthIndex > 11) {
    return monthIndex.toString();
  }

  return months[monthIndex];
}

/**
 * Format date in PDF
 * 
 * @param {Date|string} date - Date object or string
 * @param {string} language - Language code
 * @param {boolean} shortMonth - Use short month names
 * @returns {string} Formatted date
 * 
 * @example
 * formatPDFDate(new Date('2024-01-15'), 'en'); // 'January 2024'
 * formatPDFDate('2024-01-15', 'ru', true);     // 'Янв 2024'
 */
export function formatPDFDate(date, language = DEFAULT_PDF_LANGUAGE, shortMonth = false) {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return date.toString();
    }

    const monthName = getMonthName(dateObj.getMonth(), language, shortMonth);
    const year = dateObj.getFullYear();

    return `${monthName} ${year}`;
  } catch (error) {
    console.error('[PDFLabels] Date formatting error:', error);
    return date.toString();
  }
}

/**
 * Format date range for PDF
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date (or null/undefined for current)
 * @param {string} language - Language code
 * @returns {string} Formatted date range
 * 
 * @example
 * formatDateRange('2020-01-01', '2024-01-01', 'en'); // 'January 2020 to January 2024'
 * formatDateRange('2020-01-01', null, 'ru');         // 'Январь 2020 по Настоящее время'
 */
export function formatDateRange(startDate, endDate, language = DEFAULT_PDF_LANGUAGE) {
  const labels = getLabels(language);
  const start = formatPDFDate(startDate, language, true);
  
  if (!endDate) {
    return `${start} ${labels.to} ${labels.present}`;
  }
  
  const end = formatPDFDate(endDate, language, true);
  return `${start} ${labels.to} ${end}`;
}

/**
 * Validate language code
 * 
 * @param {string} language - Language code to validate
 * @returns {boolean} True if valid
 */
export function isValidPDFLanguage(language) {
  return language && SUPPORTED_PDF_LANGUAGES.includes(language.toLowerCase());
}

/**
 * Get supported languages list
 * 
 * @returns {Array} Array of supported language codes
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_PDF_LANGUAGES];
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  pdfLabels,
  getLabels,
  getLabel,
  getMonthName,
  formatPDFDate,
  formatDateRange,
  isValidPDFLanguage,
  getSupportedLanguages,
  SUPPORTED_PDF_LANGUAGES,
  DEFAULT_PDF_LANGUAGE,
};